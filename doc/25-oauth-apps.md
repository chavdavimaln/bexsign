# 25 — OAuth Apps

Give an external application (an HR portal, a CRM, an internal service) its **own OAuth 2.0 credentials**. The
application exchanges its client ID and secret for a short-lived access token and calls the public REST API
(`/api/v1`) with it — no long-lived API key has to be stored in the other system, and each app can be turned off,
rotated or revoked on its own.

Page: `client/src/pages/settings/OAuthApps.jsx`. Server: `server/routes/oauthApps.js` (management router at
`/api/developer/oauth-apps`, token router at `/api/oauth`), `server/routes/publicApi.js`
(`authenticateOAuthToken`). Tables: `oauth_apps`, `oauth_access_tokens`, `api_logs.oauth_app_id` — see
[16 — Database](16-database.md). The API itself: [15 — API Reference](15-api.md).

**Sidebar:** Settings → Developer → **OAuth Apps** (`/settings/developer/oauth-apps`).

---

## 1. Overview

| | |
|---|---|
| **Grant type** | OAuth 2.0 **client credentials** (RFC 6749 §4.4) only. There is no user-consent (authorization code) flow |
| **Who can manage apps** | `api.keys` (**Developer API → API keys**). You see and manage your own apps; with `settings.developer` you see and manage everyone's |
| **Tokens act as** | The **app owner** — a token sees exactly what the owner's API key would see |
| **Token format** | `bxo_` + 48 hex characters, sent as `Authorization: Bearer bxo_…` |
| **Credentials** | Client ID `bxc_…`, client secret `bxcs_…`. The secret is shown **once**; only its SHA-256 hash is stored |
| **Limits** | 20 apps per user; token lifetime 5–1440 minutes (the page offers 15 min, 30 min, 1 h, 2 h, 8 h, 24 h; default 1 hour) |
| **Follows Developer settings** | Tokens obey the API on/off switch, the per-minute rate limit, the allowed origins and the IP allowlist in **Settings → Developer → Developer Settings** |

### The page

- **How it works** card with the four steps, the full URLs of the **Token**, **Revoke**, **Introspect** and **API**
  endpoints (copy buttons), and a ready-made `curl` token request.
- **Stat cards:** *Apps* (and how many are on), *Active tokens* (valid right now), *Tokens issued* (expired tokens
  are kept for a day), *Last 24 hours* (tokens issued).
- A card per app with its name, client ID, scopes, state, and **Manage**.

---

## 2. Scopes

| Scope | Allows |
|---|---|
| `documents:read` | `GET /api/v1/documents`, `GET /api/v1/documents/:id` |
| `templates:read` | `GET /api/v1/templates` |
| `reports:read` | `GET /api/v1/reports/summary` |
| `documents:write` | Reserved for endpoints that create or change documents |
| `webhooks:manage` | Reserved for endpoints that manage webhooks |

`GET /api/v1/me` works with any token. A call without the needed scope returns
`403 insufficient_scope` with `required_scope`.

---

## 3. Register an app

1. **Settings → Developer → OAuth Apps → Register app.**
2. Fill in:

   | Field | Rules |
   |---|---|
   | App name | Required, up to 120 characters |
   | Access token lifetime | 15 minutes – 24 hours (API: 5–1440 minutes) |
   | Description | Up to 255 characters |
   | Homepage URL | A full `http(s)` URL |
   | Redirect URIs | One per line, at most 10, each a full `http(s)` URL. Kept for your records and a future user-consent flow — the client credentials flow does not use them |
   | Scopes | At least one |

3. Click **Register app**. The **App registered** dialog shows the **Client ID**, the **Client secret** and a
   `curl` example using both.
4. **Copy the client secret now.** It is never shown again; if you lose it, rotate it (section 6). Click
   **I copied the secret**.

You also get an in-app notification "OAuth app registered" (category `api`) — if you did not create the app,
delete it.

---

## 4. Get an access token

`POST /api/oauth/token` — public endpoint, no BexSign session needed. The body may be
`application/x-www-form-urlencoded` or JSON.

