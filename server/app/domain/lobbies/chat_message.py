from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ChatMessage:
    id: str
    author: str
    text: str
    ts: float
