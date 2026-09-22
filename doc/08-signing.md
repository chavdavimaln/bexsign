# 08 — Signing (the recipient's side)

What happens after a recipient receives the email. Page: `client/src/pages/PublicSigning.jsx`, route
`/documents/sign/:id?email=…`. Server: `server/routes/signing.js`, mounted at `/api/signatures`.

Related: [06 — Send for Signatures](06-sending-signatures.md), [12 — Signatures](12-signatures.md).

---

## 1. Opening the link

The invitation email contains `CLIENT_URL/documents/sign/:documentId?email=<recipient>`. No account is needed.
Before anything is shown, the server checks that:

- the request still exists and is open (not completed, recalled, declined, expired or trashed);
- the email is a recipient of that request — otherwise the attempt is written to `failed_access_logs`
  (source `signing_link`) and the page shows "This email address is not a recipient of the document";
- the recipient still has to act (not already signed);
- **it is their turn** — with "Send in order", a recipient in a later step is told who the request is waiting for.

The first time the document is opened, the owner is notified and a `viewed` event is recorded.

---

## 1b. Agreeing to sign electronically

Before signing, the recipient agrees to the **Electronic Record and Signature Disclosure**. The agreement is
recorded once, with the time and the IP address it came from (`document_recipients.consent_at`), appears in the
activity history as **TERMS AGREED**, and is printed on the certificate of completion. A recipient who has already
agreed is not asked again - unless the request is edited and a new signing round starts, when consent is asked for
the new version.

`POST /api/signatures/consent` `{ documentId, email }` records it; an email that is not a recipient is refused
and logged.

## 2. What the recipient sees

- The documents of the request, page by page, with the fields assigned to them.
- Fields belonging to other recipients are **not** sent to the browser while the request is in progress. The one
  exception is the *"In order, showing completed fields"* flow, where fields an earlier recipient already completed
  are included **read-only**, shown with their signer's name and a "Digitally Certified & Verified" marker.
- A guided mode walks through the required fields one by one.

---

## 3. Creating the signature

Three ways, in the signing modal:

| Method | Result |
|---|---|
| **Type** | The name rendered in a cursive style (four styles) |
| **Draw** | A canvas drawing, stored as a PNG |
| **Upload** | An image file of a handwritten signature |

A blank canvas or an empty image is rejected (`server/utils/signatureValidation.js` counts visible ink), so a
signature can never be empty. If the signer already has a saved signature for that email it is offered as a prefill;
another person's signature is never offered.

---

## 4. Finishing

On **Finish**:

1. Every field belonging to that recipient is stored — values in `document_fields.options` and an append-only row in
   `document_field_values`.
2. The recipient is marked `signed`, with the time, IP address and device recorded for the certificate.
3. Their signature is saved to their signature directory entry for next time.
4. The request either moves to the next step (the next recipients are emailed immediately) or, when nobody is left,
   becomes **Completed**: signed PDFs and the certificate of completion are generated, fingerprinted and emailed to
   everyone, and the owner is notified.

---

## 5. The other actions a recipient has

| Action | What it does |
|---|---|
| **Decline** | Closes the request with a reason; the sender is emailed and notified |
| **Assign to someone else** | Hands the turn to another email, recorded as delegated, and emails them |
| **Print and physically sign** | Uploads a scanned signed copy, which completes their part without an electronic signature |
| **Download** | The document as it stands |
| **Comments** | Left for the sender when the request allows comments |

---

## 6. Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/signatures/token/:documentId?email=` | The document, the recipient and the fields they may see |
| `POST /api/signatures/consent` | Records the agreement to the signing disclosure |
| `POST /api/signatures/viewed` | Records the first open |
| `POST /api/signatures/save` | Saves a signature draft |
| `POST /api/signatures/submit` | Completes this recipient's part |
| `POST /api/signatures/decline` | Declines with a reason |
| `POST /api/signatures/assign` | Delegates to another email |
| `POST /api/signatures/physical-copy` | Uploads a scanned signed copy |
| `GET /api/signatures/history/:token` | The request's event history |

---

## 7. Evidence kept for every signature

`document_recipients` (signed time, IP, user agent, signature image), `signature_events` (machine-readable events),
`activity_history` (the readable timeline), `document_identifiers` (the BexSign ID and audit hash), and
`issued_pdf_fingerprints` (the SHA-256 of each issued PDF, used by Settings → Document Validity to prove a file has
not been altered).
