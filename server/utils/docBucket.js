/**
 * Doc bucket: the one place saved documents, signed PDFs, certificates, avatars and scans go
 * through, so where they are kept is a setting rather than code spread over twenty files.
 *
 *   DOC_BUCKET_PROVIDER=local   (the default) - the server's own disk, server/uploads: what
 *                               BexSign has always done. Same folders, same file names, nothing
 *                               to migrate, no extra package to install.
 *   DOC_BUCKET_PROVIDER=s3      AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Wasabi, ...
 *   DOC_BUCKET_PROVIDER=azure   Azure Blob Storage
 *   DOC_BUCKET_PROVIDER=gcs     Google Cloud Storage
 *
 * A file is addressed by its **key** - the path it has under server/uploads today:
 *
 *   1764-contract.pdf                     a request document
 *   completed/12/01-contract.pdf           the signed copy of document 1 of request 12
 *   completed/12/certificate-of-completion.pdf
 *   avatars/7.png            physical/12-scan.pdf            merged/12-merged.pdf
 *
 * Because the key is the old path, every `file_path` already in the database and every
 * /uploads/... address already in an email keeps working, whichever provider is switched on.
 *
 * ## Using it from a route (see doc/31-doc-bucket.md for the full guide)
 *
 *   const bucket = require('../utils/docBucket');
 *
 *   const key = bucket.keyFor('completed', String(docId), 'contract.pdf');
 *   await bucket.put(key, pdfBuffer, { contentType: 'application/pdf' });   // save
 *   const pdf = await bucket.get(key);                                      // read back
 *   const link = await bucket.url(key);                                     // address to share
 *   await bucket.remove(key);                                               // delete
 *
 * Uploads: `multer({ storage: bucket.multerStorage({ area: 'documents' }) })` replaces
 * `multer.diskStorage(...)` and still fills req.file.path / .filename, so the code after it
 * does not change.
 *
 * ## Why existing code keeps working on a remote provider
 *
 * BexSign's PDF pipeline (completedPdfGenerator, pdfCertification, pdfMerge) reads and writes
 * real files with `fs`. With a remote provider the bucket keeps the authoritative copy and, while
 * DOC_BUCKET_LOCAL_CACHE is on (the default), also keeps a copy under server/uploads, so that
 * pipeline runs untouched. `await bucket.ensureLocal(key)` fetches a copy that is missing - for
 * instance on a fresh server whose disk starts empty - and hands back an absolute path.
 */

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const localProvider = require('./docBucketProviders/local');

const PROVIDERS = {
  local: () => localProvider,
  s3: () => require('./docBucketProviders/s3'),
  azure: () => require('./docBucketProviders/azure'),
  gcs: () => require('./docBucketProviders/gcs')
};

/**
 * Folders inside the bucket. Every kind of file has one, so the bucket stays readable as it grows and a
 * lifecycle rule can be written against a prefix. Documents are filed by the month they arrived
 * (`documents/2026/10/...`), which keeps any one folder a sensible size.
 */
const AREAS = {
  documents: 'documents',
  templates: 'templates',
  completed: 'completed',
  avatars: 'avatars',
  physical: 'physical',
  merged: 'merged',
  // Page pictures of a scan or an uploaded image, shown in the editor instead of the text it has none of
  previews: 'previews',
  // The last copy of a document deleted for good, kept so it can still be handed back (doc/35)
  archive: 'archive'
};

/** Areas whose files are filed under the year and month they were stored. */
const DATED_AREAS = new Set(['documents']);

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
  '.csv': 'text/csv; charset=utf-8',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.rtf': 'application/rtf',
  '.eml': 'message/rfc822'
};

let state = null;

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

/**
 * Loads the configured provider once. Every call goes through here, so a provider that cannot
 * start (missing package, empty bucket name) is reported once and the server falls back to the
 * local disk instead of failing every upload.
 */
function current() {
  if (state) return state;
  const requested = (process.env.DOC_BUCKET_PROVIDER || 'local').trim().toLowerCase() || 'local';
  const localStatus = localProvider.configure(process.env);

  if (!PROVIDERS[requested]) {
    state = {
      name: 'local',
      provider: localProvider,
      ready: localStatus.ready,
      error: `DOC_BUCKET_PROVIDER="${requested}" is not a provider BexSign knows (local, s3, azure, gcs). The server's own disk is used instead.`,
      info: localStatus.info,
      mirror: false,
      requested
    };
    return state;
  }

  if (requested === 'local') {
    state = {
      name: 'local',
      provider: localProvider,
      ready: localStatus.ready,
      error: localStatus.error || '',
      info: localStatus.info,
      mirror: false,
      requested
    };
    return state;
  }

  let provider = null;
  let status = { ready: false, error: '' };
  try {
    provider = PROVIDERS[requested]();
    status = provider.configure(process.env);
  } catch (err) {
    status = { ready: false, error: err.message };
  }

  if (!status.ready) {
    state = {
      name: 'local',
      provider: localProvider,
      ready: localStatus.ready,
      error: `The "${requested}" doc bucket is not usable (${status.error}). The server's own disk is used instead.`,
      info: localStatus.info,
      mirror: false,
      requested
    };
    return state;
  }

  state = {
    name: requested,
    provider,
    ready: true,
    error: '',
    info: status.info || {},
    // The PDF pipeline reads files with fs, so a remote bucket keeps a local copy as well
    mirror: process.env.DOC_BUCKET_LOCAL_CACHE === undefined ? true : truthy(process.env.DOC_BUCKET_LOCAL_CACHE),
    requested
  };
  return state;
}

