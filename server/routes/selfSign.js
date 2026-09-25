/**
 * Sign yourself (server/routes/selfSign.js)  — mounted at /api/self-sign
 *
 * Documents the signed-in user prepares and signs alone. Everything here is scoped to the caller: a self-sign
 * document belongs to the user who created it and is never returned to anybody else.
 *
 * The flow is deliberately step-wise, and the two halves are kept apart so nothing is confusing:
 *   1. Add documents   upload a file, pick templates, or write one in BexSign
 *   2. Name & merge    rename, replace, remove, merge several documents into one file
 *   ---- a user who only wants to *generate* a document stops here: the document stays in stage "draft" ----
 *   3. Prepare fields  place signature, date, full name, stamp... in the same editor "Send for signatures" uses
 *   4. Sign            the fields are filled with the user's own signature and a signed PDF is issued
 *   5. Done            download it, email a copy to someone, read its history
 *
 * See server/utils/selfSign.js for the three tables and server/utils/pdfMerge.js for how merging works.
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');
const helpers = require('../utils/requestHelpers');
const selfSign = require('../utils/selfSign');
const pdfMerge = require('../utils/pdfMerge');
const signatureStore = require('../utils/signatureStore');
const { getOrCreateDocumentIdentifier, markDocumentSigned } = require('../utils/documentIdentifier');
const { buildCompletedRequestFiles, getCompletedPdfFiles } = require('../utils/requestCompletion');
const { sendDocumentCopyEmail } = require('../utils/emailService');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Same limits as a signature request: 25 MB per document, 40 documents
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 40 }
});

const acceptFiles = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Each document must be 25 MB or smaller.'
      : (err.code === 'LIMIT_FILE_COUNT' ? 'You can add at most 40 documents at a time.' : err.message);
    return res.status(400).json({ success: false, error: message });
  });
};

// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);
selfSign.ensureSelfSignSchema();

const FOLDER = 'Sign Yourself';
const DOCUMENT_TYPE = 'self-sign';

const fail = (res, status, error) => res.status(status).json({ success: false, error });
const userName = (user) => selfSign.actorName(user);
const clean = (value, max = 255) => String(value ?? '').trim().slice(0, max);

/** The self-sign row named by :id, or null after answering 404. */
async function requireOwned(req, res) {
  const row = await selfSign.getOwned(req.params.id, req.user?.id);
  if (!row) {
    fail(res, 404, 'That self-sign document was not found in your account.');
    return null;
  }
  return row;
}

/** Documents (document_files rows) of a self-sign document, in the shape the UI and the merge use. */
async function documentsOf(documentId) {
  const files = await helpers.getDocumentFiles(documentId);
  return files.map((f, index) => ({
    id: f.id,
    fileId: f.id,
    index,
    name: f.file_name,
    filePath: f.file_path,
    signedFilePath: f.signed_file_path || null,
    fileSize: f.file_size || null,
    fileType: f.file_type || 'pdf',
    documentText: f.document_text || '',
    hasFile: Boolean(pdfMerge.resolveStoredFile(f.file_path)),
    uploadedAt: f.uploaded_at
  }));
}

/** The documents payload syncDocumentFiles expects, built from the request body plus any uploaded files. */
function documentsMetaFrom(body, files) {
  const meta = helpers.parseJsonInput(body.documentsMeta ?? body.documents, null);
  if (Array.isArray(meta) && meta.length > 0) return meta;
  // No explicit list: every uploaded file becomes a document, in upload order
  return (files || []).map((f, i) => ({
    name: clean(f.originalname || `Document ${i + 1}.pdf`),
    uploadKey: String(i),
    documentText: ''
  }));
}

/** Uploads renamed to the field names syncDocumentFiles matches (`file_<uploadKey>`). */
function normalizeUploads(files = [], meta = []) {
  const byField = new Map((files || []).map((f) => [f.fieldname, f]));
  return (files || []).map((f, i) => {
    if (byField.has(`file_${i}`) || /^file_/.test(f.fieldname)) return f;
    const wanted = meta[i]?.uploadKey;
    return { ...f, fieldname: `file_${wanted !== undefined ? wanted : i}` };
  });
}

