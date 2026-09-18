/**
 * fetch wrapper for the BexSign API: sends the signed-in user's token, parses JSON and turns failures into Error
 * objects with the server's message (or a clear "server not reachable" message).
 */
export const API_ORIGIN = 'http://localhost:5000';
export const API_BASE = `${API_ORIGIN}/api`;

export function authHeaders() {
  try {
    const token = localStorage.getItem('token');
    // The demo session token is not a JWT; the server then uses the default account
    if (token && token.split('.').length === 3) return { Authorization: `Bearer ${token}` };
  } catch (e) {}
  return {};
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res;
  try {
    res = await fetch(path.startsWith('http') ? path : `${API_BASE}${path}`, {
      method,
      headers: {
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...headers
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });
  } catch (err) {
    throw new Error(`Could not reach the BexSign server at ${API_ORIGIN}. Make sure it is running.`);
  }
  if (raw) {
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    }
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data.sessionExpired) {
    // Expired or invalid sign-in: back to the login page
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }
  if (!res.ok || data.success === false) {
    if (res.status === 404 && !data.error) {
      throw new Error('This feature needs the latest BexSign server. Restart the server (npm start in the server folder).');
    }
    const error = new Error(data.error || `Request failed (HTTP ${res.status}).`);
    error.status = res.status;
    throw error;
  }
  return data;
}

/** Downloads a file returned by the API (e.g. a CSV export). */
export async function apiDownload(path, fallbackName = 'export.csv') {
  const res = await apiFetch(path, { raw: true });
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
