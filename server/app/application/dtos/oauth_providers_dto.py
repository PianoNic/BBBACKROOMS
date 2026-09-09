from pydantic import BaseModel


class OAuthProvidersDto(BaseModel):
    google: bool
    microsoft: bool
