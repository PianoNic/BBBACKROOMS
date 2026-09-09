from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.abstractions.ice_server_provider import IIceServerProvider


@dataclass
class GetIceServersQuery(IQuery[dict]):
    pass


class GetIceServersHandler(IQueryHandler[GetIceServersQuery, dict]):
    def __init__(self, ice_server_provider: IIceServerProvider) -> None:
        self._ice_server_provider = ice_server_provider

    async def handle(self, query: GetIceServersQuery) -> dict:
        return await self._ice_server_provider.get_ice_servers()
