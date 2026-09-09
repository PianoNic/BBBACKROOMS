from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.dtos.lobby_summary_dto import LobbySummaryDto
from app.domain.lobbies.lobby_registry import ILobbyRegistry


@dataclass
class ListLobbiesQuery(IQuery[list[LobbySummaryDto]]):
    pass


class ListLobbiesHandler(IQueryHandler[ListLobbiesQuery, list[LobbySummaryDto]]):
    def __init__(self, lobbies: ILobbyRegistry) -> None:
        self._lobbies = lobbies

    async def handle(self, query: ListLobbiesQuery) -> list[LobbySummaryDto]:
        return [
            LobbySummaryDto(
                id=l.id, name=l.name,
                players=len(l.conns), max_players=l.max_players,
                has_password=l.password is not None,
                status=l.status,
            )
            for l in self._lobbies.list()
        ]
