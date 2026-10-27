# 35 — Recovering a Deleted Document

Something deleted for good used to be gone. Its rows went, their children went with them by
cascade, and the files stayed in storage with nothing left to say what they were — bytes nobody
could identify.

Now, **just before those rows go**, BexSign copies the files into `archive/` and writes down what
was deleted. There is no screen and no API for reading it back: recovering a deleted document takes
access to the server, which is the point of it.

---

## 1. What is covered, and when

Three kinds are archived:

| Kind | What it is |
|---|---|
| `document` | a signature request, with its documents, signed copies and certificate |
| `self_sign` | a document signed on your own ([22](22-sign-yourself.md)) |
| `template` | a template and its file ([09](09-templates.md)) |

A saved signature and a contact are not: neither has a stored file, and both are quicker to enter
again than to recover.

| What the user did | Archived as |
|---|---|
| Emptied the trash, or deleted an item from it | `deleted from the trash` |
| Left it in the trash until the retention period ended | `retention period ended` |
| Discarded an unsent draft (`DELETE /api/documents/:id?permanent=true`) | `draft discarded` |

Moving something **to** the trash archives nothing — it is still in BexSign, and Trash
([24](24-trash.md)) restores it. The archive is the step after that, when there is nothing left to
restore from.

Archiving never blocks a delete. If storage is unreachable the reason is written to
`document_archive.error_text` and the delete goes ahead: somebody who asked for a document to be
gone is not held up by a bucket.

### The two shapes of deletion

Worth knowing, because it decides what a recovery can offer:

- A **signature request** still has its rows when it is deleted for good, so they are read at that
  moment: the BexSign ID, the recipients, the text of each document.
- A **self-sign document** and a **template** do not. Trashing them already moved their rows into
  the trash as JSON and removed them from their tables, so what gets archived is that snapshot —
  **rows and all**. That is why those two can be put back, and a request cannot.

---

## 2. What is kept

Every file, copied to `archive/<year>/<month>/<kind>-<id>/`:

| File kind | What |
|---|---|
| `document` | the uploaded file of each document |
| `signed` | the signed copy of each |
| `certificate` | the certificate of completion, if the request got that far |
| `physical-copy` | a scan of a copy signed on paper |
| `version` | an earlier version |
| `template` | the template's own file |

And one row in `document_archive` describing it: which kind it was and the id it had, the BexSign
document ID, the name, the owner, the recipients and their signing status, the status when deleted,
who deleted it and when, and a JSON manifest naming every file with its **archive key, byte size
and SHA-256**.

The manifest also holds:

- **The text of each document** — which matters for one written in the app rather than uploaded: it
  has no file, so the text is all there is. The same for a template's content.
- **The database rows**, for a self-sign document or a template, exactly as the trash held them.
  That is `snapshot` in the manifest: `[{ table, rows }]` in insert order, parent first.

The row is self-describing on purpose. Handing something back needs nothing but the archive — no
join, no surviving row elsewhere.

---

## 3. Recovering one: the procedure

All of it runs on the server, from the `server` folder.

### Step 1 — find it

```bash
node scripts/document-archive.js --list
node scripts/document-archive.js --list --search "skycity"
node scripts/document-archive.js --list --type template    # document, self_sign or template
```

`--search` matches the name, the BexSign ID, the owner's email, a recipient's email or the id it
used to have. Newest first, 50 by default (`--limit 200` for more).

```
  ID     KIND       ID    DELETED              FILES  SIZE       NAME / OWNER
  ---------------------------------------------------------------------------------------
  5      self-sign  11    2026-10-27 17:28:28  1      662.9 KB   Q3 declaration
                          by admin@bexsign.com                    admin@bexsign.com
  3      request    135   2026-10-27 17:24:56  1      862.6 KB   skycity_implemtation.pdf
                          by vimal@bexcodeservices.com            vimal@bexcodeservices.com
```

The first column is the **archive ID** — what the other commands take. The third is the id the
thing had in its own table before it went.

### Step 2 — check it is the right one

```bash
node scripts/document-archive.js --show 5
node scripts/document-archive.js --show document:140     # by the id it used to have
node scripts/document-archive.js --show self_sign:11
node scripts/document-archive.js --show template:7
```

Prints the kind, the BexSign ID, the owner, the recipients and their signing status, who deleted it
and why, every file with the path it came from and its SHA-256 — and, for a self-sign document or a
template, how many rows are held and in which tables. Read this before restoring: it is how you
confirm you are about to hand over the right thing, to the right person.

### Step 3 — check the files are intact

```bash
node scripts/document-archive.js --verify 7
```

Re-reads every file out of storage and compares it with the checksum taken when it was archived.
`Every file is intact.` means the bytes are exactly what was deleted.

### Step 4 — restore

```bash
node scripts/document-archive.js --restore 7 --by "you@example.com"
node scripts/document-archive.js --restore 7 --out /tmp/case-1182 --by "you@example.com"
```

Writes the files to `./restored/<kind>-<id>/` (or `--out`), plus `archive-manifest.json` so whoever
receives them can see what they are. Each file is checksummed as it is written:

