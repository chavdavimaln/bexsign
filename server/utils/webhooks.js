/**
 * Webhook delivery. dispatchWebhookEvent(event, data) returns at once and delivers in the background to every
 * active webhook subscribed to the event (or to "*") that may see it: webhooks of the document/template owner and
 * webhooks of users holding "settings.developer" (organization-wide integrations).
 * Each POST carries { id, event, created_at, data } with X-BexSign-Event / -Delivery / -Signature headers
 * (sha256 HMAC of the raw body). Failures are retried with backoff; after 10 failed deliveries in a row the webhook
 * is disabled and its owner is notified. Nothing here ever throws to the caller.
 */
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const db = require('../db');
const { notify, logActivity } = require('./platformEvents');
const { getDeveloperSettings, ensureDeliverySchema, parseJsonArray, userName } = require('./developerApi');

const MAX_CONSECUTIVE_FAILURES = 10;
const MAX_RESPONSE_BYTES = 64 * 1024;
const STORED_RESPONSE_CHARS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = (prefix) => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

function signPayload(body, secret) {
  return `sha256=${crypto.createHmac('sha256', String(secret || '')).update(body).digest('hex')}`;
}

/** One HTTP POST. Resolves { statusCode, body, durationMs, error } (never rejects). */
function postJson(url, body, headers, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    let target;
    try {
      target = new URL(url);
      if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Only http and https URLs are supported');
    } catch (err) {
      resolve({ statusCode: null, body: '', durationMs: 0, error: `Invalid URL: ${err.message}` });
      return;
    }
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, durationMs: Date.now() - started });
    };
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request(target, {
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      timeout: timeoutMs
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        if (size < MAX_RESPONSE_BYTES) chunks.push(chunk);
        size += chunk.length;
      });
      res.on('end', () => done({ statusCode: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', (err) => done({ statusCode: res.statusCode, body: '', error: err.message }));
    });
    req.on('timeout', () => {
      req.destroy(new Error(`Timed out after ${Math.round(timeoutMs / 1000)} s`));
    });
    req.on('error', (err) => done({ statusCode: null, body: '', error: err.code ? `${err.message} (${err.code})` : err.message }));
    req.end(body);
  });
}

// Worth retrying: network errors, timeouts, 5xx, 408 and 429 (other 4xx answers will not change)
const isRetryable = (result) => !result.statusCode || result.statusCode >= 500 || [408, 429].includes(result.statusCode);

/**
 * Delivers one event to one webhook (with retries unless options.retries = 0), records every attempt in
 * webhook_deliveries and updates the webhook's status. Returns
 * { success, deliveryId, statusCode, durationMs, attempts, responseBody, error }.
 * options: { retries (default: developer settings), trackFailures (default true; false for test pings) }
 */
