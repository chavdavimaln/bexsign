# 11 — Contacts

An address book of people you send documents to, so recipients can be filled in quickly.
Server: `server/contacts.js` (mounted at `/api/contacts`). Table: `contacts`
(`user_id, name, email, company, phone, last_used, created_at`).

## Current state

| | |
|---|---|
| `GET /api/contacts` | the signed-in user's contacts |
| `POST /api/contacts` | add a contact |

Both require a valid token. Editing and deleting contacts, importing a list, and autocomplete inside
**Send for signatures** are **not implemented yet** — the Contacts screen in Settings is still a placeholder.
Recipients are typed in by hand, or added in bulk from a CSV with "Add bulk recipients".

## If you extend it

- Keep rows scoped to `user_id`; contacts are personal, not organisation-wide, unless you decide otherwise and add a
  permission for it.
- Update `last_used` when a contact is used in a request so the picker can sort by recency.
- Follow the module conventions in [02 — Project Structure](02-project-structure.md): an idempotent schema routine,
  `requirePermission` where needed, and `apiFetch` on the client.
