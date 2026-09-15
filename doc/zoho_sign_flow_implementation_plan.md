# BexSign – Zoho Sign "Send for signatures" Flow: Implementation Plan

Reference: Zoho Sign request flow — **Add documents → Add recipients → Add fields (per document, per recipient) → Send → Recipients sign (in order) → Completed documents + certificate emailed to everyone**.

## 0. Findings (root causes of the reported error)

| # | Symptom | Root cause |
|---|---------|------------|
| 1 | Two recipients added on "Add recipients", editor right panel shows only one | `GET /api/documents/:id` synthesises a single fake recipient from `documents.recipient_email` when `document_recipients` has no rows, and `DocumentEditor.fetchDocumentDetails` then **overwrites** the recipients passed from step 1. "Open in Editor" also navigated without saving recipients to the server. |
| 2 | Fields of several documents collapse onto one document after reload | Editor loads the flat `doc.fields` list into `fieldsByDoc[activeDocIndex]` instead of `doc.fieldsByDoc`; `docIndex` is not re-indexed when a document is removed. |
| 3 | "Save & close" on a new request saves nothing | `handleSaveAndClose` references an undefined `documentName` (ReferenceError swallowed) and never creates the draft. |
| 4 | Signer 1 cannot finish when signer 2 has fields | Signing page counts every field (including other recipients' fields) as required; submit always sends `recipientId: 1`. |
| 5 | Completion email / attachments unreliable | `express.json()` default 100 KB limit rejects the base64 PDFs sent on submit; PDFs are built in the last signer's browser with only that signer's signature. |
| 6 | Re-sending/re-saving resets recipient progress | Every save/send `DELETE`s and re-inserts `document_recipients` (new ids, statuses reset). |
| 7 | Emails show hard-coded sender, org and expiry | Sender/expiry/private message are literals in `routes/documents.js`. |

## Phase 1 – Server foundation
- Raise JSON/urlencoded body limit (signature images, attachments).
- Idempotent schema additions (`ADD COLUMN IF NOT EXISTS`): recipient `role_label`, `delivery_mode`, `private_note`, `viewed_at`; `document_files.signed_file_path`.
- Shared helpers: `utils/requestHelpers.js` – recipient upsert that **keeps ids/status by email**, role mapping, sender lookup (`users`), expiry date.
- `GET /:id` marks synthesised recipients as `isFallback` so clients never trust them over real data.
- Upload route matches files to documents by an explicit upload key (no index guessing) and returns the saved `files` so the client does not re-upload.

## Phase 2 – Step 1: Add documents & recipients (`SendForSignatures.jsx`)
- Multiple documents + multiple recipients persisted to the server.
- **Auto-save as Draft** (debounced) as soon as a document/recipient exists; URL switches to `/documents/:id/send` so refresh keeps the draft.
- "Save & close" → saves draft → Drafts list. New **Discard** button → confirm → draft removed.
- Recipient validation (email format, duplicates, at least one signer), drag to reorder, real CSV bulk import, "Add me" uses the logged-in user.

## Phase 3 – Step 2: Field editor (`DocumentEditor.jsx`)
- Recipients load: server (real rows) → navigation state → local cache; never replaced by a fallback.
- Right panel (Zoho style): recipient selector showing every recipient with colour, order number, role and field count; "Receives a copy" recipients cannot receive fields.
- Left panel lists every document with its own page count and field count; fields are stored and reloaded **per document**.
- Auto-save draft; Actions → Save & close / Discard; Back returns to step 1.
- Send validation (Zoho rule): every recipient who signs must have at least one field; confirm dialog shows per-recipient field counts; send result is checked (no false success).
- Zoho limits applied: max 25 recipients, max 40 documents / 25 MB per file.

## Phase 4 – Send & signing (`routes/documents.js`, `PublicSigning.jsx`, `routes/signing.js`)
- Send keeps recipient ids, emails the first signing group (sequential — recipients with the same order number sign in parallel) or all signers (parallel) with real sender, expiry and private note. "Receives a copy" recipients are not emailed at send time; they receive the completed copy.
- Signing page: only the current recipient's fields are required/editable; others are locked; out-of-turn and already-signed states are shown.
- Submit stores values per field and per recipient (signature image stored on the field), marks the correct recipient, then notifies the next signer group.

## Phase 5 – Completion & email with PDFs
- Server generates one signed PDF **per document** (all recipients' values and signature images) plus a **Certificate of Completion** PDF, stored under `uploads/completed/<id>/`.
- "Document completed" email to the sender and every recipient (signers, approvers, receives-a-copy) with all PDFs attached.
- SMTP settings from `.env` (`SMTP_PASSWORD` or `SMTP_PASS`, secure flag by port); optional `EMAIL_DRY_RUN=true` writes `.eml` files for local testing.

## Phase 6 – Responsive
- Editor: documents panel and fields panel become toggleable drawers below `lg`; canvas auto-fits width; header actions wrap.
- Signing sheet and step 1 fit a 375 px viewport.

## Phase 7 – Verification
- Production build, smoke test of every route, end-to-end run: 2 documents × 2 recipients (sequential) → fields per document → send → both sign → status Completed → email with 2 signed PDFs + certificate.

## Status (2026-09-16)

All phases implemented and verified.

| Check | Result |
|-------|--------|
| API flow test (2 docs, 2 sequential signers + 1 "Receives a copy") | 25/25 checks passed (draft ids stable, fields per document, masking, out-of-turn 409, copy recipient 403, completion) |
| Browser flow (request 28) | Autosaved draft → both recipients shown in the editor → fields per document persisted after reload → Send → signer 1 → signer 2 invited automatically → signer 2 → Completed |
| Completion email | Sender and every recipient received 3 attachments: 2 signed PDFs + Certificate of Completion (verified with `EMAIL_DRY_RUN=true`) |
| "Email to me" | Sends the signed PDFs + certificate |
| SMTP | Connection verified at server start |
| Responsive | 375 px: app sidebar is a drawer, editor fits the page (auto zoom) with Documents / Fields drawers, signing page fits |
| Build / routes | `vite build` passes; every route loads without console errors; DocumentsList remind/recall/extend/reminder-settings/upload-signed now reach the server (route aliases) |

### Known limits / follow-ups
- Documents are rendered from their text content (existing design). Uploaded files are stored, but the original PDF pages are not rendered in the editor, and signed PDFs are generated from the text + fields rather than stamped onto the uploaded PDF.
- Signing links identify the recipient by `?email=` (no per-recipient token or OTP yet).
- "Send later (Schedule)" and "Decline" are still UI-only.
- New dependency: `pdfkit` in `server/package.json`.