| Parameter | Required | |
|---|---|---|
| `grant_type` | yes | Must be `client_credentials` |
| `client_id`, `client_secret` | yes | Either with **HTTP Basic** (`Authorization: Basic base64(client_id:client_secret)`) or in the body |
| `scope` | no | Space- or comma-separated. Omitted = every scope the app has. Asking for a scope the app does not have fails |

### HTTP Basic (recommended)

```bash
curl -X POST https://sign.example.com/api/oauth/token \
  -u "bxc_5a1f…:bxcs_9c0e…" \
  -d "grant_type=client_credentials" \
  -d "scope=documents:read templates:read"
```

### Credentials in the body

```bash
curl -X POST https://sign.example.com/api/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=bxc_5a1f…" \
  -d "client_secret=bxcs_9c0e…"
```

### Response `200`

```json
{
  "access_token": "bxo_3e8b…",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "documents:read templates:read"
}
```

Responses carry `Cache-Control: no-store` and `Pragma: no-cache`. Request a new token when `expires_in` runs out —
there are no refresh tokens.

### Errors

Errors follow RFC 6749: `{ "error": "<code>", "error_description": "<sentence>" }`.

| Status | `error` | When |
|---|---|---|
| 400 | `unsupported_grant_type` | `grant_type` is not `client_credentials` |
| 401 | `invalid_client` | Wrong or missing client ID / secret (also sends `WWW-Authenticate: Basic realm="BexSign OAuth"` and records a failed-access entry) |
| 400 | `unauthorized_client` | "This OAuth app is turned off." or "The account that owns this app is deactivated." |
| 400 | `invalid_scope` | "The app is not allowed the scope "…"." |
| 500 | `server_error` | Unexpected failure |

---

## 5. Call the API with the token

```bash
curl "https://sign.example.com/api/v1/documents?page_size=10" \
  -H "Authorization: Bearer bxo_3e8b…"
```

A `bxo_` token goes through exactly the same checks as an API key, in this order:

| Check | Failure |
|---|---|
| Allowed origins (browser calls with an `Origin` header) | `403 origin_not_allowed` |
| API turned on | `503 api_disabled` |
| IP allowlist | `403 ip_not_allowed` |
| Token present | `401 missing_api_key` |
| Token known | `401 invalid_token` "The access token is not valid." |
| Not revoked | `401 invalid_token` "This access token was revoked." |
| Not expired | `401 token_expired` "… Request a new one from /api/oauth/token." |
| App turned on | `401 app_disabled` |
| Owner account active | `403 account_inactive` |
| Rate limit (Developer settings, per minute, **shared by all tokens of the app**) | `429 rate_limited` with `Retry-After` and `retry_after` |
| Scope of the endpoint | `403 insufficient_scope` |

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`. API errors have the
shape `{ "success": false, "error": "…", "code": "…" }`.

`GET /api/v1/me` identifies the caller: `data.key.auth` is `"oauth"`, with the app name, the token prefix,
`client_id`, scopes and expiry, plus the owner and the rate limit. OAuth tokens are always treated as **live**
(sandbox mode does not apply to them).

---

## 6. Managing an app

Click **Manage** on an app. The dialog has four tabs.

### Settings

Change the name, token lifetime, description, homepage, redirect URIs and scopes, then **Save changes**.
The **App is on / off** switch:

- **Off** — every active token is revoked at once and new token requests fail with `unauthorized_client`.
- **On** — the app can get tokens again (tokens revoked while it was off stay revoked).

**Delete app** removes the app and all its tokens; its credentials stop working immediately.

### Credentials

Shows the **Client ID**, the secret hint (`bxcs_••••` + last 4 characters) and `curl` examples for getting a token
and calling the API.

**Rotate secret** creates a new client secret, shown once. **The old secret stops working at once** — update your
application straight away. Tokens already issued stay valid until they expire; use **Revoke all** as well if the
old secret leaked.

### Access tokens

- **Generate access token** — issues a token right here (for trying the API), with every scope of the app. It is
  shown once, with its expiry, scope and a "Try it" `curl`. The app must be on.
- The list shows the latest 50 tokens: prefix (`bxo_` + first characters), state (**active**, **expired**,
  **revoked**), scopes, issued, expires, number of requests, and **Revoke** for active ones.
- **Revoke all** revokes every active token of the app.
- Tokens issued from the console are recorded with the grant type `console`; tokens from `/api/oauth/token` with
  `client_credentials`. Tokens that expired more than a day ago are removed when a new token is issued.

### Recent requests

The latest 20 `/api/v1` calls made with this app's tokens: request, status, duration, IP, time. They also appear in
**Developer API → Logs**, where `api_logs.oauth_app_id` links them to the app.

Registering, updating, rotating, generating tokens, revoking all and deleting are recorded in **Activity History**
(category `api`).

---

## 7. Revoke and introspect (for your application)

Both endpoints need the **client authentication** of the app that owns the token (HTTP Basic or body), and only see
that app's tokens.

### `POST /api/oauth/revoke` (RFC 7009)

```bash
curl -X POST https://sign.example.com/api/oauth/revoke \
  -u "bxc_5a1f…:bxcs_9c0e…" \
  -d "token=bxo_3e8b…"
