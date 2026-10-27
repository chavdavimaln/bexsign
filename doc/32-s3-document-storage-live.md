# 32 — Storing Documents in AWS S3 on the Live Server

How to switch BexSign from keeping documents on the server's own disk to keeping them in the S3
bucket, and how to move the documents that already exist. The mechanism behind it is described in
[31-doc-bucket.md](31-doc-bucket.md); this page is the runbook.

| | |
|---|---|
| Bucket | `bexone-esign` |
| Region | `us-east-1` |
| Credentials | already filled in at `server/.env.production` (that file is **not** in git) |
| Switched on by | `DOC_BUCKET_PROVIDER=s3` |

> The access key and secret are only in `server/.env.production` on purpose. `.gitignore` excludes
> `.env*` apart from `.env.example`, so they are never committed. Never paste them into this
> folder, a ticket, a chat or a screenshot. If they ever leak, rotate them in the AWS console
> (IAM → the user → Security credentials → create a new key, update `.env.production`, restart the
> API, then delete the old key).

---

## 1. What changes, and what does not

Stored in S3 from the moment it is switched on, each in its own folder:

| Folder | What |
|---|---|
| `documents/<year>/<month>/` | documents uploaded for signature, and the ones written in the app |
| `completed/<document id>/` | signed PDFs and the certificate of completion |
| `templates/` | template files |
| `physical/` | scans of copies signed on paper |
| `merged/` | documents merged in Sign yourself |
| `previews/` | page pictures of a scan or an image, shown in the editor |

Every one of these is both **written to** and **read from** S3: a download, a re-send and an email
attachment all come out of the bucket. Profile pictures (`avatars/`) are the one exception — they
are still written to the server's own disk.

What does **not** change:

- **Links already sent out keep working.** The API keeps serving `/uploads/...`; when a file is not
  on the disk it is streamed from S3 at the same address. Signing links in emails already
  delivered, PDFs linked from the Reports module, avatars in the header — all unaffected.
- **Documents uploaded before the switch keep their addresses.** They sit at the top level of the
  bucket (`1764512345678-contract.pdf`) rather than under `documents/`, and resolve exactly as
  before. Only new uploads are filed by month.
- **The database keeps its `file_path` values.** The new `storage_key` columns say where the file
  is; nothing existing is rewritten.
- **The app and the signing flow are untouched.** No client change, no API change.
- **Emails still carry the PDFs as attachments.** They are read from the bucket when needed.

---

## 2. Before you start

Check all five. The first two are the ones that actually bite.

1. **`DB_PASSWORD` in `server/.env.production`.** That file was written with `DB_PASS` and
   `SMTP_PASS`, but the API reads `DB_PASSWORD` and `SMTP_PASSWORD`. Both names now work, so the
   old file is no longer a blocker — but confirm the database password is really set:

   ```bash
   cd server && node -e "require('dotenv').config({path:'.env.production'});console.log('db password set:', Boolean(process.env.DB_PASSWORD || process.env.DB_PASS))"
   ```

2. **The S3 packages are installed on the server.** They are listed in `server/package.json`, so
   `npm install` brings them; on a server updated by hand run it explicitly:

   ```bash
   npm install --omit=dev --prefix server
   ```

3. **A backup of `server/uploads`** — the migration only copies, but take one anyway:

   ```bash
   tar czf /backup/bexsign-uploads-$(date +%F).tar.gz /var/www/bexsign/server/uploads
   ```

4. **A database dump**, because the migration adds columns:

   ```bash
   mysqldump -u <user> -p <database> > /backup/bexsign-db-$(date +%F).sql
   ```

5. **The IAM user can do what it needs to** on this bucket — §6 has the policy.

---

## 3. Going live, step by step

Run these on the live server, in this order.

```bash
cd /var/www/bexsign
```

**1. Put the live settings in place.** The API reads `server/.env`, so the production file has to be
the one in use — copy it, or point your process manager at it:

