from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PkcePair:
    verifier: str
    challenge: str
