const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission, normalizeRole } = require('../utils/permissions');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const { NOTIFICATION_CATEGORIES, getPreferences, notify, logActivity } = require('../utils/platformEvents');

router.use(async (req, res, next) => {
  try {
    await ensurePlatformSchema();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'The notification tables could not be prepared.' });
  }
});
router.use(authenticateUser);

const toItem = (row) => ({
  id: row.id,
  title: row.title,
  message: row.message || '',
  category: row.category || 'system',
  severity: row.severity || row.type || 'info',
  link: row.link || null,
  entityType: row.entity_type || null,
  entityId: row.entity_id || null,
  actorName: row.actor_name || null,
  isRead: Boolean(row.is_read),
  readAt: row.read_at || null,
  emailSent: Boolean(row.email_sent),
  createdAt: row.created_at
});

async function unreadCount(userId) {
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return n;
}

// @route GET /api/notifications?filter=all|unread&category=&search=&page=&pageSize=
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize, 10) || 20));
  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (req.query.filter === 'unread') where.push('is_read = 0');
  if (req.query.category && NOTIFICATION_CATEGORIES[req.query.category]) {
    where.push('category = ?');
    params.push(req.query.category);
  }
  if (req.query.search) {
    where.push('(title LIKE ? OR message LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }
  try {
    const clause = where.join(' AND ');
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM notifications WHERE ${clause}`, params);
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const [byCategory] = await db.query(
      'SELECT category, COUNT(*) AS total, SUM(is_read = 0) AS unread FROM notifications WHERE user_id = ? GROUP BY category',
      [req.user.id]
    );
    res.json({
      success: true,
      items: rows.map(toItem),
      total,
      page,
      pageSize,
      unread: await unreadCount(req.user.id),
      categories: Object.entries(NOTIFICATION_CATEGORIES).map(([id, meta]) => {
        const c = byCategory.find((b) => b.category === id);
        return { id, label: meta.label, total: c ? Number(c.total) : 0, unread: c ? Number(c.unread) : 0 };
      })
    });
  } catch (err) {
    console.error('List notifications error:', err);
    res.status(500).json({ success: false, error: 'Notifications could not be loaded.' });
  }
});

// @route GET /api/notifications/summary — unread count and the latest items for the header bell
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 8', [req.user.id]);
    res.json({ success: true, unread: await unreadCount(req.user.id), latest: rows.map(toItem) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Notifications could not be loaded.' });
  }
});

// @route PATCH /api/notifications/:id/read { read: true|false }
router.patch('/:id/read', async (req, res) => {
  const read = req.body.read !== false;
  try {
    const [result] = await db.query(
      'UPDATE notifications SET is_read = ?, read_at = ? WHERE id = ? AND user_id = ?',
      [read ? 1 : 0, read ? new Date() : null, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Notification not found.' });
    res.json({ success: true, unread: await unreadCount(req.user.id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The notification could not be updated.' });
  }
});

// @route POST /api/notifications/read-all { category? }
router.post('/read-all', async (req, res) => {
  try {
    const params = [new Date(), req.user.id];
    let sql = 'UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0';
    if (req.body.category && NOTIFICATION_CATEGORIES[req.body.category]) {
      sql += ' AND category = ?';
      params.push(req.body.category);
    }
    const [result] = await db.query(sql, params);
    res.json({ success: true, updated: result.affectedRows, unread: await unreadCount(req.user.id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Notifications could not be updated.' });
  }
});

// @route POST /api/notifications/clear-read — deletes read notifications
router.post('/clear-read', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM notifications WHERE user_id = ? AND is_read = 1', [req.user.id]);
    res.json({ success: true, deleted: result.affectedRows, message: `${result.affectedRows} read notification${result.affectedRows === 1 ? '' : 's'} cleared.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Notifications could not be cleared.' });
  }
});