```bash
cp server/.env server/.env.backup-$(date +%F)
cp server/.env.production server/.env
```

Confirm `server/.env` now contains:

```ini
DOC_BUCKET_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIA…           # already filled in
AWS_SECRET_ACCESS_KEY=…           # already filled in
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=bexone-esign
DOC_BUCKET_LOCAL_CACHE=true
```

**2. Apply the database migration** (adds columns and the ledger table; changes no data):

```bash
npm run db:migrate --prefix server -- --dry-run    # read the plan first
npm run db:migrate --prefix server
```

Expected: `202610261200_doc_bucket_storage.sql`, one table created, 14 columns added.

**3. Check the bucket answers** before moving anything:

```bash
npm run bucket:check --prefix server
```

It prints the provider, the bucket and the region, confirms `Bucket write, read and delete: OK`,
and lists what it would copy. Nothing is written yet.

**4. Copy the existing documents up.** Try a few first, then the rest:

```bash
node server/scripts/docbucket-migrate.js --apply --limit 20
node server/scripts/docbucket-migrate.js --apply
```

Each file is read back out of S3 and compared by SHA-256; a mismatch is reported and the local file
is kept. Interrupting is safe — run it again and it carries on.

**5. File the older uploads into folders.** Documents stored before the folders existed sit at the
top level of the bucket. This moves them into `documents/<year>/<month>/` and rewrites the paths
the database holds — see [31 §8](31-doc-bucket.md):

```bash
npm run bucket:tidy --prefix server          # dry run: every move it would make
npm run bucket:tidy:apply --prefix server
```

Skip it only if you are happy with loose files at the top of the bucket; nothing breaks either way.

**6. Restart the API:**

```bash
pm2 restart bexsign-api        # or: systemctl restart bexsign
pm2 logs bexsign-api --lines 30
```

Expected in the log:

```
[Doc bucket] Documents are stored in s3: bexone-esign (local copies: on)
[Doc bucket] Write, read and delete verified
```

**7. Check it from outside** — §5.

---

## 4. Keeping the local copies, or not

`DOC_BUCKET_LOCAL_CACHE=true` (the default and the recommendation) keeps a copy of each document on
the server as well. S3 holds the authoritative copy; the local one makes the PDF pipeline and
repeat downloads fast and free.

Only when the server's disk is tight:

```bash
node server/scripts/docbucket-migrate.js --verify --apply          # prove every copy matches
node server/scripts/docbucket-migrate.js --apply --delete-local    # then free the disk
```

Then set `DOC_BUCKET_LOCAL_CACHE=false` and restart. Documents are fetched from S3 as needed, which
costs a little latency on first use and a little egress.

Optional: `DOC_BUCKET_REDIRECT=true` sends the browser straight to a signed S3 link for downloads
instead of streaming through the API — less server bandwidth, at the cost of the bucket address
being visible to the browser. Signed links expire after `DOC_BUCKET_SIGNED_URL_SECONDS` (900 by
default). This needs the CORS rule in §6.

---

## 5. Verifying after the switch

| Check | Expected |
|---|---|
| `curl -s https://<site>/api/health` | `"documentStorage":"s3"` |
| `npm run bucket:status --prefix server` | every area `verified`, nothing `failed` or `missing` |
| Send a new document for signature | arrives, email received |
| Sign it to the end | the signed PDF and the certificate arrive as attachments |
| `aws s3 ls s3://bexone-esign/completed/ --recursive \| tail` | the new files are there |
| Open an **older** document's signed PDF | still opens (served from S3 at `/uploads/...`) |
| Upload a profile picture | shows in the header |
| Settings → Document Validity, upload a signed PDF | reported `valid` |

The last two matter most: they prove the compatibility path and the fingerprint record survived.

---

## 6. AWS side

