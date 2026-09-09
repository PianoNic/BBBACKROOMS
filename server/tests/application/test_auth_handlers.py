from urllib.parse import parse_qs, urlparse

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.oauth_provider import IOAuthProvider
from app.application.abstractions.oauth_provider_factory import IOAuthProviderFactory
from app.application.commands.complete_oauth_login_command import (
    CompleteOAuthLoginCommand,
    CompleteOAuthLoginHandler,
)
from app.application.commands.delete_account_command import DeleteAccountCommand, DeleteAccountHandler
from app.application.commands.issue_ws_ticket_command import IssueWsTicketCommand, IssueWsTicketHandler
from app.application.commands.start_oauth_login_command import StartOAuthLoginCommand, StartOAuthLoginHandler
from app.application.dtos.account_dto import AccountDto
from app.application.dtos.current_account_dto import CurrentAccountDto
from app.application.dtos.oauth_login_dto import OAuthLoginDto
from app.application.dtos.oauth_providers_dto import OAuthProvidersDto
from app.application.queries.get_current_account_query import GetCurrentAccountHandler, GetCurrentAccountQuery
from app.application.queries.get_oauth_providers_query import GetOAuthProvidersHandler, GetOAuthProvidersQuery
from app.domain.accounts.oauth_identity import OAuthIdentity
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy
from app.domain.security.pkce_generator import PkceGenerator
from app.domain.progression.level_calculator import LevelCalculator
from app.infrastructure.persistence.repositories.peewee_account_repository import PeeweeAccountRepository
from app.infrastructure.persistence.repositories.peewee_profile_repository import PeeweeProfileRepository
from app.infrastructure.security.hmac_token_service import HmacTokenService


class UnavailableDatabase(IDatabaseAvailability):
    @property
    def is_available(self) -> bool:
        return False


class FakeOAuthProvider(IOAuthProvider):
    def __init__(
        self,
        provider_name: str,
        subject: str = "sub-clean",
        display_name: str | None = "Hans Ueli",
        raises: bool = False,
    ) -> None:
        self._name = provider_name
        self._subject = subject
        self._display_name = display_name
        self.raises = raises

    @property
    def name(self) -> str:
        return self._name

    def authorize_url(self, state: str, challenge: str) -> str:
        return f"https://provider.example/{self._name}/authorize?state={state}&challenge={challenge}"

    async def exchange_code(self, code: str, verifier: str) -> dict:
        if self.raises:
            raise RuntimeError("exchange failed")
        return {"access_token": "t"}

    async def fetch_userinfo(self, access_token: str) -> OAuthIdentity:
        return OAuthIdentity(subject=self._subject, display_name=self._display_name)


class FakeOAuthProviderFactory(IOAuthProviderFactory):
    def __init__(self, providers: dict[str, IOAuthProvider], enabled_map: dict[str, bool]) -> None:
        self._providers = providers
        self._enabled_map = enabled_map

    def get(self, name: str) -> IOAuthProvider | None:
        return self._providers.get(name)

    def enabled(self) -> dict[str, bool]:
        return dict(self._enabled_map)


def _token_service() -> HmacTokenService:
    return HmacTokenService(b"test-secret", 3600, 60)


async def test_get_oauth_providers_handler_returns_factory_enabled_mapping():
    factory = FakeOAuthProviderFactory({}, {"google": True, "microsoft": False})
    result = await GetOAuthProvidersHandler(factory).handle(GetOAuthProvidersQuery())
    assert result == OAuthProvidersDto(google=True, microsoft=False)


