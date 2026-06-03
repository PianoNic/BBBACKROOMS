"""Equip + buy cosmetics. Server-authoritative: ownership and prices come from
the catalog + DB, never the client packet.

Equipping is allowed for anyone (guests can equip their free defaults). Buying
requires a linked account and a connected DB; the deduct+grant is atomic in the
repo so two tabs can't double-spend.
"""
from __future__ import annotations

import logging

from app.db import cosmetics_repo
from app.db.engine import db_available
from app.domain.cosmetics import get_item
from app.domain.lobby import Lobby, PlayerConn
from app.services._helpers import send_safe
from app.services.broadcast import broadcast

log = logging.getLogger("bbb")


async def handle_set_cosmetic(
    lobby: Lobby, me: PlayerConn, category: str, cosmetic_id: str | None,
) -> None:
    if cosmetic_id is None:  # unequip the slot
        me.equipped_cosmetics.pop(category, None)
    else:
        item = get_item(cosmetic_id)
        if item is None or item.category != category:
            return
        if cosmetic_id not in me.owned_cosmetics:  # ownership check
            return
        me.equipped_cosmetics[category] = cosmetic_id
        if me.account_id is not None and db_available():
            try:
                await cosmetics_repo.set_equipped(me.account_id, category, cosmetic_id)
            except Exception as exc:  # noqa: BLE001
                log.warning("set_equipped persist failed: %s", exc)
    await broadcast(lobby, {
        "type": "player_cosmetic", "id": me.id, "equipped": me.equipped_cosmetics,
    })


def _result(cosmetic_id: str, ok: bool, balance: int, reason: str) -> dict:
    return {
        "type": "shop_result", "cosmeticId": cosmetic_id,
        "ok": ok, "balance": balance, "reason": reason,
    }


async def handle_buy_cosmetic(lobby: Lobby, me: PlayerConn, cosmetic_id: str) -> None:
    item = get_item(cosmetic_id)
    if item is None:
        await send_safe(me, _result(cosmetic_id, False, 0, "unknown"))
        return
    if me.account_id is None or not db_available():
        await send_safe(me, _result(cosmetic_id, False, 0, "guest"))
        return
    try:
        ok, balance, reason = await cosmetics_repo.purchase(me.account_id, item)
    except Exception as exc:  # noqa: BLE001
        log.warning("purchase failed: %s", exc)
        ok, balance, reason = False, 0, "error"
    if ok:
        me.owned_cosmetics.add(cosmetic_id)
    await send_safe(me, _result(cosmetic_id, ok, balance, reason))
