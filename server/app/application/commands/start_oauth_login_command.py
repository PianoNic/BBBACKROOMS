import secrets
from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.oauth_provider_factory import IOAuthProviderFactory
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.oauth_login_dto import OAuthLoginDto
from app.domain.security.pkce_generator import PkceGenerator

OAUTH_TTL = 600


@dataclass
class StartOAuthLoginCommand(ICommand[OAuthLoginDto]):
    provider: str


class StartOAuthLoginHandler(ICommandHandler[StartOAuthLoginCommand, OAuthLoginDto]):
    def __init__(
        self,
        provider_factory: IOAuthProviderFactory,
        token_service: ITokenService,
        pkce_generator: PkceGenerator,
    ) -> None:
        self._provider_factory = provider_factory
        self._token_service = token_service
        self._pkce_generator = pkce_generator

    async def handle(self, command: StartOAuthLoginCommand) -> OAuthLoginDto:
        provider = self._provider_factory.get(command.provider)
        if provider is None:
            return OAuthLoginDto(authorize_url=None, oauth_token=None)
        state = secrets.token_urlsafe(16)
        pkce = self._pkce_generator.create()
        oauth_token = self._token_service.issue(
            {
                "kind": "oauth",
                "provider": command.provider,
                "state": state,
                "verifier": pkce.verifier,
            },
            OAUTH_TTL,
        )
        return OAuthLoginDto(
            authorize_url=provider.authorize_url(state, pkce.challenge),
            oauth_token=oauth_token,
        )
