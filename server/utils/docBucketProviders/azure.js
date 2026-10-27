/**
 * Doc bucket provider: Azure Blob Storage.
 *
 * Needs one package that BexSign does not install by default:
 *   npm install @azure/storage-blob --prefix server
 */

let Azure = null;
let container = null;
let settings = {};

const load = () => {
  if (Azure) return;
  try {
    Azure = require('@azure/storage-blob');
  } catch (err) {
    throw new Error('The Azure doc bucket needs the Azure SDK. Run: npm install @azure/storage-blob --prefix server');
  }
};

const isMissing = (err) => err?.statusCode === 404 || err?.details?.errorCode === 'BlobNotFound';

const streamToBuffer = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

module.exports = {
  name: 'azure',

  configure(env = process.env) {
    settings = {
      containerName: env.DOC_BUCKET_NAME || '',
      connectionString: env.AZURE_STORAGE_CONNECTION_STRING || env.DOC_BUCKET_SECRET_KEY || '',
      accountName: env.DOC_BUCKET_ACCESS_KEY || '',
      publicBaseUrl: (env.DOC_BUCKET_PUBLIC_URL || '').replace(/\/+$/, ''),
      signedUrlSeconds: Number(env.DOC_BUCKET_SIGNED_URL_SECONDS || 900)
    };
    if (!settings.containerName) {
      return { ready: false, error: 'DOC_BUCKET_NAME is empty: set the container name in server/.env.' };
    }
    if (!settings.connectionString) {
      return { ready: false, error: 'AZURE_STORAGE_CONNECTION_STRING is empty: paste the storage account connection string into server/.env.' };
    }
    try {
      load();
    } catch (err) {
      return { ready: false, error: err.message };
    }
    const service = Azure.BlobServiceClient.fromConnectionString(settings.connectionString);
    container = service.getContainerClient(settings.containerName);
    return { ready: true, info: { container: settings.containerName, account: service.accountName || settings.accountName || null } };
  },

  async put(key, buffer, { contentType } = {}) {
    const blob = container.getBlockBlobClient(key);
    await blob.uploadData(buffer, contentType ? { blobHTTPHeaders: { blobContentType: contentType } } : undefined);
    return { key, size: buffer.length, contentType: contentType || null };
  },

  async putStream(key, readable, { contentType } = {}) {
    const blob = container.getBlockBlobClient(key);
    await blob.uploadStream(readable, undefined, undefined, contentType ? { blobHTTPHeaders: { blobContentType: contentType } } : undefined);
    const props = await blob.getProperties();
    return { key, size: Number(props.contentLength || 0), contentType: contentType || null };
  },

  async get(key) {
    const out = await container.getBlockBlobClient(key).download();
    return streamToBuffer(out.readableStreamBody);
  },

  async getStream(key) {
    const out = await container.getBlockBlobClient(key).download();
    return out.readableStreamBody;
  },

  async stat(key) {
    try {
      const props = await container.getBlockBlobClient(key).getProperties();
      return {
        key,
        size: Number(props.contentLength || 0),
        contentType: props.contentType || null,
        modified: props.lastModified || null
      };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  },

  async remove(key) {
    const out = await container.getBlockBlobClient(key).deleteIfExists();
    return Boolean(out.succeeded);
  },

  async list(prefix = '', { limit = 1000 } = {}) {
    const items = [];
    for await (const blob of container.listBlobsFlat({ prefix: prefix || undefined })) {
      items.push({
        key: blob.name,
        size: Number(blob.properties?.contentLength || 0),
        modified: blob.properties?.lastModified || null
      });
      if (items.length >= limit) break;
    }
    return items;
  },

  async copy(fromKey, toKey) {
    const source = container.getBlockBlobClient(fromKey);
    const target = container.getBlockBlobClient(toKey);
    const poller = await target.beginCopyFromURL(source.url);
    await poller.pollUntilDone();
    return { key: toKey };
  },

  async url(key) {
    if (settings.publicBaseUrl) return `${settings.publicBaseUrl}/${key}`;
    try {
      return await container.getBlockBlobClient(key).generateSasUrl({
        permissions: Azure.BlobSASPermissions.parse('r'),
        expiresOn: new Date(Date.now() + settings.signedUrlSeconds * 1000)
      });
    } catch (err) {
      return null; // A connection string without an account key cannot sign URLs
    }
  }
};
