from app.domain.cosmetics.cosmetic_catalog import CATEGORIES, CosmeticCatalog


def test_every_default_item_is_free_and_marked_default():
    catalog = CosmeticCatalog()
    for category, cosmetic_id in catalog.default_equipped().items():
        item = catalog.get(cosmetic_id)
        assert item is not None
        assert item.default is True
        assert item.price == 0
        assert item.category == category


def test_default_equipped_has_at_most_one_entry_per_category():
    catalog = CosmeticCatalog()
    equipped = catalog.default_equipped()
    assert set(equipped.keys()).issubset(set(CATEGORIES))
    assert len(equipped) == len({it.category for it in catalog.items() if it.default})


def test_get_returns_none_for_missing_or_none_id():
    catalog = CosmeticCatalog()
    assert catalog.get(None) is None
    assert catalog.get("nope") is None


def test_validate_equipped_drops_wrong_category_and_unknown_id():
    catalog = CosmeticCatalog()
    default_body = catalog.default_equipped()["body"]
    result = catalog.validate_equipped({
        "body": default_body,
        "hat": default_body,
        "title": "nope",
    })
    assert result == {"body": default_body}


def test_to_dto_keys_and_length():
    catalog = CosmeticCatalog()
    dtos = catalog.to_dto()
    assert len(dtos) == len(catalog.items())
    for dto in dtos:
        assert list(dto.keys()) == ["id", "category", "name", "price", "rarity", "assetRef", "default"]


def test_every_item_category_is_known_and_ids_are_unique():
    catalog = CosmeticCatalog()
    items = catalog.items()
    ids = [it.id for it in items]
    assert len(ids) == len(set(ids))
    for it in items:
        assert it.category in CATEGORIES
