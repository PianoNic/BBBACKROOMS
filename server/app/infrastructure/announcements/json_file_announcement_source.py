from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Callable

from pydantic import ValidationError

from app.application.abstractions.announcement_source import IAnnouncementSource
from app.application.dtos.announcement_dto import AnnouncementDto

_log = logging.getLogger("nachsitzen")

CACHE_TTL_SECONDS = 60.0


class JsonFileAnnouncementSource(IAnnouncementSource):
    def __init__(self, path: str, clock: Callable[[], float] = time.monotonic) -> None:
        self._path = path
        self._clock = clock
        self._cached: list[AnnouncementDto] | None = None
        self._cached_at: float = 0.0

    async def load(self) -> list[AnnouncementDto]:
        now = self._clock()
        if self._cached is not None and (now - self._cached_at) < CACHE_TTL_SECONDS:
            return self._cached
        result = self._read()
        self._cached = result
        self._cached_at = now
        return result

    def _read(self) -> list[AnnouncementDto]:
        if not self._path:
            return []
        file_path = Path(self._path)
        if not file_path.is_file():
            _log.warning("announcements file not found: %s", file_path)
            return []
        try:
            raw = file_path.read_text(encoding="utf-8")
        except OSError:
            _log.warning("announcements file could not be read: %s", file_path)
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            _log.warning("announcements file contains invalid JSON: %s", file_path)
            return []
        if not isinstance(data, list):
            _log.warning("announcements file top level is not a list: %s", file_path)
            return []
        entries: list[AnnouncementDto] = []
        for entry in data:
            try:
                entries.append(AnnouncementDto.model_validate(entry))
            except ValidationError:
                _log.warning("announcements file has an invalid entry: %s", file_path)
        entries.sort(key=lambda entry: entry.date, reverse=True)
        entries.sort(key=lambda entry: not entry.pinned)
        return entries