function presentRow(row) {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    stage: row.stage,
    stageLabel: selfSign.STAGE_LABELS[row.stage] || row.stage,
    source: row.source,
    templateName: row.template_name || null,
    hasFields: Boolean(row.has_fields),
    fieldCount: Number(row.field_count || 0),
    pageCount: Number(row.page_count || 1),
    signedAt: row.signed_at || null,
    signedFilePath: row.signed_file_path || null,
    documentStatus: row.document_status || null,
    bexsignDocId: row.bexsign_doc_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    shareCount: row.share_count !== undefined ? Number(row.share_count) : undefined,
    documentCount: row.document_count !== undefined ? Number(row.document_count) : undefined
  };
}

/* ------------------------------------------------------------------ list & stats */

// GET /api/self-sign?stage=draft|prepared|signed|shared|all&search=&page=1&pageSize=12
router.get('/', async (req, res) => {
  try {
    await selfSign.ensureSelfSignSchema();
    const userId = parseInt(req.user?.id, 10) || 0;
    const stage = String(req.query.stage || 'all').toLowerCase();
    const search = clean(req.query.search, 120);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 12));

    const where = ['s.user_id = ?'];
    const params = [userId];
    if (selfSign.STAGES.includes(stage)) {
      where.push('s.stage = ?');
      params.push(stage);
    }
    if (stage === 'shared') {
      where.push('EXISTS (SELECT 1 FROM self_sign_shares sh WHERE sh.self_sign_id = s.id)');
    }
    if (search) {
      where.push('(s.title LIKE ? OR d.document_name LIKE ? OR COALESCE(s.template_name, "") LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereSql = where.join(' AND ');

    const [[counted]] = await db.query(
      `SELECT COUNT(*) AS total FROM self_sign_documents s JOIN documents d ON d.id = s.document_id WHERE ${whereSql}`,
      params
    );
    const total = Number(counted?.total || 0);

    const [rows] = await db.query(
      `SELECT s.*, d.document_name, d.status AS document_status, d.file_path, di.bexsign_doc_id,
              (SELECT COUNT(*) FROM self_sign_shares sh WHERE sh.self_sign_id = s.id) AS share_count,
              (SELECT COUNT(*) FROM document_files df WHERE df.document_id = s.document_id) AS document_count
         FROM self_sign_documents s
         JOIN documents d ON d.id = s.document_id
         LEFT JOIN document_identifiers di ON di.document_id = s.document_id
        WHERE ${whereSql}
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params
    );

    const [[stats]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(stage = 'draft') AS draft,
         SUM(stage = 'prepared') AS prepared,
         SUM(stage = 'signed') AS signed
       FROM self_sign_documents WHERE user_id = ?`,
      [userId]
    );
    const [[sharedStat]] = await db.query(
      `SELECT COUNT(DISTINCT sh.self_sign_id) AS shared
         FROM self_sign_shares sh JOIN self_sign_documents s ON s.id = sh.self_sign_id
        WHERE s.user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      total,
      page,
      pageSize,
      documents: rows.map(presentRow),
      stats: {
        total: Number(stats?.total || 0),
        draft: Number(stats?.draft || 0),
        prepared: Number(stats?.prepared || 0),
        signed: Number(stats?.signed || 0),
        shared: Number(sharedStat?.shared || 0)
      }
    });
  } catch (err) {
    console.error('[SelfSign] list failed:', err);
    fail(res, 500, 'Your self-sign documents could not be loaded.');
  }
});

/* ------------------------------------------------------------------ signatures of the caller */

// GET /api/self-sign/signatures - the signatures the caller can sign with (Sign step)
router.get('/signatures', async (req, res) => {
  try {
    const signatures = await signatureStore.listOwnSignatures(req.user);
    res.json({
      success: true,
      signatures: signatures.filter((s) => s.status !== 'Revoked'),
      signer: { name: userName(req.user), email: req.user?.email || '', company: req.user?.company || '' }
    });
  } catch (err) {
    console.error('[SelfSign] signatures failed:', err);
    fail(res, 500, 'Your saved signatures could not be loaded.');
  }
});

/* ------------------------------------------------------------------ create */

// POST /api/self-sign - start a self-sign document from uploads, templates or a blank document
router.post('/', requirePermission('documents.create'), acceptFiles, async (req, res) => {
  try {
    await selfSign.ensureSelfSignSchema();
    await helpers.ensureRequestSchema();
    const userId = parseInt(req.user?.id, 10) || 0;
    if (!userId) return fail(res, 401, 'Sign in to create a self-sign document.');

    const meta = documentsMetaFrom(req.body, req.files);
    if (!Array.isArray(meta) || meta.length === 0) {
      return fail(res, 400, 'Add at least one document: upload a file, choose a template, or create a blank document.');
    }
    const title = clean(req.body.title || req.body.documentName || meta[0]?.name || 'Self-signed document') || 'Self-signed document';
    const source = selfSign.normalizeSource(req.body.source);
    const templateName = clean(req.body.templateName, 255) || null;

    const [created] = await db.query(
      `INSERT INTO documents (user_id, document_name, file_path, folder_name, status, recipient_email, template_used, document_type, description)
       VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?)`,
      [userId, title, null, FOLDER, req.user?.email || null, templateName, DOCUMENT_TYPE, 'Self-signed document (Sign yourself)']
    );
    const documentId = created.insertId;

    // The only recipient of a self-sign document is its owner: nothing is ever emailed to sign it
    await helpers.saveRecipients(documentId, [{
      email: req.user?.email || `user-${userId}@bexsign.local`,
      name: userName(req.user),
      role: 'Needs to sign',
      signingOrder: 1
    }]);

    const files = await helpers.syncDocumentFiles(documentId, meta, normalizeUploads(req.files, meta));
    if (files[0]?.file_path) {
      await db.query('UPDATE documents SET file_path = ? WHERE id = ?', [files[0].file_path, documentId]);
    }
    const identifier = await getOrCreateDocumentIdentifier(documentId, {
      signerEmail: req.user?.email,
      signerName: userName(req.user),
      status: 'Draft'
    });

    const [inserted] = await db.query(
      `INSERT INTO self_sign_documents (user_id, document_id, title, stage, source, template_name, has_fields, field_count, page_count)
       VALUES (?, ?, ?, 'draft', ?, ?, 0, 0, ?)`,
      [userId, documentId, title, source, templateName, Math.max(1, files.length)]
    );
    const selfSignId = inserted.insertId;

    await selfSign.recordEvent({
      selfSignId,
      documentId,
      action: 'created',
      detail: `"${title}" created from ${source === 'template' ? `template${templateName ? ` "${templateName}"` : ''}` : source} with ${files.length} document${files.length === 1 ? '' : 's'} (${identifier?.bexsign_doc_id || documentId})`,
      req
    });
    for (const file of files) {
      await selfSign.recordEvent({ selfSignId, documentId, action: 'document_added', detail: `Added "${file.file_name}"`, req });
    }

    const row = await selfSign.refreshStats(selfSignId);
    res.status(201).json({
      success: true,
      selfSign: presentRow({ ...row, bexsign_doc_id: identifier?.bexsign_doc_id }),
      documents: await documentsOf(documentId)
    });
  } catch (err) {
    console.error('[SelfSign] create failed:', err);
    fail(res, 500, 'The self-sign document could not be created.');
  }
});

/* ------------------------------------------------------------------ resolve by document id (editor) */

// GET /api/self-sign/document/:documentId - the self-sign document that wraps this `documents` row
router.get('/document/:documentId', async (req, res) => {
  try {
    const row = await selfSign.getOwnedByDocument(req.params.documentId, req.user?.id);
    if (!row) return fail(res, 404, 'This document is not one of your self-sign documents.');
    res.json({ success: true, selfSign: presentRow(row), documents: await documentsOf(row.document_id) });
  } catch (err) {
    console.error('[SelfSign] resolve failed:', err);
    fail(res, 500, 'The self-sign document could not be loaded.');
  }
});

/* ------------------------------------------------------------------ one document */

// GET /api/self-sign/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    const refreshed = await selfSign.refreshStats(row.id);
    const shares = await selfSign.listShares(row.id, { limit: 20 });
    return res.json({
      success: true,
      selfSign: presentRow({ ...row, ...refreshed, share_count: shares.length }),
      documents: await documentsOf(row.document_id),
      shares,
      signer: { name: userName(req.user), email: req.user?.email || '' }
    });
  } catch (err) {
    console.error('[SelfSign] read failed:', err);
    return fail(res, 500, 'The self-sign document could not be loaded.');
  }
});

// PATCH /api/self-sign/:id - rename the self-sign document
router.patch('/:id', requirePermission('documents.create'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    const title = clean(req.body.title);
    if (!title) return fail(res, 400, 'Enter a name for this document.');
    if (title === row.title) return res.json({ success: true, selfSign: presentRow(row) });

    await db.query('UPDATE self_sign_documents SET title = ? WHERE id = ?', [title, row.id]);
    await db.query('UPDATE documents SET document_name = ? WHERE id = ?', [title, row.document_id]);
    await selfSign.recordEvent({ selfSignId: row.id, documentId: row.document_id, action: 'renamed', detail: `Renamed from "${row.title}" to "${title}"`, req });
    return res.json({ success: true, selfSign: presentRow({ ...row, title }) });
  } catch (err) {
    console.error('[SelfSign] rename failed:', err);
    return fail(res, 500, 'The document could not be renamed.');
  }
});

/* ------------------------------------------------------------------ documents inside it */

// POST /api/self-sign/:id/documents - add documents (upload, template or blank)
router.post('/:id/documents', requirePermission('documents.create'), acceptFiles, async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return fail(res, 400, 'This document is already signed. Make a new self-sign document to change it.');

    const added = documentsMetaFrom(req.body, req.files);
    if (!Array.isArray(added) || added.length === 0) return fail(res, 400, 'Choose the documents you want to add.');

    const existing = await documentsOf(row.document_id);
    const meta = [
      ...existing.map((d) => ({ fileId: d.fileId, name: d.name, filePath: d.filePath, documentText: d.documentText })),
      ...added.map((d, i) => ({ ...d, uploadKey: d.uploadKey !== undefined ? d.uploadKey : String(i) }))
    ];
    const uploads = normalizeUploads(req.files, added);
    // Uploads belong to the entries appended after the existing ones
    const shifted = uploads.map((f) => {
      const match = /^file_(.+)$/.exec(f.fieldname);
      return match ? f : { ...f, fieldname: `file_${existing.length}` };
    });
    const files = await helpers.syncDocumentFiles(row.document_id, meta, shifted);

    for (const doc of added) {
      await selfSign.recordEvent({
        selfSignId: row.id,
        documentId: row.document_id,
        action: 'document_added',
        detail: `Added "${clean(doc.name) || 'Document'}"`,
        req
      });
    }
    const refreshed = await selfSign.refreshStats(row.id);
    return res.json({ success: true, selfSign: presentRow({ ...row, ...refreshed }), documents: await documentsOf(row.document_id), files: files.length });
  } catch (err) {
    console.error('[SelfSign] add documents failed:', err);
    return fail(res, 500, 'The documents could not be added.');
  }
});

// PUT /api/self-sign/:id/documents/:fileId - replace one document (new file, new text or a new name)
router.put('/:id/documents/:fileId', requirePermission('documents.create'), acceptFiles, async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return fail(res, 400, 'This document is already signed and can no longer be changed.');

    const existing = await documentsOf(row.document_id);
    const target = existing.find((d) => String(d.fileId) === String(req.params.fileId));
    if (!target) return fail(res, 404, 'That document is not part of this self-sign document.');

    const uploaded = (req.files || [])[0] || null;
    const newName = clean(req.body.name) || (uploaded ? clean(uploaded.originalname) : target.name);
    const newText = req.body.documentText !== undefined ? String(req.body.documentText) : target.documentText;

    const meta = existing.map((d) => (String(d.fileId) === String(target.fileId)
      ? { fileId: d.fileId, name: newName, filePath: d.filePath, documentText: newText, ...(uploaded ? { uploadKey: 'replace' } : {}) }
      : { fileId: d.fileId, name: d.name, filePath: d.filePath, documentText: d.documentText }));

    await helpers.syncDocumentFiles(row.document_id, meta, uploaded ? [{ ...uploaded, fieldname: 'file_replace' }] : []);
    await selfSign.recordEvent({
      selfSignId: row.id,
      documentId: row.document_id,
      action: 'document_replaced',
      detail: uploaded ? `Replaced "${target.name}" with the uploaded file "${clean(uploaded.originalname)}"` : `Updated "${target.name}"${newName !== target.name ? ` (renamed to "${newName}")` : ''}`,
      req
    });
    const refreshed = await selfSign.refreshStats(row.id);
    return res.json({ success: true, selfSign: presentRow({ ...row, ...refreshed }), documents: await documentsOf(row.document_id) });
  } catch (err) {
    console.error('[SelfSign] replace document failed:', err);
    return fail(res, 500, 'The document could not be replaced.');
  }
});

// DELETE /api/self-sign/:id/documents/:fileId - remove one document from this self-sign document
router.delete('/:id/documents/:fileId', requirePermission('documents.create'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return fail(res, 400, 'This document is already signed and can no longer be changed.');

    const existing = await documentsOf(row.document_id);
    const target = existing.find((d) => String(d.fileId) === String(req.params.fileId));
    if (!target) return fail(res, 404, 'That document is not part of this self-sign document.');
    if (existing.length <= 1) return fail(res, 400, 'A self-sign document needs at least one document. Delete the whole self-sign document instead.');

    const meta = existing
      .filter((d) => String(d.fileId) !== String(target.fileId))
      .map((d) => ({ fileId: d.fileId, name: d.name, filePath: d.filePath, documentText: d.documentText }));
    await helpers.syncDocumentFiles(row.document_id, meta, [], { allowEmpty: true });
    await selfSign.recordEvent({ selfSignId: row.id, documentId: row.document_id, action: 'document_removed', detail: `Removed "${target.name}"`, req });
    const refreshed = await selfSign.refreshStats(row.id);
    return res.json({ success: true, selfSign: presentRow({ ...row, ...refreshed }), documents: await documentsOf(row.document_id) });
  } catch (err) {
    console.error('[SelfSign] remove document failed:', err);
    return fail(res, 500, 'The document could not be removed.');
  }
});

/* ------------------------------------------------------------------ merge */

// POST /api/self-sign/:id/merge  { fileIds: [], fileName }
router.post('/:id/merge', requirePermission('documents.create'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return fail(res, 400, 'This document is already signed and can no longer be merged.');

    const existing = await documentsOf(row.document_id);
    const wanted = Array.isArray(req.body.fileIds) ? req.body.fileIds.map(String) : [];
    const chosen = wanted.length > 0
      ? wanted.map((fid) => existing.find((d) => String(d.fileId) === fid)).filter(Boolean)
      : existing;
    if (chosen.length < 2) return fail(res, 400, 'Choose at least two documents to merge.');

    const fileName = clean(req.body.fileName) || `${row.title} (merged)`;
    const merged = await pdfMerge.mergeToUploads(chosen, { fileName });

    // The merged file replaces the chosen documents, in their original order; the source files stay on disk
    const firstIndex = existing.findIndex((d) => String(d.fileId) === String(chosen[0].fileId));
    const chosenIds = new Set(chosen.map((d) => String(d.fileId)));
    const kept = existing.filter((d) => !chosenIds.has(String(d.fileId)));
    const mergedEntry = {
      name: /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`,
      filePath: merged.filePath,
      documentText: ''
    };
    const meta = [
      ...kept.slice(0, Math.max(0, firstIndex)).map((d) => ({ fileId: d.fileId, name: d.name, filePath: d.filePath, documentText: d.documentText })),
      mergedEntry,
      ...kept.slice(Math.max(0, firstIndex)).map((d) => ({ fileId: d.fileId, name: d.name, filePath: d.filePath, documentText: d.documentText }))
    ];
    await helpers.syncDocumentFiles(row.document_id, meta, [], { allowEmpty: true });
    await db.query('UPDATE self_sign_documents SET source = ? WHERE id = ?', ['merged', row.id]);

    await selfSign.recordEvent({
      selfSignId: row.id,
      documentId: row.document_id,
      action: 'merged',
      detail: `Merged ${chosen.length} documents (${merged.pagesPerSource.map((p) => `${p.name}: ${p.pages}p`).join(', ')}) into "${mergedEntry.name}" - ${merged.pageCount} pages. Merged pages are page images, so their text is no longer selectable.`,
      req
    });
    const refreshed = await selfSign.refreshStats(row.id);
    return res.json({
      success: true,
      selfSign: presentRow({ ...row, ...refreshed, source: 'merged' }),
      documents: await documentsOf(row.document_id),
      merged: { fileName: mergedEntry.name, filePath: merged.filePath, pageCount: merged.pageCount, pagesPerSource: merged.pagesPerSource }
    });
  } catch (err) {
    console.error('[SelfSign] merge failed:', err);
    return fail(res, 400, err.message || 'The documents could not be merged.');
  }
});

