"""Laptop apps (casino mini-games + Teams/Moodle challenges):
open prompt, resolve a play, mark the spot done on win."""
from __future__ import annotations

import random

from fastapi import WebSocket

from app.domain.lobby import Laptop, Lobby, PlayerConn
from app.services.broadcast import broadcast
from app.services.laptop_challenges import is_correct
from app.services.rpg_battle import play_rpg
from app.world.geom import distance_squared_xz
from app.world.physics import LAPTOP_INTERACT_RADIUS

SLOT_SYMBOLS = 3


def nearest_laptop(
    lobby: Lobby, x: float, z: float, max_dist: float = LAPTOP_INTERACT_RADIUS,
) -> Laptop | None:
    best: Laptop | None = None
    best_d = max_dist * max_dist
    for lp in lobby.laptops.values():
        d = distance_squared_xz(lp.x, lp.z, x, z)
        if d <= best_d:
            best_d = d
            best = lp
    return best


def laptop_done_status(lobby: Lobby, laptop_id: str) -> bool:
    assert lobby.world is not None
    for obj in lobby.world.objectives:
        if obj.kind != "casino":
            continue
        for s in obj.spots:
            if s.tag == laptop_id:
                return s.done
    return False


def play_game(lp: Laptop, choice: str | None, player_id: str) -> tuple[bool, dict]:
    game = lp.game
    if game == "rpg_battle":
        return play_rpg(lp, player_id, choice)
    if game == "slots":
        symbols = [random.randrange(SLOT_SYMBOLS) for _ in range(3)]
        return symbols[0] == symbols[1] == symbols[2], {"symbols": symbols}
    if game == "dice":
        rolls = [random.randint(1, 6) for _ in range(2)]
        return sum(rolls) >= 7, {"rolls": rolls, "sum": sum(rolls)}
    if game == "coinflip":
        pick = choice if choice in ("heads", "tails") else "heads"
        outcome = random.choice(("heads", "tails"))
        return pick == outcome, {"outcome": outcome, "choice": pick}
    # Challenge-style laptops (Teams/Moodle): compare the player's pick
    # against the per-laptop random correct answer baked at world init.
    return is_correct(game, lp.challenge, choice), {"choice": choice or ""}


def _public_challenge(challenge: dict) -> dict:
    """Strip the `correct` key so it never leaks to clients."""
    return {k: v for k, v in challenge.items() if k != "correct"}


async def handle_gamble_open(ws: WebSocket, lobby: Lobby, me: PlayerConn) -> None:
    lp = nearest_laptop(lobby, me.x, me.z)
    if lp is None:
        return
    # RPG fights restart on every open so the client UI (full HP bars)
    # matches the server state.
    lp.battles.pop(me.id, None)
    done = laptop_done_status(lobby, lp.id)
    await ws.send_json({
        "type": "gamble_state", "laptopId": lp.id, "game": lp.game, "done": done,
        "challenge": _public_challenge(lp.challenge),
    })


async def mark_laptop_done(lobby: Lobby, laptop_id: str, player_id: str) -> None:
    assert lobby.world is not None
    for obj in lobby.world.objectives:
        if obj.kind != "casino":
            continue
        for idx, s in enumerate(obj.spots):
            if s.tag == laptop_id and not s.done:
                s.done = True
                await broadcast(lobby, {
                    "type": "spot_done", "id": obj.id, "spot": idx, "by": player_id,
                })
        if all(s.done for s in obj.spots) and not obj.done:
            obj.done = True
            await broadcast(
                lobby, {"type": "objective_done", "id": obj.id, "by": player_id},
            )
            # Casino is excluded from try_complete_spots' escape-phase check,
            # so when it's the last objective to finish we have to flip the
            # phase here. Otherwise the game stays in tasks forever.
            if lobby.phase == "tasks" and all(
                o.done for o in lobby.world.objectives
            ):
                lobby.phase = "escape"
                await broadcast(lobby, {"type": "phase_change", "phase": "escape"})
        break


async def handle_gamble_play(
    ws: WebSocket, lobby: Lobby, me: PlayerConn, laptop_id: str,
    choice: str | None,
) -> None:
    lp = lobby.laptops.get(laptop_id)
    if lp is None or laptop_done_status(lobby, lp.id):
        return
    win, detail = play_game(lp, choice, me.id)
    await ws.send_json({
        "type": "gamble_result", "laptopId": lp.id, "game": lp.game, "win": win,
        **detail,
    })
    if win:
        await mark_laptop_done(lobby, lp.id, me.id)