```

Always answers `200 { "success": true }`, whether or not the token existed. `401 invalid_client` for wrong
credentials.

### `POST /api/oauth/introspect` (RFC 7662)

```bash
curl -X POST https://sign.example.com/api/oauth/introspect \
  -u "bxc_5a1f…:bxcs_9c0e…" \
  -d "token=bxo_3e8b…"
```

Active token:

```json
{
  "active": true,
  "scope": "documents:read templates:read",
  "client_id": "bxc_5a1f…",
  "token_type": "Bearer",
  "exp": 1790332800,
  "iat": 1790329200,
  "sub": "4"
}
```

`sub` is the owner's user id. An unknown, revoked or expired token returns `{ "active": false }`.

---

## 8. Endpoints

### Token endpoint — `/api/oauth` (public)

| Method | Path | Purpose |
|---|---|---|
| POST | `/token` | Client credentials grant → `{ access_token, token_type, expires_in, scope }` |
| POST | `/revoke` | Revoke a token (client authentication) |
| POST | `/introspect` | Check a token (client authentication) |

### Management — `/api/developer/oauth-apps` (signed in, `api.keys`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Your apps (everyone's with `settings.developer`), `stats`, available `scopes`, `canSeeAll` |
| POST | `/` | Register `{ name, description, homepage_url, redirect_uris, scopes, token_ttl_minutes }` → `{ app, client_secret }` (201) |
| GET | `/:id` | App with its latest 50 `tokens` and latest 20 `logs` |
| PUT | `/:id` | Update any of the fields above and `is_active` |
| POST | `/:id/rotate-secret` | New `client_secret` |
| POST | `/:id/token` | Generate a token now `{ scopes? }` → `{ access_token, token_type, expires_in, expires_at, scope }` |
| POST | `/:id/tokens/:tokenId/revoke` | Revoke one token |
| POST | `/:id/revoke-all` | Revoke every active token |
| DELETE | `/:id` | Delete the app and its tokens |

---

## 9. Security notes

- Client secrets and access tokens are stored only as **SHA-256 hashes**; the client secret is compared in
  constant time.
- A bad client ID / secret and an unknown access token are written to the **Failed Access** log (source `api`).
- Keep token lifetimes short; an application should request a new token rather than keep one for days.
- Deactivating the owner's account stops all of their apps (tokens and token requests are refused).

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `invalid_client` | Wrong secret (it may have been rotated) or client ID; with HTTP Basic, URL-encode `:` or `%` in the values |
| `unsupported_grant_type` | Send `grant_type=client_credentials` |
| `invalid_scope` | The requested scope is not ticked on the app — add it in **Settings**, or ask for fewer scopes |
| `503 api_disabled` | The API is off in Developer Settings — tokens follow the same switch as API keys |
| `403 ip_not_allowed` / `origin_not_allowed` | Add the caller's IP to the allowlist or its origin to the allowed origins |
| `401 app_disabled` | The app was turned off; turn it on and request a new token |
| `429 rate_limited` | All tokens of one app share the per-minute limit; wait `Retry-After` seconds |
| "You can register at most 20 OAuth apps." | Delete an app you no longer use |
