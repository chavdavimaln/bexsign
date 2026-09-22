# 23 — Verify & Confirm a Completed Request

A final checkpoint: once everyone has signed, the sender verifies that the signed documents are exactly what
BexSign issued, and confirms the request. Senders who do not need that step switch it off per request.

Client: the checkbox in `client/src/pages/SendForSignatures.jsx`, the panel in
`client/src/components/DocumentVerificationPanel.jsx` (shown on the document page).
Server: `server/routes/verification.js` (`/api/verification`), `server/utils/documentVerification.js`.
Tables: `document_verification`, `document_verification_events`.

---

## 1. How it behaves

1. While creating a request, **"Verify and confirm the document when everyone has signed"** sits with the other
   options in More settings. It is **on by default**; unticking it skips the whole step for that request.
2. When the last recipient signs, a verification record is created with status **pending**, the owner is notified,
   and the document page shows **Awaiting confirmation**.
3. Opening the document, the owner (or anyone with `security.document_validity`) can:
   - **Check again** — re-run the integrity check on its own,
   - **Verify & confirm** — run the check, record it, and confirm with an optional note,
   - **Reject** — record a reason instead of confirming.
4. Every check and decision is added to the record's own event history, and each integrity check is also written to
   the Document Validity log (`source = 'auto'`).

If the checkbox was off, no record is created and nothing about the request changes.

---

## 2. What "verified" actually checks

Each signed PDF and certificate that BexSign issued for the request was fingerprinted (SHA-256) at the moment it was
produced. Verification re-reads the stored files and compares them with that registry:

| Result | Meaning |
|---|---|
| `valid` | every issued file still matches its fingerprint |
| `modified` | a file was built on an issued PDF but has changed since |
| `unknown` | a file is not recognised |

The message spells it out, for example: *"2 issued documents checked: every fingerprint matches the copy BexSign
issued."* A `modified` or `unknown` result does **not** block confirmation — it is recorded and shown prominently so
the person confirming decides with the facts in front of them.

---

## 3. Who may confirm

The request's owner, or any user holding `security.document_validity`. Everyone else sees the state but gets
`canConfirm: false`, and the server answers **403** if they try.

---

## 4. Endpoints — `/api/verification`

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/:documentId` | — | record, events, and whether the caller may confirm |
| POST | `/:documentId/check` | — | re-run the integrity check only |
| POST | `/:documentId/confirm` | `{ note }` | check, then confirm |
| POST | `/:documentId/reject` | `{ reason }` | check, then reject (reason required) |
| PUT | `/:documentId/setting` | `{ required }` | change the setting while the request is still a draft |

Refusals you can expect: confirming before the request is Completed → 400; confirming twice → 400; rejecting without
a reason → 400; changing the setting after the request was sent → 400; unknown document → 404.

---

## 5. Tables

**`document_verification`** — `id, document_id (UNIQUE), required, status ('pending'|'confirmed'|'rejected'|
'not_required'), integrity_result, integrity_message, confirmed_by, confirmed_at, note, rejected_reason,
created_at, updated_at`.

**`document_verification_events`** — `id, document_id, action ('required'|'not_required'|'awaiting'|'checked'|
'confirmed'|'rejected'), actor_id, actor_name, result, message, created_at`.

---

## 6. Note on requests completed before this existed

A request with no verification row is treated as **required**, so anything completing from now on waits to be
confirmed. To make it opt-in instead, set `DEFAULT_REQUIRED = false` in `server/utils/documentVerification.js`.
