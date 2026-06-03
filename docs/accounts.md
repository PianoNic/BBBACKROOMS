# Accounts & OAuth login (optional)

Login is **optional**. Guests play with a random name; signing in (Google or
Microsoft) links the session to an account so XP / level / coins / cosmetics
persist. With no provider configured, the login buttons simply don't appear and
everything else works unchanged.

## How it works
- Authorization-Code + PKCE flow, hand-rolled with `httpx` (`app/auth/oauth.py`).
- Identity comes from the provider **userinfo** endpoint (we don't verify ID-token
  signatures — the token exchange already happened over TLS with our secret).
- Session = a signed, HMAC-SHA256 cookie (`app/auth/tokens.py`, stdlib only).
- The WebSocket is linked to the account via a short-lived **ws-ticket** the
  client fetches from `/auth/ws-ticket` and passes as `?token=` on connect.

### Endpoints (`app/api/auth.py`)
| Route | Purpose |
| --- | --- |
| `GET /auth/providers` | Which login buttons to show (`{google, microsoft}`). |
| `GET /auth/{provider}/login` | Redirect to the provider. |
| `GET /auth/{provider}/callback` | Provider returns here; sets the session cookie. |
| `GET /auth/me` | Current account + progress, or `{account: null}`. |
| `POST /auth/logout` | Clear the session cookie. |
| `GET /auth/ws-ticket` | Short-lived token to authenticate the WebSocket. |

## Configuration
Set these in `.env` (see `.env.example`). Empty client id/secret disables that
provider.

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | From Microsoft Entra. |
| `MICROSOFT_TENANT` | `common` (personal + any-org accounts). |
| `OAUTH_REDIRECT_BASE` | Public base URL of the backend (`http://localhost:8000` dev). |
| `FRONTEND_URL` | SPA origin the callback returns to; also the CORS origin. |
| `SESSION_SECRET` | 32+ random bytes in production; empty = ephemeral dev key. |
| `SESSION_COOKIE_SECURE` | `true` behind HTTPS, `false` for localhost. |

**Redirect URIs to register** (must match `OAUTH_REDIRECT_BASE` exactly):
- `http://localhost:8000/auth/google/callback`
- `http://localhost:8000/auth/microsoft/callback`

`http://localhost` is accepted for dev by both providers.

## Registering the apps

### Google (Google Cloud Console)
1. Sign in to <https://console.cloud.google.com> and pick/create a project.
2. **Google Auth platform → Branding**: set app name + support email; **Audience**: External; add a contact email.
3. **Data Access**: add scopes `openid`, `email`, `profile` (non-sensitive — no verification needed).
4. **Audience → Test users**: add your own email while in "Testing".
5. **Clients → Create client → Web application**: add the Google redirect URI above.
6. Copy the **Client ID** and **Client secret** (secret shown once) → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Microsoft (Microsoft Entra admin center)
1. Sign in to <https://entra.microsoft.com>.
2. **App registrations → New registration**. Supported account types: **Any org directory + personal Microsoft accounts** (→ tenant `common`).
3. Add a **Web** redirect URI (the Microsoft one above) and **Register**.
4. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`.
5. **Certificates & secrets → New client secret**: copy the secret **Value** (shown once) → `MICROSOFT_CLIENT_SECRET`.
6. **API permissions**: Microsoft Graph delegated `openid`, `email`, `profile`, `User.Read` (default).

> The sign-in steps and the one-time secret reveal require you to be logged into
> your own Google/Microsoft account — there's no way around that. The rest is
> form-filling.

## Security notes
- CORS switches from `*` to `FRONTEND_URL` with credentials (required for cookies).
- Session cookies are `HttpOnly`, `SameSite=Lax`; set `SESSION_COOKIE_SECURE=true` on HTTPS.
- Accounts are keyed by `(provider, provider_subject)` — the same person on Google
  and Microsoft is two accounts (no auto-merge in v1).
