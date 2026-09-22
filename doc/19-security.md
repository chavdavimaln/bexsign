# 19 — Security, Roles and Permissions

Who can do what, how that is enforced, and what is recorded.

Related: [03 — Authentication](03-authentication.md), [16 — Database](16-database.md),
[21 — Live Server Deployment](21-live-server-deployment.md).

---

## 1. Sign-in and sessions

- Passwords are hashed with bcrypt (`users.password_hash`); the plain value is never stored or logged.
- Signing in returns a JWT signed with `JWT_SECRET` from `server/.env`. The client keeps it in `localStorage` and
  sends it as `Authorization: Bearer <token>`.
- `server/middleware/authMiddleware.js` verifies it. A JWT-shaped token that fails verification is rejected with
  **401 + `sessionExpired: true`**, and the client clears the session and returns to the sign-in page.
- Password reset uses a single-use, expiring token (`password_reset_tokens`), emailed as a link. Requesting a reset
  for an unknown address is logged and answers the same way as a known one.

**Known limitation:** a request with *no* token still falls back to the default account (user 1) so the demo login
keeps working. Remove that fallback before exposing an installation to the public internet.

---

## 2. Roles

| Role | Intended for | Default grants |
|---|---|---|
| `manager` | Administrator | all 33 permissions (`roles.manage` is locked on) |
| `leader` | Team lead | 18 |
| `team_member` | Everyday user | 8 |

Custom roles can be created in **Settings → Roles & permissions**, optionally copying another role's grants.
Built-in roles cannot be deleted; deleting a custom role reassigns its users.

---

## 3. The permission catalogue

33 keys in 10 modules (`server/utils/permissions.js`):

| Module | Keys |
|---|---|
| documents | `view_own`, `view_team`, `view_all`, `create`, `send`, `recall`, `download`, `delete` |
| templates | `view`, `create`, `edit`, `delete`, `share` |
| signatures | `manage` |
| reports | `view`, `export`, `schedule` |
| users | `view`, `invite`, `edit`, `deactivate`, `delete` |
| roles | `manage` |
| settings | `general`, `integrations`, `developer` |
| security | `failed_access`, `document_validity`, `activity_history` |
| api | `keys`, `webhooks`, `logs` |
| notifications | `broadcast` |

**Resolution order** for a user: role grants (`role_permissions`) → per-user override (`user_permissions`, where
`allowed = 1` adds and `allowed = 0` denies, with an optional reason and expiry). An expired override is ignored.
`getEffectivePermissions(userId)` returns the result.

**Enforcement**

- Server: `requirePermission('reports.export')` on the route — a refusal is a 403 with a readable message.
- Client: `usePermissions().can('reports.export')` hides what the user cannot do, and `RequirePermission` guards the
  route. The client check is convenience only; the server decision is the real one.

---

## 4. Document visibility

- `documents.view_all` sees the organisation; `view_team` sees their department; otherwise a user sees documents
  they own or received.
- While a request is in progress, a recipient is sent **only their own fields**. The one exception is the
  *"In order, showing completed fields"* flow, where fields an earlier recipient already completed are included
  read-only (see [06](06-sending-signatures.md)).
- A signing link opened with an email that is not a recipient is refused and written to `failed_access_logs`.
- Saved signatures belong to their owner: another person's signature can be seen in the organisation directory but
  never edited, and is never used to prefill anyone else's signing page (see [12](12-signatures.md)).

---

## 5. A signature is never changed after the fact

Once a recipient has signed, the documents and fields of that request are frozen: a save that would change them is
refused with **409** and the message points at *Edit as new*, which copies the request into a fresh draft and leaves
the signed original untouched.

A sender who deliberately wants to change the signed version restarts the round (`restartSigning: true`). Every
collected signature, view and consent is then cleared, the audit trail records *"Document edited after signing"*,
and all recipients sign the new version from the start. Nobody can end up signed to text that changed afterwards.

## 6. Document integrity

Every PDF BexSign issues is fingerprinted (SHA-256) in `issued_pdf_fingerprints`. **Settings → Document Validity**
checks an uploaded file against that registry:

| Result | Meaning |
|---|---|
| `valid` | byte-for-byte a PDF BexSign issued |
| `modified` | built on an issued PDF but changed since |
| `unknown` | not recognised |
| `invalid` | not a PDF |

Signed copies also carry a BexSign document ID, a certificate of completion listing every signer with time, IP and
device, and a lock that prevents casual editing.

---

## 7. What is logged

| Log | Contents |
|---|---|
| `user_login_logs` | every sign-in attempt and its outcome |
| `failed_access_logs` | failed sign-ins, signing links opened by a non-recipient, rejected API keys |
| `activity_logs` | account, user, role and settings changes |
| `activity_history` + `signature_events` | everything that happens to a document |
| `document_validity` | every integrity check |
| `api_logs`, `webhook_deliveries` | public-API traffic and webhook attempts |

Three or ten failed attempts from the same source within 15 minutes raise a security notification to everyone
holding `security.failed_access`. Security notifications cannot be turned off in-app.

---

## 8. Hardening a live installation

- Long random `JWT_SECRET`, different from any development value.
- `CORS_ORIGINS` limited to your own origins; `TRUST_PROXY=1` behind a proxy so the real signer IP is recorded.
- HTTPS only; HTTP redirected.
- `server/.env` unreadable by other users and never committed.
- Webhook URLs are not restricted to public addresses — an internal URL can be registered (SSRF). Review what
  developers add in Settings → Developer API.
- Change the passwords of any seeded demo accounts.
- Back up the database and `server/uploads/` (the signed PDFs are the legal record).
