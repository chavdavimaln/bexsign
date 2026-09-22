/**
 * Document lifecycle events: the owner's notification, the webhook event and (optionally) registered recipients'
 * notifications. Nothing here throws or delays the request that triggered it.
 */
const db = require('../db');
const { notify } = require('./platformEvents');
const { dispatchWebhookEvent } = require('./webhooks');

/**
 * Webhook event (document.sent, document.viewed, document.signed, document.completed, document.declined,
 * document.recalled). The dispatcher loads the document, its owner and recipients by id and adds the recipient.
 */
function emitDocumentWebhook(event, doc, extra = {}) {
  if (!doc?.id) return;
  try {
    dispatchWebhookEvent(event, {
      documentId: doc.id,
      ...(extra.recipient?.email ? { recipientEmail: extra.recipient.email } : {}),
      ...(extra.reason ? { reason: extra.reason } : {})
    });
  } catch (err) {
    console.warn('[Webhooks] event not dispatched:', err.message);
  }
}

/** Notification to the person who sent the request, unless they are the one who acted. */
async function notifyDocumentOwner(doc, { title, message = '', severity = 'info', actorEmail = null, actorName = null }) {
  if (!doc?.user_id) return;
  try {
    if (actorEmail) {
      const [owners] = await db.query('SELECT email FROM users WHERE id = ?', [doc.user_id]);
      if (owners[0] && String(owners[0].email).toLowerCase() === String(actorEmail).toLowerCase()) return;
    }
    await notify({
      userIds: [doc.user_id],
      category: 'document',
      severity,
      title,
      message,
      link: `/documents/${doc.id}`,
      entityType: 'document',
      entityId: doc.id,
      actorName
    });
  } catch (err) {
    console.warn('[Notifications] document owner not notified:', err.message);
  }
}

/** Notification to recipients who have a BexSign account (e.g. a request was recalled or completed). */
async function notifyRecipientUsers(doc, recipients, { title, message = '', severity = 'info', category = 'document', link = null, exceptEmail = null }) {
  const emails = (recipients || [])
    .map((r) => r.email)
    .filter((email) => email && (!exceptEmail || email.toLowerCase() !== String(exceptEmail).toLowerCase()));
  if (!emails.length) return;
  await notify({
    emails,
    excludeUserId: doc.user_id || null,
    category,
    severity,
    title,
    message,
    link: link || `/documents/${doc.id}`,
    entityType: 'document',
    entityId: doc.id
  });
}

module.exports = { emitDocumentWebhook, notifyDocumentOwner, notifyRecipientUsers };
