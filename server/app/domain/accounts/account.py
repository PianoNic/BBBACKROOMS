from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Account:
    id: int
    provider: str
    provider_subject: str
    display_name: str | None
