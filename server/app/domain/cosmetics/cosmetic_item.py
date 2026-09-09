from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CosmeticItem:
    id: str
    category: str
    name: str
    price: int
    rarity: str  # common | rare | epic | legendary
    asset_ref: str
    default: bool = False