// @route GET /api/notifications/preferences
router.get('/preferences', async (req, res) => {
  try {
    const prefs = await getPreferences(req.user.id);
    res.json({
      success: true,
      ...prefs,
      catalog: Object.entries(NOTIFICATION_CATEGORIES).map(([id, meta]) => ({ id, ...meta }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Preferences could not be loaded.' });
  }
});

// @route PUT /api/notifications/preferences { categories: { id: { inApp, email } }, mutedUntil }
router.put('/preferences', async (req, res) => {
  try {
    const current = await getPreferences(req.user.id);
    const categories = { ...current.categories };
    Object.entries(req.body.categories || {}).forEach(([id, value]) => {
      if (!NOTIFICATION_CATEGORIES[id] || !value || typeof value !== 'object') return;
      categories[id] = { inApp: value.inApp !== false, email: Boolean(value.email) };
    });
    // Security alerts always stay visible in the app
    categories.security.inApp = true;
    let mutedUntil = current.mutedUntil;
    if ('mutedUntil' in req.body) {
      mutedUntil = req.body.mutedUntil ? new Date(req.body.mutedUntil) : null;
      if (mutedUntil && Number.isNaN(mutedUntil.getTime())) return res.status(400).json({ success: false, error: 'The pause date is not valid.' });
    }
    const [rows] = await db.query('SELECT id FROM notification_preferences WHERE user_id = ? ORDER BY id ASC LIMIT 1', [req.user.id]);
    if (rows.length) {
      await db.query('UPDATE notification_preferences SET preferences = ?, muted_until = ? WHERE id = ?', [JSON.stringify(categories), mutedUntil, rows[0].id]);
    } else {
      await db.query('INSERT INTO notification_preferences (user_id, preferences, muted_until) VALUES (?, ?, ?)', [req.user.id, JSON.stringify(categories), mutedUntil]);
    }
    await logActivity({ req, category: 'settings', action: 'Updated notification preferences' });
    res.json({ success: true, message: 'Notification preferences saved.', ...(await getPreferences(req.user.id)) });
  } catch (err) {
    console.error('Save preferences error:', err);
    res.status(500).json({ success: false, error: 'Preferences could not be saved.' });
  }
});

// @route POST /api/notifications/broadcast { title, message, link, severity, roles[] } — announcement to users
router.post('/broadcast', requirePermission('notifications.broadcast'), async (req, res) => {
  const title = String(req.body.title || '').trim();
  const message = String(req.body.message || '').trim();
  if (title.length < 3) return res.status(400).json({ success: false, error: 'Enter a title of at least 3 characters.' });
  const severity = ['info', 'success', 'warning', 'error'].includes(req.body.severity) ? req.body.severity : 'info';
  const link = req.body.link && String(req.body.link).startsWith('/') ? String(req.body.link).slice(0, 255) : null;
  try {
    const roles = (Array.isArray(req.body.roles) ? req.body.roles : []).map(normalizeRole);
    const [users] = await db.query(
      `SELECT u.id, LOWER(COALESCE(u.role, 'team_member')) AS role FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE COALESCE(p.status, 'active') = 'active'`
    );
    const target = users.filter((u) => roles.length === 0 || roles.includes(u.role)).map((u) => u.id);
    const sender = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    const created = await notify({ userIds: target, category: 'system', severity, title, message, link, actorName: sender });
    await logActivity({ req, category: 'system', action: `Sent announcement "${title}" to ${created.length} user${created.length === 1 ? '' : 's'}` });
    res.json({ success: true, message: `Announcement sent to ${created.length} user${created.length === 1 ? '' : 's'}.`, recipients: created.length });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ success: false, error: 'The announcement could not be sent.' });
  }
});

// @route POST /api/notifications/test — sends a sample notification to yourself
router.post('/test', async (req, res) => {
  const created = await notify({
    userIds: [req.user.id],
    category: 'system',
    severity: 'success',
    title: 'Notifications are working',
    message: 'This is a test notification. You will see alerts about documents, signing, users and security here.',
    link: '/notifications'
  });
  res.json({ success: true, created: created.length, message: created.length ? 'Test notification sent.' : 'In-app notifications are turned off for Announcements in your preferences.' });
});

// @route DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Notification not found.' });
    res.json({ success: true, unread: await unreadCount(req.user.id) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The notification could not be deleted.' });
  }
});

module.exports = router;
