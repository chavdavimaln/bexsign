/**
 * Doc bucket provider: S3 and every S3-compatible service.
 *
 * Covers AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2 and any other
 * service that speaks the S3 API - they differ only in DOC_BUCKET_ENDPOINT and the region.
 *
 * Needs two packages that BexSign does not install by default:
 *   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --prefix server
 *
 * Settings are read from DOC_BUCKET_* first and from the standard AWS_* names as a fallback, so
 * an AWS credentials block pasted straight into server/.env works as it is:
 *
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION / AWS_BUCKET
 */

let S3 = null;
let presigner = null;
let client = null;
let settings = {};

const load = () => {
  if (S3) return;
  try {
    S3 = require('@aws-sdk/client-s3');
  } catch (err) {
    throw new Error('The S3 doc bucket needs the AWS SDK. Run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --prefix server');
  }
  try {
    presigner = require('@aws-sdk/s3-request-presigner');
  } catch (err) {
    presigner = null; // Signed URLs are unavailable; everything else still works
  }
};

const streamToBuffer = async (body) => {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === 'function') return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const isMissing = (err) => err?.name === 'NoSuchKey' || err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404;

module.exports = {
  name: 's3',

  configure(env = process.env) {
    settings = {
      bucket: env.DOC_BUCKET_NAME || env.AWS_BUCKET || env.AWS_S3_BUCKET || '',
      region: env.DOC_BUCKET_REGION || env.AWS_DEFAULT_REGION || env.AWS_REGION || 'us-east-1',
      endpoint: env.DOC_BUCKET_ENDPOINT || '',
      accessKeyId: env.DOC_BUCKET_ACCESS_KEY || env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: env.DOC_BUCKET_SECRET_KEY || env.AWS_SECRET_ACCESS_KEY || '',
      // MinIO and most self-hosted services need path-style addressing
      forcePathStyle: String(env.DOC_BUCKET_FORCE_PATH_STYLE || '').toLowerCase() === 'true',
      publicBaseUrl: (env.DOC_BUCKET_PUBLIC_URL || '').replace(/\/+$/, ''),
      signedUrlSeconds: Number(env.DOC_BUCKET_SIGNED_URL_SECONDS || 900)
    };
    if (!settings.bucket) {
      return { ready: false, error: 'No bucket name: set DOC_BUCKET_NAME (or AWS_BUCKET) in server/.env.' };
    }
    try {
      load();
    } catch (err) {
      return { ready: false, error: err.message };
    }
    client = new S3.S3Client({
      region: settings.region,
      ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
      ...(settings.forcePathStyle ? { forcePathStyle: true } : {}),
      // No keys in .env = fall back to the machine's own credentials (IAM role, ~/.aws, env)
      ...(settings.accessKeyId && settings.secretAccessKey
        ? { credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey } }
        : {})
    });
    return {
      ready: true,
      info: {
        bucket: settings.bucket,
        region: settings.region,
        endpoint: settings.endpoint || 'aws',
        signedUrls: Boolean(presigner)
      }
    };
  },

  async put(key, buffer, { contentType } = {}) {
    await client.send(new S3.PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
      Body: buffer,
      ...(contentType ? { ContentType: contentType } : {})
    }));
    return { key, size: buffer.length, contentType: contentType || null };
  },

  async putStream(key, readable, { contentType, size } = {}) {
    // S3 cannot stream a body of unknown length, so buffer it first (documents are capped at 25 MB)
    const chunks = [];
    for await (const chunk of readable) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const buffer = Buffer.concat(chunks);
    return this.put(key, buffer, { contentType, size: size || buffer.length });
  },

  async get(key) {
    const out = await client.send(new S3.GetObjectCommand({ Bucket: settings.bucket, Key: key }));
    return streamToBuffer(out.Body);
  },

  async getStream(key) {
    const out = await client.send(new S3.GetObjectCommand({ Bucket: settings.bucket, Key: key }));
    return out.Body;
  },

  async stat(key) {
    try {
      const out = await client.send(new S3.HeadObjectCommand({ Bucket: settings.bucket, Key: key }));
      return {
        key,
        size: Number(out.ContentLength || 0),
        contentType: out.ContentType || null,
        modified: out.LastModified || null
      };
    } catch (err) {
      if (isMissing(err)) return null;
      throw err;
    }
  },

  async remove(key) {
    try {
      await client.send(new S3.DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
      return true;
    } catch (err) {
      if (isMissing(err)) return false;
      throw err;
    }
  },

  async list(prefix = '', { limit = 1000 } = {}) {
    const items = [];
    let token;
    do {
      const out = await client.send(new S3.ListObjectsV2Command({
        Bucket: settings.bucket,
        Prefix: prefix || undefined,
        ContinuationToken: token,
        MaxKeys: Math.min(1000, limit - items.length)
      }));
      for (const obj of out.Contents || []) {
        items.push({ key: obj.Key, size: Number(obj.Size || 0), modified: obj.LastModified || null });
      }
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token && items.length < limit);
    return items;
  },

  async copy(fromKey, toKey) {
    await client.send(new S3.CopyObjectCommand({
      Bucket: settings.bucket,
      CopySource: `${settings.bucket}/${fromKey}`,
      Key: toKey
    }));
    return { key: toKey };
  },

  async url(key, { expiresIn } = {}) {
    if (settings.publicBaseUrl) return `${settings.publicBaseUrl}/${key}`;
    if (!presigner) return null;
    return presigner.getSignedUrl(
      client,
      new S3.GetObjectCommand({ Bucket: settings.bucket, Key: key }),
      { expiresIn: Number(expiresIn) || settings.signedUrlSeconds }
    );
  }
};