async def test_get_current_account_none_for_missing_token(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    handler = GetCurrentAccountHandler(_token_service(), accounts, profiles, LevelCalculator(), account_engine)

    result = await handler.handle(GetCurrentAccountQuery(None))
    assert result == CurrentAccountDto(account=None)


async def test_get_current_account_none_for_garbage_token(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    handler = GetCurrentAccountHandler(_token_service(), accounts, profiles, LevelCalculator(), account_engine)

    result = await handler.handle(GetCurrentAccountQuery("garbage"))
    assert result == CurrentAccountDto(account=None)


async def test_get_current_account_none_when_database_unavailable(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    handler = GetCurrentAccountHandler(token_service, accounts, profiles, LevelCalculator(), UnavailableDatabase())

    session_token = token_service.issue_session(1)
    result = await handler.handle(GetCurrentAccountQuery(session_token))
    assert result == CurrentAccountDto(account=None)


async def test_get_current_account_returns_dto_with_wire_contract(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    await profiles.apply_round_rewards(acct.id, 40, 10)
    handler = GetCurrentAccountHandler(token_service, accounts, profiles, LevelCalculator(), account_engine)

    session_token = token_service.issue_session(acct.id)
    result = await handler.handle(GetCurrentAccountQuery(session_token))

    assert isinstance(result.account, AccountDto)
    dumped = result.account.model_dump(by_alias=True)
    assert list(dumped.keys()) == [
        "accountId", "provider", "displayName", "xp", "coins", "level", "xpIntoLevel", "xpForNextLevel",
    ]
    assert "email" not in dumped


async def test_start_oauth_login_returns_empty_dto_for_unconfigured_provider():
    factory = FakeOAuthProviderFactory({}, {"google": False, "microsoft": False})
    handler = StartOAuthLoginHandler(factory, _token_service(), PkceGenerator())

    result = await handler.handle(StartOAuthLoginCommand("google"))
    assert result == OAuthLoginDto(authorize_url=None, oauth_token=None)


async def test_start_oauth_login_returns_authorize_url_and_matching_state():
    token_service = _token_service()
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    handler = StartOAuthLoginHandler(factory, token_service, PkceGenerator())

    result = await handler.handle(StartOAuthLoginCommand("google"))

    assert result.authorize_url is not None
    claims = token_service.verify(result.oauth_token)
    assert claims["kind"] == "oauth"
    assert claims["provider"] == "google"

    query = parse_qs(urlparse(result.authorize_url).query)
    assert query["state"] == [claims["state"]]


def _oauth_cookie(token_service: HmacTokenService, provider: str, state: str, verifier: str = "v") -> str:
    return token_service.issue(
        {"kind": "oauth", "provider": provider, "state": state, "verifier": verifier}, 600,
    )


async def test_complete_oauth_login_error_for_unknown_provider(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    factory = FakeOAuthProviderFactory({}, {"google": False, "microsoft": False})
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts, profiles, BlockedSubjectPolicy(frozenset()), account_engine,
    )

    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "state", None))
    assert result.status == "error"


async def test_complete_oauth_login_error_when_database_unavailable():
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    token_service = _token_service()
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts=None, profiles=None,
        blocked_subject_policy=BlockedSubjectPolicy(frozenset()), engine=UnavailableDatabase(),
    )

    oauth_token = _oauth_cookie(token_service, "google", "st")
    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", oauth_token))
    assert result.status == "error"


async def test_complete_oauth_login_error_for_missing_or_garbage_cookie(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts, profiles, BlockedSubjectPolicy(frozenset()), account_engine,
    )

    missing = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", None))
    garbage = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", "garbage"))
    assert missing.status == "error"
    assert garbage.status == "error"


async def test_complete_oauth_login_error_for_state_mismatch(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts, profiles, BlockedSubjectPolicy(frozenset()), account_engine,
    )

    oauth_token = _oauth_cookie(token_service, "google", "expected-state")
    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "other-state", oauth_token))
    assert result.status == "error"


async def test_complete_oauth_login_error_for_missing_code(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts, profiles, BlockedSubjectPolicy(frozenset()), account_engine,
    )

    oauth_token = _oauth_cookie(token_service, "google", "st")
    result = await handler.handle(CompleteOAuthLoginCommand("google", None, "st", oauth_token))
    assert result.status == "error"


