import logging
from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.oauth_provider_factory import IOAuthProviderFactory
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.oauth_callback_dto import OAuthCallbackDto
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.accounts.profile_repository import IProfileRepository
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy

log = logging.getLogger("nachsitzen.auth")


@dataclass
class CompleteOAuthLoginCommand(ICommand[OAuthCallbackDto]):
    provider: str
    code: str | None
    state: str | None
    oauth_token: str | None


class CompleteOAuthLoginHandler(ICommandHandler[CompleteOAuthLoginCommand, OAuthCallbackDto]):
    def __init__(
        self,
        provider_factory: IOAuthProviderFactory,
        token_service: ITokenService,
        accounts: IAccountRepository,
        profiles: IProfileRepository,
        blocked_subject_policy: BlockedSubjectPolicy,
        engine: IDatabaseAvailability,
    ) -> None:
        self._provider_factory = provider_factory
        self._token_service = token_service
        self._accounts = accounts
        self._profiles = profiles
        self._blocked_subject_policy = blocked_subject_policy
        self._engine = engine

    async def handle(self, command: CompleteOAuthLoginCommand) -> OAuthCallbackDto:
        provider = self._provider_factory.get(command.provider)
        if provider is None or not self._engine.is_available:
            return OAuthCallbackDto(status="error")
        body = self._token_service.verify(command.oauth_token or "")
        if (
            body is None
            or body.get("kind") != "oauth"
            or body.get("provider") != command.provider
            or not command.code
            or not command.state
            or body.get("state") != command.state
        ):
            return OAuthCallbackDto(status="error")
        try:
            token_resp = await provider.exchange_code(command.code, body["verifier"])
            identity = await provider.fetch_userinfo(token_resp["access_token"])
            if not identity.subject:
                return OAuthCallbackDto(status="error")
            if self._blocked_subject_policy.is_blocked(command.provider, identity.subject):
                return OAuthCallbackDto(status="blocked")
            acct = await self._accounts.upsert(command.provider, identity.subject, identity.display_name)
            await self._profiles.ensure(acct.id)
        except Exception as exc:  # noqa: BLE001
            log.warning("OAuth callback failed (%s): %s", command.provider, exc)
            return OAuthCallbackDto(status="error")
        return OAuthCallbackDto(status="ok", session_token=self._token_service.issue_session(acct.id))