```
  ok        Skycity implementation.pdf     862.6 KB
  ok        Certificate of Completion.pdf  275.2 KB

2 file(s) written, plus archive-manifest.json.
Recorded on archive #7 as restored by "you@example.com".
```

`--by` is stamped into the archive row along with the time. Always pass it — it is the record of
who took a copy of a deleted document out of the system.

### Step 5 — hand it over

Send the PDF the way your organization sends documents containing someone else's agreement. Then
delete the restored folder: it is an unprotected copy sitting on the server's disk.

```bash
rm -rf ./restored/document-140
```

---

## 4. What a restore does *not* do

It gives you the **files**. It does not put anything back into BexSign on its own, and what is even
possible differs by kind.

### A signature request cannot be put back, by design

A completed request is evidence — signatures, an audit trail, a certificate, fingerprints in the
validity registry. Rebuilding one around signatures that were collected against the old row would
produce something that looks like a signed agreement but is not the one anybody signed. If a
request genuinely has to run again, send the restored PDF as a new one.

### A self-sign document or a template can be, by hand

Both were archived with their rows, so `snapshot` in the manifest holds what a put-back needs:
`[{ table, rows }]` in insert order, parent first — the same shape the trash used to restore them
before they were deleted for good.

There is deliberately no `--put-back` flag. Writing rows straight into live tables is the kind of
thing that should be done by somebody looking at what they are doing: ids may now belong to
something else, the owner may have been removed, and a template's category or sharing may since
have changed meaning. Read the snapshot, decide what still makes sense, and insert it yourself —
or, for a template, simply create it again from the restored file and the `content` in the
snapshot, which is usually quicker and always safer.

---

## 5. Who can do this

Anybody with a shell on the API server and the database password. That is the whole access model,
and it is chosen rather than inherited:

- **No HTTP endpoint.** A deleted document cannot be pulled back by a session, a stolen token, an
  OAuth app or a misconfigured permission, because there is nothing listening.
- **No screen.** Nobody can be talked into clicking it.
- **Every restore is stamped** into `document_archive.restored_at` / `restored_by`.

The trade is that recovery needs a person with server access. For a document that was deleted on
purpose and is wanted back, that is the right amount of friction.

> **Keep this in mind.** The archive holds documents their owners believe are deleted. Treat a
> restore as handling someone else's confidential agreement: confirm who is asking and why, pass
> `--by`, and remove the restored copy afterwards.

---

## 6. Where it lives

| | |
|---|---|
| Table | `document_archive` — `202610272300_document_archive.sql`, plus `202610272330_archive_item_types.sql` for the three kinds |
| Files | `archive/<year>/<month>/<kind>-<id>/` in the doc bucket ([31](31-doc-bucket.md)) |
| Writing it | `server/utils/documentArchive.js`, called from `utils/trashStore.js` and `routes/documents.js` |
| Reading it | `server/scripts/document-archive.js` |

`document_archive.item_type` says which kind a row is and `item_id` is the id it had. One entry
point, `archiveTrashItem(item)`, decides from the trash row what to archive and how — so a kind
that is not covered is skipped there, in one place, rather than being forgotten in three.

Because the files go through the doc bucket, the archive is wherever documents are: on this
server's disk with `DOC_BUCKET_PROVIDER=local`, in S3 when one is configured. With S3 it inherits
the bucket's own durability and versioning.

---

## 7. Housekeeping

The archive grows and nothing prunes it — on purpose, since the point is that it is there when
somebody needs it. It holds one copy of each deleted document, so it grows at the rate documents
are deleted.

To age it out, use a lifecycle rule on the `archive/` prefix rather than a script, so the bytes and
the rows do not disagree: expire objects after your retention period, and delete the rows of the
same age.

```sql
-- what is old enough to drop
SELECT id, item_type, item_id, document_name, deleted_at, total_bytes
  FROM document_archive
 WHERE deleted_at < DATE_SUB(NOW(), INTERVAL 7 YEAR);
```

Check your own retention obligations before removing anything: a signed agreement often has to be
keepable for years, and this may be the last copy of one.

---

## 8. Checking it works

Worth doing once after setting it up, on a document you created for the purpose:

```bash
# 1. create a document in the app and note its id, then discard it as a draft
curl -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/documents/<id>?permanent=true"

# 2. it should be in the archive straight away
node scripts/document-archive.js --list

# 3. the files should still be intact
node scripts/document-archive.js --verify <archive id>

# 4. and come back byte for byte
node scripts/document-archive.js --restore <archive id> --out /tmp/check
sha256sum /tmp/check/*.pdf        # matches the sha256 in --show
```

Do the same once for a template and a self-sign document, which take the other route — their rows
come out of the trash snapshot rather than the live tables:

```bash
node scripts/document-archive.js --list --type template
node scripts/document-archive.js --show template:<id>     # "Rows held (1 table(s))"
```

The API log says so at the time, too:

```
[Archive] Document 143 "ArchiveTest Contract" archived as #1 (1 file(s), 678774 bytes)
[Archive] Template 4 "Service agreement" archived as #4 (1 file(s), 678774 bytes, 1 table(s) of rows)
[Archive] Self-sign document 11 "Q3 declaration" archived as #5 (1 file(s), 678774 bytes, 6 table(s) of rows)
```
