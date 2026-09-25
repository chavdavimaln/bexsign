# 11 — Contacts

Your personal address book of the people you send documents to. Recipients of the requests you send are added
automatically, with how many documents each person received and signed; you can also add, import, tag, favorite
and export contacts, and pick them when adding recipients.

Page: `client/src/pages/settings/Contacts.jsx`. Recipient suggestions: `client/src/pages/SendForSignatures.jsx`.
Server: `server/routes/contacts.js` (mounted at `/api/contacts`). Deleting goes through `server/utils/trashStore.js`.
Table: `signing_contacts` — see [16 — Database](16-database.md). (The older, empty `contacts` table is no longer
used and is left untouched.)

**Sidebar:** Settings → **Contacts** (`/settings/contacts`).

---

## 1. Who sees what

- Contacts are **personal**: every row belongs to one user (`owner_id`). You only ever see, change, import or
  export your own contacts.
- No permission is needed — every signed-in user has a Contacts page.
- Deleting a contact moves it to **your** trash ([24 — Trash](24-trash.md)).

---

## 2. Automatic sync from sent requests

Every recipient of a request **you** sent becomes a contact with the source **From sent documents**
(`source = 'recipient'`).

| | |
|---|---|
| **When** | Each time the Contacts page or the recipient suggestions load (at most once every 30 seconds per user), and at once with the **Sync** button |
| **Which requests** | Your requests that are not *Draft* or *Trashed*, excluding self-sign documents |
| **Which people** | Every recipient email except your own |
| **What is updated** | *Documents sent* (distinct requests), *Documents signed* (requests where they signed), *Last sent*, *Last signed* |
| **What is kept** | A name you edited is never overwritten. A contact you deleted **stays deleted** (its row keeps `deleted_at`; only its counters are refreshed) |

**Sync** reports "N new contacts added from your sent documents." or "Your contacts are up to date with your sent
documents."

---

## 3. The Contacts page

### Header buttons

**Sync** · **Import** · **Export** (disabled when you have no contacts) · **Add contact**.

### Stat cards

| Card | Shows | Click |
|---|---|---|
| All contacts | Total | Shows all |
| Favorites | Starred contacts | Filters to favorites |
| From sent documents | Contacts taken from your requests; the hint says how many were sent something in the last 30 days | Filters to that source |
| Documents sent | Total documents sent to your contacts | — |

### Search, filter, tag, sort

- **Search** matches name, email, company, job title and phone.
- **Show:** All contacts, Favorites, From sent documents, Added manually, Imported.
- **Tag:** Any tag, or one of your tags (with its count).
- **Sort:** Favorites, then A-Z (default) · Recently sent · Most documents · Newest added.
- 25 contacts per page by default (page sizes 5–100).

### The table

Each row shows the contact (name, email, favorite star), company, tags, documents sent/signed with the sign rate,
*Last sent* (or "Never"), and actions: **favorite**, **Send document**, **Edit**, **Delete**. On a phone the table
becomes a list of cards with the same actions.

---

## 4. Step by step

### Add a contact

1. Click **Add contact**.
2. Fill in **Full name** and **Email** (required), and optionally **Company**, **Job title**, **Phone**, **Tags**
   (type a tag and press Enter; up to 10, 30 characters each) and **Notes** (up to 2000 characters).
3. Turn on **Favorite** to show and suggest the contact first.
4. Click **Save**.

If the email is already in your contacts you get "<name> (<email>) is already in your contacts." If a contact with
that email is **in the trash**, it is brought back with the new details and removed from the trash.

Validation: a valid email; a phone may contain only digits, spaces and `+ - ( ) .` (4–40 characters).

### Edit a contact

Click the pencil (or **Edit** in the drawer), change what you need, **Save**. Changing the email to one another
contact uses is refused ("Another contact (<name>) already uses <email>.").

### Favorites

Click the star on a row or in the drawer. Favorites sort first in the list and first in recipient suggestions.

### Bulk actions

Tick contacts (or the header checkbox for the whole page). A bar appears with:

- **Tag** — type a tag, then **Add** or **Remove** it on every selected contact.
- **Delete** — moves the selected contacts to the trash.
- **Clear selection**.

### The contact drawer

Click a contact's name to open the drawer on the right:

- name, email, company, job title, phone, tags, notes and a favorite star;
- **Send document** and **Edit**;
- counters **Sent**, **Signed**, **Sign rate**;
- **Documents sent to <first name>** — the latest 50 requests you sent to this email (trashed requests and self-sign
  documents are left out), each with its date, the request status and the recipient's own status
  (pending / sent / viewed / signed / declined; *Copy* for viewer, reviewer and CC roles). Click one to open the
  document.

### Send a document to a contact

Click **Send document** (row or drawer). **Send for Signatures** (`/documents/create`) opens with that person as
the **first recipient**, name and email filled in.

### Recipient suggestions on the Send page