/* ------------------------------------------------------------------ prepare (fields placed) */

// POST /api/self-sign/:id/prepare - recompute the stage after fields were placed in the editor
router.post('/:id/prepare', requirePermission('documents.create'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return res.json({ success: true, selfSign: presentRow(row) });

    const before = Number(row.field_count || 0);
    const refreshed = await selfSign.refreshStats(row.id);
    if (Number(refreshed.field_count || 0) !== before || refreshed.stage !== row.stage) {
      await selfSign.recordEvent({
        selfSignId: row.id,
        documentId: row.document_id,
        action: 'fields_placed',
        detail: `${refreshed.field_count} field${Number(refreshed.field_count) === 1 ? '' : 's'} placed - the document is ready to sign`,
        req
      });
    }
    return res.json({ success: true, selfSign: presentRow({ ...row, ...refreshed }) });
  } catch (err) {
    console.error('[SelfSign] prepare failed:', err);
    return fail(res, 500, 'The document could not be marked as ready to sign.');
  }
});

/* ------------------------------------------------------------------ sign */

const displayDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** The value a field gets when the user signs it themselves. Only empty fields are filled in. */
function autofillValue(type, signer) {
  switch (type) {
    case 'Full name':
    case 'Name':
      return signer.name;
    case 'Email':
      return signer.email;
    case 'Sign date':
    case 'Date':
      return displayDate(new Date());
    case 'Company':
      return signer.company || '';
    case 'Job title':
      return signer.designation || '';
    default:
      return null;
  }
}

