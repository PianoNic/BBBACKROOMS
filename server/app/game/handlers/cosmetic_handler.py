"""Equip + buy cosmetics. Server-authoritative: ownership and prices come from
the catalog + DB, never the client packet.

Equipping is allowed for anyone (guests can equip their free defaults). Buying
requires a linked account and a connected DB; the deduct+grant is atomic in the
repo so two tabs can't double-spend.
"""
from __future__ import annotations

import logging

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.domain.cosmetics.cosmetic_catalog import CosmeticCatalog
from app.domain.cosmetics.cosmetic_repository import ICosmeticRepository
from app.domain.lobbies.lobby import Lobby
from app.domain.lobbies.player_conn import PlayerConn
from app.game.broadcaster import Broadcaster

log = logging.getLogger("bbb")


class CosmeticHandler:
    def __init__(
        self,
        broadcaster: Broadcaster,
        cosmetics: ICosmeticRepository,
        catalog: CosmeticCatalog,
        db_availability: IDatabaseAvailability,
    ) -> None:
        self._broadcaster = broadcaster
        self._cosmetics = cosmetics
        self._catalog = catalog
        self._db_availability = db_availability

    async def handle_set_cosmetic(
        self, lobby: Lobby, me: PlayerConn, category: str, cosmetic_id: str | None,
    ) -> None:
        if cosmetic_id is None:  # unequip the slot
            me.equipped_cosmetics.pop(category, None)
        else:
            item = self._catalog.get(cosmetic_id)
            if item is None or item.category != category:
                return
            if cosmetic_id not in me.owned_cosmetics:  # ownership check
                return
            me.equipped_cosmetics[category] = cosmetic_id
            if me.account_id is not None and self._db_availability.is_available:
                try:
                    await self._cosmetics.set_equipped(me.account_id, category, cosmetic_id)
                except Exception as exc:  # noqa: BLE001
                    log.warning("set_equipped persist failed: %s", exc)
        await self._broadcaster.broadcast(lobby, {
            "type": "player_cosmetic", "id": me.id, "equipped": me.equipped_cosmetics,
        })

    def _result(self, cosmetic_id: str, ok: bool, balance: int, reason: str) -> dict:
        return {
            "type": "shop_result", "cosmeticId": cosmetic_id,
            "ok": ok, "balance": balance, "reason": reason,
        }

    async def handle_buy_cosmetic(self, lobby: Lobby, me: PlayerConn, cosmetic_id: str) -> None:
        item = self._catalog.get(cosmetic_id)
        if item is None:
            await self._broadcaster.send_safe(me, self._result(cosmetic_id, False, 0, "unknown"))
            return
        if me.account_id is None or not self._db_availability.is_available:
            await self._broadcaster.send_safe(me, self._result(cosmetic_id, False, 0, "guest"))
            return
        try:
            ok, balance, reason = await self._cosmetics.purchase(me.account_id, item)
        except Exception as exc:  # noqa: BLE001
            log.warning("purchase failed: %s", exc)
            ok, balance, reason = False, 0, "error"
        if ok:
            me.owned_cosmetics.add(cosmetic_id)
        await self._broadcaster.send_safe(me, self._result(cosmetic_id, ok, balance, reason))