**IAM policy** for the user whose key is in `.env.production` — exactly what BexSign needs,
nothing more:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BexSignObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::bexone-esign/*"
    },
    {
      "Sid": "BexSignList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::bexone-esign"
    }
  ]
}
```

**Recommended bucket settings**

| Setting | Value | Why |
|---|---|---|
| Block all public access | **On** | BexSign serves files itself or with signed links; the bucket never needs to be public |
| Versioning | **On** | A wrong delete can be undone. Without it, a bucket is not a backup |
| Default encryption | SSE-S3 (or SSE-KMS) | Signed agreements at rest |
| Lifecycle rule | keep noncurrent versions 30–90 days | Caps the cost of versioning |

**CORS** — only needed with `DOC_BUCKET_REDIRECT=true`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://sign.example.com"],
    "ExposeHeaders": ["Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 7. Going back

The local copies are still on the server (unless `--delete-local` was used), so rolling back is one
setting and a restart:

```bash
# in server/.env
DOC_BUCKET_PROVIDER=local
```

```bash
pm2 restart bexsign-api
```

The API reads from `server/uploads` again. The added database columns are harmless when unused, so
there is nothing to undo there. Documents created while S3 was on are in the bucket — if local
copies were deleted, pull them back down first:

```bash
# still with DOC_BUCKET_PROVIDER=s3
node server/scripts/docbucket-migrate.js --status     # see what is only in the bucket
```

and copy those keys back into `server/uploads` (same paths) before switching the setting.

---

## 8. If something is wrong

| Symptom | Cause and fix |
|---|---|
| `[Doc bucket] The "s3" doc bucket is not usable (…). The server's own disk is used instead.` | The settings did not load. Check `DOC_BUCKET_PROVIDER`, `AWS_BUCKET` and the keys in the `.env` the API actually reads, then restart. Uploads keep working on the local disk meanwhile |
| `The S3 doc bucket needs the AWS SDK` | `npm install --omit=dev --prefix server` |
| `[Doc bucket Warning] The bucket is not writable: … AccessDenied` | The IAM policy in §6 is missing, or the key belongs to another account |
| `… SignatureDoesNotMatch` | The secret is wrong — most often a line break or a stray space when it was pasted. Re-paste it as one line |
| `… PermanentRedirect` / `AuthorizationHeaderMalformed` | Wrong region. The bucket is in `us-east-1`; set `AWS_DEFAULT_REGION` to match |
| `… NoSuchBucket` | Typo in `AWS_BUCKET`, or the bucket is in another AWS account |
| Older documents give 404 | The migration did not run, or not fully. `npm run bucket:status --prefix server`, then `node server/scripts/docbucket-migrate.js --apply` |
| New documents work, older ones are slow the first time | Normal with `DOC_BUCKET_LOCAL_CACHE=false`: the first read fetches from S3 |
| `MISMATCH` lines during the migration | The bucket copy differs from the local file. The local file was kept. Run the migration again for that area; if it repeats, the local file is likely damaged — check it opens |
| Document Validity says `unknown` for an old PDF | Unrelated to storage: `issued_pdf_fingerprints` holds the hashes, and the migration does not touch them. Check the file was issued by this installation |

Logs: `pm2 logs bexsign-api`. Every doc bucket message is prefixed `[Doc bucket]`.

---

## 9. Cost, roughly

For a few thousand agreements a month in `us-east-1`, with `DOC_BUCKET_LOCAL_CACHE=true` (so reads
mostly come from the server's disk):

| | |
|---|---|
| Storage | ~$0.023 per GB per month |
| Uploads | ~$0.005 per 1,000 PUT requests |
| Downloads | ~$0.0004 per 1,000 GET requests |
| Transfer out | first 100 GB per month free, then ~$0.09 per GB |

Signed PDFs and certificates are a few hundred KB each, so a few thousand documents is a few GB —
cents a month in storage. Versioning roughly doubles stored bytes until the lifecycle rule expires
old versions. Check the current AWS pricing page before quoting these.
