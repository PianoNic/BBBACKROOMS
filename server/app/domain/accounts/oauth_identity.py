from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class OAuthIdentity:
    subject: str
    display_name: str | None
