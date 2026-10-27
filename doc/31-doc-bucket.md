# 31 — The Doc Bucket (pluggable document storage)

One setting decides where every uploaded document, signed PDF, certificate of completion, avatar and
scanned copy is kept: the server's own disk, AWS S3, Azure Blob Storage or Google Cloud Storage.
Application code never names a folder or a provider — it asks the **doc bucket**.

For the live S3 setup with the real bucket and the go-live steps, see
[32-s3-document-storage-live.md](32-s3-document-storage-live.md).

| | |
|---|---|
| The one module | `server/utils/docBucket.js` |
| Providers | `server/utils/docBucketProviders/{local,s3,azure,gcs}.js` |
| Endpoints | `server/routes/docBucket.js` → `/api/doc-bucket/...` |
| Move existing files | `server/scripts/docbucket-migrate.js` |
| Database columns | `server/migrations/202610261200_doc_bucket_storage.sql` |

---

## 1. Choosing a store

`DOC_BUCKET_PROVIDER` in `server/.env`:

| Value | Keeps documents in | Extra packages |
|---|---|---|
| `local` *(default)* | `server/uploads` on this server | none |
| `s3` | AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| `azure` | Azure Blob Storage | `@azure/storage-blob` |
| `gcs` | Google Cloud Storage | `@google-cloud/storage` |

Every setting is listed with its comment in `server/.env.example`. The S3 packages ship with
BexSign; Azure and GCS are installed only if you choose them.

`local` is the default and behaves exactly as BexSign always has — same folders, same file names,
nothing to migrate. **Leaving the setting alone changes nothing.**

If a provider cannot start (package missing, bucket name empty, keys rejected) the server says so
once at boot and falls back to the local disk, so uploads keep working instead of failing.

---

## 2. Keys: the address of a file

A file is addressed by its **key**, which is the path it has under `server/uploads` today:

```
1764512345678-contract.pdf                      an uploaded request document
completed/12/01-contract.pdf                     the signed copy of document 1 of request 12
completed/12/certificate-of-completion.pdf       its certificate
avatars/7.png                                    a profile picture
physical/12-scan.pdf                             a copy signed on paper
merged/12-merged.pdf                             documents merged in Sign yourself
previews/1764512345678-scan-1.png                 page 1 of a scan, shown in the editor
```

Because the key *is* the old path, every `file_path` already in the database and every
`/uploads/...` address already sent in an email keeps working, whichever provider is switched on.

```js
bucket.keyFor('completed', String(docId), '01-contract.pdf')  // 'completed/12/01-contract.pdf'
bucket.keyFor('documents', bucket.safeFileName(file.originalname))
bucket.keyFromPath(row.file_path)   // a path already in the database -> its key
```

Areas: `documents`, `templates` (both at the root, as today), `completed`, `avatars`, `physical`,
`merged`, `previews`. `normalizeKey()` removes leading slashes, drive letters and `..` segments, so
a key can never point outside the bucket.

---

## 3. Using it from backend code

```js
const bucket = require('../utils/docBucket');
```

| Call | Does |
|---|---|
| `await bucket.put(key, buffer, { contentType })` | save; returns `{ key, size, provider }` |
| `await bucket.putFile(key, localPath)` | save a file that is already on disk |
| `await bucket.get(key)` | read as a Buffer |
| `await bucket.getStream(key)` | read as a stream (for piping to a response) |
| `await bucket.stat(key)` | `{ key, size, contentType, modified }` or `null` |
| `await bucket.exists(key)` | boolean |
| `await bucket.remove(key)` | delete |
| `await bucket.list(prefix)` | `[{ key, size, modified }]` |
| `await bucket.copy(fromKey, toKey)` | copy inside the bucket |
| `await bucket.url(key)` | the address to put in a page, an email or an API answer |
| `await bucket.ensureLocal(key)` | an absolute path `fs` can read, fetching the file if needed |
| `bucket.localPathFor(key)` | where this key lives (or would live) on this disk |
| `bucket.provider()` / `bucket.status()` | which store is in use |
| `await bucket.selfTest()` | write, read back and delete one tiny object |

### Saving a generated PDF

```js
const key = bucket.keyFor('completed', String(documentId), '01-contract.pdf');
await bucket.put(key, pdfBuffer, { contentType: 'application/pdf' });
await db.query('UPDATE document_files SET signed_file_path = ?, signed_storage_key = ? WHERE id = ?',
  [`/uploads/${key}`, key, fileId]);
```

### Accepting an upload

`bucket.multerStorage()` replaces `multer.diskStorage()` and still fills `req.file.path`,
`.filename` and `.size`, so the code after it does not change — it only gains `.key` and `.bucket`:

```js
// before
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 }
});

// after
const upload = multer({
  storage: bucket.multerStorage({ area: 'documents' }),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 }
});
```

### Sending a file to the browser

```js
const info = await bucket.stat(key);
if (!info) return res.status(404).json({ success: false, error: 'That file is no longer stored.' });
res.setHeader('Content-Type', info.contentType || bucket.contentTypeFor(key));
(await bucket.getStream(key)).pipe(res);
```

