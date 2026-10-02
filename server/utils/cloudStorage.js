/**
 * Cloud storage import (server/utils/cloudStorage.js): "Add document > Cloud" on the Send for signatures page.
 *
 * Each user connects their own Google Drive, Dropbox, OneDrive or Box account (OAuth 2.0 authorization code flow);
 * BexSign then lists that account's folders and files and downloads the ones the user picks.
 *
 * The app credentials (client ID and secret of the OAuth app registered with each provider) come from
 * Settings > Integrations (Google Drive, Dropbox file import, OneDrive, Box) or, when that is not set up, from
 * server/.env:
 *   GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET   (fall back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)
 *   DROPBOX_APP_KEY, DROPBOX_APP_SECRET
 *   ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT (fall back to MICROSOFT_CLIENT_ID / _SECRET / _TENANT)
 *   BOX_CLIENT_ID, BOX_CLIENT_SECRET
 *
 * The access and refresh tokens of a connected account are stored encrypted (AES-256-GCM, the integrations key)
 * in cloud_connections and never leave the server.
 */
const path = require('path');
const zlib = require('zlib');
const db = require('../db');
const integrationStore = require('./integrationStore');

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const IMPORT_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'txt', 'md'];
const TIMEOUT_MS = 25000;
const GOOGLE_FOLDER = 'application/vnd.google-apps.folder';
// Google's own formats have no file to download: they are exported as PDF
const GOOGLE_EXPORTS = {
  'application/vnd.google-apps.document': 'Google Docs',
  'application/vnd.google-apps.spreadsheet': 'Google Sheets',
  'application/vnd.google-apps.presentation': 'Google Slides'
};
const SHARED_WITH_ME = '__shared_with_me';

class CloudError extends Error {
  constructor(message, status = 400, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const firstEnv = (...names) => {
  const name = names.find((n) => process.env[n] && String(process.env[n]).trim());
  return name ? String(process.env[name]).trim() : '';
};

const extensionOf = (name) => path.extname(String(name || '')).replace('.', '').toLowerCase();

/* ---------------------------------------------------------------- http */

async function http(url, { method = 'GET', headers = {}, body, binary = false } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), binary ? TIMEOUT_MS * 3 : TIMEOUT_MS);
  try {
    const res = await fetch(url, { method, headers, body, signal: controller.signal, redirect: 'follow' });
    if (binary && res.ok) {
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > MAX_IMPORT_BYTES) throw new CloudError('This file is larger than 25 MB and cannot be added.', 413);
      const buffer = Buffer.from(await res.arrayBuffer());
      return { ok: true, status: res.status, headers: res.headers, buffer };
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}
    return { ok: res.ok, status: res.status, headers: res.headers, text, json };
  } catch (err) {
    if (err instanceof CloudError) throw err;
    throw new CloudError(err.name === 'AbortError' ? 'The storage provider took too long to answer. Try again.' : `The storage provider could not be reached: ${err.message}`, 502);
  } finally {
    clearTimeout(timer);
  }
}

const bearer = (token, extra = {}) => ({ Authorization: `Bearer ${token}`, ...extra });
const form = (values) => new URLSearchParams(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== null && v !== '')));

/** What went wrong, in the provider's own words when it said so. */
function providerMessage(res, fallback) {
  const j = res.json || {};
  const detail = j.error_description || j.error_summary || j.message
    || (typeof j.error === 'string' ? j.error : j.error?.message)
    || (res.text && res.text.length < 200 ? res.text : '');
  return detail ? `${fallback}: ${detail}` : `${fallback} (HTTP ${res.status}).`;
}

/* ---------------------------------------------------------------- what can be added */

function importCheck({ name, size, mimeType }) {
  if (GOOGLE_EXPORTS[mimeType]) return { importable: true, exportAs: 'pdf', note: `${GOOGLE_EXPORTS[mimeType]} file, added as PDF` };
  if (!IMPORT_EXTENSIONS.includes(extensionOf(name))) return { importable: false, note: 'This file type cannot be signed' };
  if (Number(size) > MAX_IMPORT_BYTES) return { importable: false, note: 'Larger than 25 MB' };
  return { importable: true };
}

