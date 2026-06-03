"""Game-over "back to lobby" trigger.

Any connected player can fire this once the round is over (`phase` in
{"won","lost"}). The lobby's runtime state is wiped and `status` flips
back to `"waiting"`. A broadcast `lobby_state` tells every client to
soft-reload — they all land back in the same lobby's waiting room and
the admin can press START again."""
from __future__ import annotations

from app.domain.lobby import Lobby, PlayerConn
from app.services.broadcast import broadcast
from app.services.lobby_service import lobby_room_state


def _reset_runtime_state(lobby: Lobby) -> None:
    """Wipe everything that belongs to one round. Connections + lobby
    config (admin, password, settings, chat) survive."""
    lobby.laptops.clear()
    lobby.chairs.clear()
    lobby.chair_projectiles.clear()
    lobby.lockers.clear()
    lobby.pickups.clear()
    lobby.teachers.clear()
    lobby.doors.clear()
    lobby.doors_state.clear()
    lobby.hallway_rects.clear()
    lobby.dead.clear()
    lobby.extracted.clear()
    lobby.corpses.clear()
    lobby.revives.clear()
    lobby.potion_puddles.clear()
    lobby.extraction_locked_until = 0.0
    lobby.grace_until = 0.0
    lobby.round_started_at = 0.0
    lobby.round_ended_at = 0.0
    lobby.round_rewards.clear()
    lobby.rewards_applied = False
    lobby.world = None
    lobby.phase = "tasks"
    lobby.status = "waiting"

    for p in lobby.conns.values():
        p.slow_until = p.stun_until = p.haste_until = 0.0
        p.slow_factor = p.haste_factor = 1.0
        p.medkits = p.potions = p.compasses = 0
        p.trackers = p.goggles = p.gps = 0
        p.goggles_until = p.goggles_cooldown_until = 0.0
        p.tasks_done = p.teachers_stunned = p.revives_done = p.items_collected = 0
        p.death_t = p.extracted_t = 0.0


async def handle_back_to_lobby(lobby: Lobby, me: PlayerConn) -> None:
    # Only meaningful while the game is actually over.
    if lobby.phase not in ("won", "lost"):
        return
    _reset_runtime_state(lobby)
    # Tell every connection the lobby is back in the waiting room so each
    # client can drop the victory overlay + tear down its game scene.
    for p in list(lobby.conns.values()):
        try:
            await p.ws.send_json(lobby_room_state(lobby, p.id))
        except Exception:
            # Connection died — `ws` cleanup will handle removal.
            pass
