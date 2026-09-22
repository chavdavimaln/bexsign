/**
 * fetch wrapper for the BexSign API: sends the signed-in user's token, parses JSON and turns failures into Error
 * objects with the server's message (or a clear "server not reachable" message).
 */
/**
 * Where the BexSign API lives.
 *   VITE_API_URL   set it in client/.env (local) or in the build environment (live) to point anywhere,
 *                  e.g. https://sign.example.com or https://api.example.com
 *   not set        development falls back to the local server on port 5000; a production build talks to
 *                  the origin it is served from, so one deployment works behind any domain without rebuilding paths.
 */
function resolveApiOrigin() {
  const configured = (import.meta.env?.VITE_API_URL || '').trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (import.meta.env?.DEV) return 'http://localhost:5000';
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE = `${API_ORIGIN}/api`;

/** Absolute URL for a file the server stores (e.g. "/uploads/x.pdf"); absolute URLs are returned unchanged. */
export function apiUrl(pathname = '') {
  const value = String(pathname || '');
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
}

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