### Reading a file with `fs`

Code that must hand a real path to another library (pdfkit, pdfjs-dist, nodemailer attachments):

```js
const localPath = await bucket.ensureLocal(key);   // downloads it if this server does not have it
if (!localPath) throw new Error('That document is no longer stored.');
const pdf = fs.readFileSync(localPath);
```

---

## 4. Why nothing broke when this was added

Three things keep the existing modules working untouched:

1. **`local` is the default.** Same folders, same names, same `/uploads/...` addresses.
2. **`/uploads/...` keeps working on every provider.** `server/index.js` mounts
   `express.static` first and `docBucket.uploadsFallback()` straight after it. A document that
   lives only in a remote bucket is streamed from there *at the same address*, so links already
   saved in the database or already emailed to a signer still open. With `local` the fallback is a
   no-op costing one comparison.
3. **Local copies.** BexSign's PDF pipeline (`completedPdfGenerator.js`, `pdfCertification.js`,
   `pdfMerge.js`) reads and writes real files with `fs`. With a remote provider the bucket holds
   the authoritative copy and — while `DOC_BUCKET_LOCAL_CACHE` is on, the default — a copy stays
   under `server/uploads`, so that pipeline runs unchanged. `ensureLocal()` fills a gap on a server
   whose disk starts empty.

So a remote bucket is a **second, authoritative** home for documents rather than a rewrite of the
PDF code. Turning `DOC_BUCKET_LOCAL_CACHE` off makes the bucket the only copy; do that only after
the call sites in §6 have been moved over.

---

## 5. Checking it

```bash
npm run bucket:status --prefix server     # what the ledger holds, per area and state
npm run bucket:check  --prefix server     # dry run: what would be copied, plus a write test
```

At boot the API prints one line:

```
[Doc bucket] Documents are stored in s3: bexone-esign (local copies: on)
[Doc bucket] Write, read and delete verified
```

`GET /api/health` reports `documentStorage`. Signed in with the developer-settings permission:

| Endpoint | |
|---|---|
| `GET /api/doc-bucket/status` | provider, bucket, region, whether it is usable |
| `POST /api/doc-bucket/self-test` | writes, reads back and deletes one tiny object |
| `GET /api/doc-bucket/where?path=…` | where **one** document is: its key, whether S3 holds it, its size |
| `GET /api/doc-bucket/file/<key>` | streams one object (support and debugging) |

### Was *this* document served from S3?

