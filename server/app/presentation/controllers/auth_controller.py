from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse
from mediatorx import Mediator

from app.application.commands.complete_oauth_login_command import CompleteOAuthLoginCommand
from app.application.commands.delete_account_command import DeleteAccountCommand
from app.application.commands.issue_ws_ticket_command import IssueWsTicketCommand
from app.application.commands.start_oauth_login_command import StartOAuthLoginCommand
from app.application.dtos.current_account_dto import CurrentAccountDto
from app.application.dtos.oauth_providers_dto import OAuthProvidersDto
from app.application.queries.get_current_account_query import GetCurrentAccountQuery
from app.application.queries.get_oauth_providers_query import GetOAuthProvidersQuery
from app.infrastructure.configuration.settings import settings
from app.presentation.controller import controller
from app.presentation.dependencies import get_mediator

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE = "bbb_session"
OAUTH_COOKIE = "bbb_oauth"
OAUTH_TTL = 600


def _set_cookie(resp, name: str, value: str, max_age: int) -> None:
    resp.set_cookie(
        name, value, max_age=max_age, httponly=True,
        secure=settings.session_cookie_secure, samesite="lax", path="/",
    )


def _frontend_redirect(status: str) -> RedirectResponse:
    sep = "&" if "?" in settings.frontend_url else "?"
    target = f"{settings.frontend_url}{sep}login={status}"
    return RedirectResponse(target, status_code=302)


@controller(router)
class AuthController:
    mediator: Mediator = Depends(get_mediator)

    @router.get("/providers", response_model=OAuthProvidersDto)
    async def providers(self) -> OAuthProvidersDto:
        return await self.mediator.send(GetOAuthProvidersQuery())

    @router.get("/{provider}/login")
    async def login(self, provider: str):
        result = await self.mediator.send(StartOAuthLoginCommand(provider))
        if result.authorize_url is None:
            return JSONResponse({"error": "provider not configured"}, status_code=404)
        resp = RedirectResponse(result.authorize_url, status_code=302)
        _set_cookie(resp, OAUTH_COOKIE, result.oauth_token, OAUTH_TTL)
        return resp

    @router.get("/{provider}/callback")
    async def callback(self, provider: str, request: Request, code: str | None = None, state: str | None = None):
        result = await self.mediator.send(CompleteOAuthLoginCommand(
            provider=provider,
            code=code,
            state=state,
            oauth_token=request.cookies.get(OAUTH_COOKIE),
        ))
        if result.status == "error":
            resp = _frontend_redirect("error")
            resp.delete_cookie(OAUTH_COOKIE, path="/")
            return resp
        if result.status == "blocked":
            resp = _frontend_redirect("blocked")
            resp.delete_cookie(OAUTH_COOKIE, path="/")
            return resp
        resp = _frontend_redirect("ok")
        resp.delete_cookie(OAUTH_COOKIE, path="/")
        _set_cookie(resp, SESSION_COOKIE, result.session_token, settings.session_ttl_seconds)
        return resp

    @router.get("/me", response_model=CurrentAccountDto)
    async def me(self, request: Request) -> CurrentAccountDto:
        return await self.mediator.send(GetCurrentAccountQuery(request.cookies.get(SESSION_COOKIE)))

    @router.post("/logout")
    async def logout(self):
        resp = JSONResponse({"ok": True})
        resp.delete_cookie(SESSION_COOKIE, path="/")
        return resp

    @router.delete("/account")
    async def delete_account(self, request: Request):
        result = await self.mediator.send(DeleteAccountCommand(request.cookies.get(SESSION_COOKIE)))
        if result.status == "unauthenticated":
            return JSONResponse({"error": "not authenticated"}, status_code=401)
        if result.status == "unavailable":
            return JSONResponse({"error": "database unavailable"}, status_code=503)
        resp = Response(status_code=204)
        resp.delete_cookie(SESSION_COOKIE, path="/")
        return resp

    @router.get("/ws-ticket")
    async def ws_ticket(self, request: Request):
        result = await self.mediator.send(IssueWsTicketCommand(request.cookies.get(SESSION_COOKIE)))
        if result.status == "unauthenticated":
            return JSONResponse({"error": "not authenticated"}, status_code=401)
        if result.status == "blocked":
            return JSONResponse({"error": "account blocked"}, status_code=403)
        return {"ticket": result.ticket}
