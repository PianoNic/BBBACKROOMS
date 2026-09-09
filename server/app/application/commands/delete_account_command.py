from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.delete_account_result_dto import DeleteAccountResultDto
from app.domain.accounts.account_repository import IAccountRepository


@dataclass
class DeleteAccountCommand(ICommand[DeleteAccountResultDto]):
    session_token: str | None


class DeleteAccountHandler(ICommandHandler[DeleteAccountCommand, DeleteAccountResultDto]):
    def __init__(
        self,
        token_service: ITokenService,
        accounts: IAccountRepository,
        engine: IDatabaseAvailability,
    ) -> None:
        self._token_service = token_service
        self._accounts = accounts
        self._engine = engine

    async def handle(self, command: DeleteAccountCommand) -> DeleteAccountResultDto:
        account_id = self._token_service.read_account_id(command.session_token, "session")
        if account_id is None:
            return DeleteAccountResultDto(status="unauthenticated")
        if not self._engine.is_available:
            return DeleteAccountResultDto(status="unavailable")
        await self._accounts.delete(account_id)
        return DeleteAccountResultDto(status="ok")