`where` answers it for a single file. Pass the `file_path` the database stores — the same
`/uploads/...` address the app links to:

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/doc-bucket/where?path=/uploads/documents/2026/10/1793-contract.pdf"
```

```json
{
  "key": "documents/2026/10/1793-contract.pdf",
  "provider": "s3",
  "inBucket": true,
  "size": 678774,
  "cachedOnThisServer": true,
  "servedFrom": "s3"
}
```

`inBucket: true` with `provider: "s3"` means that exact file is in the S3 bucket. `servedFrom`
says which store is authoritative for it. `cachedOnThisServer` only says a copy is also on the
disk for speed (`DOC_BUCKET_LOCAL_CACHE`); the bucket still holds the real one.

Three more ways to confirm, strongest last:

1. **The boot line.** `[Doc bucket] Documents are stored in s3: bexone-esign` — if it says
   "on this server", the provider never switched and nothing is going to S3.
2. **The AWS console.** Open the bucket and look under `documents/<year>/<month>/`. A document
   uploaded a moment ago is there, with the same byte size the app shows.
3. **Take the disk away.** With `DOC_BUCKET_LOCAL_CACHE=false`, nothing is kept locally. If a
   download still works, it can only have come from S3.

---

## 6. Every document goes through the bucket

Nothing in the document pipeline writes or reads a file with `fs` any more. Switch the provider to
`s3` and *every* file below is in S3 — written there, read back from there, attached to emails from
there.

Written through the bucket:

| File | What it stores | Where it lands |
|---|---|---|
| `routes/documents.js` | documents added to a signature request | `documents/<year>/<month>/` |
| `routes/selfSign.js` | documents you sign on your own | `documents/<year>/<month>/` |
| `routes/templates.js` | template files | `templates/` |
| `routes/signing.js` | scans of copies signed on paper | `physical/` |
| `utils/requestCompletion.js` | the signed PDF of each document, and the certificate of completion | `completed/<request id>/` |
| `utils/pdfMerge.js` | documents merged in Sign yourself | `merged/` |
| `routes/documents.js` (`/extract-text`) | page pictures of a scan or an image | `previews/` |

Read through the bucket:

| File | What it reads |
|---|---|
| `utils/requestCompletion.js` | the issued PDFs, to send or re-send them |
| `utils/emailService.js` | every attachment, as bytes — so a mail carries a document kept only in S3 |
| `utils/pdfMerge.js` | each source document of a merge |
| `utils/documentVerification.js` | each issued PDF, to hash and compare it |
| `routes/selfSign.js` | the stored copy behind a download |

Use `bucket.putByPath(filePath, buffer)` and `bucket.readByPath(filePath)` for anything new: both
take the `/uploads/...` path the database already stores, so no caller has to know the provider.

Still on `fs`, and unaffected by the provider:

| File | Why it stays |
|---|---|
| `routes/settings.js` | avatars — move with `bucket.put(bucket.keyFor('avatars', name), buffer)` when convenient |
| `utils/pdfCertification.js` | the server's own signing key and certificate: machine identity, not a document |
| `utils/completedPdfGenerator.js` | reads a font file shipped with the app |

---

## 7. What the database records

`server/migrations/202610261200_doc_bucket_storage.sql` adds, next to every stored path, the store
that holds it and the key it has. Additive only: existing rows keep their `file_path` and are
marked `local`, which is where those files are.

| Table | Columns added |
|---|---|
| `documents` | `storage_provider`, `storage_key` |
| `document_files` | `storage_provider`, `storage_key`, `signed_storage_key` |
| `document_versions` | `storage_provider`, `storage_key` |
| `document_recipients` | `physical_copy_storage_key` |
| `self_sign_documents` | `storage_provider`, `signed_storage_key` |
| `templates` | `storage_provider`, `storage_key` |
| `issued_pdf_fingerprints` | `storage_provider`, `storage_key` |

Plus `doc_bucket_objects`, the bucket's own ledger — one row per object, with its size, content
type, SHA-256, where it came from and its state:

| `status` | Means |
|---|---|
| `pending` | found on disk, not copied yet |
| `stored` | in the bucket |
| `verified` | in the bucket and its SHA-256 matches the local copy |
| `missing` | the row points at a file that is in neither place |
| `failed` | the copy was attempted and did not work (`error_text` says why) |

That ledger is what lets a half-finished move be resumed instead of restarted.

Apply it with `npm run db:migrate` (see [30-database-migration.md](30-database-migration.md)).

---

## 8. Moving the existing documents into a bucket

`server/scripts/docbucket-migrate.js` copies what is already on the server into the configured
bucket, verifies each copy by reading it back and comparing SHA-256, and records everything in the
ledger.

```bash
cd server
node scripts/docbucket-migrate.js                      # dry run: what would be copied
node scripts/docbucket-migrate.js --apply              # copy everything missing
node scripts/docbucket-migrate.js --apply --prefix completed   # one area only
node scripts/docbucket-migrate.js --apply --limit 50   # a first trial run
node scripts/docbucket-migrate.js --verify --apply     # re-read every object, compare checksums
node scripts/docbucket-migrate.js --status             # counts per area and state
node scripts/docbucket-migrate.js --db-only            # only fill the database columns
node scripts/docbucket-migrate.js --apply --delete-local  # free the disk after a verified copy
```

Safe to stop and re-run: a file already in the bucket with the same size is skipped, and nothing is
deleted unless `--delete-local` is given. Keep a backup of `server/uploads` until a `--verify` run
reports no problems.

### Tidying up documents stored before the folders existed

Uploads made before §2's folders were introduced sit at the top level of the bucket, mixed in with
the folders. `server/scripts/docbucket-reorganize.js` files them where new ones go and rewrites
every path the database holds, so nothing in the app notices:

```bash
cd server
npm run bucket:tidy                                    # dry run: every move it would make
npm run bucket:tidy:apply                              # do it
node scripts/docbucket-reorganize.js --apply --limit 20       # a first trial run
node scripts/docbucket-reorganize.js --apply --include-orphans  # also files no row points at
node scripts/docbucket-reorganize.js --apply --keep-source      # copy, leave the old object
```

```
1793113657323-contract.pdf   ->  documents/2026/10/1793113657323-contract.pdf
1764512345678-template-nda.pdf  ->  templates/1764512345678-template-nda.pdf
1790000000000-merged-pack.pdf   ->  merged/1790000000000-merged-pack.pdf
```

The month comes from the timestamp BexSign puts at the front of every stored file name, so a
document keeps the date it arrived. Each file is copied inside the bucket, the copy is checked
against the original, the database is updated, and only then is the old object removed — so an
interrupted run leaves the original where it was and simply re-runs. Files already in a folder are
never touched, and `sample.pdf` (the placeholder a text-only document points at) is left alone.

Do it **before** switching the provider if you can: moving objects on local disk is quicker and
cheaper than copying them inside S3 afterwards. Afterwards is fine too — the script works against
whichever store is switched on.

> Every address the database holds is rewritten, so the app, its downloads and its emails follow
> the files. A `/uploads/...` address written down by hand somewhere outside the database would
> not; use `--keep-source` if anything relies on the old one.

---

## 9. Backup

| Provider | What to back up |
|---|---|
| `local` | `server/uploads` (see [18-storage.md](18-storage.md)) |
| `s3` | Turn on bucket **Versioning**, and a lifecycle rule or cross-region replication |
| `azure` | Soft delete + blob versioning on the container |
| `gcs` | Object Versioning on the bucket |

A bucket is not a backup on its own: a wrong delete is still a delete. Versioning is what makes it
one. The signed PDFs and certificates under `completed/` are the legal record.