// POST /api/self-sign/:id/complete  { signatureId? }
router.post('/:id/complete', requirePermission('documents.create'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    if (row.stage === 'signed') return fail(res, 400, 'This document is already signed.');

    const documents = await documentsOf(row.document_id);
    if (documents.length === 0) return fail(res, 400, 'Add at least one document before signing.');

    const signer = {
      name: userName(req.user),
      email: req.user?.email || '',
      company: req.user?.company || '',
      designation: req.user?.designation || ''
    };

    // The signature to sign with: the one the user chose, else their default, else their typed name
    let signature = null;
    try {
      const own = await signatureStore.listOwnSignatures(req.user);
      const wanted = parseInt(req.body?.signatureId, 10) || 0;
      signature = (wanted ? own.find((s) => s.id === wanted) : null)
        || own.find((s) => s.is_default && s.status === 'Active')
        || own.find((s) => s.status === 'Active')
        || null;
    } catch (e) {
      signature = null;
    }
    const signatureImage = signature?.signature_image || null;
    const signatureStyle = signature?.signature_style || 'font-signature-1';
    const signedAt = new Date();
    const ip = selfSign.clientIp(req) || '';

    // Fill the placed fields with the user's own signature and details (fields the user typed in are kept)
    const [fieldRows] = await db.query('SELECT id, field_type, options FROM document_fields WHERE document_id = ?', [row.document_id]);
    let signedFields = 0;
    for (const field of fieldRows) {
      const options = helpers.parseJsonInput(field.options, {}) || {};
      const type = field.field_type;
      if (type === 'Signature' || type === 'Initial') {
        options.signatureImage = signatureImage || signer.name;
        options.signatureStyle = signatureStyle;
      } else {
        const filled = autofillValue(type, signer);
        const isEmpty = options.value === undefined || options.value === null || String(options.value).trim() === '' || options.value === type;
        if (filled !== null && isEmpty) options.value = filled;
      }
      options.signerName = signer.name;
      options.signerEmail = signer.email;
      options.signedAt = signedAt.toISOString();
      await db.query('UPDATE document_fields SET options = ? WHERE id = ?', [JSON.stringify(options), field.id]);
      signedFields += 1;
    }

    await db.query(
      `UPDATE document_recipients
          SET status = 'signed', signed_at = ?, signed_ip = ?, signed_user_agent = ?, signature_image = COALESCE(?, signature_image), sent_at = COALESCE(sent_at, ?), viewed_at = COALESCE(viewed_at, ?)
        WHERE document_id = ?`,
      [signedAt, ip || null, clean(req.headers['user-agent'], 255) || null, signatureImage, signedAt, signedAt, row.document_id]
    );
    await db.query(
      `UPDATE documents SET status = 'Completed', completed_at = ?, sent_at = COALESCE(sent_at, ?) WHERE id = ?`,
      [signedAt, signedAt, row.document_id]
    );
    await markDocumentSigned(row.document_id, {
      signerName: signer.name,
      signerEmail: signer.email,
      ipAddress: ip || undefined,
      signatureImage,
      signatureStyle,
      status: 'Completed'
    });

    // The signed PDFs and the certificate of completion, stored under uploads/completed/<documentId>/.
    // Nothing is emailed: a self-signed document goes out only when the user chooses to share it.
    let bundle = null;
    try {
      bundle = await buildCompletedRequestFiles(row.document_id);
    } catch (err) {
      console.error('[SelfSign] signed PDF generation failed:', err);
      return fail(res, 500, `The document was signed but its signed PDF could not be produced: ${err.message}`);
    }

    const firstPath = bundle.attachments[0]?.publicPath || null;
    await db.query(
      `UPDATE self_sign_documents SET stage = 'signed', signed_at = ?, signed_file_path = ?, has_fields = ?, field_count = ? WHERE id = ?`,
      [signedAt, firstPath, signedFields > 0 ? 1 : 0, signedFields, row.id]
    );
    await selfSign.recordEvent({
      selfSignId: row.id,
      documentId: row.document_id,
      action: 'signed',
      detail: `Signed by ${signer.name} (${signer.email}) with ${signedFields} field${signedFields === 1 ? '' : 's'}${signature ? ` using the signature "${signature.signature_id || signature.display_name}"` : ' (typed signature)'}`,
      req
    });

    if (signature?.id) {
      try {
        await signatureStore.recordSignatureUsage({
          ownerEmail: signer.email,
          signatureImage,
          signatureStyle,
          documentId: row.document_id,
          documentName: row.title,
          context: 'self_sign',
          signerName: signer.name,
          signerEmail: signer.email,
          fieldCount: signedFields,
          ip: ip || null
        });
      } catch (e) {}
    }

    const refreshed = await selfSign.getOwned(row.id, req.user.id);
    return res.json({
      success: true,
      selfSign: presentRow(refreshed),
      files: bundle.attachments.map((a) => ({ name: a.filename, path: a.publicPath, sha256: a.sha256 })),
      certificatePath: bundle.certificate?.publicPath || null
    });
  } catch (err) {
    console.error('[SelfSign] complete failed:', err);
    return fail(res, 500, 'The document could not be signed.');
  }
});

