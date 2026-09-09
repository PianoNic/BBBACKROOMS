from __future__ import annotations


class BlockedSubjectPolicy:
    def __init__(self, blocked: frozenset[str]) -> None:
        self._blocked = blocked

    @staticmethod
    def parse(raw: str) -> frozenset[str]:
        entries: set[str] = set()
        for chunk in raw.split(","):
            chunk = chunk.strip()
            if not chunk or ":" not in chunk:
                continue
            provider, subject = chunk.split(":", 1)
            provider = provider.strip()
            subject = subject.strip()
            if not provider or not subject:
                continue
            entries.add(f"{provider.lower()}:{subject}")
        return frozenset(entries)

    @classmethod
    def from_raw(cls, raw: str) -> "BlockedSubjectPolicy":
        return cls(cls.parse(raw))

    def is_blocked(self, provider: str, subject: str) -> bool:
        return f"{provider.lower().strip()}:{subject.strip()}" in self._blocked
