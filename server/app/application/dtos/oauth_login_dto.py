from pydantic import BaseModel


class OAuthLoginDto(BaseModel):
    authorize_url: str | None
    oauth_token: str | None
