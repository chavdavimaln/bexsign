# 29 — Mail Merge Template

**Send for signatures > Add document > Mail merge template**: one template, a personal copy for every recipient.
Each row of recipient data becomes **its own signature request**, so nobody sees another person's copy.

Use it for offer letters, renewals, NDAs for a list of vendors — anything where the wording is the same and only a
few values (name, date, amount) change.

It needs no configuration.

Client: `client/src/components/documents/MailMergeModal.jsx`.
Server: `POST /api/documents/mail-merge` in `server/routes/documents.js`.

---

## 1. Merge fields

A merge field is a name in **square brackets** in the template text:

```
This Agreement is made on [Effective Date] between [Company Name] and [Client Name].
```

- The same convention the template library already uses for its placeholders, so every library template works.
- Names are matched without regard to capitals or extra spaces: `[client name]` and `[Client Name]` are one field.
- A field used several times is filled everywhere.
- A field left empty for a recipient **stays in the document** as `[Field name]`; the wizard counts and warns.

---

## 2. The three steps

### Step 1 — Template

1. **Choose a template** opens the template picker (library and *My templates*).
2. The wizard lists the merge fields it found and shows the text.
3. **Edit text** lets you change the wording for this merge and add or remove fields; the list updates as you type.
   The saved template is not changed.

### Step 2 — Recipients

One row per recipient: **Name**, **Email** (required) and one column per merge field.

- **Add row** and type, or
- **Import CSV**:
  1. **Download sample CSV** gives a file with the right column headings for this template.
  2. Fill it in Excel or Google Sheets and save as CSV (comma, semicolon or tab separated all work; quoted cells may
     contain commas and line breaks).
  3. **Import CSV** shows which file column fills each value. Columns whose heading matches a field name, or
     common headings such as *Full Name* and *E-mail*, are chosen for you; change any of them, then **Import**.
  4. Imported rows are added below the rows already typed and stay editable.

Checks: an invalid or missing email blocks the next step and is marked in red; an email listed twice is flagged
(allowed — it creates two requests); empty merge values are tinted amber. Up to **500** recipients per merge.

### Step 3 — Review

- The preview shows the document as each recipient receives it; the arrows step through the recipients. Unfilled
  fields are highlighted.
- **Send now** — every recipient is emailed their own request immediately. A **signature block for that recipient is
  placed under the text** (and the signing date, if ticked). Needs the *Send documents* permission.
- **Save as drafts** — one draft per recipient, without fields. Open each from **Sent documents > Draft**, place
  the fields exactly where you want them in the editor, and send.
- Options applied to every request: days to complete, a note shown in the email, and whether each completed
  document goes through **Verify & confirm** ([23](23-verify-and-confirm.md)).

A progress bar runs while the requests are created. The result lists every recipient with **Sent**, **Draft** or
**Failed** and an **Open** link. **Try the failed rows again** repeats only the rows that were not created.

---

## 3. What is created

For each row:

| | |
|---|---|
| Request name | `<Template name> - <Recipient name>.pdf` |
| Document text | the template with that row's values merged in |
| Recipient | the row's name and email, role *Needs to sign*, delivered by email |
| Fields (Send now) | Signature (required), and Sign date when ticked, listed under the text |
| Description | `Mail merge MM-XXXXXXXX from "<Template name>"` — the batch number shared by all requests of one merge |
| Status | *In Progress* (Send now) or *Draft* |

From there each request is an ordinary request: it appears in the documents list, can be reminded, recalled,
verified, downloaded with its own certificate, and reports count it individually.

Every request of a merge starts with the template name, so searching the documents list for it shows them together.

---

## 4. Endpoint

`POST /api/documents/mail-merge` — needs `documents.create`; `mode: "send"` also needs `documents.send`.

```json
{
  "templateName": "Service Agreement",
  "content": "… between [Company Name] and [Client Name] …",
  "mode": "send",
  "addSignDate": true,
  "noteToAll": "Please sign by Friday",
  "daysToComplete": 15,
  "requireVerification": true,
  "batchId": null,
  "rows": [
    { "name": "Asha Patel", "email": "asha@example.com", "values": { "company name": "Acme", "client name": "Asha Patel" } }
  ]
}
```

- At most **25 rows per call**. The wizard sends 5 at a time and passes the `batchId` returned by the first call to
  the following ones.
- The server performs the merge, so the stored text never depends on the browser.

Response:

```json
{
  "success": true,
  "batchId": "MM-MUV51ZYY",
  "mode": "send",
  "created": 1,
  "failed": 0,
  "results": [ { "index": 0, "name": "Asha Patel", "email": "asha@example.com", "status": "sent", "documentId": 123, "error": null } ]
}
```

`status` is `sent`, `draft` or `failed`. A row with a `documentId` **and** an `error` was created but its email could
not be delivered: open the request and send a reminder.

---

## 5. Good to know

- **Emails are real.** "Send now" emails every recipient at once. Check the preview of a few rows first, or use
  "Save as drafts" for the first run. On a test server set `EMAIL_DRY_RUN=true` to write emails to
  `server/email_outbox` instead.
- **One recipient per request.** A document that needs two signers per copy (for example the client and a manager)
  is better sent as drafts: add the second recipient and the fields in each draft.
- **Field position.** "Send now" lists the signature under the text rather than at a chosen spot on the page. For a
  signature at an exact position, use "Save as drafts" and place it in the editor.
- **Square brackets in ordinary text** (for example `[30]` days in a library template) are treated as merge fields
  too. Fill them in, or remove the brackets with **Edit text**.
- The older **Bulk Send** page (`/documents/sent/bulk`) is a non-functional mock-up and is not connected to this
  feature.
