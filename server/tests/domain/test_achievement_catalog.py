from app.domain.achievements.achievement_catalog import _ITEMS, AchievementCatalog


def test_ids_are_unique():
    ids = [a.id for a in _ITEMS]
    assert len(ids) == len(set(ids))


def test_to_dto_keys_and_saved_flag():
    catalog = AchievementCatalog()
    dto = catalog.to_dto("ach_erste_schicht", True)
    assert list(dto.keys()) == ["id", "name", "description", "coins", "icon", "saved"]
    assert dto["saved"] is True

    dto_unsaved = catalog.to_dto("ach_erste_schicht", False)
    assert dto_unsaved["saved"] is False


def test_get_returns_none_for_unknown_id():
    catalog = AchievementCatalog()
    assert catalog.get("nope") is None