async def test_complete_oauth_login_error_when_provider_raises(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google", raises=True)
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    handler = CompleteOAuthLoginHandler(
        factory, token_service, accounts, profiles, BlockedSubjectPolicy(frozenset()), account_engine,
    )

    oauth_token = _oauth_cookie(token_service, "google", "st")
    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", oauth_token))
    assert result.status == "error"


async def test_complete_oauth_login_blocked_creates_no_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google", subject="sub-blocked")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    handler = CompleteOAuthLoginHandler(factory, token_service, accounts, profiles, policy, account_engine)

    oauth_token = _oauth_cookie(token_service, "google", "st")
    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", oauth_token))

    assert result.status == "blocked"
    from app.infrastructure.persistence.models import Account
    assert list(await Account.select().aio_execute()) == []


async def test_complete_oauth_login_ok_for_clean_subject(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    profiles = PeeweeProfileRepository(account_engine)
    token_service = _token_service()
    provider = FakeOAuthProvider("google", subject="sub-clean")
    factory = FakeOAuthProviderFactory({"google": provider}, {"google": True, "microsoft": False})
    policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    handler = CompleteOAuthLoginHandler(factory, token_service, accounts, profiles, policy, account_engine)

    oauth_token = _oauth_cookie(token_service, "google", "st")
    result = await handler.handle(CompleteOAuthLoginCommand("google", "code", "st", oauth_token))

    assert result.status == "ok"
    new_account = await accounts.upsert("google", "sub-clean", "Hans Ueli")
    assert token_service.read_account_id(result.session_token, "session") == new_account.id


async def test_delete_account_unauthenticated_checked_before_availability():
    handler = DeleteAccountHandler(_token_service(), accounts=None, engine=UnavailableDatabase())
    result = await handler.handle(DeleteAccountCommand(None))
    assert result.status == "unauthenticated"


async def test_delete_account_unavailable_when_database_down():
    token_service = _token_service()
    handler = DeleteAccountHandler(token_service, accounts=None, engine=UnavailableDatabase())
    session_token = token_service.issue_session(1)
    result = await handler.handle(DeleteAccountCommand(session_token))
    assert result.status == "unavailable"


async def test_delete_account_ok_removes_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    token_service = _token_service()
    acct = await accounts.upsert("google", "sub-1", "Hans Ueli")
    handler = DeleteAccountHandler(token_service, accounts, account_engine)

    session_token = token_service.issue_session(acct.id)
    result = await handler.handle(DeleteAccountCommand(session_token))

    assert result.status == "ok"
    assert await accounts.get(acct.id) is None


async def test_issue_ws_ticket_unauthenticated_with_no_token(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    handler = IssueWsTicketHandler(_token_service(), accounts, BlockedSubjectPolicy(frozenset()), account_engine)

    result = await handler.handle(IssueWsTicketCommand(None))
    assert result.status == "unauthenticated"


async def test_issue_ws_ticket_blocked_for_blocked_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    token_service = _token_service()
    policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    acct = await accounts.upsert("google", "sub-blocked", "Hans Ueli")
    handler = IssueWsTicketHandler(token_service, accounts, policy, account_engine)

    session_token = token_service.issue_session(acct.id)
    result = await handler.handle(IssueWsTicketCommand(session_token))
    assert result.status == "blocked"


async def test_issue_ws_ticket_ok_for_clean_account(account_engine):
    accounts = PeeweeAccountRepository(account_engine)
    token_service = _token_service()
    policy = BlockedSubjectPolicy(frozenset({"google:sub-blocked"}))
    acct = await accounts.upsert("google", "sub-clean", "Hans Ueli")
    handler = IssueWsTicketHandler(token_service, accounts, policy, account_engine)

    session_token = token_service.issue_session(acct.id)
    result = await handler.handle(IssueWsTicketCommand(session_token))

    assert result.status == "ok"
    assert token_service.read_account_id(result.ticket, "ws") == acct.id