async function deliverWebhook(webhook, event, data = {}, options = {}) {
  try {
    await ensureDeliverySchema();
    const settings = await getDeveloperSettings();
    const retries = Math.max(0, Math.min(10, options.retries ?? (parseInt(settings.webhook_retry_count, 10) || 0)));
    const timeoutMs = Math.max(1, Math.min(60, parseInt(settings.webhook_timeout_seconds, 10) || 10)) * 1000;
    const deliveryId = newId('dlv');
    const body = JSON.stringify({ id: newId('evt'), event, created_at: new Date().toISOString(), data });
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'BexSign-Webhooks/1.0',
      'X-BexSign-Event': event,
      'X-BexSign-Delivery': deliveryId,
      'X-BexSign-Signature': signPayload(body, webhook.secret_token || settings.webhook_signing_secret)
    };

    let result = null;
    let attempt = 0;
    while (attempt <= retries) {
      attempt += 1;
      if (attempt > 1) await sleep(Math.min(30000, 1000 * 2 ** (attempt - 2))); // 1 s, 2 s, 4 s ...
      result = await postJson(webhook.url, body, headers, timeoutMs);
      result.success = Boolean(result.statusCode && result.statusCode >= 200 && result.statusCode < 300);
      await db.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body, success, duration_ms, delivery_id, attempt, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          webhook.id, event, body, result.statusCode, String(result.body || '').slice(0, STORED_RESPONSE_CHARS),
          result.success ? 1 : 0, result.durationMs, deliveryId, attempt, result.error ? String(result.error).slice(0, 255) : null
        ]
      );
      if (result.success || !isRetryable(result)) break;
    }

    if (result.success) {
      await db.query('UPDATE webhooks SET last_status = ?, last_delivery_at = NOW(), failure_count = 0 WHERE id = ?', [result.statusCode, webhook.id]);
    } else if (options.trackFailures === false) {
      await db.query('UPDATE webhooks SET last_status = ?, last_delivery_at = NOW() WHERE id = ?', [result.statusCode || 0, webhook.id]);
    } else {
      await db.query(
        'UPDATE webhooks SET last_status = ?, last_delivery_at = NOW(), failure_count = failure_count + 1 WHERE id = ?',
        [result.statusCode || 0, webhook.id]
      );
      await disableIfFailing(webhook.id);
    }

    return {
      success: result.success,
      deliveryId,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      attempts: attempt,
      responseBody: String(result.body || '').slice(0, STORED_RESPONSE_CHARS),
      error: result.success ? null : (result.error || `The endpoint answered HTTP ${result.statusCode}.`)
    };
  } catch (err) {
    console.warn(`[Webhooks] delivery to webhook ${webhook?.id} failed:`, err.message);
    return { success: false, deliveryId: null, statusCode: null, durationMs: 0, attempts: 0, responseBody: '', error: err.message };
  }
}

async function disableIfFailing(webhookId) {
  const [rows] = await db.query('SELECT id, user_id, name, url, failure_count, is_active FROM webhooks WHERE id = ?', [webhookId]);
  const hook = rows[0];
  if (!hook || !hook.is_active || hook.failure_count < MAX_CONSECUTIVE_FAILURES) return;
  const [result] = await db.query('UPDATE webhooks SET is_active = 0 WHERE id = ? AND is_active = 1', [webhookId]);
  if (!result.affectedRows) return;
  const label = hook.name || hook.url;
  await notify({
    userIds: [hook.user_id],
    category: 'api',
    severity: 'error',
    title: 'Webhook disabled after repeated failures',
    message: `"${label}" failed ${hook.failure_count} deliveries in a row and was turned off. Fix the endpoint, then turn the webhook on again.`,
    link: '/settings/developer-api?tab=webhooks',
    entityType: 'webhook',
    entityId: hook.id
  });
  await logActivity({
    userId: hook.user_id,
    category: 'api',
    action: `Webhook "${label}" disabled after ${hook.failure_count} failed deliveries`,
    entityType: 'webhook',
    entityId: hook.id
  });
}

