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
Job title, Checkbox, Radio group, Dropdown, plus custom fields. Each field stores its page, position, size and the
recipient it belongs to.

Every field has a **Field name** (`label`), a **Data label** (`dataLabel`, the name it has in the form data), a
**Description** (`description`, the help text the signer sees on the field and in the guided callout) and
**Required**. The choice fields add (property sections in `client/src/components/documents/FieldSettings.jsx`):

| Field | Properties | Stored value |
|---|---|---|
| Checkbox | Read only, Checked (ticked when the signer opens the document), Checkbox value (`optionValue`, what ticking it means), "Show the value next to the box" (`showLabel`) | `value` `true`/`false`; the form data records the checkbox value when ticked |
| Radio group (`Radio`) | Radio button values (`options: [{ id, value }]`, at least two, add/remove/in bulk), the default (the circle in front of a value), Layout (`direction` vertical/horizontal), "Show the values next to the buttons" (`showLabels`) | `value` = the chosen value |
| Dropdown | Options (same list), default value, Read only, Formatting | `value` = the chosen option |

**Labels beside a field.** The sender chooses, with a five-tile picker (Hidden, Left, Above, Right, Below), where
a label is written beside a field. It is shown in the editor, at signing, in the document view and in the signed
PDF (`FieldLabel.jsx` on the page, `drawSideLabel()` in the PDF generator):

- `labelPosition`: the **field name**, for every field except a checkbox (hidden by default).
- `valuePosition`: the **checkbox value** beside its box (older checkboxes with `showLabel` count as "right").
- `valuesPosition`: the **radio button values** beside their buttons (default "right"; `showLabels: false` counts
  as hidden). Above/below needs a taller row, which the editor sets when that position is chosen.

**Placeholder.** Text, Company, Full name, Email, Job title, Sign date, Dropdown, Signature and Initial fields
have a Placeholder section: a switch (`showPlaceholder`, on by default) and the text (`placeholder`; when empty
the field name, the date format or "--select--" is used, see `fieldPlaceholder()` in `fieldSizing.js`). It is what
the empty field shows the signer; turned off, the field is empty (a signature box shows only its pen). A
placeholder is a hint while signing and is never printed on the document. In the editor a field without a
placeholder shows its name with a crossed-out eye, so the sender can still tell the fields apart.

The buttons of a radio group share the group's box evenly (`radioLayout()` in `client/src/utils/fieldSizing.js`),
so stretching the box lines them up with the text. A required checkbox must be ticked; a required radio group or
dropdown needs one of its values. A **read-only** field keeps the value the sender set: the server ignores what the
browser sends for it, and a radio group or dropdown only accepts one of its own values.
A field belongs to the recipient in its `assigneeEmail` first, then the recipient row, then the assignee label.

The editor refuses to send while a signer has no field, and points at the recipient that is missing one.

### Placing and resizing

A field is one box with a 1px border in its recipient's colour; the selected field has the full colour and a soft
glow. It can be dragged anywhere on the page, also over or inside the text, and resized with its handles (or the
Size inputs in the property panel) down to 24 x 14 px, small enough for one line of text. `sized: true` marks a
field whose saved width and height are its box; fields saved before resizing existed keep their old footprint
(`getFieldBox()` in `client/src/utils/fieldSizing.js`, mirrored by `fieldBox()` in
`server/utils/completedPdfGenerator.js`).

### Fields stay where they were placed

The editor, the signing page and the document view draw their pages with the same component
(`client/src/components/documents/DocumentPage.jsx`), and `BexDocumentSheet` puts every field at its saved page,
position and size, so the text and the fields line up the same way everywhere.

The server builds the signed PDF without a browser. When a request is saved or sent from the editor, the client
sends a **layout snapshot** per document (`client/src/utils/layoutSnapshot.js`): where every line of text, border
and image sits on the page. It is stored in `document_files.layout_snapshot`, and the PDF generator draws the text
from it and the fields at their positions. A page longer than A4 is cut into A4 pages between lines. A document
without a snapshot, or whose text changed after the snapshot was taken (`bodyKey` no longer matches), is drawn the
older way: the text, then the fields listed under it.

A request that was sent without a snapshot (before snapshots existed, or while an older server was running) gets
one later: when a signed-in user with "Send documents" opens it in the document view, or downloads, prints or
emails its PDF, the client takes the snapshot (`client/src/utils/layoutBackfill.js`) and posts it to
`POST /api/documents/:id/layouts`. The server stores it only when it writes the document's own text, never
replaces one that is already stored, and clears the stored signed PDFs so the next download rebuilds them with the
fields in place. PDFs that were already emailed keep the older layout.

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
