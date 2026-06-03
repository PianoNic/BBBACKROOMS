"""Async data access for cosmetic ownership + equipped state.

Default (free) cosmetics are virtual — they're always "owned" and fill empty
equipped slots without needing rows. Callers check `db_available()` first.
"""
from __future__ import annotations

from app.db.engine import database
from app.db.models import CosmeticEquipped, CosmeticOwnership, Profile
from app.domain.cosmetics import (
    CosmeticItem, default_equipped, default_ids, validate_equipped,
)


async def get_owned(account_id: int) -> set[str]:
    rows = await (
        CosmeticOwnership.select(CosmeticOwnership.cosmetic_id)
        .where(CosmeticOwnership.account == account_id)
        .aio_execute()
    )
    return {r.cosmetic_id for r in rows} | default_ids()


async def get_equipped(account_id: int) -> dict[str, str]:
    rows = await (
        CosmeticEquipped.select()
        .where(CosmeticEquipped.account == account_id)
        .aio_execute()
    )
    equipped = {r.category: r.cosmetic_id for r in rows}
    for category, cosmetic_id in default_equipped().items():
        equipped.setdefault(category, cosmetic_id)
    return validate_equipped(equipped)


async def set_equipped(account_id: int, category: str, cosmetic_id: str) -> None:
    """Upsert the equipped cosmetic for one category slot (manual upsert — no
    reliance on ON CONFLICT, which keeps it portable and easy to reason about)."""
    async with database.aio_atomic():
        updated = await (
            CosmeticEquipped.update(cosmetic_id=cosmetic_id)
            .where(
                (CosmeticEquipped.account == account_id)
                & (CosmeticEquipped.category == category)
            )
            .aio_execute()
        )
        if not updated:
            await CosmeticEquipped.insert(
                account=account_id, category=category, cosmetic_id=cosmetic_id,
            ).aio_execute()


async def purchase(account_id: int, item: CosmeticItem) -> tuple[bool, int, str]:
    """Atomically buy `item`: re-check ownership + balance, deduct coins, grant.
    Returns (ok, new_balance, reason). reason in ok|owned|insufficient."""
    async with database.aio_atomic():
        already = await (
            CosmeticOwnership.select()
            .where(
                (CosmeticOwnership.account == account_id)
                & (CosmeticOwnership.cosmetic_id == item.id)
            )
            .aio_execute()
        )
        prof = await Profile.aio_get(Profile.account == account_id)
        if list(already):
            return False, prof.coins, "owned"
        if prof.coins < item.price:
            return False, prof.coins, "insufficient"
        await (
            Profile.update(coins=Profile.coins - item.price)
            .where(Profile.account == account_id)
            .aio_execute()
        )
        await CosmeticOwnership.insert(
            account=account_id, cosmetic_id=item.id,
        ).aio_execute()
        after = await Profile.aio_get(Profile.account == account_id)
        return True, after.coins, "ok"
