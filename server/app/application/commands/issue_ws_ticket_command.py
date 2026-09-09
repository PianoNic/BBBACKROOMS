from dataclasses import dataclass

from mediatorx import ICommand, ICommandHandler

from app.application.abstractions.database_availability import IDatabaseAvailability
from app.application.abstractions.token_service import ITokenService
from app.application.dtos.ws_ticket_result_dto import WsTicketResultDto
from app.domain.accounts.account_repository import IAccountRepository
from app.domain.security.blocked_subject_policy import BlockedSubjectPolicy


@dataclass
class IssueWsTicketCommand(ICommand[WsTicketResultDto]):
    session_token: str | None


class IssueWsTicketHandler(ICommandHandler[IssueWsTicketCommand, WsTicketResultDto]):
    def __init__(
        self,
        token_service: ITokenService,
        accounts: IAccountRepository,
        blocked_subject_policy: BlockedSubjectPolicy,
        engine: IDatabaseAvailability,
    ) -> None:
        self._token_service = token_service
        self._accounts = accounts
        self._blocked_subject_policy = blocked_subject_policy
        self._engine = engine

    async def handle(self, command: IssueWsTicketCommand) -> WsTicketResultDto:
        account_id = self._token_service.read_account_id(command.session_token, "session")
        if account_id is None:
            return WsTicketResultDto(status="unauthenticated")
        if self._engine.is_available:
            acct = await self._accounts.get(account_id)
            if acct is not None and self._blocked_subject_policy.is_blocked(acct.provider, acct.provider_subject):
                return WsTicketResultDto(status="blocked")
        return WsTicketResultDto(status="ok", ticket=self._token_service.issue_ws_ticket(account_id))
