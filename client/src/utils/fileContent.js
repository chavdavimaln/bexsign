/**
 * Reading a file the user just picked from their computer.
 *
 * BexSign shows a document as text on an A4 page, so a PDF, Word file, scan or picture has to be opened and read
 * before the editor can show it. The browser cannot do that on its own, so the file is sent to
 * POST /api/documents/extract-text, which answers with what belongs on the page:
 *
 *   kind 'text'    the words of the document
 *   kind 'image'   HTML with <img> tags: a picture, or the pages of a scan that has no text layer
 *   kind 'none'    nothing could be read; the caller falls back to the standard text for the document's name
 *
 * Nothing is stored by this call - the file itself is uploaded later, when the draft is saved. A server that
 * cannot be reached is not an error the user has to act on: the document is still added, with the standard text,
 * and `ok` says so.
 */
import { API_BASE, authHeaders } from './api';

/** @typedef {{ text: string, kind: 'text'|'image'|'none', pages: number }} FileContent */

/**
 * Reads several files in one request.
 * @param {File[]} files
 * @returns {Promise<{ ok: boolean, byFile: Map<File, FileContent>, error: string|null }>}
 */
export async function readUploadedFiles(files) {
  const list = Array.from(files || []);
  const byFile = new Map();
  if (list.length === 0) return { ok: true, byFile, error: null };

  const form = new FormData();
  list.forEach((file, index) => form.append(`file_${index}`, file, file.name));

  try {
    const res = await fetch(`${API_BASE}/documents/extract-text`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: form
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { ok: false, byFile, error: data.error || `The files could not be read (HTTP ${res.status}).` };
    }
    (data.files || []).forEach((entry) => {
      const index = Number(String(entry.field || '').replace('file_', ''));
      const file = list[index];
      if (!file) return;
      byFile.set(file, {
        text: entry.kind === 'none' ? '' : String(entry.text || ''),
        kind: entry.kind || 'none',
        pages: Number(entry.pages) || 1
      });
    });
    return { ok: true, byFile, error: null };
  } catch (err) {
    return { ok: false, byFile, error: 'The BexSign server could not be reached to read the files.' };
  }
}

/** The contents of a single file; `null` when it could not be read. */
export async function readUploadedFile(file) {
  const { byFile } = await readUploadedFiles([file]);
  const content = byFile.get(file);
  return content && content.text ? content : null;
}

/** Files whose contents the server could not make out, for a note to the user. */
export function unreadableNames(files, byFile) {
  return Array.from(files || [])
    .filter((file) => !byFile.get(file)?.text)
    .map((file) => file.name);
}
