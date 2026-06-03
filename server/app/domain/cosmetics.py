"""Cosmetic catalog — the server-authoritative source of truth.

Prices and categories live here so the client can never fake them. `asset_ref`
is category-polymorphic and interpreted client-side:
  - body        -> a hex colour ("" = the default sampled colour)
  - facePattern -> a texture path under client `public/`
  - hat         -> a procedural mesh key ("cone", "halo", "gradcap", "crown")
  - title       -> "text|#hexcolor"
`default` items are free and auto-owned by everyone (including guests).
"""
from __future__ import annotations

from dataclasses import dataclass

CATEGORIES = ("body", "facePattern", "hat", "title")


@dataclass(frozen=True)
class CosmeticItem:
    id: str
    category: str
    name: str
    price: int
    rarity: str  # common | rare | epic | legendary
    asset_ref: str
    default: bool = False


_ITEMS: list[CosmeticItem] = [
    CosmeticItem("body_default", "body", "Standard Issue", 0, "common", "", True),
    CosmeticItem("body_hazmat", "body", "Hazmat Green", 150, "common", "#3fa34d"),
    CosmeticItem("body_void", "body", "Void Black", 400, "rare", "#0c0c10"),
    CosmeticItem("body_neon", "body", "Neon Cyan", 600, "epic", "#19e6ff"),
    CosmeticItem("face_smiley", "facePattern", "Pixel Smiley", 200, "common", "/cosmetics/faces/smiley.png"),
    CosmeticItem("face_xeyes", "facePattern", "X_X", 350, "rare", "/cosmetics/faces/xeyes.png"),
    CosmeticItem("hat_grad", "hat", "Graduation Cap", 0, "common", "gradcap", True),
    CosmeticItem("hat_party", "hat", "Party Cone", 250, "common", "cone"),
    CosmeticItem("hat_halo", "hat", "Detention Halo", 800, "epic", "halo"),
    CosmeticItem("hat_crown", "hat", "Class President Crown", 2000, "legendary", "crown"),
    CosmeticItem("title_newkid", "title", "New Kid", 0, "common", "New Kid|#9fb3c8", True),
    CosmeticItem("title_vip", "title", "VIP", 1000, "epic", "VIP|#ffd24a"),
]

CATALOG: dict[str, CosmeticItem] = {it.id: it for it in _ITEMS}


def get_item(cosmetic_id: str | None) -> CosmeticItem | None:
    if cosmetic_id is None:
        return None
    return CATALOG.get(cosmetic_id)


def default_ids() -> set[str]:
    return {it.id for it in _ITEMS if it.default}


def default_equipped() -> dict[str, str]:
    """The free default cosmetic for each category (guests start with these)."""
    return {it.category: it.id for it in _ITEMS if it.default}


def catalog_dto() -> list[dict]:
    return [
        {
            "id": it.id, "category": it.category, "name": it.name,
            "price": it.price, "rarity": it.rarity,
            "assetRef": it.asset_ref, "default": it.default,
        }
        for it in _ITEMS
    ]


def validate_equipped(equipped: dict[str, str]) -> dict[str, str]:
    """Drop any slot whose value isn't a real cosmetic of that category."""
    out: dict[str, str] = {}
    for category, cosmetic_id in equipped.items():
        item = CATALOG.get(cosmetic_id)
        if item is not None and item.category == category:
            out[category] = cosmetic_id
    return out