/** Re-reads server/.env. Used by the migration script and after settings change; harmless otherwise. */
function reset() {
  state = null;
  return current();
}

// --- keys -------------------------------------------------------------------------------------

/** Keeps a key inside the bucket: no leading slash, no drive letter, no ".." climbing out. */
function normalizeKey(value) {
  const raw = String(value || '').replace(/\\/g, '/').trim();
  const withoutDrive = raw.replace(/^[a-zA-Z]:\//, '');
  return withoutDrive
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

/** bucket.keyFor('completed', '12', 'contract.pdf') -> 'completed/12/contract.pdf' */
function keyFor(area, ...segments) {
  const prefix = AREAS[area] !== undefined ? AREAS[area] : normalizeKey(area);
  return normalizeKey([prefix, ...segments].filter(Boolean).join('/'));
}

/**
 * The key for a path already stored in the database or written by older code - absolute or
 * relative, Windows or POSIX, with or without the "uploads" segment.
 *   'G:\...\server\uploads\completed\12\a.pdf' -> 'completed/12/a.pdf'
 *   '/uploads/1764-contract.pdf'               -> '1764-contract.pdf'
 *   'completed/12/a.pdf'                        -> unchanged
 */
function keyFromPath(value) {
  const raw = String(value || '').replace(/\\/g, '/');
  if (!raw) return '';
  const marker = raw.toLowerCase().lastIndexOf('uploads/');
  if (marker !== -1) return normalizeKey(raw.slice(marker + 'uploads/'.length));
  if (/^([a-zA-Z]:\/|\/)/.test(raw)) return normalizeKey(raw.split('/').pop());
  return normalizeKey(raw);
}

/**
 * The key a new file of this area gets. A dated area (documents) files it under the year and month, so
 * `documents/2026/10/1764512345678-contract.pdf`; every other area puts it straight in its folder.
 */
function newKeyFor(area, name, when = new Date()) {
  if (!DATED_AREAS.has(area)) return keyFor(area, name);
  const year = String(when.getFullYear());
  const month = String(when.getMonth() + 1).padStart(2, '0');
  return keyFor(area, year, month, name);
}

/** A unique, safe file name of the shape BexSign already uses: 1764512345678-my_contract.pdf */
function safeFileName(originalName, { prefix = '' } = {}) {
  const base = String(originalName || 'document')
    .split(/[\\/]/)
    .pop()
    .replace(/\s+/g, '_')
    .replace(/[^\w.\-]+/g, '_')
    .slice(-180);
  return `${Date.now()}-${prefix ? `${prefix}-` : ''}${base}`;
}

function contentTypeFor(key) {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] || 'application/octet-stream';
}

// --- local copies -----------------------------------------------------------------------------

/** Where this key lives (or would live) on this server's disk. */
function localPathFor(key) {
  return localProvider.localPathFor(normalizeKey(key));
}

/** True when the rest of the app can open this key as an ordinary file right now. */
function hasLocalCopy(key) {
  try {
    return fs.existsSync(localPathFor(key));
  } catch (err) {
    return false;
  }
}

async function writeLocalCopy(key, buffer) {
  const target = localPathFor(key);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, buffer);
  return target;
}

/**
 * Hands back an absolute path the `fs`-based PDF pipeline can read, downloading the object from
 * the bucket first if this server does not have it. Returns null when the key does not exist.
 */
async function ensureLocal(key) {
  const safe = normalizeKey(key);
  if (!safe) return null;
  const target = localPathFor(safe);
  if (fs.existsSync(target)) return target;
  const { name, provider } = current();
  if (name === 'local') return null;
  const info = await provider.stat(safe);
  if (!info) return null;
  const buffer = await provider.get(safe);
  await writeLocalCopy(safe, buffer);
  return target;
}

// --- reading and writing ----------------------------------------------------------------------