/* ------------------------------------------------------------------ download */

function sendPdf(res, buffer, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${String(fileName).replace(/[^\w .()-]+/g, '_')}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.end(buffer);
}

// GET /api/self-sign/:id/download?index=0&type=document|certificate
router.get('/:id/download', requirePermission('documents.download'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    const documents = await documentsOf(row.document_id);
    const index = Math.min(Math.max(parseInt(req.query.index, 10) || 0, 0), Math.max(documents.length - 1, 0));
    const wantsCertificate = String(req.query.type || '') === 'certificate';

    if (row.stage === 'signed') {
      const bundle = await getCompletedPdfFiles(row.document_id);
      if (wantsCertificate) {
        if (!bundle.certificate) return fail(res, 404, 'The certificate of completion is not available.');
        await selfSign.recordEvent({ selfSignId: row.id, documentId: row.document_id, action: 'downloaded', detail: 'Downloaded the certificate of completion', req });
        return sendPdf(res, bundle.certificate, `Certificate of Completion - ${row.title}.pdf`);
      }
      const file = bundle.documents[index] || bundle.documents[0];
      if (!file?.buffer) return fail(res, 404, 'The signed PDF is not available.');
      await selfSign.recordEvent({ selfSignId: row.id, documentId: row.document_id, action: 'downloaded', detail: `Downloaded the signed "${file.name}"`, req });
      return sendPdf(res, file.buffer, file.name);
    }

    // Not signed yet: a plain copy of the document as it stands (the stored file, or its text rendered to PDF)
    const target = documents[index];
    if (!target) return fail(res, 404, 'This self-sign document has no documents yet.');
    const stored = pdfMerge.resolveStoredFile(target.filePath);
    const buffer = stored ? fs.readFileSync(stored) : await pdfMerge.renderTextPdf({ name: target.name, text: target.documentText });
    await selfSign.recordEvent({ selfSignId: row.id, documentId: row.document_id, action: 'downloaded', detail: `Downloaded the unsigned "${target.name}"`, req });
    return sendPdf(res, buffer, /\.pdf$/i.test(target.name) ? target.name : `${target.name}.pdf`);
  } catch (err) {
    console.error('[SelfSign] download failed:', err);
    return fail(res, 500, 'The file could not be downloaded.');
  }
});

