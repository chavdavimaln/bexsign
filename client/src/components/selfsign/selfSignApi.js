/**
 * Sign yourself - API calls and the vocabulary the module shares (client/src/components/selfsign/selfSignApi.js).
 *
 * Every call goes through apiFetch, so the signed-in user's token travels with it and the module works unchanged
 * on a live server (the API origin comes from utils/api, never from a hard-coded localhost).
 */
import { apiFetch, apiUrl, authHeaders, API_BASE } from '../../utils/api';

/** The five stages a self-sign document moves through, in the order the module shows them. */
export const STAGES = {
  draft: {
    id: 'draft',
    label: 'Generated',
    short: 'Generated',
    tone: 'slate',
    description: 'The document exists but has no fields yet. Download it, or add fields when you want to sign it.'
  },
  prepared: {
    id: 'prepared',
    label: 'Ready to sign',
    short: 'Ready',
    tone: 'amber',
    description: 'Signature, date and other fields are placed. Sign it whenever you are ready.'
  },
  signed: {
    id: 'signed',
    label: 'Signed',
    short: 'Signed',
    tone: 'emerald',
    description: 'You signed it. The signed PDF and its certificate of completion are ready to download or share.'
  }
};

export const SOURCE_LABELS = {
  upload: 'Uploaded file',
  template: 'From a template',
  created: 'Written in BexSign',
  merged: 'Merged documents'
};

/** Sentence shown for one history entry. */
export const ACTION_LABELS = {
  created: 'Created',
  document_added: 'Document added',
  document_replaced: 'Document replaced',
  document_removed: 'Document removed',
  merged: 'Documents merged',
  renamed: 'Renamed',
  fields_placed: 'Fields placed',
  signed: 'Signed',
  downloaded: 'Downloaded',
  shared: 'Copy emailed',
  share_failed: 'Copy could not be emailed',
  printed: 'Printed'
};

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const listSelfSign = (params) => apiFetch(`/self-sign${query(params)}`);
export const getSelfSign = (id) => apiFetch(`/self-sign/${id}`);
export const getSelfSignByDocument = (documentId) => apiFetch(`/self-sign/document/${documentId}`);
export const getSelfSignHistory = (id) => apiFetch(`/self-sign/${id}/history`);
export const getOwnSignatures = () => apiFetch('/self-sign/signatures');

export const createSelfSign = (form) => apiFetch('/self-sign', { method: 'POST', body: form });
export const addSelfSignDocuments = (id, form) => apiFetch(`/self-sign/${id}/documents`, { method: 'POST', body: form });
export const replaceSelfSignDocument = (id, fileId, form) => apiFetch(`/self-sign/${id}/documents/${fileId}`, { method: 'PUT', body: form });
export const removeSelfSignDocument = (id, fileId) => apiFetch(`/self-sign/${id}/documents/${fileId}`, { method: 'DELETE' });
export const mergeSelfSignDocuments = (id, body) => apiFetch(`/self-sign/${id}/merge`, { method: 'POST', body });
export const renameSelfSign = (id, title) => apiFetch(`/self-sign/${id}`, { method: 'PATCH', body: { title } });
export const prepareSelfSign = (id) => apiFetch(`/self-sign/${id}/prepare`, { method: 'POST' });
export const completeSelfSign = (id, body = {}) => apiFetch(`/self-sign/${id}/complete`, { method: 'POST', body });
export const shareSelfSign = (id, body) => apiFetch(`/self-sign/${id}/share`, { method: 'POST', body });
export const deleteSelfSign = (id) => apiFetch(`/self-sign/${id}`, { method: 'DELETE' });

/** Downloads one PDF of a self-sign document (the signed copy once it is signed). */
export async function downloadSelfSign(id, { index = 0, type = 'document', fallbackName = 'document.pdf' } = {}) {
  const res = await apiFetch(`/self-sign/${id}/download${query({ index, type })}`, { raw: true });
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

/**
 * The documents a self-sign document holds, as the multipart payload the server expects.
 * `docs` is [{ name, file?, documentText? }] - a File for an upload, text for a template or a blank document.
 */
export function buildDocumentsForm(docs, extra = {}) {
  const form = new FormData();
  const meta = docs.map((doc, index) => {
    const entry = { name: doc.name, documentText: doc.documentText || '' };
    if (doc.file) {
      entry.uploadKey = String(index);
      form.append(`file_${index}`, doc.file, doc.name);
    }
    return entry;
  });
  form.set('documentsMeta', JSON.stringify(meta));
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.set(key, String(value));
  });
  return form;
}

export { apiUrl, authHeaders, API_BASE };