async function put(key, data, { contentType } = {}) {
  const safe = normalizeKey(key);
  if (!safe) throw new Error('A doc bucket key is required.');
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const { name, provider, mirror } = current();
  const type = contentType || contentTypeFor(safe);
  const saved = await provider.put(safe, buffer, { contentType: type });
  if (name !== 'local' && mirror) {
    try {
      await writeLocalCopy(safe, buffer);
    } catch (err) {
      console.warn(`[Doc bucket] ${safe} was saved to ${name} but the local copy failed: ${err.message}`);
    }
  }
  return { ...saved, key: safe, provider: name, contentType: type };
}

/**
 * Saves a file under the path the database stores, e.g. '/uploads/completed/12/01-contract.pdf'. The
 * counterpart of readByPath: both take the address the rest of BexSign already passes around, so a module
 * that writes and reads documents never has to know which provider is switched on.
 */
async function putByPath(filePath, data, { contentType } = {}) {
  return put(keyFromPath(filePath), data, { contentType });
}

/**
 * The bytes of a file by the path stored in the database. Null when it is in neither the bucket nor on this
 * disk - a file issued before a restore, or one deleted by hand. Callers decide what a missing file means.
 */
async function readByPath(filePath) {
  const key = keyFromPath(filePath);
  if (!key) return null;
  try {
    return await get(key);
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404)) return null;
    console.warn(`[Doc bucket] ${key} could not be read: ${err.message}`);
    return null;
  }
}

/** Whether a file exists, by the path stored in the database. */
async function existsByPath(filePath) {
  const key = keyFromPath(filePath);
  if (!key) return false;
  return exists(key);
}

/** Saves a file that is already on this disk (a temp upload, a freshly generated PDF). */
async function putFile(key, localFilePath, { contentType } = {}) {
  const buffer = await fsp.readFile(localFilePath);
  return put(key, buffer, { contentType });
}

async function get(key) {
  const safe = normalizeKey(key);
  const { name, provider } = current();
  if (name !== 'local' && hasLocalCopy(safe)) {
    // The local copy is a copy of this very object, so prefer it: no round trip, no egress
    return fsp.readFile(localPathFor(safe));
  }
  return provider.get(safe);
}

async function getStream(key) {
  const safe = normalizeKey(key);
  const { name, provider } = current();
  if (name !== 'local' && hasLocalCopy(safe)) return fs.createReadStream(localPathFor(safe));
  return provider.getStream(safe);
}

async function stat(key) {
  const safe = normalizeKey(key);
  const { provider } = current();
  return provider.stat(safe);
}

async function exists(key) {
  return Boolean(await stat(key));
}

async function remove(key) {
  const safe = normalizeKey(key);
  const { name, provider } = current();
  const removed = await provider.remove(safe);
  if (name !== 'local') {
    try {
      await fsp.unlink(localPathFor(safe));
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`[Doc bucket] the local copy of ${safe} could not be removed: ${err.message}`);
    }
  }
  return removed;
}

async function list(prefix = '', options = {}) {
  const { provider } = current();
  return provider.list(normalizeKey(prefix), options);
}

async function copy(fromKey, toKey) {
  const from = normalizeKey(fromKey);
  const to = normalizeKey(toKey);
  const { name, provider, mirror } = current();
  const result = await provider.copy(from, to);
  if (name !== 'local' && mirror) {
    try {
      await writeLocalCopy(to, await provider.get(to));
    } catch (err) {
      console.warn(`[Doc bucket] ${to} was copied in ${name} but the local copy failed: ${err.message}`);
    }
  }
  return { ...result, key: to, provider: name };
}

/**
 * The address to put in a page, an email or an API answer. Local: the /uploads/... path the
 * client already builds with apiUrl(). Remote: the public URL when the bucket is public, a
 * signed URL when it is not, and the /uploads/... path as the fallback - that path is served
 * from the bucket by uploadsFallback() below, so it always resolves.
 */
async function url(key, { expiresIn, direct = true } = {}) {
  const safe = normalizeKey(key);
  const { name, provider } = current();
  if (name === 'local') return provider.url(safe);
  if (direct) {
    try {
      const link = await provider.url(safe, { expiresIn });
      if (link) return link;
    } catch (err) {
      console.warn(`[Doc bucket] no direct address for ${safe}: ${err.message}`);
    }
  }
  return `/uploads/${safe}`;
}

// --- uploads ----------------------------------------------------------------------------------

const collectStream = (readable) => new Promise((resolve, reject) => {
  const chunks = [];
  readable.on('data', (chunk) => chunks.push(chunk));
  readable.on('error', reject);
  readable.on('end', () => resolve(Buffer.concat(chunks)));
});

