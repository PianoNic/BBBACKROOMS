# Accounts & OAuth login (optional)

Login is **optional**. Guests play with a random name; signing in (Google or
Microsoft) links the session to an account so XP / level / coins / cosmetics
persist. With no provider configured, the login buttons simply don't appear and
everything else works unchanged.

## How it works
- Authorization-Code + PKCE flow, hand-rolled with `httpx`
  (`app/infrastructure/oauth/`, behind the `IOAuthProvider` abstraction).
- Identity comes from the provider **userinfo** endpoint (we don't verify ID-token
  signatures — the token exchange already happened over TLS with our secret).
- Session = a signed, HMAC-SHA256 cookie
  (`app/infrastructure/security/hmac_token_service.py`, stdlib only).
- The WebSocket is linked to the account via a short-lived **ws-ticket** the
  client fetches from `/auth/ws-ticket` and passes as `?token=` on connect.

### Endpoints (`app/presentation/controllers/auth_controller.py`)

Each route is a thin mapping from HTTP to a mediatorx command or query in
`app/application/`; the handlers know nothing about cookies or status codes.

| Route | Purpose |
| --- | --- |
| `GET /auth/providers` | Which login buttons to show (`{google, microsoft}`). |
| `GET /auth/{provider}/login` | Redirect to the provider. |
| `GET /auth/{provider}/callback` | Provider returns here; sets the session cookie. |
| `GET /auth/me` | Current account + progress, or `{account: null}`. |
| `POST /auth/logout` | Clear the session cookie. |
| `DELETE /auth/account` | Delete the account and all its progress; clears the session cookie. |
| `GET /auth/ws-ticket` | Short-lived token to authenticate the WebSocket. |

## Configuration
Set these in `.env` (see `.env.example`). Empty client id/secret disables that
provider.

| Variable | Notes |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console. |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | From Microsoft Entra. |
| `MICROSOFT_TENANT` | `common` (personal + any-org accounts). |
| `OAUTH_REDIRECT_BASE` | Public base URL of the backend (`http://localhost:8000` dev, `https://backrooms-baden.ch` production). |
| `FRONTEND_URL` | SPA origin the callback returns to; also the CORS origin (`http://localhost:5173` dev, `https://backrooms-baden.ch` production). |
| `SESSION_SECRET` | 32+ random bytes in production; empty = ephemeral dev key. |
| `SESSION_COOKIE_SECURE` | `true` behind HTTPS, `false` for localhost. |
| `BLOCKED_SUBJECTS` | Comma-separated `provider:subject` pairs that may not sign in or host. Empty = nobody blocked. |

**Redirect URIs to register** (must match `OAUTH_REDIRECT_BASE` exactly):
- Dev: `http://localhost:8000/auth/google/callback`
- Dev: `http://localhost:8000/auth/microsoft/callback`
- Production: `https://backrooms-baden.ch/auth/google/callback`
- Production: `https://backrooms-baden.ch/auth/microsoft/callback`

`http://localhost` is accepted for dev by both providers.

## Registering the apps

### Google (Google Cloud Console)
1. Sign in to <https://console.cloud.google.com> and pick/create a project.
2. **Google Auth platform → Branding**: set app name + support email; **Audience**: External; add a contact email.
3. **Data Access**: add scopes `openid`, `profile` (non-sensitive — no verification needed).
4. **Audience → Test users**: add your own email while in "Testing".
5. **Clients → Create client → Web application**: add both the dev and production Google redirect URIs above.
6. Copy the **Client ID** and **Client secret** (secret shown once) → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Microsoft (Microsoft Entra admin center)
1. Sign in to <https://entra.microsoft.com>.
2. **App registrations → New registration**. Supported account types: **Any org directory + personal Microsoft accounts** (→ tenant `common`).
3. Add **Web** redirect URIs (both the dev and production Microsoft ones above) and **Register**.
4. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`.
5. **Certificates & secrets → New client secret**: copy the secret **Value** (shown once) → `MICROSOFT_CLIENT_SECRET`.
6. **API permissions**: Microsoft Graph delegated `openid`, `profile`, `User.Read` (default).

> The sign-in steps and the one-time secret reveal require you to be logged into
> your own Google/Microsoft account — there's no way around that. The rest is
> form-filling.

## Security notes
- CORS switches from `*` to `FRONTEND_URL` with credentials (required for cookies).
- Session cookies are `HttpOnly`, `SameSite=Lax`; set `SESSION_COOKIE_SECURE=true` on HTTPS.
- Accounts are keyed by `(provider, provider_subject)` — the same person on Google
  and Microsoft is two accounts (no auto-merge in v1).
- The OIDC request asks only for `openid profile`; no email address is ever requested or stored.
- The `account` row holds only `id`, `provider`, `provider_subject`, `display_name`, `created_at` — `display_name` is the default in-game name. Everything else lives in `profile` / `cosmetic_*` / `achievement_unlock`.

## Blocking an account
To stop a specific person from signing in or hosting a lobby, find their
`(provider, provider_subject)` pair on the database:

```sql
SELECT provider, provider_subject, display_name FROM account ORDER BY created_at DESC;
```

Then set `BLOCKED_SUBJECTS=google:1234567890,microsoft:abcd` in `.env`
(comma-separated, `provider:subject`, provider lowercase, subject exactly as
stored). **Restart the server** — the list is read once at startup.

Effect: the OAuth callback refuses the login (no session cookie, browser
returns to `?login=blocked`, the title screen shows a German notice with the
contact address kontakt@backrooms-baden.ch); `GET /auth/ws-ticket` answers
`403`, so the WebSocket falls back to an unauthenticated guest connection;
`POST /lobbies` answers `403` for a blocked session, so a blocked account
cannot host.

**Limitation:** guests have no account, so a blocked person can still play as
a guest under a random name. Blocking is per account only; kicking or banning
a guest is not implemented and stays a per-lobby / manual matter.

## Deleting an account
The profile panel on the server-browser screen shows a **KONTO LÖSCHEN** button
while signed in. It calls `DELETE /auth/account`, which removes the `account`
row together with its `profile`, `cosmetic_ownership`, `cosmetic_equipped` and
`achievement_unlock` rows, then clears the session cookie. Signing in again
creates a brand-new, empty account.

By hand on the database:

```sql
DELETE FROM account WHERE provider = 'google' AND provider_subject = '<sub>';
```
