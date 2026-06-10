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
    # --- body themes ---
    CosmeticItem("body_default", "body", "Standard Issue", 0, "common", "", True),
    CosmeticItem("body_hazmat", "body", "Hazmat Green", 150, "common", "#3fa34d"),
    CosmeticItem("body_camo", "body", "Forest Camo", 150, "common", "#4a5d3a"),
    CosmeticItem("body_hotpink", "body", "Hot Pink", 250, "common", "#ff4fa0"),
    CosmeticItem("body_royal", "body", "Royal Blue", 250, "common", "#2456d6"),
    CosmeticItem("body_bbb", "body", "BBB Red", 350, "rare", "#c61824"),
    CosmeticItem("body_void", "body", "Void Black", 400, "rare", "#0c0c10"),
    CosmeticItem("body_toxic", "body", "Toxic Lime", 400, "rare", "#9eff2e"),
    CosmeticItem("body_lava", "body", "Lava Orange", 450, "rare", "#ff5a1f"),
    CosmeticItem("body_neon", "body", "Neon Cyan", 600, "epic", "#19e6ff"),
    CosmeticItem("body_ghost", "body", "Ghost White", 650, "epic", "#f2f4ff"),
    CosmeticItem("body_gold", "body", "Golden Hour", 900, "epic", "#d4a017"),
    # --- face patterns (PNGs under client public/cosmetics/faces/) ---
    CosmeticItem("face_smiley", "facePattern", "Pixel Smiley", 200, "common", "/cosmetics/faces/smiley.png"),
    CosmeticItem("face_wink", "facePattern", "Wink", 200, "common", "/cosmetics/faces/wink.png"),
    CosmeticItem("face_angry", "facePattern", "Grumpy", 300, "common", "/cosmetics/faces/angry.png"),
    CosmeticItem("face_xeyes", "facePattern", "X_X", 350, "rare", "/cosmetics/faces/xeyes.png"),
    CosmeticItem("face_shades", "facePattern", "Deal With It", 450, "rare", "/cosmetics/faces/shades.png"),
    CosmeticItem("face_heart", "facePattern", "Heart Eyes", 500, "rare", "/cosmetics/faces/heart.png"),
    CosmeticItem("face_robot", "facePattern", "Roboter", 700, "epic", "/cosmetics/faces/robot.png"),
    CosmeticItem("face_ghost", "facePattern", "Spooked", 750, "epic", "/cosmetics/faces/ghost.png"),
    # --- hats (procedural mesh keys, built client-side) ---
    CosmeticItem("hat_grad", "hat", "Graduation Cap", 0, "common", "gradcap", True),
    CosmeticItem("hat_beret", "hat", "Künstler-Beret", 200, "common", "beret"),
    CosmeticItem("hat_party", "hat", "Party Cone", 250, "common", "cone"),
    CosmeticItem("hat_propeller", "hat", "Propeller Cap", 350, "common", "propeller"),
    CosmeticItem("hat_viking", "hat", "Viking Helm", 600, "rare", "viking"),
    CosmeticItem("hat_sombrero", "hat", "Sombrero", 650, "rare", "sombrero"),
    CosmeticItem("hat_halo", "hat", "Detention Halo", 800, "epic", "halo"),
    CosmeticItem("hat_headset", "hat", "Gamer Headset", 800, "epic", "headset"),
    CosmeticItem("hat_tophat", "hat", "Rektor's Top Hat", 900, "epic", "tophat"),
    CosmeticItem("hat_alien", "hat", "Alien Antenna", 1000, "epic", "antenna"),
    CosmeticItem("hat_wizard", "hat", "Prüfungs-Magier", 1500, "legendary", "wizard"),
    CosmeticItem("hat_crown", "hat", "Class President Crown", 2000, "legendary", "crown"),
    # --- titles ---
    CosmeticItem("title_newkid", "title", "New Kid", 0, "common", "New Kid|#9fb3c8", True),
    CosmeticItem("title_monitor", "title", "Hall Monitor", 250, "common", "Hall Monitor|#7fd0ff"),
    CosmeticItem("title_hausmeister", "title", "Hausmeister", 400, "common", "Hausmeister|#b0a08a"),
    CosmeticItem("title_pet", "title", "Teacher's Pet", 500, "rare", "Teacher's Pet|#ffb3d9"),
    CosmeticItem("title_detention", "title", "Detention Regular", 550, "rare", "Detention Regular|#ff6b4a"),
    CosmeticItem("title_honor", "title", "Honor Roll", 700, "rare", "Honor Roll|#7dff9e"),
    CosmeticItem("title_speedrun", "title", "Speedrunner", 900, "epic", "Speedrunner|#19e6ff"),
    CosmeticItem("title_vip", "title", "VIP", 1000, "epic", "VIP|#ffd24a"),
    CosmeticItem("title_veteran", "title", "Backrooms Veteran", 1200, "epic", "Backrooms Veteran|#c9a227"),
    CosmeticItem("title_king", "title", "Pausenkönig", 1800, "legendary", "Pausenkönig|#ffd24a"),
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
