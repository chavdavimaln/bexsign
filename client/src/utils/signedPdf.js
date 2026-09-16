/**
 * Locked signed PDFs are produced by the server (signed documents, certificates, a signer's own copy): they open
 * normally but cannot be edited, and their SHA-256 fingerprint is recorded for "Verify document".
 */

const API_BASE = 'http://localhost:5000/api';

async function downloadFromServer(url, fallbackName) {
  const res = await fetch(url);
  if (!res.ok) {
    const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : {};
    if (res.status === 404 && !isJson) {
      // Express answered "Cannot GET": the running server predates signed PDF downloads
      throw new Error('The BexSign server is running an older version without signed PDF downloads. Restart the server (npm start in the server folder), then download again.');
    }
    throw new Error(data.error || `The PDF could not be downloaded (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  const plain = /filename="([^"]+)"/i.exec(disposition);
  const fileName = encoded ? decodeURIComponent(encoded[1]) : (plain ? plain[1] : fallbackName);

  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
  return { fileName, sha256: res.headers.get('X-BexSign-SHA256') || '' };
}

/** Final signed document of a completed request, or (with email, in progress) that recipient's signed copy. */
export function downloadSignedDocument(documentId, { index = 0, email = '' } = {}) {
  const query = `index=${index}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
  return downloadFromServer(`${API_BASE}/documents/${documentId}/signed-pdf?${query}`, 'Signed document.pdf');
}

export function downloadCompletionCertificate(documentId) {
  return downloadFromServer(`${API_BASE}/documents/${documentId}/certificate-pdf`, 'Certificate of Completion.pdf');
}

/** Every signed document of a completed request, one after another. Returns the downloaded file names. */
export async function downloadAllSignedDocuments(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`);
  const data = await res.json().catch(() => ({}));
  const count = Math.max(1, (data.document?.files || []).length);
  const names = [];
  for (let index = 0; index < count; index++) {
    const { fileName } = await downloadSignedDocument(documentId, { index });
    names.push(fileName);
  }
  return names;
}

/** Creates an editable draft copy of a sent/completed request (the original is not changed). */
export async function createEditableCopy(documentId, userId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/clone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `The copy could not be created (HTTP ${res.status}).`);
  }
  return data;
}

/** Name the copy will get ("doc-2" -> "doc-2 (Copy)"); the server picks the next free number if needed. */
export function previewCopyName(name) {
  const text = String(name || 'Document').trim();
  const hasPdf = /\.pdf$/i.test(text);
  const stem = text.replace(/\.pdf$/i, '').replace(/ \(Copy(?: \d+)?\)$/i, '');
  return `${stem} (Copy)${hasPdf ? '.pdf' : ''}`;
}
