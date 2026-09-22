# 04 — Dashboard

`client/src/pages/Dashboard.jsx` — the landing screen after sign-in.

## What it shows

- **Quick actions** — Create document, Send for signatures, Sign yourself.
- **Counters** — total documents, in progress, completed, pending, scoped to what the user may see.
- **Recent activity** — the latest requests with their status and the recipients still to act.
- **Waiting on you** — requests where the signed-in user is the next signer.

## Where the numbers come from

`GET /api/documents` (filtered by the user's document permissions) and the sidebar's status counts. A user with
`documents.view_all` sees organisation-wide numbers; `view_team` sees their department; everyone else sees their own
requests and the ones they received.

## Related

[05 — Documents](05-documents.md) · [06 — Send for Signatures](06-sending-signatures.md) ·
[10 — Reports](10-reports.md) for the analytical view.
