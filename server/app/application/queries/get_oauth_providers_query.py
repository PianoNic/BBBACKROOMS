from dataclasses import dataclass

from mediatorx import IQuery, IQueryHandler

from app.application.abstractions.oauth_provider_factory import IOAuthProviderFactory
from app.application.dtos.oauth_providers_dto import OAuthProvidersDto


@dataclass
class GetOAuthProvidersQuery(IQuery[OAuthProvidersDto]):
    pass


class GetOAuthProvidersHandler(IQueryHandler[GetOAuthProvidersQuery, OAuthProvidersDto]):
    def __init__(self, provider_factory: IOAuthProviderFactory) -> None:
        self._provider_factory = provider_factory

    async def handle(self, query: GetOAuthProvidersQuery) -> OAuthProvidersDto:
        enabled = self._provider_factory.enabled()
        return OAuthProvidersDto(google=enabled["google"], microsoft=enabled["microsoft"])
