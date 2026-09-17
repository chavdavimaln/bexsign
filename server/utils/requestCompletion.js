/**
 * Request Completion (server/utils/requestCompletion.js)
 * When every signer/approver has completed: build the signed PDF of each document plus the
 * Certificate of Completion, store them under uploads/completed/<id>/ and email them to the
 * sender and every recipient.
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const helpers = require('./requestHelpers');
const { generateSignedDocumentPdf, generateCompletionCertificatePdf, formatDateTime } = require('./completedPdfGenerator');
const { sendDocumentCompletedEmail } = require('./emailService');
const { getOrCreateDocumentIdentifier } = require('./documentIdentifier');
const { recordFingerprint, isCurrentIssuedPdf } = require('./pdfFingerprints');

function safeFileName(name, fallback) {
  const base = String(name || fallback).replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|]+/g, '_').trim() || fallback;
  return `${base}.pdf`;
}

function slugify(name) {
  return String(name || 'document').replace(/\.pdf$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

async function buildCompletedRequestFiles(documentId) {
  const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [documentId]);
  const doc = docs[0];
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const identifier = await getOrCreateDocumentIdentifier(documentId);
  const bexId = identifier?.bexsign_doc_id || `BEX-DOC-${documentId}`;
  const files = await helpers.getDocumentFiles(documentId);
  const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [documentId]);
  const fields = fieldRows.map(helpers.parseFieldRow);
  const recipients = await helpers.getRecipients(documentId);
  const signingRecipients = recipients.filter((r) => helpers.isSigningRole(r.role));
  const sender = await helpers.getRequestSender(doc);

  let events = [];
  let history = [];
  try {
    [events] = await db.query('SELECT * FROM signature_events WHERE document_id = ? ORDER BY id ASC', [documentId]);
    [history] = await db.query('SELECT * FROM activity_history WHERE document_id = ? ORDER BY id ASC', [documentId]);
  } catch (err) {
    console.warn('[Completion] audit query warning:', err.message);
  }

  const documents = files.length > 0
    ? files.map((f) => ({ id: f.id, name: f.file_name, text: f.document_text }))
    : [{ id: null, name: doc.document_name, text: doc.custom_message }];

  const outDir = path.join(__dirname, '..', 'uploads', 'completed', String(documentId));
  fs.mkdirSync(outDir, { recursive: true });

  const completedAt = doc.completed_at || new Date();
  const signerSummary = signingRecipients.map((r) => r.name || r.email);
  const usedNames = new Set();
  const attachments = [];

  for (let i = 0; i < documents.length; i++) {
    const d = documents[i];
    const docFields = fields.filter((f) => f.docIndex === i);
    let sections = signingRecipients
      .map((recipient) => ({
        recipient,
        fields: docFields.filter((f) => helpers.fieldBelongsToRecipient(f, recipient, signingRecipients))
      }))
      .filter((s) => s.fields.length > 0);

    // Requests without any placed fields: show each signer's captured signature.
    if (fields.length === 0) {
      sections = signingRecipients
        .filter((r) => r.status === 'signed')
        .map((recipient) => ({ recipient, fields: [{ type: 'Signature', label: 'Signature' }] }));
    }

    const buffer = await generateSignedDocumentPdf({
      documentName: d.name,
      documentText: d.text,
      bexsignDocId: documents.length > 1 ? `${bexId}-${i + 1}` : bexId,
      sections,
      signerSummary,
      completedAt,
      sender
    });

    let fileName = safeFileName(d.name, `Document ${i + 1}`);
    if (usedNames.has(fileName.toLowerCase())) fileName = fileName.replace(/\.pdf$/i, ` (${i + 1}).pdf`);
    usedNames.add(fileName.toLowerCase());

    const diskName = `${String(i + 1).padStart(2, '0')}-${slugify(d.name)}.pdf`;
    fs.writeFileSync(path.join(outDir, diskName), buffer);
    const publicPath = `/uploads/completed/${documentId}/${diskName}`;
    if (d.id) {
      await db.query('UPDATE document_files SET signed_file_path = ? WHERE id = ?', [publicPath, d.id]);
    }
    d.sha256 = await recordFingerprint(buffer, { documentId, fileIndex: i, kind: 'signed', fileName, filePath: publicPath });
    attachments.push({ filename: fileName, content: buffer, contentType: 'application/pdf', publicPath, sha256: d.sha256 });
  }

  const certificateBuffer = await generateCompletionCertificatePdf({
    requestName: doc.document_name,
    bexsignDocId: bexId,
    sender,
    sentAt: doc.sent_at || doc.created_at,
    completedAt,
    signingOrder: doc.signing_order,
    documents,
    recipients,
    events,
    history
  });
  fs.writeFileSync(path.join(outDir, 'certificate-of-completion.pdf'), certificateBuffer);
  const certificate = {
    filename: 'Certificate of Completion.pdf',
    content: certificateBuffer,
    contentType: 'application/pdf',
    publicPath: `/uploads/completed/${documentId}/certificate-of-completion.pdf`
  };
  certificate.sha256 = await recordFingerprint(certificateBuffer, {
    documentId,
    kind: 'certificate',
    fileName: certificate.filename,
    filePath: certificate.publicPath
  });

  if (attachments[0]) {
    await db.query('UPDATE documents SET file_path = ? WHERE id = ?', [attachments[0].publicPath, documentId]);
  }

  return { doc, sender, recipients, documents, attachments, certificate };
}

/**
 * Generate completed PDFs and email them to the sender and all recipients.
 * `fallbackAttachments` (e.g. PDFs rendered by the signer's browser) are used only if server generation fails.
 */
