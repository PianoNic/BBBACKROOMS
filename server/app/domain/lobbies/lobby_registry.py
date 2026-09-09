from __future__ import annotations

from abc import ABC, abstractmethod

from app.domain.lobbies.lobby import Lobby


class ILobbyRegistry(ABC):
    @abstractmethod
    def create(self, name: str, *, max_players: int = 8, password: str | None = None) -> Lobby: ...

    @abstractmethod
    def get(self, lobby_id: str) -> Lobby | None: ...

    @abstractmethod
    def list(self) -> list[Lobby]: ...

    @abstractmethod
    def delete(self, lobby_id: str) -> None: ...
