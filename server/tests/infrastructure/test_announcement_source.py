from __future__ import annotations

import json
from pathlib import Path

from app.infrastructure.announcements.json_file_announcement_source import JsonFileAnnouncementSource


def _write(path: Path, data) -> None:
    path.write_text(json.dumps(data), encoding="utf-8")


async def test_returns_empty_list_when_path_is_unset():
    source = JsonFileAnnouncementSource("")

    result = await source.load()

    assert result == []


async def test_returns_empty_list_when_file_is_missing(tmp_path):
    source = JsonFileAnnouncementSource(str(tmp_path / "missing.json"))

    result = await source.load()

    assert result == []


async def test_returns_empty_list_on_invalid_json(tmp_path):
    file_path = tmp_path / "announcements.json"
    file_path.write_text("{not valid json", encoding="utf-8")
    source = JsonFileAnnouncementSource(str(file_path))

    result = await source.load()

    assert result == []


async def test_returns_empty_list_when_top_level_is_not_a_list(tmp_path):
    file_path = tmp_path / "announcements.json"
    _write(file_path, {"id": "1"})
    source = JsonFileAnnouncementSource(str(file_path))

    result = await source.load()

    assert result == []


async def test_skips_entry_with_wrong_types(tmp_path):
    file_path = tmp_path / "announcements.json"
    _write(file_path, [{"id": "1", "date": "2026-01-01", "title": 5, "body": "x"}])
    source = JsonFileAnnouncementSource(str(file_path))

    result = await source.load()

    assert result == []


async def test_valid_file_parses_and_sorts_pinned_first(tmp_path):
    file_path = tmp_path / "announcements.json"
    _write(
        file_path,
        [
            {"id": "1", "date": "2026-01-01", "title": "Old", "body": "old news"},
            {"id": "2", "date": "2026-02-01", "title": "New", "body": "new news"},
            {"id": "3", "date": "2026-01-15", "title": "Pinned", "body": "pinned news", "pinned": True},
        ],
    )
    source = JsonFileAnnouncementSource(str(file_path))

    result = await source.load()

    assert [entry.id for entry in result] == ["3", "2", "1"]


async def test_cache_is_reused_within_ttl(tmp_path):
    file_path = tmp_path / "announcements.json"
    _write(file_path, [{"id": "1", "date": "2026-01-01", "title": "First", "body": "first"}])
    clock = {"now": 0.0}
    source = JsonFileAnnouncementSource(str(file_path), clock=lambda: clock["now"])

    first = await source.load()
    _write(file_path, [{"id": "2", "date": "2026-01-02", "title": "Second", "body": "second"}])
    clock["now"] = 30.0
    second = await source.load()

    assert first == second
    assert [entry.id for entry in second] == ["1"]


async def test_cache_expires_after_ttl(tmp_path):
    file_path = tmp_path / "announcements.json"
    _write(file_path, [{"id": "1", "date": "2026-01-01", "title": "First", "body": "first"}])
    clock = {"now": 0.0}
    source = JsonFileAnnouncementSource(str(file_path), clock=lambda: clock["now"])

    await source.load()
    _write(file_path, [{"id": "2", "date": "2026-01-02", "title": "Second", "body": "second"}])
    clock["now"] = 61.0
    result = await source.load()

    assert [entry.id for entry in result] == ["2"]
