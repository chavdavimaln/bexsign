# 24 — Trash

One bin for everything deleted in BexSign: request documents, self-sign documents, templates, saved signatures and
contacts. Deleted items stay restorable until the retention period ends, then they are deleted for good.

Page: `client/src/pages/settings/Trash.jsx`. Server: `server/routes/trash.js` (mounted at `/api/trash`),
`server/utils/trashStore.js` (moving, restoring, deleting, purging). Tables: `trash_items`, plus
`general_settings.trash_retention_days` — see [16 — Database](16-database.md).

**Sidebar:** Settings → **Trash** (`/settings/trash`).

---

## 1. What goes to the trash, and how it is kept

| Type | Deleted from | How it is kept while in the trash | Restore puts back |
|---|---|---|---|
| **Document** (signature request) | Documents list, document details | The `documents` row stays, with status **Trashed**. The status it had is saved in `trash_items.previous_status` | The previous status (e.g. *In Progress*, *Completed*); *Draft* if none was recorded |
| **Self-sign document** | Sign Yourself | Its rows — the `documents` row, files, fields, recipients, identifiers and every other dependent row, plus `self_sign_documents`, `self_sign_events`, `self_sign_shares` — are copied into a **snapshot**, then removed | Every row from the snapshot |
| **Template** | Templates (one or bulk) | The `templates` row and its dependent rows (fields, roles) in a **snapshot**, then removed | The template with its fields and roles |
| **Signature** | My Signatures | The `user_signatures` row in a **snapshot**, then removed (with its legacy `employee_signatures` mirror). If it was the default, the owner's next signature becomes default | The signature; it becomes the default only when the owner has no other signature. The legacy directory is rebuilt |
| **Contact** | Contacts (one or bulk) | The `signing_contacts` row stays, with `deleted_at` set | The contact (`deleted_at` cleared). If an active contact with the same email exists again, the trashed one is merged into it (removed) |

Notes:

- A snapshot keeps dates and binary values with their type, and on restore only columns that still exist are
  written back, so a restore survives later schema changes. Rows that already exist again are skipped.
- A trashed document is hidden everywhere else: document lists, counts, the public API, contact history.
- Deleting something already in the trash does not create a second entry.
- **Discarding an unsent draft** (`DELETE /api/documents/:id?permanent=true`) deletes it at once and never lists it
  in the trash.
- Documents that were already *Trashed* before the Trash module existed got a trash entry on the first server start
  (restore to *Draft*), with their retention period starting from that start.

---

## 2. Who sees what

| | Everyone | With `settings.trash` (**Organization trash**) |
|---|---|---|
| Items listed | Items **they own or deleted** | A **Whose items** selector: *My items* / *Everyone's items* |
| Restore / delete forever | Their own items | Anyone's items |
| Empty trash | Their own items | *Everyone's items* when that scope is selected |
| Change the retention period | — | Yes |

`settings.trash` is in the **Settings** module of Roles & Permissions. The Manager role has it by default; Leader and
Team member do not. In *Everyone's items* each row also shows the owner's email.

---

## 3. The Trash page

### Header

- **Whose items** (only with `settings.trash`).
- **Empty trash** — or **Empty <type>** when a type tab is selected. Asks for confirmation: "Every item in your
  trash is deleted permanently. This cannot be undone."

### Stat cards

| Card | Shows | Click |
|---|---|---|
| In the trash | Items in the current scope | — |
| Deleted soon | Items deleted for good within the next 3 days | Sorts by *Deleted for good soonest* |
| Documents | Trashed signature requests | Filters to documents |
| Kept for | The retention period, e.g. *30 days* | Opens the retention dialog (only with `settings.trash`) |

### Tabs, search and sort

- **Type tabs:** All, Documents, Self-sign, Templates, Signatures, Contacts — each with its count (counts ignore the
  selected tab, so they always show).
- **Search:** item name, its description line, or the name of who deleted it.
- **Sort:** Recently deleted (default) · Deleted longest ago · Deleted for good soonest · Name A-Z.
- 25 items per page by default, with pagination.

### The list

Each row: the item (name, type, description such as "Was In Progress" or "Template · HR · shared"), **Deleted by**,
**Deleted** (relative time; hover for the date), **Deleted for good in** (days left, red when it is close; hover
for the exact date), and **Restore** / **Delete forever**. On a phone the rows become cards.

---

## 4. Step by step

### Restore one item

Click **Restore** on its row. It goes back where it came from (see the table in section 1) and leaves the trash.

### Restore or delete several items

1. Tick the items (or the header checkbox for the page).
2. Click **Restore** or **Delete forever** in the bar that appears.
3. Each item is handled on its own: if one fails, the others still go through, and the message says how many could
   not be restored ("3 items restored, 1 could not be restored.").