/* ------------------------------------------------------------------ share */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/self-sign/:id/share  { email, name, message, includeCertificate }
router.post('/:id/share', requirePermission('documents.download'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    const email = clean(req.body.email).toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'Enter a valid email address.');
    const name = clean(req.body.name, 150);
    const message = clean(req.body.message, 2000);

    const attachments = [];
    const documents = await documentsOf(row.document_id);
    if (row.stage === 'signed') {
      const bundle = await getCompletedPdfFiles(row.document_id);
      bundle.documents.filter((d) => d.buffer).forEach((d) => attachments.push({ filename: d.name, content: d.buffer, contentType: 'application/pdf' }));
      if (bundle.certificate && req.body.includeCertificate !== false) {
        attachments.push({ filename: 'Certificate of Completion.pdf', content: bundle.certificate, contentType: 'application/pdf' });
      }
    } else {
      for (const target of documents) {
        const stored = pdfMerge.resolveStoredFile(target.filePath);
        const buffer = stored ? fs.readFileSync(stored) : await pdfMerge.renderTextPdf({ name: target.name, text: target.documentText });
        attachments.push({ filename: /\.pdf$/i.test(target.name) ? target.name : `${target.name}.pdf`, content: buffer, contentType: 'application/pdf' });
      }
    }
    if (attachments.length === 0) return fail(res, 400, 'There is nothing to share yet: add a document first.');

    const result = await sendDocumentCopyEmail({
      to: email,
      documentName: row.title,
      senderEmail: req.user?.email || '',
      attachments
    });

    await selfSign.recordShare({
      selfSignId: row.id,
      documentId: row.document_id,
      email,
      name,
      message,
      status: result.success ? 'sent' : 'failed',
      error: result.success ? null : result.error,
      userId: req.user?.id
    });
    await selfSign.recordEvent({
      selfSignId: row.id,
      documentId: row.document_id,
      action: 'shared',
      detail: result.success
        ? `A copy (${attachments.length} file${attachments.length === 1 ? '' : 's'}) was emailed to ${name ? `${name} <${email}>` : email}`
        : `The copy could not be emailed to ${email}: ${result.error}`,
      req
    });

    if (!result.success) return fail(res, 502, `The copy could not be emailed to ${email}: ${result.error}`);
    return res.json({ success: true, shared: { email, name, attachments: attachments.map((a) => a.filename) }, shares: await selfSign.listShares(row.id) });
  } catch (err) {
    console.error('[SelfSign] share failed:', err);
    return fail(res, 500, 'The copy could not be shared.');
  }
});

