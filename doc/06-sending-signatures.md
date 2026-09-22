# 06 — Send for Signatures

The module that turns documents into a signing request: `/documents/create` (or `/send-for-signatures`) for the
request, then the editor at `/documents/:id/edit` for placing fields, then sending.

Related: [08 — Signing](08-signing.md) for the recipient's side, [09 — Templates](09-templates.md),
[16 — Database](16-database.md) for the tables.

---

## 1. The flow

```
Add documents ──▶ Add recipients ──▶ More settings ──▶ Continue (editor)
                                                          │
                                                 place fields per recipient
                                                          │
                                                 Send ──▶ confirm dialog ──▶ emails go out
```

1. **Add documents** — upload (PDF/Word/image, 25 MB each, up to 40), pick one or more **templates**, or write a new
   document in the editor. Template text stays editable ("Edit text" / "Replace with a template").
2. **Add recipients** — email, name, role, delivery mode, and a private note per recipient. Drag to reorder, or type
   the step number; recipients sharing a number are treated as one step.
3. **More settings** — days to complete, automatic reminders and their frequency, document type, folder,
   description, comments, and a note to all recipients. New requests start from the organisation defaults in
   Settings → General.
4. **Continue** opens the editor, where every signer needs at least one field before the request can be sent.
5. **Send** shows a confirmation with exactly who is emailed now and who follows.

Drafts autosave. Leaving the page keeps the request in **Draft**.

---

## 2. Recipient roles

| Role | Meaning |
|---|---|
| Needs to sign | Must complete their fields and sign |
| In-person signer | Signs on the sender's device |
| Approver | Approves without signature fields |
| Receives a copy | Gets the completed document, never signs |
| Reviewer | Reviews, no signature required |

---

## 3. Signing order and field visibility

Two checkboxes in **Add recipients** decide how the request is delivered. They map to the three flows stored in
`document_signing_flow.mode`:

| Checkboxes | Mode | Emails | What the next recipient sees |
|---|---|---|---|
| Send in order ✓ + Show completed fields ✓ | `sequential_shared` | recipient 1 first; recipient 2 is emailed only once 1 has signed, and so on | the signature, stamp, date and text the earlier recipients completed, read-only |
| Send in order ✓ | `sequential_private` | same one-at-a-time order | only their own fields |
| neither | `parallel_private` | everyone at the same time | only their own fields |

- Recipients with the **same step number** are emailed together and sign in parallel inside that step.
- A recipient who opens the link before their turn is told: *"It is not your turn to sign yet. Waiting for …"*.
- The default for a new request comes from **Settings → General → Default signing order**.
- Every signing email is recorded in `signing_email_dispatch` with its step and what triggered it
  (`send`, `next_in_order`, `reminder`), and `GET /api/documents/:id/signing-flow` returns that log with who the
  request is currently waiting on.

---

## 4. Fields

Placed per recipient in the editor: Signature, Initial, Stamp, Full name, Email, Sign date, Text, Split text,
Job title, Checkbox, plus custom fields. Each field stores its page, position, size and the recipient it belongs to.
A field belongs to the recipient in its `assigneeEmail` first, then the recipient row, then the assignee label.

The editor refuses to send while a signer has no field, and points at the recipient that is missing one.

---

## 5. Settings that affect delivery

| Setting | Effect |
|---|---|
| Days to complete | Expiry date shown in emails and on the request |
| Automatic reminders + frequency | Reminder emails to recipients whose turn it is |
| Note to all recipients | Message in the invitation email |
| Private note per recipient | Message only that recipient sees |
| Allow comments | Recipients may leave comments while signing |

---

## 6. After sending

- Status becomes **In Progress**; the document detail page shows each recipient's state
  (pending → sent → viewed → signed).
- The sender is notified on view, sign, decline and completion.
- **Recall** stops an in-progress request; **Extend** moves the expiry; **Remind** re-emails the current step.
- When everyone has signed the request becomes **Completed**: signed PDFs and a certificate of completion are
  generated, fingerprinted (`issued_pdf_fingerprints`) and emailed to every party.

---

## 7. Endpoints used

| Action | Endpoint |
|---|---|
| Create / update a draft | `POST /api/documents/upload` |
| Save documents, fields, recipients | `POST /api/documents/:id/save` |
| Send | `POST /api/documents/send/:id` |
| Signing flow + email log | `GET /api/documents/:id/signing-flow` |
| Change the flow of a draft | `PUT /api/documents/:id/signing-flow` |
| Remind | `POST /api/documents/:id/remind` |
| Recall | `POST /api/documents/:id/recall` |
| Extend | `POST /api/documents/:id/extend` |