async function finalizeCompletedRequest(documentId, { fallbackAttachments = [] } = {}) {
  let bundle;
  try {
    bundle = await buildCompletedRequestFiles(documentId);
  } catch (err) {
    console.error('[Completion] PDF generation failed:', err);
    if (fallbackAttachments.length === 0) throw err;
    const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [documentId]);
    const doc = docs[0] || { id: documentId, document_name: 'Document' };
    bundle = {
      doc,
      sender: await helpers.getRequestSender(doc),
      recipients: await helpers.getRecipients(documentId),
      documents: [{ name: doc.document_name }],
      attachments: fallbackAttachments,
      certificate: null
    };
  }

  const { doc, sender, recipients, documents, attachments, certificate } = bundle;
  const mailAttachments = [...attachments, certificate]
    .filter(Boolean)
    .map(({ filename, content, contentType, path: filePath }) => ({ filename, content, path: filePath, contentType }));

  const targets = new Map();
  if (sender.email) targets.set(sender.email.toLowerCase(), { email: sender.email, name: sender.name, isSender: true });
  recipients.forEach((r) => {
    const key = String(r.email || '').toLowerCase();
    if (key && !targets.has(key)) targets.set(key, { email: r.email, name: r.name, isSender: false });
  });

  const results = await Promise.all(
    [...targets.values()].map(async (target) => ({
      email: target.email,
      ...(await sendDocumentCompletedEmail({
        to: target.email,
        recipientName: target.name,
        documentName: doc.document_name,
        documentNames: documents.map((d) => d.name),
        senderName: sender.name,
        senderEmail: sender.email,
        orgName: sender.company,
        isSender: target.isSender,
        attachments: mailAttachments
      }))
    }))
  );

  const delivered = results.filter((r) => r.success).map((r) => r.email);
  const failed = results.filter((r) => !r.success);
  await helpers.logRequestEvent(documentId, {
    description: `Completed documents (${attachments.length} signed PDF${attachments.length === 1 ? '' : 's'}${certificate ? ' + certificate of completion' : ''}) emailed to: ${delivered.join(', ') || 'none'}${failed.length ? `. Failed: ${failed.map((f) => f.email).join(', ')}` : ''}`
  });

  return {
    emailed: delivered,
    failed,
    files: attachments.map((a) => a.publicPath).filter(Boolean),
    certificatePath: certificate?.publicPath || null
  };
}

