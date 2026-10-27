/**
 * Doc bucket provider: Google Cloud Storage.
 *
 * Needs one package that BexSign does not install by default:
 *   npm install @google-cloud/storage --prefix server
 */

let GCS = null;
let bucket = null;
let settings = {};

const load = () => {
  if (GCS) return;
  try {
    GCS = require('@google-cloud/storage');
  } catch (err) {
    throw new Error('The Google Cloud Storage doc bucket needs its SDK. Run: npm install @google-cloud/storage --prefix server');
  }
};

const isMissing = (err) => err?.code === 404;

module.exports = {
  name: 'gcs',

  configure(env = process.env) {
    settings = {
      bucketName: env.DOC_BUCKET_NAME || '',
      projectId: env.GOOGLE_CLOUD_PROJECT || '',
      keyFile: env.GOOGLE_APPLICATION_CREDENTIALS || '',
      publicBaseUrl: (env.DOC_BUCKET_PUBLIC_URL || '').replace(/\/+$/, ''),
      signedUrlSeconds: Number(env.DOC_BUCKET_SIGNED_URL_SECONDS || 900)
    };
    if (!settings.bucketName) {
      return { ready: false, error: 'DOC_BUCKET_NAME is empty: set the bucket name in server/.env.' };
    }
    try {
      load();
    } catch (err) {
      return { ready: false, error: err.message };
    }
    // No key file = the machine's own service account is used (Cloud Run, GCE, gcloud login)
    const storage = new GCS.Storage({
      ...(settings.projectId ? { projectId: settings.projectId } : {}),
      ...(settings.keyFile ? { keyFilename: settings.keyFile } : {})
    });
    bucket = storage.bucket(settings.bucketName);
    return { ready: true, info: { bucket: settings.bucketName, project: settings.projectId || 'default' } };
  },

  async put(key, buffer, { contentType } = {}) {
    await bucket.file(key).save(buffer, {
      resumable: false,
      ...(contentType ? { contentType } : {})
    });
    return { key, size: buffer.length, contentType: contentType || null };
  },

  async putStream(key, readable, { contentType } = {}) {
    await new Promise((resolve, reject) => {
      const out = bucket.file(key).createWriteStream({
        resumable: false,
        ...(contentType ? { contentType } : {})
      });
      readable.on('error', reject);
      out.on('error', reject);
      out.on('finish', resolve);
      readable.pipe(out);
    });
    const stat = await this.stat(key);
    return { key, size: stat?.size || 0, contentType: contentType || null };
  },

  async get(key) {
    const [buffer] = await bucket.file(key).download();
    return buffer;
  },

  async getStream(key) {
    return bucket.file(key).createReadStream();
  },

  async stat(key) {
    try {
      const [meta] = await bucket.file(key).getMetadata();
      return {
        key,
        size: Number(meta.size || 0),
        contentType: meta.contentType || null,
        modified: meta.updated ? new Date(meta.updated) : null
      };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  },

  async remove(key) {
    try {
      await bucket.file(key).delete();
      return true;
    } catch (err) {
      if (isMissing(err)) return false;
      throw err;
    }
  },

  async list(prefix = '', { limit = 1000 } = {}) {
    const [files] = await bucket.getFiles({ prefix: prefix || undefined, maxResults: limit });
    return files.map((file) => ({
      key: file.name,
      size: Number(file.metadata?.size || 0),
      modified: file.metadata?.updated ? new Date(file.metadata.updated) : null
    }));
  },

  async copy(fromKey, toKey) {
    await bucket.file(fromKey).copy(bucket.file(toKey));
    return { key: toKey };
  },

  async url(key, { expiresIn } = {}) {
    if (settings.publicBaseUrl) return `${settings.publicBaseUrl}/${key}`;
    try {
      const [url] = await bucket.file(key).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + (Number(expiresIn) || settings.signedUrlSeconds) * 1000
      });
      return url;
    } catch (err) {
      return null;
    }
  }
};
