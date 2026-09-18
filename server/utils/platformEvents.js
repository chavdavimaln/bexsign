/**
 * Platform events: in-app notifications (header bell and Notifications page), the account/system activity log and
 * the failed access log. Every helper swallows its own errors so a logging problem never breaks the action that
 * triggered it.
 */
const db = require('../db');
const { getRequestIp } = require('./requestHelpers');

// Notification categories and their defaults (in-app on, email off unless the user turns it on)
const NOTIFICATION_CATEGORIES = {
  document: { label: 'Documents', description: 'Requests you send: viewed, signed, completed, declined, recalled, expired' },
  signing: { label: 'Signing requests', description: 'Documents waiting for your signature and reminders' },
  email: { label: 'Email delivery', description: 'Emails that could not be delivered' },
  user: { label: 'Users & access', description: 'New users, role changes, password changes' },
  security: { label: 'Security alerts', description: 'Failed sign-in attempts and blocked access' },
  template: { label: 'Templates', description: 'Templates shared with you or changed' },
  report: { label: 'Reports', description: 'Scheduled reports sent or failed' },
  api: { label: 'Developer API', description: 'API keys and webhook failures' },
  system: { label: 'Announcements', description: 'Announcements from administrators' }
};

const DEFAULT_PREFERENCES = Object.fromEntries(
  Object.keys(NOTIFICATION_CATEGORIES).map((key) => [key, { inApp: true, email: ['security'].includes(key) }])
);

function parsePreferences(raw) {
  let saved = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch (e) {
    saved = {};
  }
  const merged = {};
  Object.keys(NOTIFICATION_CATEGORIES).forEach((key) => {
    merged[key] = { ...DEFAULT_PREFERENCES[key], ...(saved[key] || {}) };
  });
  return merged;
}

async function getPreferences(userId) {
  const [rows] = await db.query('SELECT * FROM notification_preferences WHERE user_id = ? ORDER BY id ASC LIMIT 1', [userId]);
  const row = rows[0];
  return {
    categories: parsePreferences(row?.preferences),
    emailDigest: row?.email_digest || 'off',
    mutedUntil: row?.muted_until || null
  };
}

/** User ids for a mix of ids, emails (registered users only) and a permission. */
async function resolveRecipients({ userIds = [], emails = [], permission = null, excludeUserId = null }) {
  const ids = new Set((userIds || []).map(Number).filter(Boolean));
  const cleanEmails = (emails || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean);
  if (cleanEmails.length) {
    const [rows] = await db.query('SELECT id FROM users WHERE LOWER(email) IN (?)', [cleanEmails]);
    rows.forEach((r) => ids.add(r.id));
  }
  if (permission) {
    const { usersWithPermission } = require('./permissions');
    (await usersWithPermission(permission)).forEach((id) => ids.add(id));
  }
  if (excludeUserId) ids.delete(Number(excludeUserId));
  return [...ids];
}

/**
 * Creates notifications. Recipients: userIds, emails of registered users, and/or every user holding `permission`.
 * { category, title, message, link, severity: info|success|warning|error, entityType, entityId, actorName, excludeUserId }
 */