const downloadName = (name, fallback = 'Document') => {
  const text = String(name || fallback).replace(/\.pdf$/i, '').replace(/[\\/:*?"<>|\r\n]+/g, '_').trim() || fallback;
  return `${text}.pdf`;
};

/**
 * Signed PDFs of a completed request: { documents: [{ name, buffer }], certificate }. The stored files are used
 * unless one is missing, unregistered or was issued with an older PDF layout; then all of them are rebuilt
 * (the original completion date is kept, nothing is emailed).
 */
async function getCompletedPdfFiles(documentId) {
  const readPublic = (publicPath) => {
    if (!publicPath) return null;
    const abs = path.join(__dirname, '..', publicPath);
    return fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  };
  const files = await helpers.getDocumentFiles(documentId);
  const documents = files.map((f) => ({ name: downloadName(f.file_name), buffer: readPublic(f.signed_file_path) }));
  const certificate = readPublic(`/uploads/completed/${documentId}/certificate-of-completion.pdf`);

  const buffers = [...documents.map((d) => d.buffer), certificate];
  let current = files.length > 0 && buffers.every(Boolean);
  for (const buffer of buffers) {
    if (!current) break;
    if (!(await isCurrentIssuedPdf(buffer))) current = false;
  }
  if (current) return { documents, certificate, rebuilt: false };

  const bundle = await buildCompletedRequestFiles(documentId);
  return {
    documents: bundle.attachments.map((a) => ({ name: downloadName(a.filename), buffer: a.content })),
    certificate: bundle.certificate.content,
    rebuilt: true
  };
}

/** Rebuilds, in the background, the stored PDFs of completed requests issued with an older layout. */
async function refreshOutdatedCompletedPdfs() {
  const [rows] = await db.query("SELECT id FROM documents WHERE LOWER(COALESCE(status, '')) = 'completed' ORDER BY id ASC");
  let rebuilt = 0;
  for (const { id } of rows) {
    try {
      if ((await getCompletedPdfFiles(id)).rebuilt) rebuilt += 1;
    } catch (err) {
      console.warn(`[Signed PDFs] request ${id} could not be rebuilt:`, err.message);
    }
  }
  if (rebuilt > 0) console.log(`[Signed PDFs] Rebuilt the signed documents of ${rebuilt} completed request(s) with the current signature stamp and lock`);
  return rebuilt;
}

/**
 * Locked copy of one document of a request that is still in progress, recorded so it can be verified:
 *  - a recipient (email) who has signed: the document with their own fields and signature;
 *  - a recipient who has not signed yet: the document without any fields;
 *  - the sender (no email): the document with the fields of every recipient who has signed so far.
 * Returns null for an unknown recipient or request.
 */
async function buildProgressCopy(documentId, { email = '', fileIndex = 0 } = {}) {
  const [docs] = await db.query('SELECT * FROM documents WHERE id = ?', [documentId]);
  const doc = docs[0];
  if (!doc) return null;
  const recipients = await helpers.getRecipients(documentId);
  const wanted = String(email || '').trim().toLowerCase();
  const recipient = wanted ? recipients.find((r) => String(r.email || '').toLowerCase() === wanted) : null;
  if (wanted && !recipient) return null;

  const files = await helpers.getDocumentFiles(documentId);
  const documents = files.length > 0
    ? files.map((f) => ({ id: f.id, name: f.file_name, text: f.document_text }))
    : [{ id: null, name: doc.document_name, text: doc.custom_message }];
  const index = Math.min(Math.max(parseInt(fileIndex, 10) || 0, 0), documents.length - 1);
  const target = documents[index];

  const signingRecipients = recipients.filter((r) => helpers.isSigningRole(r.role));
  const signedRecipients = signingRecipients.filter((r) => r.status === 'signed');
  const [fieldRows] = await db.query('SELECT * FROM document_fields WHERE document_id = ? ORDER BY id ASC', [documentId]);
  const allFields = fieldRows.map(helpers.parseFieldRow);
  // Whose fields this copy shows: the recipient's own once signed, nobody's before; the sender sees every signer so far
  const shownRecipients = recipient ? (recipient.status === 'signed' ? [recipient] : []) : signedRecipients;
  const sections = shownRecipients
    .map((r) => ({
      recipient: r,
      fields: allFields.length === 0
        ? [{ type: 'Signature', label: 'Signature' }]
        : allFields.filter((f) => f.docIndex === index && helpers.fieldBelongsToRecipient(f, r, signingRecipients))
    }))
    .filter((s) => s.fields.length > 0);

  let statusLine;
  let kind;
  if (recipient && recipient.status === 'signed') {
    statusLine = `Signed by ${recipient.name || recipient.email} on ${formatDateTime(recipient.signed_at)}`;
    kind = 'signer-copy';
  } else if (recipient) {
    statusLine = `Copy for review, not signed yet (downloaded on ${formatDateTime(new Date())})`;
    kind = 'recipient-copy';
  } else {
    statusLine = `In progress: ${signedRecipients.length} of ${signingRecipients.length} recipients signed (as of ${formatDateTime(new Date())})`;
    kind = 'progress-copy';
  }

  const identifier = await getOrCreateDocumentIdentifier(documentId);
  const bexId = identifier?.bexsign_doc_id || `BEX-DOC-${documentId}`;
  const buffer = await generateSignedDocumentPdf({
    documentName: target.name,
    documentText: target.text,
    bexsignDocId: documents.length > 1 ? `${bexId}-${index + 1}` : bexId,
    sections,
    statusLine,
    sender: await helpers.getRequestSender(doc)
  });
  const fileName = safeFileName(target.name, `Document ${index + 1}`);
  const hash = await recordFingerprint(buffer, {
    documentId,
    fileIndex: index,
    kind,
    fileName,
    recipientEmail: recipient ? recipient.email : null
  });
  return { buffer, fileName, sha256: hash };
}

// Previous name: a signed recipient's own copy
const buildSignerCopy = (documentId, email, fileIndex = 0) => buildProgressCopy(documentId, { email, fileIndex });

module.exports = {
  buildCompletedRequestFiles,
  finalizeCompletedRequest,
  getCompletedPdfFiles,
  refreshOutdatedCompletedPdfs,
  buildProgressCopy,
  buildSignerCopy
};
