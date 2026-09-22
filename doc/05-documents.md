# 05 — Documents

Everything that lists, opens or acts on a signing request.
Pages: `DocumentsList.jsx` (`/documents/...`), `DocumentDetails.jsx` (`/documents/:id`),
`DocumentViewer.jsx`, `CompletedDocumentViewer.jsx`. Server: `server/routes/documents.js`, `server/routes/trash.js`.

---

## 1. The lists

The sidebar splits the same table by status:

| List | Shows |
|---|---|
| All Documents | everything the user may see |
| Sent | requests the user sent |
| Received | requests where the user is a recipient |
| Scheduled | send scheduled for later |
| In Progress | sent, waiting on at least one signer |
| Completed | every signer signed |
| Declined / Expired / Recalled | closed without completion |
| Draft | never sent |
| Trash | moved to the bin, restorable |

Each list supports search, folder filtering, sorting, selection and bulk actions. Visibility follows the document
permissions (`documents.view_own` / `view_team` / `view_all`).

---

## 2. Document details

- Status, owner, documents in the request, expiry and the BexSign document ID.
- **Recipients** with their step number and state: pending → sent → viewed → signed (or declined), with the time,
  IP address and device where available.
- **Timeline** — every event: created, sent, emailed, viewed, signed, reminded, recalled, completed.
- **Signing flow** — whether the request goes out in order or all at once, whether completed fields are shared, who
  it is waiting on, and the log of every signing email.
- Downloads: the signed document, the certificate of completion, or the document as it stands.

---

## 3. The action bar

Along the top of a document: **View document · Edit · Completion certificate · Email document**, then everything
else behind the **⋯** menu:

| Action | What it does |
|---|---|
| Download | Choose documents, the certificate, or both; merge them into one PDF; and lock the file with a password |
| Edit as new | Copies the request into a new draft, leaving the original untouched |
| Print | Prints the locked PDF, never the web page, so a printed copy is never editable |
| Form data | Every field value per recipient, with a CSV download |
| Activity history | The full audit trail, with a CSV export |
| Versions | Earlier generated copies of the documents |
| View legal disclosure | The disclosure text, and who agreed to it and when |
| Copy document ID | The BexSign document ID |
| Send reminder / Correct document / Extend | While the request is in progress |
| Delete | Moves the request to the bin |

## 4. Actions on a request

| Action | Condition | Effect |
|---|---|---|
| Send | Draft with recipients and fields | Emails the first step (or everyone, in "all at once") |
| Remind | In Progress | Re-emails the recipients whose turn it is |
| Recall | In Progress | Closes the request; recipients are told it was withdrawn |
| Extend | In Progress | Moves the expiry date |
| Correct | In Progress | Re-opens the request for editing |
| Upload signed copy | In Progress | Attaches a hand-signed scan |
| Email a copy | any | Emails the current document |
| Clone | any | A fresh draft with the same documents and recipients |
| Move to trash / restore / delete | owner or `documents.delete` | Trash keeps the row; delete removes it permanently |

---

## 5. Completion

When the last signer finishes: the status becomes **Completed**, signed PDFs and the certificate of completion are
generated and fingerprinted, everyone is emailed a copy, and the owner is notified. From there the request is
read-only; the files stay downloadable and verifiable ([18 — Storage](18-storage.md)).

---

## 6. Verifying a document later

**Settings → Document Validity** checks any PDF against the fingerprint registry and reports `valid`, `modified`,
`unknown` or `invalid`, recording each check. A request may also be set to require an explicit
**verify & confirm** step once it completes — see [06 — Send for Signatures](06-sending-signatures.md).

---

## 7. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/documents` | the lists |
| `GET /api/documents/:id` | one request (fields are scoped to the viewer) |
| `POST /api/documents/upload` | create or update a draft, with files |
| `POST /api/documents/:id/save` | documents, fields and recipients |
| `POST /api/documents/send/:id` | send |
| `GET /api/documents/:id/signing-flow` | flow, who it waits on, the email log |
| `POST /api/documents/:id/remind` / `recall` / `extend` / `correct` | in-flight actions |
| `POST /api/documents/verify` | check a PDF against the fingerprint registry |
| `GET /api/documents/:id/activity` | the audit trail (`?format=csv` downloads it) |
| `POST /api/documents/:id/bundle-pdf` | documents and/or certificate, merged and optionally password-protected |
| `GET /api/documents/:id/signed-pdf` / `certificate-pdf` | downloads |
| `POST /api/trash/move/:id` / `restore/:id` / `delete/:id` | the bin |
