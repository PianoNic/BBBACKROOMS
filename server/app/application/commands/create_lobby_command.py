from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.create_lobby_result_dto import CreateLobbyResultDto
from app.application.dtos.created_lobby_dto import CreatedLobbyDto
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.lobbies.lobby_registry import ILobbyRegistry
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy


@dataclass
class CreateLobbyCommand(ICommand[CreateLobbyResultDto]):
    session_token: str | None
    name: str
    max_players: int
    password: str | None


class CreateLobbyHandler(ICommandHandler[CreateLobbyCommand, CreateLobbyResultDto]):
    def __init__(
        self,
        token_service: ITokenService,
        accounts: IAccountRepository,
        blocked_subject_policy: BlockedSubjectPolicy,
        engine: IDatabaseAvailability,
        lobbies: ILobbyRegistry,
    ) -> None:
        self._token_service = token_service
        self._accounts = accounts
        self._blocked_subject_policy = blocked_subject_policy
        self._engine = engine
        self._lobbies = lobbies

    async def handle(self, command: CreateLobbyCommand) -> CreateLobbyResultDto:
        account_id = self._token_service.read_account_id(command.session_token, "session")
        if account_id is not None and self._engine.is_available:
            account = await self._accounts.get(account_id)
            if account is not None and self._blocked_subject_policy.is_blocked(
                account.provider, account.provider_subject,
            ):
                return CreateLobbyResultDto(status="blocked")
        lobby = self._lobbies.create(command.name, max_players=command.max_players, password=command.password)
        return CreateLobbyResultDto(
            status="ok",
            lobby=CreatedLobbyDto(
                id=lobby.id, name=lobby.name,
                players=0, max_players=lobby.max_players,
                has_password=lobby.password is not None,
            ),
        )