On **Send for Signatures**, the recipient **Email** box suggests your contacts as you type (a browser `datalist` of
up to 300 contacts, favorites and recently-sent first, shown as "Name · Company"). Picking a suggestion fills in the
recipient's **name** when the name box is still empty.

### Delete a contact

Click the bin on a row (or **Delete** in the bulk bar) and confirm **Move to trash**. The contact disappears from
the list and suggestions and can be restored from **Settings → Trash** until the retention period ends.

---

## 5. CSV import

1. Click **Import**, then choose or drop a `.csv` file (at most **2 MB**). **Download a sample file** gives you a
   ready-made template.
2. A preview shows the number of rows, the columns that were recognised, and the first 8 rows (Name, Email,
   Company, Tags).
3. Click **Import**. The result shows **Added**, **Updated** and **Skipped** (with the row number and reason for
   each skipped row).

### Format

- The **first row is a header** and must contain an **Email** column. Columns can be in any order; unknown columns
  are ignored.
- Separators: comma, semicolon or tab. Quoted values (`"Acme, Ltd"`) are supported. A UTF-8 BOM is fine.
- Up to 2000 contacts per import.

| Contact field | Accepted header names (case-insensitive) |
|---|---|
| Name | `name`, `full name`, `contact`, `contact name` — or `first name` + `last name` (`firstname`, `given name`; `lastname`, `surname`, `family name`) |
| Email (required) | `email`, `e-mail`, `email address`, `mail` |
| Company | `company`, `organization`, `organisation`, `account` |
| Job title | `job title`, `title`, `position`, `designation`, `role` |
| Phone | `phone`, `mobile`, `phone number`, `telephone` |
| Tags | `tags`, `tag`, `labels`, `groups` — several tags separated by `;` or `|` |
| Notes | `notes`, `note`, `comments` |

### Sample

```csv
Name,Email,Company,Job title,Phone,Tags,Notes
Priya Shah,priya@example.com,Acme Ltd,HR Manager,+91 98765 43210,Client;HR,Signs offer letters
```

### What happens to each row

| Row | Result |
|---|---|
| New email | Added with source **Imported** |
| Email already in your contacts | **Updated** with the non-empty values in the file |
| Email of a contact in the trash | Updated **and restored** (removed from the trash) |
| Invalid email or phone | **Skipped**, with the reason |
| Empty name | The part of the email before `@` is used |

---

## 6. CSV export

**Export** downloads `bexsign-contacts-YYYY-MM-DD.csv` with all your contacts (not only the current page or
filter), sorted by name, UTF-8 with BOM so Excel opens it correctly.

Columns: `Name, Email, Company, Job title, Phone, Tags, Favorite, Source, Documents sent, Documents signed,
Last sent, Notes`. Tags are joined with `; `, *Favorite* is `Yes`/`No`, *Last sent* is `YYYY-MM-DD`. Values starting
with `=`, `+`, `-` or `@` are prefixed with `'` so spreadsheets never run them as formulas.

---

## 7. API endpoints

`/api/contacts` — every route needs a signed-in user and only touches that user's contacts.

| Method | Path | Purpose |
|---|---|---|
| GET | `/?search=&filter=all\|favorites\|recipient\|manual\|import&tag=&sort=name\|recent\|most_sent\|newest&page=&pageSize=` | List with `stats` (`total, favorites, recipient, manual, imported, documents_sent, active_30d`) and `tags` (`[{ name, count }]`). Syncs first |
| GET | `/suggest?q=&limit=` | Recipient autocomplete: `id, name, email, company` (limit 1–500, default 8). Syncs first |
| GET | `/export` | CSV download |
| POST | `/sync` | Sync from sent requests now; returns `{ added, message }` |
| POST | `/import` | `{ contacts: [{ name, email, company, job_title, phone, tags, notes }] }` → `{ created, updated, skipped: [{ row, email, reason }] }` |
| POST | `/bulk-delete` | `{ ids }` — move to the trash |
| POST | `/bulk-tag` | `{ ids, tag, action: 'add' \| 'remove' }` |
| POST | `/` | Add a contact (201; 409 when the email exists) |
| GET | `/:id` | One contact with `documents` (latest 50 sent to them) |
| PUT | `/:id` | Update (partial) |
| POST | `/:id/favorite` | `{ favorite }`; toggles when omitted |
| DELETE | `/:id` | Move to the trash |

Adding and importing contacts are recorded in **Activity History** (category `contacts`).

---

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| A recipient is missing from Contacts | Only requests that were **sent** count (not drafts, not self-sign). Click **Sync** |
| A deleted contact does not come back after Sync | By design; restore it from **Settings → Trash**, add it again, or import it |
| Import says "No "Email" column was found" | The first row must be a header with an Email column (see the accepted names) |
| Import says "The file is larger than 2 MB" | Split the file |
| Suggestions do not appear on the Send page | The browser shows `datalist` suggestions as you type in the Email box; check that you have contacts and reload the page |
