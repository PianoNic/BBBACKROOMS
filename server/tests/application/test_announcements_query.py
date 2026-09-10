from __future__ import annotations

from app.application.abstractions.announcement_source import IAnnouncementSource
from app.application.dtos.announcement_dto import AnnouncementDto
from app.application.queries.get_announcements_query import GetAnnouncementsHandler, GetAnnouncementsQuery


class FakeAnnouncementSource(IAnnouncementSource):
    def __init__(self, entries: list[AnnouncementDto]) -> None:
        self._entries = entries

    async def load(self) -> list[AnnouncementDto]:
        return self._entries


async def test_handler_returns_entries_from_source():
    entries = [
        AnnouncementDto(id="1", date="2026-01-01", title="Maintenance", body="Server offline tonight."),
    ]
    handler = GetAnnouncementsHandler(FakeAnnouncementSource(entries))

    result = await handler.handle(GetAnnouncementsQuery())

    assert result == entries


async def test_handler_returns_empty_list_when_source_is_empty():
    handler = GetAnnouncementsHandler(FakeAnnouncementSource([]))

    result = await handler.handle(GetAnnouncementsQuery())

    assert result == []
