# 18 — File Storage and PDFs

Where files live, how signed PDFs are produced, and what must be backed up.

---

## 1. Layout on disk

```
server/uploads/
├── <timestamp>-<original-name>.pdf     uploaded documents
├── completed/<documentId>/
│   ├── 01-<document>.pdf               signed copy, one per document in the request
│   └── certificate-of-completion.pdf   the audit certificate
├── physical/                           scanned "signed on paper" copies
└── merged/                             documents merged in Sign yourself
```

Served read-only at `/uploads/...` by `server/index.js`. In the client, build the URL with `apiUrl('/uploads/...')`
from `client/src/utils/api.js` — never a hard-coded host.

**Limits:** 25 MB per file, up to 40 files per request (multer, `server/routes/documents.js`). Behind NGINX also
raise `client_max_body_size`, or large uploads fail before they reach Node.

---

## 2. Documents can be files or text

A request can hold both:

- **Uploaded files** — `document_files.file_path` points into `server/uploads/`.
- **Documents written in the app** (templates, the rich-text editor) — the body lives in
  `document_files.document_text`, and the PDF is generated when needed.

Text written with the formatting toolbar is stored as HTML. When the signed PDF is produced,
`completedPdfGenerator.htmlToBlocks()` turns it into styled blocks, so headings, **bold**, *italic*, underline,
text colour, alignment and list bullets appear in the PDF as they do on screen. Plain-text documents keep the
older behaviour, where a line in capitals or numbered like `1. SCOPE` is treated as a heading.

---

## 3. How a signed PDF is produced

When the last recipient signs (`server/utils/requestCompletion.js`):

1. `completedPdfGenerator.js` renders each document with every completed field in place — signatures, initials,
   stamps, dates, text — plus the BexSign document ID on each page.
2. `pdfCertification.js` builds the **certificate of completion**: every signer with their email, the times they
   were emailed, viewed, agreed to the disclosure and signed, their IP address and device, the signing order used,
   and the document's audit hash. The signature printed for each signer is **the one they actually signed with** -
   their drawn or uploaded image, or the typed signature rendered in the style they chose. Values that do not exist
   are shown as `-`; nothing on a certificate is invented.
3. `pdfLock.js` applies a permissions password so the file cannot be casually edited.
4. `pdfFingerprints.js` stores the SHA-256 of every issued file in `issued_pdf_fingerprints`.
5. The files are attached to the completion email sent to every party.

Signed copies issued by an older layout are refreshed in the background at boot — no emails are re-sent.

---

## 4. Merging documents

`server/utils/pdfMerge.js` combines several PDFs into one using `pdfjs-dist` to read the pages and `pdfkit` to write
them, with no extra dependency. Source files are left untouched and the merged file is written next to them.

---

## 5. Verifying a file later

Settings → Document Validity (or `POST /api/documents/verify`) hashes an uploaded PDF and compares it with
`issued_pdf_fingerprints`: byte-identical → `valid`; built on an issued file but changed → `modified`; otherwise
`unknown`; not a PDF → `invalid`. Every check is recorded in `document_validity`.

---

## 6. Backup and housekeeping

| Path | Why it matters |
|---|---|
| `server/uploads/completed/` | The signed documents and certificates — the legal record |
| `server/uploads/` | Everything recipients were asked to sign |
| `server/uploads/physical/` | Hand-signed scans |
| `server/email_outbox/` | Dry-run only; safe to delete |

```bash
tar czf /backup/bexsign-uploads-$(date +%F).tar.gz /var/www/bexsign/server/uploads
```

Deleting a document row without its files leaves orphans on disk, and deleting files without the rows leaves the app
pointing at missing paths — use the Trash feature, which keeps both sides consistent.