### Delete forever

Click the bin on a row (or **Delete forever** in the bulk bar) and confirm. This cannot be undone:

| Type | Permanent delete removes |
|---|---|
| Document | The `documents` row (only while it is still *Trashed*) and its identifiers; dependent rows go with it |
| Contact | The `signing_contacts` row |
| Self-sign, template, signature | The snapshot — the live rows were already removed when the item was trashed |

Files already written to `server/uploads/` are not removed by a permanent delete.

### Empty the trash

Pick a type tab first to empty only that type, then click **Empty trash** / **Empty <type>** and confirm.

### Change how long items are kept

(Needs `settings.trash`.)

1. Click the **Kept for** card.
2. Choose **Keep deleted items for**: 7, 14, 30, 60, 90, 180 or 365 days.
3. Click **Save**.

The new period applies to **everyone's trash, including items already in it**: each item's removal date is
recalculated from the day it was deleted. A shorter period can therefore delete items at the next cleanup.

---

## 5. Retention and automatic cleanup

| | |
|---|---|
| Default | **30 days** (`general_settings.trash_retention_days`) |
| Allowed | 1–365 days through the API; the page offers 7 / 14 / 30 / 60 / 90 / 180 / 365 |
| Removal date | `trash_items.purge_after` = deleted date + retention period |
| Cleanup | Items whose removal date has passed are deleted for good (exactly like **Delete forever**). The cleanup runs when the trash list is loaded, at most once an hour — there is no separate background timer, so an expired item is removed the next time anyone opens the Trash |

---

## 6. Where deletes come from

| Module | Endpoint that now moves to the trash |
|---|---|
| Documents | `DELETE /api/documents/:id` (without `?permanent=true`), `POST /api/documents/:id/trash`, `POST /api/trash/move/:id`, `POST /api/trash/bulk-move` |
| Sign yourself | `DELETE /api/self-sign/:id` — "You can restore it from Settings > Trash." |
| Templates | `DELETE /api/templates/:id?userId=`, `POST /api/templates/bulk-delete` (only templates the user may manage) |
| Signatures | `DELETE /api/signature-directory/:id` (`signatureStore.deleteSignature`) |
| Contacts | `DELETE /api/contacts/:id`, `POST /api/contacts/bulk-delete` |

---

## 7. API endpoints

`/api/trash` — every route needs a signed-in user.

### Trash bin (trash item ids)

| Method | Path | Purpose |
|---|---|---|
| GET | `/items?type=&search=&scope=mine\|all&sort=newest\|oldest\|name\|expiring&page=&pageSize=` | Items with `counts` per type (`all`, `document`, `self_sign`, `template`, `signature`, `contact`), `expiringSoon` (3 days), `retentionDays`, `canManageAll`, `scope`, `types`. Each item has `days_left`. Runs the cleanup first |
| POST | `/items/restore` | `{ ids }` → `{ restored, failed: [{ id, title, error }], message }` |
| POST | `/items/delete` | `{ ids }` → `{ deleted, failed, message }` |
| POST | `/empty` | `{ type?, scope?: 'mine' \| 'all' }` → `{ deleted }` (`all` only with `settings.trash`) |
| PUT | `/settings` | `{ retentionDays }` (1–365). 403 without `settings.trash` |

`type` is one of `document`, `self_sign`, `template`, `signature`, `contact`. `scope=all` is ignored without
`settings.trash`. Restores, permanent deletes, emptying and retention changes are recorded in **Activity History**
(category `trash`).

### Older document endpoints (document ids)

Kept so the Documents list keeps working. They take **document** ids, not trash item ids, and go through the same
trash store (so restores return the previous status).

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Trashed documents (with identifier and owner columns) |
| POST | `/move/:id`, `/bulk-move` `{ ids }` | Move documents to the trash |
| POST | `/restore/:id`, `/bulk-restore` `{ ids }` | Restore documents |
| DELETE | `/delete/:id`, `/:id` · POST `/bulk-delete` `{ ids }` | Delete documents forever |

Note for developers: these older endpoints do not apply the "own items" check of `/items/*`. New code should use
the `/items` endpoints.

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "This item cannot be restored: its data was not kept." | A snapshot type without a snapshot (very old or damaged row); it can only be deleted |
| A restored contact vanished | An active contact with the same email existed, so the trashed copy was merged into it |
| A restored signature is not the default | It becomes the default only when the owner has no other signature; set it as default in My Signatures |
| Someone else's deleted item is not listed | Only items you own or deleted are shown; ask someone with **Organization trash** |
| Item still listed after its date | The cleanup runs when the Trash is loaded, at most hourly; reload later or delete it forever |
| "Only people with the Organization trash permission can change how long items are kept." | Needs `settings.trash` |