/**
 * A multer storage engine that saves into the bucket. A drop-in replacement for
 * multer.diskStorage: req.file keeps .path (absolute, whenever the file is on this disk),
 * .filename and .size, and gains .key and .bucket.
 *
 *   const upload = multer({ storage: bucket.multerStorage({ area: 'documents' }) });
 */
function multerStorage({ area = 'documents', prefix = '', filename } = {}) {
  return {
    _handleFile(req, file, cb) {
      const name = typeof filename === 'function'
        ? filename(req, file)
        : safeFileName(file.originalname, { prefix });
      const key = newKeyFor(area, name);
      collectStream(file.stream)
        .then((buffer) => put(key, buffer, { contentType: file.mimetype }))
        .then((saved) => cb(null, {
          key: saved.key,
          bucket: saved.provider,
          filename: name,
          size: saved.size,
          mimetype: file.mimetype,
          // Absolute path while a copy is on this disk, so fs-based code after the upload works
          path: hasLocalCopy(saved.key) ? localPathFor(saved.key) : null,
          destination: hasLocalCopy(saved.key) ? path.dirname(localPathFor(saved.key)) : null
        }))
        .catch(cb);
    },
    _removeFile(req, file, cb) {
      if (!file || !file.key) return cb(null);
      remove(file.key).then(() => cb(null)).catch(cb);
    }
  };
}

// --- serving ----------------------------------------------------------------------------------

/**
 * Mounted at /uploads **after** express.static, this answers requests for files that are in a
 * remote bucket and therefore not on this disk - at the very same address, so links already sent
 * out keep working. With the local provider it is a no-op that costs one comparison.
 *
 *   app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 *   app.use('/uploads', docBucket.uploadsFallback());
 */
function uploadsFallback() {
  return async function docBucketUploads(req, res, next) {
    if (current().name === 'local') return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let key = '';
    try {
      key = normalizeKey(decodeURIComponent(req.path));
    } catch (err) {
      return next();
    }
    if (!key) return next();
    try {
      const info = await stat(key);
      if (!info) return next();
      if (truthy(process.env.DOC_BUCKET_REDIRECT)) {
        const link = await url(key);
        if (/^https?:\/\//i.test(link)) return res.redirect(302, link);
      }
      res.setHeader('Content-Type', info.contentType || contentTypeFor(key));
      if (info.size) res.setHeader('Content-Length', String(info.size));
      if (info.modified) res.setHeader('Last-Modified', new Date(info.modified).toUTCString());
      if (req.method === 'HEAD') return res.end();
      const stream = await getStream(key);
      stream.on('error', (err) => {
        console.warn(`[Doc bucket] ${key} could not be streamed: ${err.message}`);
        if (res.headersSent) res.end();
        else res.status(502).json({ success: false, error: 'The file could not be read from the doc bucket.' });
      });
      return stream.pipe(res);
    } catch (err) {
      console.warn(`[Doc bucket] ${key} could not be served: ${err.message}`);
      return next();
    }
  };
}

// --- diagnostics ------------------------------------------------------------------------------

/** What the server is using right now, for the status endpoint and the start-up log line. */
function status() {
  const s = current();
  return {
    provider: s.name,
    requested: s.requested,
    ready: s.ready,
    error: s.error || '',
    localCopies: s.name === 'local' ? 'always' : (s.mirror ? 'on' : 'off'),
    localRoot: localProvider.root(),
    info: s.info || {}
  };
}

/** Writes, reads back and deletes one tiny object, so a misconfiguration is seen before go-live. */
async function selfTest() {
  const key = keyFor('documents', `.docbucket-selftest-${Date.now()}.txt`);
  const body = Buffer.from(`BexSign doc bucket check ${new Date().toISOString()}`);
  try {
    await put(key, body, { contentType: 'text/plain; charset=utf-8' });
    const readBack = await get(key);
    const identical = Buffer.compare(body, readBack) === 0;
    await remove(key);
    return identical
      ? { success: true, provider: current().name }
      : { success: false, provider: current().name, error: 'The object read back did not match what was written.' };
  } catch (err) {
    try {
      await remove(key);
    } catch (cleanupErr) { /* nothing to clean up */ }
    return { success: false, provider: current().name, error: err.message };
  }
}

module.exports = {
  AREAS,
  reset,
  status,
  selfTest,
  provider: () => current().name,
  isRemote: () => current().name !== 'local',
  keyFor,
  keyFromPath,
  normalizeKey,
  newKeyFor,
  safeFileName,
  contentTypeFor,
  localPathFor,
  hasLocalCopy,
  ensureLocal,
  put,
  putByPath,
  putFile,
  get,
  readByPath,
  existsByPath,
  getStream,
  stat,
  exists,
  remove,
  list,
  copy,
  url,
  multerStorage,
  uploadsFallback
};
