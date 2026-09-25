# 15 — API Reference

Two different APIs:

- **The application API** (`/api/...`) — what the browser app calls. Authenticated with the user's JWT.
- **The public REST API** (`/api/v1/...`) — for your own systems. Authenticated with an API key or an OAuth access
  token ([25 — OAuth Apps](25-oauth-apps.md)).

Base address: whatever `VITE_API_URL` / your domain resolves to (see [21](21-live-server-deployment.md)).
In the client always build URLs with `apiFetch` / `API_BASE` from `client/src/utils/api.js`.

---

## 1. Conventions

- Requests and responses are JSON, except file uploads (multipart) and file downloads.
- Success: `{ success: true, ... }`. Failure: `{ success: false, error: "a sentence you can show the user" }`.
- `401` with `sessionExpired: true` means the token is invalid or expired — the client clears the session.
- `403` means a permission is missing; the message names what is required.
- Authentication header: `Authorization: Bearer <jwt>`.

---

## 2. Authentication — `/api` (also under `/api/auth`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/register` | Create an account |
| POST | `/login` | Sign in, returns `{ token, user }` |
| POST | `/change-password` | Change the password of the signed-in user |
| POST | `/send-reset-email` (also `/forgot-password`) | Email a reset link |
| GET | `/reset-password/verify?token=` | Is this link still valid |
| POST | `/reset-password` | Set a new password |

