/**
 * Signature directory client.
 *
 * Two jobs:
 *   1. fetchSignatureForEmail - what the signing screens use to prefill a recipient's saved stamp by email.
 *      This still talks to the legacy /documents/employees endpoints, which the signing flow writes to.
 *   2. The signature module API (/api/signature-directory), where a signature has an owner: you get your own
 *      signatures in full and everyone else's read only, and the server refuses to change another user's row.
 */
import { API_BASE, apiFetch, authHeaders } from './api';

const CACHE_KEY = 'bexsign_employee_signatures_cache';

/** Looks up the saved signature for one email address (signing prefill). Returns null when there is none. */
export async function fetchSignatureForEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Dedicated by-email endpoint
    const res = await fetch(`${API_BASE}/documents/employees/by-email/${encodeURIComponent(cleanEmail)}`, {
      headers: { ...authHeaders() }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.employee) return data.employee;
    }
  } catch (e) {}

  try {
    // 2. Whole directory, matched locally
    const res2 = await fetch(`${API_BASE}/documents/employees/signatures`, { headers: { ...authHeaders() } });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.success && Array.isArray(data2.employees)) {
        const found = data2.employees.find((e) => (e.employee_email || '').trim().toLowerCase() === cleanEmail);
        if (found) return found;
      }
    }
  } catch (e) {}

  try {
    // 3. Last resort: the copy the signature module cached the last time it loaded
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find((e) => (e.employee_email || '').trim().toLowerCase() === cleanEmail);
        if (found) return found;
      }
    }
  } catch (e) {}

  return null;
}

/** The signed-in user's own signatures, editable. */
export async function fetchMySignatures() {
  const data = await apiFetch('/signature-directory/mine');
  const signatures = Array.isArray(data.signatures) ? data.signatures : [];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(signatures));
  } catch (e) {}
  return { signatures, owner: data.owner || null };
}

/** Everyone else's signatures: view only, and the server will not change them whatever the client asks. */
export async function fetchDirectorySignatures() {
  const data = await apiFetch('/signature-directory/directory');
  return {
    signatures: Array.isArray(data.signatures) ? data.signatures : [],
    notice: data.notice || ''
  };
}

/** The signed-in user's default signature (what signing screens prefill with), or null. */
export async function fetchMyDefaultSignature() {
  try {
    const { signatures } = await fetchMySignatures();
    return signatures.find((s) => s.is_default) || signatures[0] || null;
  } catch (e) {
    return null;
  }
}

export async function createSignature(payload) {
  const data = await apiFetch('/signature-directory', { method: 'POST', body: payload });
  return data.signature;
}

export async function updateSignature(id, payload) {
  const data = await apiFetch(`/signature-directory/${id}`, { method: 'PUT', body: payload });
  return data.signature;
}

export async function deleteSignature(id) {
  return apiFetch(`/signature-directory/${id}`, { method: 'DELETE' });
}

export async function setDefaultSignature(id) {
  const data = await apiFetch(`/signature-directory/${id}/default`, { method: 'POST' });
  return data.signature;
}

/** Where one of your own signatures has been used. The server refuses this for anyone else's signature. */
export async function fetchSignatureHistory(id, { limit = 100 } = {}) {
  const data = await apiFetch(`/signature-directory/${id}/history?limit=${limit}`);
  return {
    history: Array.isArray(data.history) ? data.history : [],
    summary: data.summary || { total: 0, documents: 0, lastUsedAt: null }
  };
}