async function notify(options) {
  try {
    const {
      category = 'system',
      title,
      message = '',
      link = null,
      severity = 'info',
      entityType = null,
      entityId = null,
      actorName = null
    } = options;
    if (!title) return [];
    const recipients = await resolveRecipients(options);
    const created = [];
    for (const userId of recipients) {
      const prefs = await getPreferences(userId);
      const channel = prefs.categories[category] || { inApp: true, email: false };
      const muted = prefs.mutedUntil && new Date(prefs.mutedUntil) > new Date();
      if (channel.inApp !== false) {
        const [result] = await db.query(
          `INSERT INTO notifications (user_id, title, message, type, category, severity, link, entity_type, entity_id, actor_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, String(title).slice(0, 255), message, severity, category, severity, link, entityType, entityId, actorName]
        );
        created.push(result.insertId);
        if (channel.email && !muted) {
          sendNotificationEmail(userId, { title, message, link, category, notificationId: result.insertId }).catch(() => {});
        }
      } else if (channel.email && !muted) {
        sendNotificationEmail(userId, { title, message, link, category }).catch(() => {});
      }
    }
    return created;
  } catch (err) {
    console.warn('[Notifications] could not create notification:', err.message);
    return [];
  }
}

async function sendNotificationEmail(userId, { title, message, link, category, notificationId = null }) {
  const [users] = await db.query('SELECT email, first_name FROM users WHERE id = ?', [userId]);
  if (!users[0]?.email) return;
  const { sendNotificationEmail: send } = require('./emailService');
  const { getClientBaseUrl } = require('./requestHelpers');
  const result = await send({
    to: users[0].email,
    name: users[0].first_name,
    title,
    message,
    categoryLabel: NOTIFICATION_CATEGORIES[category]?.label || 'Notification',
    link: link ? `${getClientBaseUrl()}${link.startsWith('/') ? link : `/${link}`}` : `${getClientBaseUrl()}/notifications`
  });
  if (result?.success && notificationId) {
    await db.query('UPDATE notifications SET email_sent = 1 WHERE id = ?', [notificationId]);
  }
}

/** Account and system activity (Activity History). */
async function logActivity({ req = null, userId = null, userEmail = null, category = 'system', action, entityType = null, entityId = null, details = null }) {
  if (!action) return;
  try {
    const actorId = userId ?? req?.user?.id ?? null;
    const actorEmail = userEmail ?? req?.user?.email ?? null;
    await db.query(
      `INSERT INTO activity_logs (user_id, user_email, category, action, entity_type, entity_id, details, ip_address, browser_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actorId,
        actorEmail,
        category,
        String(action).slice(0, 255),
        entityType,
        entityId,
        details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        getRequestIp(req),
        String(req?.headers?.['user-agent'] || '').slice(0, 255) || null
      ]
    );
  } catch (err) {
    console.warn('[Activity] could not log activity:', err.message);
  }
}

/**
 * Failed access (Failed Access log): wrong password, deactivated account, invalid signing link, API key rejected...
 * The account owner is told about failed sign-ins; administrators are alerted after repeated failures.
 */
async function logFailedAccess({ req = null, email = null, userId = null, source = 'login', reason, documentId = null }) {
  try {
    const ip = getRequestIp(req) || 'unknown';
    let ownerId = userId;
    if (!ownerId && email) {
      const [users] = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
      ownerId = users[0]?.id || null;
    }
    await db.query(
      `INSERT INTO failed_access_logs (ip_address, reason, email, user_id, source, user_agent, document_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ip, String(reason || 'Access denied').slice(0, 255), email, ownerId, source, String(req?.headers?.['user-agent'] || '').slice(0, 255) || null, documentId]
    );

    if (source === 'login' && ownerId) {
      await notify({
        userIds: [ownerId],
        category: 'security',
        severity: 'warning',
        title: 'Failed sign-in attempt on your account',
        message: `Someone tried to sign in to ${email || 'your account'} from IP ${ip}: ${reason}. If this wasn't you, change your password.`,
        link: '/settings/profile',
        entityType: 'user',
        entityId: ownerId
      });
    }
    // Several failures from one IP or for one account within 15 minutes: alert administrators once
    const [[recent]] = await db.query(
      `SELECT COUNT(*) AS n FROM failed_access_logs
       WHERE attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND (ip_address = ? OR (email IS NOT NULL AND email = ?))`,
      [ip, email]
    );
    if (recent.n === 3 || recent.n === 10) {
      await notify({
        permission: 'security.failed_access',
        category: 'security',
        severity: 'error',
        title: `${recent.n} failed access attempts in 15 minutes`,
        message: `Repeated failed ${source.replace(/_/g, ' ')} attempts${email ? ` for ${email}` : ''} from IP ${ip}. Last reason: ${reason}.`,
        link: '/settings/failed-access'
      });
    }
  } catch (err) {
    console.warn('[Failed access] could not log attempt:', err.message);
  }
}

module.exports = {
  NOTIFICATION_CATEGORIES,
  DEFAULT_PREFERENCES,
  parsePreferences,
  getPreferences,
  notify,
  logActivity,
  logFailedAccess
};
