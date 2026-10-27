/**
 * Doc bucket provider: the server's own disk (the default).
 *
 * Keys map one-to-one onto paths under the bucket root, which is server/uploads unless
 * DOC_BUCKET_LOCAL_ROOT says otherwise. So the key "completed/12/01-contract.pdf" is the file
 * server/uploads/completed/12/01-contract.pdf - exactly where BexSign has always written it.
 * Nothing moves and nothing changes when this provider is used.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

let root = path.join(__dirname, '..', '..', 'uploads');

const pathFor = (key) => path.join(root, key.split('/').join(path.sep));

const ensureParent = async (filePath) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
};

module.exports = {
  name: 'local',

  configure(env = process.env) {
    root = env.DOC_BUCKET_LOCAL_ROOT
      ? path.resolve(env.DOC_BUCKET_LOCAL_ROOT)
      : path.join(__dirname, '..', '..', 'uploads');
    try {
      fs.mkdirSync(root, { recursive: true });
      return { ready: true, info: { root } };
    } catch (err) {
      return { ready: false, error: `The bucket folder ${root} could not be created: ${err.message}`, info: { root } };
    }
  },

  /** The local provider is the one provider whose objects are real files the rest of the app can open. */
  root: () => root,
  localPathFor: pathFor,

  async put(key, buffer, { contentType } = {}) {
    const filePath = pathFor(key);
    await ensureParent(filePath);
    await fsp.writeFile(filePath, buffer);
    return { key, size: buffer.length, contentType: contentType || null };
  },

  async putStream(key, readable, { contentType } = {}) {
    const filePath = pathFor(key);
    await ensureParent(filePath);
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(filePath);
      readable.on('error', reject);
      out.on('error', reject);
      out.on('finish', resolve);
      readable.pipe(out);
    });
    const stat = await fsp.stat(filePath);
    return { key, size: stat.size, contentType: contentType || null };
  },

  async get(key) {
    return fsp.readFile(pathFor(key));
  },

  getStream(key) {
    return fs.createReadStream(pathFor(key));
  },

  async stat(key) {
    try {
      const stat = await fsp.stat(pathFor(key));
      if (!stat.isFile()) return null;
      return { key, size: stat.size, contentType: null, modified: stat.mtime };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  },

  async remove(key) {
    try {
      await fsp.unlink(pathFor(key));
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  },

  async list(prefix = '', { limit = 1000 } = {}) {
    const start = prefix ? pathFor(prefix) : root;
    const found = [];
    const walk = async (dir) => {
      if (found.length >= limit) return;
      let entries;
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return;
        throw err;
      }
      for (const entry of entries) {
        if (found.length >= limit) return;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile()) {
          const stat = await fsp.stat(full);
          found.push({
            key: path.relative(root, full).split(path.sep).join('/'),
            size: stat.size,
            modified: stat.mtime
          });
        }
      }
    };
    await walk(start);
    return found;
  },

  async copy(fromKey, toKey) {
    const target = pathFor(toKey);
    await ensureParent(target);
    await fsp.copyFile(pathFor(fromKey), target);
    return { key: toKey };
  },

  /** Served by express.static at /uploads, so the address is the key itself. */
  url(key) {
    return `/uploads/${key}`;
  }
};
