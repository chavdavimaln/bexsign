# 22 — Sign Yourself

Documents you sign on your own: generate one, optionally place fields, sign it, download it, and email a copy to
whoever needs it. Nothing is ever sent for someone else's signature from here.

Pages: `client/src/pages/SignYourself.jsx` (hub), `client/src/pages/selfsign/SelfSignCreate.jsx` (the step flow),
`client/src/pages/selfsign/SelfSignDetail.jsx` (one document), and the shared field editor
`client/src/pages/DocumentEditor.jsx` in self-sign mode.
Server: `server/routes/selfSign.js` (`/api/self-sign`), `server/utils/selfSign.js`, `server/utils/pdfMerge.js`.
Tables: `self_sign_documents`, `self_sign_events`, `self_sign_shares`.

---

## 1. The five steps

```
1 Add documents ─▶ 2 Name & merge ─▶ 3 Prepare fields ─▶ 4 Sign ─▶ 5 Done
                        │                 (optional)
                        └─▶ "Finish here (document only)"
```

1. **Add documents** — upload from the device (drag and drop works), choose one or more of the 100 **templates**,
   or write a new document in BexSign. *Write a new one* opens a formatted editor with the same toolbar as the
   document editor: font and size, bold, italic, underline, strikethrough, super/subscript, text and highlight
   colour, alignment, line spacing, bullet and numbered lists, indent, and paragraph styles. The formatting is kept
   on the document and in the signed PDF (see [18 — Storage and PDFs](18-storage.md)).
2. **Name & merge** — name the document, rename/replace/remove the files it holds, add more, or merge several into
   a single file. *Merged pages become page images, so their text is no longer selectable; the originals are kept.*
3. **Prepare fields** — open the field editor and place a signature, date, full name, stamp and anything else.
   Skip it if you only needed the document: **Finish here (document only)** stops cleanly at step 2.
4. **Sign** — in the editor the primary action is **Sign & finish**: it signs with your default signature stamp
   and completes the flow. There is no Send button and no recipient panel; the only signer is you.
5. **Done** — the document's own page, with the signed PDF, the certificate of completion, sharing and history.

---

## 2. The hub and its tabs

`/sign-yourself` shows counters and four tabs, each with search and pagination:

| Tab | Stage | Meaning |
|---|---|---|
| **Generated** | `draft` | the document exists, no fields placed — download it or add fields later |
| **Ready to sign** | `prepared` | fields are placed, waiting for you to sign |
| **Signed** | `signed` | signed by you; signed PDF and certificate available |
| **Shared** | — | the ones you emailed to somebody, with who and when |

The sidebar has an entry for each, under **Signatures → Sign Yourself**, plus *All documents* and *New document*.

---

## 3. One document

The detail page shows where the document stands in the five steps, the files it holds, what to do next, and two
further tabs:

- **History** — every change: created, document added, replaced, removed, merged, renamed, fields placed, signed,
  downloaded, printed, and every copy emailed. Each entry records who did it and from which IP address.
- **Shared with** — each recipient of a copy, when it was sent, and whether the email succeeded.

Actions: download the signed PDF or the certificate, email a copy (the signed documents and certificate are
attached), print, rename, replace a document, add more, or delete the whole thing.

---

## 4. What it shares with "Send for signatures"

The field editor is the same component, so placing fields feels identical. In self-sign mode it:

- uses the signed-in user as the only recipient (no hard-coded account),
- hides the recipient/send machinery,
- swaps **Send** for **Sign & finish**, which marks the document prepared, signs it and returns you to its page.

Underneath, a self-sign document is a normal `documents` row, so signed PDFs, certificates, fingerprints and
Document Validity all work exactly as they do for a sent request.

---

## 5. Endpoints — `/api/self-sign`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | list (stage, search, pagination) + counters |
| POST | `/` | create from an upload, a template or a blank document |
| GET | `/:id` | one self-sign document with its files |
| GET | `/document/:documentId` | find the self-sign record behind a document (used by the editor) |
| PATCH | `/:id` | rename |
| POST | `/:id/documents` | add documents |
| PUT | `/:id/documents/:fileId` | replace one |
| DELETE | `/:id/documents/:fileId` | remove one |
| POST | `/:id/merge` | merge selected documents into a single file |
| POST | `/:id/prepare` | recount fields and mark it ready to sign |
| POST | `/:id/complete` | sign it and finish |
| GET | `/:id/download` | the signed PDF (or the document as it stands) |
| POST | `/:id/share` | email a copy `{ email, name, message }` |
| GET | `/:id/history` | every event |
| DELETE | `/:id` | delete |
| GET | `/signatures` | your own signature stamps, to choose which one signs |

Every route is scoped to the signed-in user: another account's self-sign document returns **404**.

---

## 6. Tables

**`self_sign_documents`** — `id, user_id, document_id (UNIQUE), title, stage ('draft'|'prepared'|'signed'),
source ('upload'|'template'|'created'|'merged'), template_name, has_fields, field_count, page_count, signed_at,
signed_file_path, created_at, updated_at`.

**`self_sign_events`** — `id, self_sign_id, document_id, action, detail, actor_id, actor_name, ip_address,
created_at`.

**`self_sign_shares`** — `id, self_sign_id, document_id, recipient_email, recipient_name, message, status,
error_message, shared_by, shared_at`.

Merging is done by `server/utils/pdfMerge.js` with `pdfjs-dist` + `pdfkit` — no extra dependency, and the source
files are never modified.
