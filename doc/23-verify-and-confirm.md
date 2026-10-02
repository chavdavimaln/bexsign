# 23 — Verify & Confirm a Completed Request

A final checkpoint: once everyone has signed, the sender verifies that the signed documents are exactly what
BexSign issued, and confirms the request. Senders who do not need that step switch it off per request.

Client: the checkbox in `client/src/pages/SendForSignatures.jsx`, the panel in
`client/src/components/DocumentVerificationPanel.jsx` (shown on the document page), the reject / correction dialog
in `client/src/components/VerificationRejectDialog.jsx`.
Server: `server/routes/verification.js` (`/api/verification`), `server/utils/documentVerification.js`,
`reopenRecipientsForCorrection` in `server/utils/requestHelpers.js`, `sendCorrectionRequestEmail` in
`server/utils/emailService.js`.
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
   - **Reject** — review what was signed, then reject only or send it back for correction (section 2).
4. Every check and decision is added to the record's own event history, and each integrity check is also written to
   the Document Validity log (`source = 'auto'`).

If the checkbox was off, no record is created and nothing about the request changes.

---

## 2. Rejecting, and sending back for correction

**Reject** opens a two-step dialog.

**Step 1 — Review signed data.** Every signer is listed with everything they entered: text, dates, ticked boxes,
chosen options and the signature picture. The confirmer ticks each field that is **not correct** and may add a note
per field ("What is wrong?"). Ticking a field selects its recipient; **Ask to correct** selects a recipient without
naming a field (they review everything and sign again). Fields the sender set as read-only cannot be ticked, and
stamps are not listed. Recipients with nothing ticked are left alone.

**Step 2 — Reason and delivery.** A reason is always required. Then one of:

| Choice | What happens |
|---|---|
| **Reject only** | Request stays Completed, verification becomes `rejected`. Nobody is told. |
| **Send back for correction** | Only the selected recipients are reopened and told. |

For a correction the confirmer picks the channels: **Email** and, only when an SMS provider is really set up on the
server (`smsReady`), **SMS**. A recipient without a phone number is reached by email only.

What a correction does (`reopenRecipientsForCorrection`):

1. Each selected recipient goes back to `sent`; their signature and initials are cleared; the ticked fields are
   emptied and marked (`options.correction = { note, requestedAt }`); everything else they entered stays filled in.
2. Recipients who were not selected keep their signature and are **not** emailed.
3. The request returns to **In Progress**, the issued PDFs are withdrawn, verification becomes `correction` and
   the panel lists who was asked, what for, and how they were told (Emailed / SMS sent / Waits for their turn).
4. "Sign in order" requests: only the recipient whose turn it is gets the message now; the others wait
   (`pending`) and receive the same correction email when their turn comes.
5. On the signing page the recipient sees an amber banner with the reason and the fields to correct; those fields
   carry an amber ring and a "!" marker.
6. When the last of them has signed again the request is Completed again, new PDFs are issued, everyone gets the
   completed documents, and verification is back to **Awaiting confirmation**.

A request that was rejected with **Reject only** shows **Send back for correction** in the panel, which opens the
same dialog (the earlier reason is filled in) so the recipients can still be asked later.

While a correction is open the documents list and the recipient rows show a **Correction requested** badge.

---

## 3. What "verified" actually checks

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

## 4. Who may confirm

The request's owner, or any user holding `security.document_validity`. Everyone else sees the state but gets
`canConfirm: false`, and the server answers **403** if they try.

---

## 5. Endpoints — `/api/verification`

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/:documentId` | — | record, events, and whether the caller may confirm |
| POST | `/:documentId/check` | — | re-run the integrity check only |
| POST | `/:documentId/confirm` | `{ note }` | check, then confirm |
| GET | `/:documentId/review` | — | every signer with the data they entered, and `smsReady` |
| POST | `/:documentId/reject` | `{ reason, corrections?, channels? }` | check, then reject (reason required) |
| PUT | `/:documentId/setting` | `{ required }` | change the setting while the request is still a draft |

`corrections` is `[{ recipientId, fieldIds: [], notes: { [fieldId]: "…" } }]`; `channels` is `{ email, sms }`
(email is the default). Without `corrections` the call is a plain rejection.

Refusals you can expect: a correction with neither channel chosen → 400; a correction where none of the chosen
recipients has signed → 400; confirming before the request is Completed → 400; confirming twice → 400; rejecting without
a reason → 400; changing the setting after the request was sent → 400; unknown document → 404.

---

## 6. Tables

**`document_verification`** — `id, document_id (UNIQUE), required, status ('pending'|'confirmed'|'rejected'|
'correction'|'not_required'), integrity_result, integrity_message, confirmed_by, confirmed_at, note, rejected_reason,
correction_details (JSON: requestedAt, requestedBy, channels, recipients[{ id, name, email, fields, emailed, sms,
waitingTurn }]), created_at, updated_at`.

**`document_verification_events`** — `id, document_id, action ('required'|'not_required'|'awaiting'|'checked'|
'confirmed'|'rejected'|'correction'), actor_id, actor_name, result, message, created_at`.

**`document_recipients`** gains `correction_note` and `correction_requested_at`; both are cleared when the
recipient signs again.

---

## 7. Note on requests completed before this existed

A request with no verification row is treated as **required**, so anything completing from now on waits to be
confirmed. To make it opt-in instead, set `DEFAULT_REQUIRED = false` in `server/utils/documentVerification.js`.
