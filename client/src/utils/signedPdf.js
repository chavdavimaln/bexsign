import { API_BASE } from './api';
/**
 * Every PDF of a sent request is produced by the server: signed documents, certificates and in-progress copies.
 * Their pages are flattened into images, the file is encrypted (printing only) and certified, and its SHA-256
 * fingerprint is recorded for "Verify document", so a downloaded or printed copy cannot be edited.
 */


async function fetchLockedPdf(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const isJson = (res.headers.get('Content-Type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : {};
    if (res.status === 404 && !isJson) {
      // Express answered "Cannot GET": the running server predates signed PDF downloads
      throw new Error('The BexSign server is running an older version without signed PDF downloads. Restart the server (npm start in the server folder), then download again.');
    }
    throw new Error(data.error || `The PDF could not be downloaded (HTTP ${res.status}).`);
  }
  return res;
}

async function downloadFromServer(url, fallbackName, options) {
  const res = await fetchLockedPdf(url, options);
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

const signedPdfUrl = (documentId, { index = 0, email = '' } = {}) => (
  `${API_BASE}/documents/${documentId}/signed-pdf?index=${index}${email ? `&email=${encodeURIComponent(email)}` : ''}`
);

/**
 * Final signed document of a completed request; while in progress, the recipient's own copy (email) or the
 * sender's copy with the signatures collected so far. A password is sent in the request body, never in the URL,
 * and is then needed to open the file.
 */
export function downloadSignedDocument(documentId, { index = 0, email = '', password = '' } = {}) {
  if (password) {
    return downloadFromServer(`${API_BASE}/documents/${documentId}/signed-pdf`, 'Signed document.pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, email, password })
    });
  }
  return downloadFromServer(signedPdfUrl(documentId, { index, email }), 'Signed document.pdf');
}

/**
 * Prints the locked PDF (the same file as the download) instead of the web page, so printing to "Save as PDF"
 * never produces an editable copy.
 */
export async function printLockedDocument(documentId, { index = 0, email = '' } = {}) {
  const res = await fetchLockedPdf(signedPdfUrl(documentId, { index, email }));
  const href = URL.createObjectURL(new Blob([await res.blob()], { type: 'application/pdf' }));
  await new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.title = 'Print document';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;';
    frame.onload = () => {
      setTimeout(() => {
        try {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } catch (e) {
          window.open(href, '_blank', 'noopener');
        }
        resolve();
      }, 400);
    };
    frame.src = href;
    document.body.appendChild(frame);
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(href);
    }, 120000);
  });
}

/** Prints every document of a request (locked PDFs), one after another. */
export async function printAllLockedDocuments(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`);
  const data = await res.json().catch(() => ({}));
  const count = Math.max(1, (data.document?.files || []).length);
  for (let index = 0; index < count; index++) {
    await printLockedDocument(documentId, { index });
  }
  return count;
}

export function downloadCompletionCertificate(documentId) {
  return downloadFromServer(`${API_BASE}/documents/${documentId}/certificate-pdf`, 'Certificate of Completion.pdf');
}

/** Every document of a sent request (signed PDFs, or in-progress copies), one after another. Returns the file names. */
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
