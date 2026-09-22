# 17 — Email

Every email the product sends goes through **`server/utils/emailService.js`** (nodemailer). Add new mail there so
dry-run mode, the shared layout and the attachment handling keep working.

---

## 1. Configuration

`server/.env`:

```ini
SMTP_HOST=smtp.example.com
SMTP_PORT=465          # 465 = SSL, 587 = STARTTLS
SMTP_SECURE=true       # defaults to true when the port is 465
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=...      # Gmail: an app password, not the account password
SMTP_FROM_NAME=BexSign
CLIENT_URL=https://sign.example.com   # the address inside signing links
EMAIL_DRY_RUN=false
```

`CLIENT_URL` is what recipients click. If it points at `localhost` on a live server, every signing link in every
email is dead.

**Dry run.** `EMAIL_DRY_RUN=true` writes each message — headers, HTML and PDF attachments — to
`server/email_outbox/<timestamp>-<type>-<recipient>.eml` instead of sending it. Open those files in any mail client.
This is the right setting for development and staging, and must be `false` in production.

At boot the server reports which mode it is in:

```
[SMTP] EMAIL_DRY_RUN=true: emails are written to server/email_outbox instead of being sent
[SMTP] Connected to smtp.example.com:465 as no-reply@example.com
```

---

## 2. The messages

| Sender | When |
|---|---|
| `sendSignatureRequestEmail` | A recipient's turn begins — on send, and again for each later step in an "in order" flow |
| `sendReminderEmail` | Manual reminder, or the automatic reminder frequency |
| `sendRecipientSignedEmail` | To the sender when someone signs, naming who is next |
| `sendDocumentCompletedEmail` | Everyone has signed: signed PDFs + certificate of completion attached |
| `sendDocumentCopyEmail` | "Email me a copy" of a document |
| `sendDocumentDeclinedEmail` | A recipient declined, with the reason |
| `sendDocumentRecalledEmail` | The sender recalled the request |
| `sendSigningDelegatedEmail` | A recipient handed their turn to someone else |
| `sendPasswordResetEmail` | Reset link (single use, expires) |
| `sendPasswordChangedEmail` | Confirmation that a password changed |
| `sendNotificationEmail` | The email copy of an in-app notification, when the category has email enabled |
| `sendReportEmail` | A scheduled report, with the export attached |

Every send returns `{ success, error }` — the caller records the outcome instead of throwing, so a mail failure
never breaks a signing flow. Failures are written to `email_logs`, to the document's audit trail, and raised as a
notification to the sender.

---

## 3. The signing sequence

Which recipients are emailed, and when, is decided by the request's signing flow
(see [06 — Send for Signatures](06-sending-signatures.md)):

- `parallel_private` — everyone at send time.
- `sequential_shared` / `sequential_private` — step 1 at send time; the next step is emailed the moment the previous
  step finishes signing.

Each message is recorded in `signing_email_dispatch` (recipient, step, type, trigger, status, error), which is what
`GET /api/documents/:id/signing-flow` returns.

---

## 4. Attachments

Completion emails attach the signed PDF of every document in the request plus the certificate of completion, taken
from `server/uploads/completed/<documentId>/`. They are generated before the email is queued, so a completion mail
never arrives without its documents.

---

## 5. Troubleshooting

| Symptom | Cause | Check |
|---|---|---|
| Nothing arrives, no error | `EMAIL_DRY_RUN=true` | `server/email_outbox/` and the boot `[SMTP]` line |
| `Invalid login` / `535` | Wrong credentials; Gmail needs an app password | `SMTP_USER`, `SMTP_PASSWORD` |
| `ETIMEDOUT` on send | The host blocks outbound SMTP | Try port 587, or ask the hosting provider |
| Links point at localhost | `CLIENT_URL` unset | Set it and restart |
| Mail lands in spam | No SPF/DKIM for the sending domain | Configure DNS for the domain in `SMTP_USER` |
| "Email to X could not be delivered" notification | The address bounced | The reason is in `email_logs` and on the document timeline |