const fileItem = ({ id, name, size = null, modifiedAt = null, mimeType = null }) => ({
  id: String(id), name, type: 'file', size: size === null || size === undefined ? null : Number(size), modifiedAt, mimeType, ...importCheck({ name, size, mimeType })
});
const folderItem = ({ id, name, modifiedAt = null, virtual = false }) => ({ id: String(id), name, type: 'folder', modifiedAt, virtual });

/** Folders first, then files, each by name. */
const sorted = (items) => [...items].sort((a, b) => (a.type === b.type
  ? String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' })
  : (a.type === 'folder' ? -1 : 1)));

/* ---------------------------------------------------------------- providers */

const PROVIDERS = {
  'google-drive': {
    key: 'google-drive',
    label: 'Google Drive',
    color: '#1FA463',
    env: { id: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_CLIENT_ID'], secret: ['GOOGLE_DRIVE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'] },
    envHint: 'GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET',
    authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    // offline + consent: Google only returns a refresh token on a consent screen
    authParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    async account(token) {
      const res = await http('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)', { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'Google Drive did not share the account details');
      return { email: res.json?.user?.emailAddress || null, name: res.json?.user?.displayName || null };
    },
    async list(token, { folder, query, cursor }) {
      const quote = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      let q;
      if (query) q = `name contains '${quote(query)}' and trashed = false`;
      else if (folder === SHARED_WITH_ME) q = 'sharedWithMe = true and trashed = false';
      else q = `'${quote(folder || 'root')}' in parents and trashed = false`;
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime)',
        orderBy: query ? 'modifiedTime desc' : 'folder,name_natural',
        pageSize: '100',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true'
      });
      if (cursor) params.set('pageToken', cursor);
      const res = await http(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'Google Drive could not list this folder');
      const items = (res.json?.files || [])
        .filter((f) => f.mimeType !== 'application/vnd.google-apps.shortcut')
        .map((f) => (f.mimeType === GOOGLE_FOLDER
          ? folderItem({ id: f.id, name: f.name, modifiedAt: f.modifiedTime })
          : fileItem({ id: f.id, name: f.name, size: f.size, modifiedAt: f.modifiedTime, mimeType: f.mimeType })));
      // The top of My Drive also offers what other people shared with this account
      if (!folder && !query && !cursor) items.unshift(folderItem({ id: SHARED_WITH_ME, name: 'Shared with me', virtual: true }));
      return { items, nextCursor: res.json?.nextPageToken || null };
    },
    async download(token, fileId) {
      const id = encodeURIComponent(fileId);
      const meta = await http(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,size&supportsAllDrives=true`, { headers: bearer(token) });
      if (!meta.ok) throw apiError(meta, 'Google Drive could not open this file');
      const { name, mimeType, size } = meta.json;
      const check = importCheck({ name, size, mimeType });
      if (!check.importable) throw new CloudError(`${name}: ${check.note}.`, 400);
      if (check.exportAs) {
        const res = await http(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application%2Fpdf`, { headers: bearer(token), binary: true });
        if (!res.ok) throw apiError(res, `Google could not export "${name}" as PDF`);
        return { name: `${name.replace(/\.pdf$/i, '')}.pdf`, mimeType: 'application/pdf', buffer: res.buffer };
      }
      const res = await http(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: bearer(token), binary: true });
      if (!res.ok) throw apiError(res, `Google Drive could not download "${name}"`);
      return { name, mimeType, buffer: res.buffer };
    },
    async revoke(token) {
      await http(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    }
  },

  'dropbox-files': {
    key: 'dropbox-files',
    label: 'Dropbox',
    color: '#0061FF',
    env: { id: ['DROPBOX_APP_KEY'], secret: ['DROPBOX_APP_SECRET'] },
    envHint: 'DROPBOX_APP_KEY and DROPBOX_APP_SECRET',
    authorizeUrl: () => 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: () => 'https://api.dropboxapi.com/oauth2/token',
    scope: 'account_info.read files.metadata.read files.content.read',
    // offline: Dropbox access tokens last four hours, the refresh token renews them
    authParams: { token_access_type: 'offline' },
    async account(token) {
      const res = await http('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', headers: bearer(token, { 'Content-Type': 'application/json' }), body: 'null' });
      if (!res.ok) throw apiError(res, 'Dropbox did not share the account details');
      return { email: res.json?.email || null, name: res.json?.name?.display_name || null };
    },
    async list(token, { folder, query, cursor }) {
      const headers = bearer(token, { 'Content-Type': 'application/json' });
      const entry = (e) => (e['.tag'] === 'folder'
        ? folderItem({ id: e.path_lower || e.id, name: e.name })
        : fileItem({ id: e.id, name: e.name, size: e.size, modifiedAt: e.server_modified || e.client_modified }));
      if (query) {
        const res = await http('https://api.dropboxapi.com/2/files/search_v2', {
          method: 'POST', headers, body: JSON.stringify({ query, options: { max_results: 60, file_status: 'active', filename_only: true } })
        });
        if (!res.ok) throw apiError(res, 'Dropbox could not search');
        const items = (res.json?.matches || []).map((m) => m.metadata?.metadata).filter((e) => e && ['file', 'folder'].includes(e['.tag'])).map(entry);
        return { items, nextCursor: null };
      }
      const res = cursor
        ? await http('https://api.dropboxapi.com/2/files/list_folder/continue', { method: 'POST', headers, body: JSON.stringify({ cursor }) })
        : await http('https://api.dropboxapi.com/2/files/list_folder', { method: 'POST', headers, body: JSON.stringify({ path: folder || '', limit: 200, include_non_downloadable_files: false }) });
      if (!res.ok) throw apiError(res, 'Dropbox could not list this folder');
      const items = (res.json?.entries || []).filter((e) => ['file', 'folder'].includes(e['.tag'])).map(entry);
      return { items, nextCursor: res.json?.has_more ? res.json.cursor : null };
    },
    async download(token, fileId) {
      // Non-ASCII characters must be escaped in this header
      const arg = JSON.stringify({ path: fileId }).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
      const meta = await http('https://api.dropboxapi.com/2/files/get_metadata', { method: 'POST', headers: bearer(token, { 'Content-Type': 'application/json' }), body: JSON.stringify({ path: fileId }) });
      if (!meta.ok) throw apiError(meta, 'Dropbox could not open this file');
      const check = importCheck({ name: meta.json.name, size: meta.json.size });
      if (!check.importable) throw new CloudError(`${meta.json.name}: ${check.note}.`, 400);
      const res = await http('https://content.dropboxapi.com/2/files/download', { method: 'POST', headers: bearer(token, { 'Dropbox-API-Arg': arg }), binary: true });
      if (!res.ok) throw apiError(res, `Dropbox could not download "${meta.json.name}"`);
      return { name: meta.json.name, mimeType: null, buffer: res.buffer };
    },
    async revoke(token) {
      await http('https://api.dropboxapi.com/2/auth/token/revoke', { method: 'POST', headers: bearer(token) });
    }
  },

  onedrive: {
    key: 'onedrive',
    label: 'OneDrive',
    color: '#0078D4',
    env: { id: ['ONEDRIVE_CLIENT_ID', 'MICROSOFT_CLIENT_ID'], secret: ['ONEDRIVE_CLIENT_SECRET', 'MICROSOFT_CLIENT_SECRET'], tenant: ['ONEDRIVE_TENANT', 'MICROSOFT_TENANT'] },
    envHint: 'ONEDRIVE_CLIENT_ID and ONEDRIVE_CLIENT_SECRET',
    authorizeUrl: (p) => `https://login.microsoftonline.com/${encodeURIComponent(p.tenant || 'common')}/oauth2/v2.0/authorize`,
    tokenUrl: (p) => `https://login.microsoftonline.com/${encodeURIComponent(p.tenant || 'common')}/oauth2/v2.0/token`,
    scope: 'offline_access User.Read Files.Read',
    authParams: { prompt: 'select_account' },
    async account(token) {
      const res = await http('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'Microsoft did not share the account details');
      return { email: res.json?.mail || res.json?.userPrincipalName || null, name: res.json?.displayName || null };
    },
    async list(token, { folder, query, cursor }) {
      const select = '$select=id,name,size,lastModifiedDateTime,folder,file&$top=200';
      let url;
      if (cursor) {
        // The next page link comes from Microsoft Graph: nothing else is ever requested with the token
        if (!/^https:\/\/graph\.microsoft\.com\//.test(cursor)) throw new CloudError('That page of results is not valid any more. Open the folder again.', 400);
        url = cursor;
      } else if (query) {
        url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(String(query).replace(/'/g, "''"))}')?${select}`;
      } else if (folder) {
        url = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folder)}/children?${select}`;
      } else {
        url = `https://graph.microsoft.com/v1.0/me/drive/root/children?${select}`;
      }
      const res = await http(url, { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'OneDrive could not list this folder');
      const items = (res.json?.value || []).filter((e) => e.folder || e.file).map((e) => (e.folder
        ? folderItem({ id: e.id, name: e.name, modifiedAt: e.lastModifiedDateTime })
        : fileItem({ id: e.id, name: e.name, size: e.size, modifiedAt: e.lastModifiedDateTime, mimeType: e.file?.mimeType })));
      return { items, nextCursor: res.json?.['@odata.nextLink'] || null };
    },
    async download(token, fileId) {
      const id = encodeURIComponent(fileId);
      const meta = await http(`https://graph.microsoft.com/v1.0/me/drive/items/${id}?$select=id,name,size,file`, { headers: bearer(token) });
      if (!meta.ok) throw apiError(meta, 'OneDrive could not open this file');
      const check = importCheck({ name: meta.json.name, size: meta.json.size });
      if (!check.importable) throw new CloudError(`${meta.json.name}: ${check.note}.`, 400);
      const res = await http(`https://graph.microsoft.com/v1.0/me/drive/items/${id}/content`, { headers: bearer(token), binary: true });
      if (!res.ok) throw apiError(res, `OneDrive could not download "${meta.json.name}"`);
      return { name: meta.json.name, mimeType: meta.json.file?.mimeType || null, buffer: res.buffer };
    }
  },

  box: {
    key: 'box',
    label: 'Box',
    color: '#0061D5',
    env: { id: ['BOX_CLIENT_ID'], secret: ['BOX_CLIENT_SECRET'] },
    envHint: 'BOX_CLIENT_ID and BOX_CLIENT_SECRET',
    authorizeUrl: () => 'https://account.box.com/api/oauth2/authorize',
    tokenUrl: () => 'https://api.box.com/oauth2/token',
    scope: '',
    authParams: {},
    async account(token) {
      const res = await http('https://api.box.com/2.0/users/me?fields=login,name', { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'Box did not share the account details');
      return { email: res.json?.login || null, name: res.json?.name || null };
    },
    async list(token, { folder, query, cursor }) {
      const fields = 'fields=id,type,name,size,modified_at';
      const offset = Math.max(0, parseInt(cursor, 10) || 0);
      const url = query
        ? `https://api.box.com/2.0/search?query=${encodeURIComponent(query)}&content_types=name&${fields}&limit=60&offset=${offset}`
        : `https://api.box.com/2.0/folders/${encodeURIComponent(folder || '0')}/items?${fields}&limit=200&offset=${offset}`;
      const res = await http(url, { headers: bearer(token) });
      if (!res.ok) throw apiError(res, 'Box could not list this folder');
      const entries = res.json?.entries || [];
      const items = entries.filter((e) => ['file', 'folder'].includes(e.type)).map((e) => (e.type === 'folder'
        ? folderItem({ id: e.id, name: e.name, modifiedAt: e.modified_at })
        : fileItem({ id: e.id, name: e.name, size: e.size, modifiedAt: e.modified_at })));
      const next = offset + entries.length;
      return { items, nextCursor: entries.length > 0 && next < Number(res.json?.total_count || 0) ? String(next) : null };
    },
    async download(token, fileId) {
      const id = encodeURIComponent(fileId);
      const meta = await http(`https://api.box.com/2.0/files/${id}?fields=name,size`, { headers: bearer(token) });
      if (!meta.ok) throw apiError(meta, 'Box could not open this file');
      const check = importCheck({ name: meta.json.name, size: meta.json.size });
      if (!check.importable) throw new CloudError(`${meta.json.name}: ${check.note}.`, 400);
      const res = await http(`https://api.box.com/2.0/files/${id}/content`, { headers: bearer(token), binary: true });
      if (!res.ok) throw apiError(res, `Box could not download "${meta.json.name}"`);
      return { name: meta.json.name, mimeType: null, buffer: res.buffer };
    },
    async revoke(token, provider) {
      await http('https://api.box.com/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ client_id: provider.clientId, client_secret: provider.clientSecret, token })
      });
    }
  }
};

/** A failed provider call: 401 means the stored token is no longer accepted. */
function apiError(res, fallback) {
  if (res.status === 401) return new CloudError('The connection to this account has expired. Connect it again.', 401, 'reconnect');
  if (res.status === 404) return new CloudError('That file or folder was not found. It may have been moved or deleted.', 404);
  if (res.status === 403) return new CloudError(providerMessage(res, 'The storage provider refused this request'), 403);
  if (res.status === 429) return new CloudError('The storage provider is busy (too many requests). Wait a moment and try again.', 429);
  return new CloudError(providerMessage(res, fallback), 502);
}

/* ---------------------------------------------------------------- credentials */

/**
 * A provider with the app credentials in use: the integration in Settings > Integrations wins over server/.env.
 * { ...provider, clientId, clientSecret, tenant, configured, hidden, source }
 */
async function resolveProvider(key) {
  const provider = PROVIDERS[key];
  if (!provider) return null;
  const app = await integrationStore.getOAuthAppSettings(key);
  if (app && app.configured) {
    return { ...provider, clientId: app.clientId, clientSecret: app.clientSecret, tenant: app.tenant || 'common', configured: true, hidden: !app.enabled, source: 'integration' };
  }
  const clientId = firstEnv(...provider.env.id);
  const clientSecret = firstEnv(...provider.env.secret);
  return {
    ...provider,
    clientId,
    clientSecret,
    tenant: provider.env.tenant ? (firstEnv(...provider.env.tenant) || 'common') : null,
    configured: Boolean(clientId && clientSecret),
    // An integration that exists but is turned off hides the provider even when .env has credentials
    hidden: Boolean(app && !app.enabled),
    source: 'env'
  };
}

/* ---------------------------------------------------------------- connections */

let schemaPromise = null;
function ensureCloudSchema() {
  if (!schemaPromise) {
    schemaPromise = db.query(
      `CREATE TABLE IF NOT EXISTS cloud_connections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        provider VARCHAR(40) NOT NULL,
        account_email VARCHAR(255) NULL,
        account_name VARCHAR(255) NULL,
        access_token TEXT NULL,
        refresh_token TEXT NULL,
        expires_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_cloud_user_provider (user_id, provider)
      )`
    ).catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

async function getConnection(userId, key) {
  await ensureCloudSchema();
  const [rows] = await db.query('SELECT * FROM cloud_connections WHERE user_id = ? AND provider = ?', [userId, key]);
  return rows[0] || null;
}

const expiryFrom = (seconds) => (Number(seconds) > 0 ? new Date(Date.now() + Number(seconds) * 1000) : null);

async function storeTokens(userId, key, tokens, account = null) {
  await ensureCloudSchema();
  const access = integrationStore.encrypt(tokens.access_token);
  const refresh = tokens.refresh_token ? integrationStore.encrypt(tokens.refresh_token) : null;
  const expires = expiryFrom(tokens.expires_in);
  const existing = await getConnection(userId, key);
  if (existing) {
    // A refresh usually returns no new refresh token: the stored one stays (Box and Microsoft return a new one)
    await db.query(
      `UPDATE cloud_connections SET access_token = ?, refresh_token = COALESCE(?, refresh_token), expires_at = ?
       ${account ? ', account_email = ?, account_name = ?' : ''} WHERE id = ?`,
      [access, refresh, expires, ...(account ? [account.email, account.name] : []), existing.id]
    );
  } else {
    await db.query(
      `INSERT INTO cloud_connections (user_id, provider, account_email, account_name, access_token, refresh_token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, key, account?.email || null, account?.name || null, access, refresh, expires]
    );
  }
}

async function requestTokens(provider, values) {
  const res = await http(provider.tokenUrl(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ client_id: provider.clientId, client_secret: provider.clientSecret, ...values })
  });
  return res;
}

/** Where the provider sends the browser after the consent screen. */
function buildAuthorizeUrl(provider, redirectUri, state) {
  const params = form({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scope,
    state,
    ...provider.authParams
  });
  return `${provider.authorizeUrl(provider)}?${params}`;
}

/** Swaps the authorization code for tokens and remembers the account. */
async function completeConnection(provider, code, redirectUri, userId) {
  const res = await requestTokens(provider, { grant_type: 'authorization_code', code, redirect_uri: redirectUri });
  if (!res.ok || !res.json?.access_token) {
    throw new CloudError(providerMessage(res, `${provider.label} did not accept the sign-in`), 400);
  }
  const account = await provider.account(res.json.access_token).catch(() => ({ email: null, name: null }));
  await storeTokens(userId, provider.key, res.json, account);
  return account;
}

/** A valid access token of the user's connected account (renewed with the refresh token when it has expired). */
async function accessTokenFor(userId, provider, { forceRefresh = false } = {}) {
  const row = await getConnection(userId, provider.key);
  if (!row) throw new CloudError(`Connect your ${provider.label} account first.`, 401, 'connect');
  const access = integrationStore.decrypt(row.access_token);
  const fresh = !row.expires_at || new Date(row.expires_at).getTime() - Date.now() > 90 * 1000;
  if (access && fresh && !forceRefresh) return access;

  const refresh = integrationStore.decrypt(row.refresh_token);
  if (!refresh) {
    if (access && !forceRefresh) return access; // no expiry was given: the provider says when it stops working
    await db.query('DELETE FROM cloud_connections WHERE id = ?', [row.id]);
    throw new CloudError(`The connection to ${provider.label} has expired. Connect it again.`, 401, 'reconnect');
  }
  const res = await requestTokens(provider, { grant_type: 'refresh_token', refresh_token: refresh, scope: provider.key === 'onedrive' ? provider.scope : undefined });
  if (!res.ok || !res.json?.access_token) {
    // invalid_grant: the user removed BexSign from their account, or the refresh token ran out
    if (res.status >= 400 && res.status < 500) {
      await db.query('DELETE FROM cloud_connections WHERE id = ?', [row.id]);
      throw new CloudError(`The connection to ${provider.label} has expired. Connect it again.`, 401, 'reconnect');
    }
    throw new CloudError(providerMessage(res, `${provider.label} could not renew the connection`), 502);
  }
  await storeTokens(userId, provider.key, res.json);
  return res.json.access_token;
}

/** Runs a provider call; a token the provider no longer accepts is renewed once and the call repeated. */
async function withToken(userId, provider, work) {
  const token = await accessTokenFor(userId, provider);
  try {
    return await work(token);
  } catch (err) {
    if (!(err instanceof CloudError) || err.code !== 'reconnect') throw err;
    const renewed = await accessTokenFor(userId, provider, { forceRefresh: true });
    return work(renewed);
  }
}

/** The cloud providers as the "Add document > Cloud" dialog shows them for this user. */
async function listProviders(userId) {
  await ensureCloudSchema();
  const [rows] = await db.query('SELECT provider, account_email, account_name, updated_at FROM cloud_connections WHERE user_id = ?', [userId]);
  const byKey = new Map(rows.map((r) => [r.provider, r]));
  const out = [];
  for (const key of Object.keys(PROVIDERS)) {
    const provider = await resolveProvider(key);
    if (provider.hidden) continue;
    const row = byKey.get(key);
    out.push({
      key,
      label: provider.label,
      color: provider.color,
      configured: provider.configured,
      connected: Boolean(row) && provider.configured,
      account: row ? { email: row.account_email, name: row.account_name, connectedAt: row.updated_at } : null
    });
  }
  return out;
}

async function disconnect(userId, key) {
  const provider = await resolveProvider(key);
  const row = await getConnection(userId, key);
  if (!row) return false;
  // Best effort: the provider forgets the grant too
  if (provider?.revoke) {
    const token = integrationStore.decrypt(row.refresh_token) || integrationStore.decrypt(row.access_token);
    if (token) await provider.revoke(token, provider).catch(() => {});
  }
  await db.query('DELETE FROM cloud_connections WHERE id = ?', [row.id]);
  return true;
}

async function listFiles(userId, key, { folder = '', query = '', cursor = '' } = {}) {
  const provider = await resolveProvider(key);
  if (!provider || provider.hidden) throw new CloudError('Unknown storage provider.', 404);
  if (!provider.configured) throw new CloudError(`${provider.label} is not set up yet.`, 400, 'not_configured');
  const result = await withToken(userId, provider, (token) => provider.list(token, {
    folder: String(folder || '').slice(0, 500),
    query: String(query || '').trim().slice(0, 120),
    cursor: String(cursor || '').slice(0, 2000)
  }));
  // A page keeps the provider's order when there are more pages; a complete folder is sorted folders first
  return { items: result.nextCursor || cursor ? result.items : sorted(result.items), nextCursor: result.nextCursor };
}

/** Downloads one file: { name, mimeType, size, buffer, text } (text is null when none could be read). */
async function importFile(userId, key, fileId) {
  const provider = await resolveProvider(key);
  if (!provider || provider.hidden) throw new CloudError('Unknown storage provider.', 404);
  if (!provider.configured) throw new CloudError(`${provider.label} is not set up yet.`, 400, 'not_configured');
  if (!fileId) throw new CloudError('Choose a file to add.', 400);
  const file = await withToken(userId, provider, (token) => provider.download(token, String(fileId)));
  if (file.buffer.length > MAX_IMPORT_BYTES) throw new CloudError(`${file.name} is larger than 25 MB and cannot be added.`, 413);
  if (file.buffer.length === 0) throw new CloudError(`${file.name} is empty.`, 400);
  const text = await extractText(file.buffer, file.name).catch(() => null);
  return { name: file.name, mimeType: file.mimeType || mimeOf(file.name), size: file.buffer.length, buffer: file.buffer, text };
}

const MIME_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
  md: 'text/markdown'
};
const mimeOf = (name) => MIME_TYPES[extensionOf(name)] || 'application/octet-stream';

/* ---------------------------------------------------------------- text of an imported file */

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').catch((err) => {
      pdfjsPromise = null;
      throw err;
    });
  }
  return pdfjsPromise;
}

/**
 * The text of a PDF, paragraph by paragraph. Lines that were wrapped at the right margin are joined again, so the
 * text flows in the BexSign page instead of keeping the line breaks of the original page width.
 */
async function pdfText(buffer) {
  const pdfjs = await loadPdfjs();
  const fontFolder = `${path.join(path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')), '..', '..', 'standard_fonts').replace(/\\/g, '/')}/`;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false, standardFontDataUrl: fontFolder, verbosity: 0 }).promise;
  const pages = [];
  try {
    for (let n = 1; n <= Math.min(pdf.numPages, 150); n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const lines = [];
      let line = null;
      const close = () => {
        if (line && line.text.trim()) lines.push(line);
        line = null;
      };
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const height = item.height || 0;
        if (line && Math.abs(y - line.y) > Math.max(2, (line.height || height || 10) * 0.6)) close();
        if (!line) line = { text: '', y, left: x, right: x, height };
        // A visible gap between two pieces on the same line is a space the PDF did not store
        if (line.text && !/\s$/.test(line.text) && !/^\s/.test(item.str) && x - line.right > (height || 10) * 0.2) line.text += ' ';
        line.text += item.str;
        line.right = Math.max(line.right, x + (item.width || 0));
        line.height = Math.max(line.height, height);
        if (item.hasEOL) close();
      }
      close();
      if (lines.length === 0) continue;
      const left = Math.min(...lines.map((l) => l.left));
      const width = Math.max(...lines.map((l) => l.right)) - left;
      let text = '';
      lines.forEach((current, i) => {
        const value = current.text.replace(/\s+/g, ' ').trim();
        if (i === 0) {
          text = value;
          return;
        }
        const previous = lines[i - 1];
        const gap = previous.y - current.y;
        const lineHeight = Math.max(previous.height, current.height, 8);
        const wrapped = width > 0 && (previous.right - left) / width > 0.86;
        // A larger gap (or a new column) starts a paragraph; a line that reached the right margin was wrapped
        if (gap > lineHeight * 1.9 || gap < 0) text += `\n\n${value}`;
        else if (wrapped) text += ` ${value}`;
        else text += `\n${value}`;
      });
      pages.push(text);
    }
  } finally {
    await pdf.destroy().catch(() => {});
  }
  return pages.join('\n\n').trim();
}

/** word/document.xml of a .docx (a ZIP archive) as plain text, one line per paragraph. */
function docxText(buffer) {
  // End of central directory record
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buffer.readUInt16LE(eocd + 10);
  let pointer = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && pointer + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const nameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength);
    if (name === 'word/document.xml') {
      const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
      const data = buffer.subarray(dataStart, dataStart + compressedSize);
      const xml = (method === 0 ? data : zlib.inflateRawSync(data)).toString('utf8');
      const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      const paragraphs = xml.split(/<\/w:p>/).map((p) => decode(p
        .replace(/<w:tab\b[^>]*\/>/g, '\t')
        .replace(/<w:br\b[^>]*\/>/g, '\n')
        .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<[^>]+>/g, (m, t) => (t === undefined ? '' : t))));
      return paragraphs.map((p) => p.replace(/[ \t]+$/g, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    pointer += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/** The text BexSign can show and sign for this file; null when it has none (images, old .doc files). */
async function extractText(buffer, name) {
  const ext = extensionOf(name);
  let text = null;
  if (ext === 'pdf') text = await pdfText(buffer);
  else if (ext === 'docx') text = docxText(buffer);
  else if (ext === 'txt' || ext === 'md') text = buffer.toString('utf8').replace(/^﻿/, '');
  text = text ? String(text).replace(/\r\n?/g, '\n').trim() : '';
  // A scanned PDF has pages but no text
  return text.length >= 20 ? text.slice(0, 400000) : null;
}

module.exports = {
  CloudError,
  PROVIDERS,
  MAX_IMPORT_BYTES,
  IMPORT_EXTENSIONS,
  resolveProvider,
  listProviders,
  buildAuthorizeUrl,
  completeConnection,
  disconnect,
  listFiles,
  importFile,
  extractText,
  ensureCloudSchema
};