/** Adds document / template details to the caller's data. Returns { data, ownerId }. */
async function buildEventData(event, input) {
  const data = { ...(input || {}) };
  let ownerId = data.userId ?? data.user_id ?? null;
  delete data.userId;
  delete data.user_id;
  const documentId = data.documentId ?? data.document_id ?? null;
  if (documentId) {
    delete data.documentId;
    delete data.document_id;
    const [docs] = await db.query(
      `SELECT d.id, d.document_name, d.status, d.signing_order, d.created_at, d.sent_at, d.completed_at, d.user_id,
              u.first_name, u.last_name, u.email
       FROM documents d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?`,
      [documentId]
    );
    const doc = docs[0];
    if (doc) {
      ownerId = ownerId || doc.user_id;
      const [recipients] = await db.query(
        `SELECT id, name, email, role, status, signing_order_index, sent_at, viewed_at, signed_at, declined_at
         FROM document_recipients WHERE document_id = ? ORDER BY signing_order_index ASC, id ASC`,
        [doc.id]
      );
      data.document = {
        id: doc.id,
        name: doc.document_name,
        status: doc.status,
        signing_order: doc.signing_order,
        created_at: doc.created_at,
        sent_at: doc.sent_at,
        completed_at: doc.completed_at,
        owner: { id: doc.user_id, name: userName(doc), email: doc.email || null },
        recipients: recipients.map((r) => ({
          id: r.id, name: r.name, email: r.email, role: r.role, status: r.status, signing_order: r.signing_order_index,
          sent_at: r.sent_at, viewed_at: r.viewed_at, signed_at: r.signed_at, declined_at: r.declined_at
        }))
      };
      const recipientKey = data.recipientId ?? data.recipient_id ?? data.recipientEmail ?? data.recipient_email ?? null;
      if (recipientKey !== null && data.recipient === undefined) {
        const match = data.document.recipients.find((r) => String(r.id) === String(recipientKey) || String(r.email).toLowerCase() === String(recipientKey).toLowerCase());
        if (match) data.recipient = match;
      }
      ['recipientId', 'recipient_id', 'recipientEmail', 'recipient_email'].forEach((k) => delete data[k]);
    } else {
      data.document = { id: documentId };
    }
  }
  const templateId = data.templateId ?? data.template_id ?? null;
  if (templateId) {
    delete data.templateId;
    delete data.template_id;
    const [rows] = await db.query(
      `SELECT t.id, t.title, t.category, t.is_shared, t.created_at, t.user_id, u.first_name, u.last_name, u.email
       FROM templates t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
      [templateId]
    );
    const t = rows[0];
    if (t) {
      ownerId = ownerId || t.user_id;
      data.template = {
        id: t.id, title: t.title, category: t.category, is_shared: Boolean(t.is_shared), created_at: t.created_at,
        owner: { id: t.user_id, name: userName(t), email: t.email || null }
      };
    } else {
      data.template = { id: templateId };
    }
  }
  return { data, ownerId };
}

async function runDispatch(event, input) {
  await ensureDeliverySchema();
  const settings = await getDeveloperSettings();
  if (!settings.api_enabled) return [];
  const [hooks] = await db.query('SELECT * FROM webhooks WHERE is_active = 1');
  const subscribed = hooks.filter((h) => {
    const events = parseJsonArray(h.events, []);
    return events.includes('*') || events.includes(event);
  });
  if (!subscribed.length) return [];

  // Owner's webhooks plus organization-wide ones; events without a known owner go to organization-wide webhooks only
  const { data, ownerId } = await buildEventData(event, input);
  const { userCan } = require('./permissions');
  const allowed = new Map();
  for (const hook of subscribed) {
    if (!allowed.has(hook.user_id)) {
      allowed.set(hook.user_id, (ownerId && Number(hook.user_id) === Number(ownerId)) || (await userCan({ id: hook.user_id }, 'settings.developer')));
    }
  }
  const targets = subscribed.filter((h) => allowed.get(h.user_id));
  return Promise.all(targets.map((hook) => deliverWebhook(hook, event, data)));
}

/**
 * Fire-and-forget: dispatchWebhookEvent('document.signed', { documentId: 12, recipientEmail: 'a@b.com' }).
 * Returns immediately; delivery happens in the background and errors are only logged.
 */
function dispatchWebhookEvent(event, data = {}) {
  if (!event) return;
  setImmediate(() => {
    runDispatch(event, data).catch((err) => console.warn(`[Webhooks] ${event} dispatch failed:`, err.message));
  });
}

/** Same as dispatchWebhookEvent but resolves with the delivery results (scripts and tests). */
async function dispatchWebhookEventNow(event, data = {}) {
  try {
    return await runDispatch(event, data);
  } catch (err) {
    console.warn(`[Webhooks] ${event} dispatch failed:`, err.message);
    return [];
  }
}

module.exports = { dispatchWebhookEvent, dispatchWebhookEventNow, deliverWebhook, signPayload, MAX_CONSECUTIVE_FAILURES };
