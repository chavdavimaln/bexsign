# 34 — Reading an Uploaded Document

What happens between the moment somebody picks a file and the moment that file appears on the page
in the editor. The short version: **the file is opened and read**, so the page shows the document
they chose — not a stand-in written from its file name.

---

## 1. Why this exists

BexSign draws a document as text on an A4 sheet (`components/documents/DocumentPage.jsx`), and
places signature fields at positions on that sheet. So a request cannot just hold a PDF: it needs
the *contents* of the PDF.

Before this, only `.txt` and `.md` files were read in the browser; a PDF, a Word file, a scan or a
picture fell back to `getDefaultDocContent()` — the standard agreement wording in
`client/src/utils/documentDefaults.js`. That wording is still the right answer for a document
somebody starts from scratch, but for an uploaded file it meant the sender saw, and the signer
signed, text that was never in their file.

---

## 2. Where a file is read

| Added from | Read by |
|---|---|
| Add documents (the computer, drag and drop) | `POST /api/documents/extract-text` |
| Replace this document | the same |
| Add document > Cloud | `POST /api/cloud/:provider/import`, on download |
| Create document > Desktop upload | `POST /api/documents/upload`, on the server |
| Templates > upload a file | `POST /api/templates/create`, on the server |

All five end in the same reader, `server/utils/fileText.js`, so a file read in one place reads the
same way everywhere.

---

## 3. What is read out of each kind of file

`fileText.readDocumentContent(buffer, name, { storePage })` answers with one of three shapes:

| Kind | When | What comes back |
|---|---|---|
| `text` | a PDF with a text layer, `.docx`, `.doc`, `.rtf`, `.txt`, `.md` | the words of the document |
| `image` | a picture (`.png`, `.jpg`, `.gif`, `.webp`), or a scan — a PDF with no text layer | HTML with `<img>` tags, one per page, pointing at the doc bucket |
| `none` | an unreadable or unsupported file | nothing; the caller falls back to the standard text |

Details worth knowing:

- **PDF** is read with `pdfjs-dist`, line by line and column by column. A line that reached the
  right margin was wrapped by the original page width, so it is joined to the next one: the text
  reflows in the BexSign page instead of keeping the line breaks of a different page size.
- **A scan** has pages but no text. Each page is drawn into a PNG (`pdfjs-dist` +
  `@napi-rs/canvas`, the same pair the signed-PDF pipeline uses), saved in the doc bucket under
  `previews/`, and referenced from the HTML — so the sender sees the actual pages. At most 30
  pages are drawn.
- **`.docx`** is a ZIP; `word/document.xml` is inflated and its paragraphs taken.
- **`.doc`** (Word 97-2003) is an OLE compound file. Word scatters the characters through the
  `WordDocument` stream and keeps a *piece table* saying where each piece is and whether it is
  8-bit or 16-bit, so the table is followed. A file whose table cannot be read falls back to the
  readable runs of the stream.
- Fewer than 20 characters is treated as no text at all: that is page furniture (a stamp, a page
  number), not a document.

---

## 4. When a file cannot be read

Nothing fails. The document is still added, still uploaded and still sent — only its text falls
back to the standard wording, and the sender is told so and pointed at **Edit content**:

> `invoice.jpg` has no readable contents, so the standard text was used.

The same message, with the reason, appears when the server cannot be reached at all. A picture or
scan on a server without `@napi-rs/canvas` lands here too.

---

## 5. Where the file itself goes

Reading and storing are separate. `extract-text` holds the file in memory and stores nothing but
the page pictures of a scan; the file is uploaded when the draft is saved, through
`POST /api/documents/upload`, into the doc bucket — the server's own disk, or S3 when one is
configured. See [31 — The Doc Bucket](31-doc-bucket.md) and
[32 — Documents in AWS S3](32-s3-document-storage-live.md).

---

## 6. Limits

| | |
|---|---|
| File size | 25 MB, as everywhere else |
| Files per call | 40 |
| Pages read for text | 150 |
| Pages drawn as pictures | 30 |
| Text stored per document | 400 000 characters |