/* ------------------------------------------------------------------ history */

// GET /api/self-sign/:id/history - every event and every share, as one readable timeline
router.get('/:id/history', async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    const [events, shares] = await Promise.all([selfSign.listEvents(row.id), selfSign.listShares(row.id)]);
    const timeline = [
      ...events.map((e) => ({
        kind: 'event',
        id: `event-${e.id}`,
        action: e.action,
        detail: e.detail,
        actor: e.actor_name,
        ip: e.ip_address,
        at: e.created_at
      })),
      ...shares.map((s) => ({
        kind: 'share',
        id: `share-${s.id}`,
        action: s.status === 'failed' ? 'share_failed' : 'shared',
        detail: `${s.status === 'failed' ? 'Could not email' : 'Emailed'} a copy to ${s.recipient_name ? `${s.recipient_name} <${s.recipient_email}>` : s.recipient_email}${s.message ? ` - "${s.message}"` : ''}${s.error_message ? ` (${s.error_message})` : ''}`,
        email: s.recipient_email,
        at: s.shared_at
      }))
    ].sort((a, b) => new Date(a.at) - new Date(b.at));
    return res.json({ success: true, selfSign: presentRow(row), timeline, events, shares });
  } catch (err) {
    console.error('[SelfSign] history failed:', err);
    return fail(res, 500, 'The history could not be loaded.');
  }
});

/* ------------------------------------------------------------------ delete */

// DELETE /api/self-sign/:id - moves the self-sign document (and the `documents` row behind it) to the trash
router.delete('/:id', requirePermission('documents.delete'), async (req, res) => {
  try {
    const row = await requireOwned(req, res);
    if (!row) return undefined;
    await require('../utils/trashStore').trashSelfSign(row, req.user);
    return res.json({ success: true, message: 'The self-sign document was moved to the trash. You can restore it from Settings > Trash.' });
  } catch (err) {
    console.error('[SelfSign] delete failed:', err);
    return fail(res, 500, 'The self-sign document could not be deleted.');
  }
});

module.exports = router;
