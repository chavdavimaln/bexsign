# 12 — Signatures

Your saved signature stamps, the organisation's signature directory, and the record of every document each
signature has signed.

Page: `client/src/pages/SignaturesModule.jsx` (`/signatures`).
Server: `server/routes/signatureDirectory.js` (`/api/signature-directory`), `server/utils/signatureStore.js`.
Tables: `user_signatures`, `signature_usage_log` (plus the legacy `employee_signatures`).

---

## 1. Two tabs

| Tab | What it holds | What you can do |
|---|---|---|
| **My signatures** | The signatures you own | Create, edit, delete, set the default, see usage history, copy the signature ID |
| **Team directory** | Everyone else's signatures | Look at them to recognise a stamp. Nothing else. |

Other people's signatures are confidential: the directory shows no edit or delete controls, and the server refuses
any change with **403 — "This signature belongs to another user and is protected."** Ownership is decided by
`user_signatures.owner_user_id`, falling back to a case-insensitive match on `owner_email`.

Both tabs keep the card grid you already know (name, employee code, designation • department, email, stamp
preview, status badge), plus a list view, search, status filter and pagination.

---

## 2. Creating and editing

Three methods, as before:

| Method | Stored as |
|---|---|
| **Type** | a font style — the image is cleared, so the styled name is what renders |
| **Draw** | a PNG from the canvas |
| **Upload** | the image file you choose |

> **The bug that used to hide your change:** switching an existing signature to **Type** sent no image, the server
> kept the old one (`COALESCE`), and the stamp renders an image in preference to a style — so the card looked
> untouched. The API now distinguishes "field not sent" (keep) from "explicitly cleared" (set to NULL), the Type
> method clears the image, and a failed save reports the real error instead of a success message.

One signature can be the **default**: it is offered when you sign, and used when you sign a document yourself.

---

## 3. Usage history

Every time a saved signature signs something, one row is written to `signature_usage_log`:

| Context | Written when |
|---|---|
| `signing_request` | you signed a document somebody sent you |
| `self_sign` | you signed your own document in Sign yourself |
| `directory_prefill` | your saved signature prefilled a signing page |
| `manual` | anything else |

The card shows **used N×**, and "Usage history" opens a timeline: the document name and status, when it was signed,
how many fields, and a link to the document. The header also reports total uses and when the signature was last
used. History is private — asking for someone else's returns 403.

---

## 4. How it fits the signing flow

- When a signer opens a signing page, BexSign offers **their own** saved signature. Another person's signature is
  never offered (this used to fall back to a hard-coded account).
- When someone signs, their signature is saved back so it is ready next time, and the usage row is written.
- The legacy `employee_signatures` table is still the directory the signing flow reads, and is kept in step with
  `user_signatures` on every change, so nothing in the older flow breaks.

---

## 5. Endpoints — `/api/signature-directory`

| Method | Path | Notes |
|---|---|---|
| GET | `/mine` | your signatures, in full |
| GET | `/directory` | everyone else's, read-only (`canEdit: false`) |
| POST | `/` | create one of your own |
| PUT | `/:id` | edit — 403 unless you own it |
| DELETE | `/:id` | delete — 403 unless you own it |
| POST | `/:id/default` | make it your default |
| GET | `/:id/history` | usage history — 403 unless you own it |

All of them require a signed-in user.

---

## 6. Tables

**`user_signatures`** — `id, owner_user_id, owner_email, display_name, employee_code, designation, department,
initials, signature_id (UNIQUE), method ('type'|'draw'|'upload'), signature_image, signature_style, is_default,
status, legacy_employee_id, created_at, updated_at`.

**`signature_usage_log`** — `id, signature_id, owner_email, document_id, document_name, context, recipient_id,
signer_name, signer_email, field_count, ip_address, used_at`.

Existing `employee_signatures` rows were copied into `user_signatures` on first boot (matched to users by email,
linked through `legacy_employee_id`); the migration is idempotent and never duplicates.