"Continue with Google / Microsoft" lives under `/api/auth/oauth`: `GET /providers` (which buttons to show),
`GET /:provider`, `GET /:provider/callback`, `POST /exchange`. Credentials come from the Google Workspace /
Microsoft 365 integrations first, then `server/.env` — see [14 — Integrations](14-integrations.md#8-google-and-microsoft-sign-in).

---

## 3. Documents — `/api/documents`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Lists (status, folder, search) |
| POST | `/upload` | Create or update a draft, with files (multipart) |
| GET | `/:id` | One request; `?email=` scopes fields to that recipient, `?view=sender` returns all |
| POST | `/:id/save` | Save documents, fields and recipients |
| POST | `/send/:id` | Send |
| GET | `/:id/signing-flow` | Flow, who it waits on, and every signing email |
| PUT | `/:id/signing-flow` | Change the flow (draft only) |
| POST | `/:id/remind` | Remind the current step |
| POST | `/:id/recall` | Withdraw |
| POST | `/:id/extend` | Move the expiry |
| POST | `/:id/correct` | Re-open for correction |
| POST | `/:id/reminder-settings` | Automatic reminder frequency |
| POST | `/:id/upload-signed` | Attach a hand-signed scan |
| POST | `/:id/email-copy` | Email the document |
| POST | `/:id/clone` | Copy into a new draft |
| GET | `/:id/signed-pdf`, `/:id/certificate-pdf` | Downloads |
| GET | `/:id/versions`, `/:id/form-data`, `/:id/certificate-data` | Versions, submitted values, certificate data |
| POST | `/verify` | Check a PDF against the fingerprint registry (multipart) |
| GET | `/:id/activity` | The audit trail; `?format=csv` downloads it |
| POST | `/:id/bundle-pdf` | Documents and/or certificate merged into one PDF, optionally password-protected |
| POST | `/:id/trash`, DELETE `/:id` | Move to the trash; `DELETE /:id?permanent=true` discards an unsent draft at once — [24 — Trash](24-trash.md) |

---

## 4. Signing — `/api/signatures`

| Method | Path | Purpose |
|---|---|---|
| GET | `/token/:documentId?email=` | The signing session: document, recipient, visible fields |
| POST | `/consent` | Record the recipient's agreement to the signing disclosure |
| POST | `/viewed` | Record the first open |
| POST | `/save` | Save a signature draft |
| POST | `/submit` | Complete this recipient's part |
| POST | `/decline` | Decline with a reason |
| POST | `/assign` | Delegate to another email |
| POST | `/physical-copy` | Upload a scanned signed copy |
| GET | `/history/:token` | The request's events |

---

## 5. Templates, trash, contacts, integrations, settings

| Method | Path | |
|---|---|---|
| GET | `/api/templates?userId=` | Saved templates |
| POST | `/api/templates/create` | Save |
| PUT/DELETE | `/api/templates/:id` | Edit / delete (delete moves to the trash) |
| POST | `/api/templates/bulk-delete` | Move several to the trash |
| POST | `/api/templates/:id/use` | Usage count |
| GET | `/api/trash/items` | The trash bin: every type, counts, retention — [24 — Trash](24-trash.md) |
| POST | `/api/trash/items/restore`, `/api/trash/items/delete`, `/api/trash/empty` | Restore / delete forever / empty (trash item ids) |
| PUT | `/api/trash/settings` | Retention period (`settings.trash`) |
| GET, POST, DELETE | `/api/trash`, `/api/trash/move/:id`, `/restore/:id`, `/bulk-move`, `/bulk-restore`, `/delete/:id`, `/bulk-delete` | Older document-id endpoints, kept for the documents list |
| GET/POST/PUT/DELETE | `/api/contacts[/:id]`, `/suggest`, `/import`, `/export`, `/sync`, `/bulk-tag`, `/bulk-delete`, `/:id/favorite` | Contacts — [11 — Contacts](11-contacts.md) |
| GET/PUT/POST/DELETE | `/api/integrations[/:key]`, `/custom`, `/:key/test`, `/:key/enable`, `/:key/reveal-signing-secret` | Integrations — [14 — Integrations](14-integrations.md) |
| GET/PUT | `/api/settings/profile/:userId` | Profile |
| POST | `/api/settings/delegate` | Out-of-office delegation |

---

## 6. Users, roles and permissions

| Method | Path | Permission |
|---|---|---|
| GET | `/api/users` | `users.view` |
| POST | `/api/users` | `users.invite` |
| PUT | `/api/users/:id` | `users.edit` |
| PATCH | `/api/users/:id/status` | `users.deactivate` |
| POST | `/api/users/:id/reset-password` | `users.edit` |
| DELETE | `/api/users/:id` | `users.delete` |
| GET | `/api/users/roles`, `/api/users/login-logs` | `users.view` |
| GET | `/api/permissions/me` | any signed-in user |
| GET | `/api/permissions/catalog` | `roles.manage` or `users.view` |
| POST/PUT/DELETE | `/api/permissions/roles[/:key]` | `roles.manage` |
| PUT | `/api/permissions/roles/:key/permissions` | `roles.manage` |
| GET | `/api/permissions/users[/:id]` | `roles.manage` or `users.view` |
| PUT | `/api/permissions/users/:id/overrides` | `roles.manage` |
| PUT | `/api/permissions/users/:id/role` | `roles.manage` or `users.edit` |

---

## 7. Notifications — `/api/notifications`

`GET /`, `GET /summary`, `PATCH /:id/read`, `POST /read-all`, `POST /clear-read`, `GET|PUT /preferences`,
`POST /broadcast` (`notifications.broadcast`), `POST /test`, `DELETE /:id`.

---

## 8. Reports — `/api/reports`

`GET /overview`, `GET /timeline` (`reports.view`) · `GET /export?kind=documents|timeline|recipients|users`
(`reports.export`) · `GET|POST|PUT|DELETE /scheduled[/:id]`, `POST /scheduled/:id/run`, `GET /scheduled/:id/runs`
(`reports.schedule`).

---

## 9. Security logs — `/api/security`

| Path | Permission |
|---|---|
| `GET /failed-access`, `GET /failed-access/export`, `PATCH /failed-access/:id/resolve`, `POST /failed-access/resolve-all`, `POST /failed-access/purge` | `security.failed_access` |
| `GET /document-validity`, `GET /document-validity/documents`, `POST /document-validity/verify`, `POST /document-validity/verify-hash` | `security.document_validity` |
| `GET /activity`, `GET /activity/export` | `security.activity_history` |

---

## 10. Platform settings — `/api/platform-settings`

`GET /general` (any signed-in user) · `PUT /general` (`settings.general`) ·
`GET|PUT /developer`, `POST /developer/rotate-secret`, `POST /developer/reveal-secret` (`settings.developer`).

---

## 11. Developer API management — `/api/developer`

Keys: `GET|POST /keys`, `PATCH /keys/:id`, `POST /keys/:id/revoke`, `DELETE /keys/:id` (`api.keys`).
Webhooks: `GET|POST /webhooks`, `PUT|PATCH|DELETE /webhooks/:id`, `POST /webhooks/:id/test`,
`GET /webhooks/:id/deliveries` (`api.webhooks`).
Logs: `GET /logs`, `GET /logs/summary` (`api.logs`). Reference: `GET /events`, `GET /meta`.
Tokens: `POST /tokens/temporary` (a development token that expires within hours) and `POST /tokens/deployment`
(a long-lived token for a deployed integration), plus `GET /templates` and `GET /templates/:id` for the details and
the example request needed to send a template through the API — all `api.keys`.

---

## 12. The public REST API — `/api/v1`

Authenticated with an API key created in Settings → Developer API:

```http
GET /api/v1/documents?status=completed
Authorization: Bearer bxs_live_xxxxxxxxxxxx
```

| Path | Returns |
|---|---|
| `GET /me` | The key's owner and its permissions |
| `GET /documents` | Requests visible to the key's owner |
| `GET /documents/:id` | One request with its recipients |
| `GET /templates` | Templates |
| `GET /reports/summary` | Counters |

Every call is rate-limited (Settings → Developer Settings) and recorded in `api_logs`. Turning the API off refuses
every call and pauses webhooks.

### OAuth access tokens

External applications can use their own OAuth credentials instead of an API key. Register an app in
**Settings → Developer → OAuth Apps**, exchange its client ID and secret for a short-lived token, and send that
token exactly like a key:

```bash
curl -X POST https://sign.example.com/api/oauth/token -u "<client_id>:<client_secret>" -d "grant_type=client_credentials"
# → { "access_token": "bxo_…", "token_type": "Bearer", "expires_in": 3600, "scope": "documents:read" }

curl https://sign.example.com/api/v1/documents -H "Authorization: Bearer bxo_…"
```

| Base | Endpoints |
|---|---|
| `/api/oauth` (public) | `POST /token` (client credentials grant), `POST /revoke`, `POST /introspect` |
| `/api/developer/oauth-apps` (`api.keys`) | Register, edit, rotate secret, generate / revoke tokens, delete |

`bxo_` tokens act as the app's owner, carry the scopes of the app, and follow the same API switch, rate limit
(shared per app), allowed origins and IP allowlist as keys; their requests are logged in `api_logs` with
`oauth_app_id`. Full guide: [25 — OAuth Apps](25-oauth-apps.md).

### Webhooks

`document.sent`, `document.viewed`, `document.signed`, `document.completed`, `document.declined`,
`document.recalled`, `template.created`. Deliveries are signed with the webhook secret and every attempt is stored in
`webhook_deliveries`.

---

## 13. Module APIs added by the latest upgrade

| Module | Base | Documentation |
|---|---|---|
| Signatures + usage history | `/api/signature-directory` | [12 — Signatures](12-signatures.md) |
| Sign yourself | `/api/self-sign` | [22 — Sign Yourself](22-sign-yourself.md) |
| Verify & confirm | `/api/verification` | [23 — Verify and Confirm](23-verify-and-confirm.md) |
| Integrations | `/api/integrations` | [14 — Integrations](14-integrations.md) |
| Contacts | `/api/contacts` | [11 — Contacts](11-contacts.md) |
| Trash | `/api/trash` | [24 — Trash](24-trash.md) |
| OAuth apps | `/api/developer/oauth-apps`, `/api/oauth` | [25 — OAuth Apps](25-oauth-apps.md) |
