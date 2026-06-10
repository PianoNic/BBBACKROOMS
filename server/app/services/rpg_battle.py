"""Turn resolution for the rpg_battle laptop minigame.

One battle per (laptop, player): the player picks an action each turn, the
boss counterattacks while it still stands. State lives on the Laptop's
`battles` dict and is dropped on win, knockout or laptop reopen — so a
fresh open always starts a fresh fight. All rolls are server-side; the
client only renders the returned battle snapshot.
"""
from __future__ import annotations

import random

from app.domain.lobby import Laptop
from app.services.laptop_challenges import RPG_BOSS_HP, RPG_PLAYER_HP

ACTIONS = ("strike", "special", "heal")

STRIKE_DMG = (4, 7)
SPECIAL_DMG = (9, 14)
SPECIAL_HIT_CHANCE = 0.6
HEAL_AMOUNT = (6, 9)
BOSS_DMG = (3, 6)
# The boss enrages: +1 damage per turn beyond this one, so heal-stalling
# (avg heal > avg boss hit) can't drag the fight out forever.
BOSS_ENRAGE_TURN = 4


def play_rpg(lp: Laptop, player_id: str, choice: str | None) -> tuple[bool, dict]:
    """Resolve one turn. Returns (win, detail-for-gamble_result)."""
    action = choice if choice in ACTIONS else "strike"
    state = lp.battles.get(player_id)
    if state is None:
        state = {"player_hp": RPG_PLAYER_HP, "boss_hp": RPG_BOSS_HP, "turn": 0}
        lp.battles[player_id] = state
    state["turn"] += 1

    player_dmg = 0
    healed = 0
    if action == "strike":
        player_dmg = random.randint(*STRIKE_DMG)
    elif action == "special":
        if random.random() < SPECIAL_HIT_CHANCE:
            player_dmg = random.randint(*SPECIAL_DMG)
    else:  # heal
        healed = min(random.randint(*HEAL_AMOUNT), RPG_PLAYER_HP - state["player_hp"])
        state["player_hp"] += healed

    state["boss_hp"] = max(0, state["boss_hp"] - player_dmg)
    boss_down = state["boss_hp"] <= 0

    boss_dmg = 0
    if not boss_down:
        enrage = max(0, state["turn"] - BOSS_ENRAGE_TURN)
        boss_dmg = random.randint(*BOSS_DMG) + enrage
        state["player_hp"] = max(0, state["player_hp"] - boss_dmg)
    player_down = state["player_hp"] <= 0

    battle = {
        "action": action,
        "playerHp": state["player_hp"],
        "bossHp": state["boss_hp"],
        "playerDmg": player_dmg,
        "bossDmg": boss_dmg,
        "healed": healed,
        "bossDown": boss_down,
        "playerDown": player_down,
    }
    if boss_down or player_down:
        lp.battles.pop(player_id, None)
    return boss_down, {"battle": battle}
