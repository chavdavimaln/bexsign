import { API_BASE, sessionToken } from './api';
import { captureDocumentLayouts } from './layoutSnapshot';

/**
 * Layout snapshots for requests that were sent without one.
 *
 * The signed PDF shows every field at the place it has on the page only when the document's layout snapshot is
 * stored with it (see layoutSnapshot.js). The editor stores it when a request is saved or sent. Requests sent
 * before that existed, or while an older server was running, have none, and their PDF lists the fields under the
 * text. When a signed-in user opens, downloads or prints such a request, the snapshot is taken here from the same
 * page markup and sent to the server, which then draws the PDF with the fields in place.
 *
 * Nothing happens for drafts (the editor takes their snapshot when they are sent), for recipients on a signing
 * link, or when every document already has its snapshot.
 */

const finished = new Set();
const running = new Map();

/** Takes and stores the missing layouts of a request; resolves to how many were stored. */
export function ensureDocumentLayouts(documentId) {
  const key = String(documentId || '');
  if (!key || finished.has(key) || !sessionToken()) return Promise.resolve(0);
  // Opening a request and downloading it at once share one run
  if (!running.has(key)) {
    running.set(key, recordLayouts(documentId, key).finally(() => running.delete(key)));
  }
  return running.get(key);
}

async function recordLayouts(documentId, key) {

  const res = await fetch(`${API_BASE}/documents/${documentId}`);
  const data = await res.json().catch(() => ({}));
  const doc = data?.document;
  if (!res.ok || !doc) return 0;

  const files = Array.isArray(doc.files) ? doc.files : [];
  // An older server does not report has_layout: it could not store a snapshot either
  const missing = files.map((file, index) => ({ file, index })).filter(({ file }) => file.has_layout === false);
  const isDraft = String(doc.status || 'Draft').toLowerCase() === 'draft';
  if (missing.length === 0 || isDraft) {
    if (files.length > 0 && files.every((file) => file.has_layout === true)) finished.add(key);
    return 0;
  }

  const fieldsByDoc = doc.fieldsByDoc || {};
  const layouts = await captureDocumentLayouts(missing.map(({ file, index }) => ({
    title: file.file_name || '',
    docIdText: `${doc.bexsign_doc_id || ''}${files.length > 1 ? `-${index + 1}` : ''}`,
    documentText: file.document_text,
    customMessage: doc.custom_message,
    totalPages: (fieldsByDoc[index] || []).reduce((max, field) => Math.max(max, parseInt(field.page, 10) || 1), 1)
  })));

  const payload = missing
    .map(({ file }, position) => ({ fileId: file.id, layout: layouts[position] }))
    .filter((entry) => entry.layout);
  if (payload.length === 0) return 0;

  const saved = await fetch(`${API_BASE}/documents/${documentId}/layouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layouts: payload })
  });
  const result = await saved.json().catch(() => ({}));
  if (saved.ok && result.success) finished.add(key);
  return Number(result.stored) || 0;
}

/** The same, never failing: a PDF download goes ahead whether or not the layout could be recorded. */
export function ensureDocumentLayoutsQuietly(documentId) {
  return ensureDocumentLayouts(documentId).catch(() => 0);
}
