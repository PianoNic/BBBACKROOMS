"""Session-authenticated REST shop, used by the title-screen shop where there's
no WebSocket. (The in-lobby shop uses the WS path so equips broadcast live to
other players.) Equips/purchases here persist to the account and are reflected
in-game via world_init/lobby_state on the next connect.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.auth import tokens
from app.db import cosmetics_repo
from app.db.accounts_repo import get_profile
from app.db.engine import db_available
from app.domain.cosmetics import default_equipped, default_ids, get_item

log = logging.getLogger("bbb")
router = APIRouter(prefix="/shop", tags=["shop"])

SESSION_COOKIE = "bbb_session"


def _account_id(request: Request) -> int | None:
    return tokens.read_account_id(request.cookies.get(SESSION_COOKIE), "session")


class BuyReq(BaseModel):
    cosmeticId: str = Field(max_length=64)


class EquipReq(BaseModel):
    category: str = Field(max_length=20)
    cosmeticId: str = Field(max_length=64)


@router.get("/me")
async def shop_me(request: Request) -> dict:
    """Balance + owned + equipped for the signed-in account, or free defaults."""
    account_id = _account_id(request)
    if account_id is None or not db_available():
        return {
            "signedIn": False, "balance": 0,
            "owned": sorted(default_ids()), "equipped": default_equipped(),
        }
    owned = await cosmetics_repo.get_owned(account_id)
    equipped = await cosmetics_repo.get_equipped(account_id)
    prof = await get_profile(account_id)
    return {
        "signedIn": True, "balance": prof.coins if prof else 0,
        "owned": sorted(owned), "equipped": equipped,
    }


@router.post("/buy")
async def shop_buy(request: Request, body: BuyReq) -> dict:
    item = get_item(body.cosmeticId)
    if item is None:
        return {"ok": False, "reason": "unknown", "balance": 0}
    account_id = _account_id(request)
    if account_id is None or not db_available():
        return {"ok": False, "reason": "guest", "balance": 0}
    try:
        ok, balance, reason = await cosmetics_repo.purchase(account_id, item)
    except Exception as exc:  # noqa: BLE001
        log.warning("shop buy failed: %s", exc)
        ok, balance, reason = False, 0, "error"
    return {"ok": ok, "reason": reason, "balance": balance}


@router.post("/equip")
async def shop_equip(request: Request, body: EquipReq) -> dict:
    account_id = _account_id(request)
    if account_id is None or not db_available():
        return {"ok": False, "reason": "guest"}
    item = get_item(body.cosmeticId)
    if item is None or item.category != body.category:
        return {"ok": False, "reason": "invalid"}
    owned = await cosmetics_repo.get_owned(account_id)
    if body.cosmeticId not in owned:
        return {"ok": False, "reason": "unowned"}
    try:
        await cosmetics_repo.set_equipped(account_id, body.category, body.cosmeticId)
    except Exception as exc:  # noqa: BLE001
        log.warning("shop equip failed: %s", exc)
        return {"ok": False, "reason": "error"}
    return {"ok": True}
