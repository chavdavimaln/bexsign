# 14 — Integrations

How BexSign connects to the outside world.

## 1. Working today

| Integration | Where | Notes |
|---|---|---|
| **SMTP email** | `server/.env` (`SMTP_*`) | Every message the product sends — [17 — Email](17-email.md) |
| **Webhooks** | Settings → Developer API | Real-time events to your own endpoint — [15 — Developer API](15-api.md) |
| **REST API** | `/api/v1`, API-key auth | Documents, recipients and status for your own systems |

### Webhook events

`document.sent`, `document.viewed`, `document.signed`, `document.completed`, `document.declined`,
`document.recalled`, `template.created`.

Deliveries are signed with the secret in Settings → Developer Settings and every attempt is recorded in
`webhook_deliveries` (status code, response, duration, attempt number). Turning the API off also pauses webhooks.

**Careful:** a webhook URL is not restricted to public addresses, so an internal URL can be registered (SSRF).
Review what developers add.

## 2. Present in the UI, not implemented

Cloud storage (Google Drive, OneDrive, Dropbox, Box) appears in the "Add document" menu and on the Integrations
screen, but no provider is connected yet — the `integrations` table (`provider`, `access_token`, `status`) is the
place to store an OAuth connection when one is added. Upload from the computer and templates are the working paths.

## 3. Adding an integration

1. Store credentials in `integrations`, never in code.
2. Put the outbound calls in a `server/utils/<provider>.js` module that fails softly — an integration outage must
   never break signing.
3. Guard the settings screen with `settings.integrations`.
4. Record what happened in `activity_logs` so the audit trail stays complete.
