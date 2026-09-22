/**
 * Security & compliance logs (Settings · Security), mounted at /api/security:
 *  - Failed access: sign-in failures, rejected signing links and API keys, blocked actions (failed_access_logs)
 *  - Document validity: verify a PDF against the fingerprints of issued PDFs, verification history, issued documents
 *  - Activity history: one feed of account/system activity (activity_logs), document events (activity_history)
 *    and sign-ins (user_login_logs)
 */
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { authenticateUser } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const { findFingerprint, ensureFingerprintTable } = require('../utils/pdfFingerprints');
const { KIND_LABELS, ensureValiditySchema, recordValidityCheck, verifyPdfBuffer, describeIssuedFile } = require('../utils/validityLog');

const router = express.Router();
router.use(authenticateUser);

const canFailed = requirePermission('security.failed_access');
const canValidity = requirePermission('security.document_validity');
const canActivity = requirePermission('security.activity_history');

// Indexes for the date-ordered feeds (created once, idempotent)
const INDEXES = [
  ['activity_history', 'idx_activity_history_time', '(created_at)'],
  ['user_login_logs', 'idx_user_login_logs_time', '(login_at)'],
  ['failed_access_logs', 'idx_failed_access_ip', '(ip_address)']
];
let indexPromise = null;
function ensureSecurityIndexes() {
  if (!indexPromise) {
    indexPromise = (async () => {
      for (const [table, index, columns] of INDEXES) {
        const [rows] = await db.query(
          'SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
          [table, index]
        );
        if (rows.length === 0) await db.query(`ALTER TABLE \`${table}\` ADD INDEX \`${index}\` ${columns}`);
      }
    })().catch((err) => {
      console.warn('[Security] index setup warning:', err.message);
    });
  }
  return indexPromise;
}
router.use((req, res, next) => {
  ensureSecurityIndexes().then(() => next(), () => next());
});

/* ------------------------------------------------------------------ helpers */

function paging(query, defaultSize = 25) {
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
const like = (value) => `%${String(value).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const num = (value) => Number(value) || 0;
const fullName = (first, last) => `${first || ''} ${last || ''}`.trim() || null;

function addDateRange(column, query, where, params) {
  if (isDate(query.from)) {
    where.push(`${column} >= ?`);
    params.push(`${query.from} 00:00:00`);
  }
  if (isDate(query.to)) {
    where.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`);
    params.push(query.to);
  }
}

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDateTime = (d) => `${localDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Consecutive days ending today (or `end`), filled with the counts found: [{ day, count }] */
function fillDays(rows, days = 14, end = new Date()) {
  const counts = new Map(rows.map((r) => [r.day, num(r.n)]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const day = localDay(d);
    out.push({ day, count: counts.get(day) || 0 });
  }
  return out;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? localDateTime(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no spreadsheet formulas
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function sendCsv(res, name, header, rows) {
  const body = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${localDay(new Date())}.csv"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(`﻿${body}\r\n`);
}

/** Browser, OS and device type from a user agent string. */
function parseUserAgent(ua) {
  const s = String(ua || '').trim();
  if (!s) return null;
  const version = (re) => {
    const m = re.exec(s);
    return m ? m[1] : '';
  };
  let browser = 'Unknown client';
  if (/curl\//i.test(s)) browser = 'curl';
  else if (/PostmanRuntime/i.test(s)) browser = 'Postman';
  else if (/Edg(e|A|iOS)?\//.test(s)) browser = `Edge ${version(/Edg(?:e|A|iOS)?\/(\d+)/)}`;
  else if (/OPR\/|Opera/.test(s)) browser = `Opera ${version(/OPR\/(\d+)/)}`;
  else if (/SamsungBrowser\//.test(s)) browser = `Samsung Internet ${version(/SamsungBrowser\/(\d+)/)}`;
  else if (/Firefox\/|FxiOS\//.test(s)) browser = `Firefox ${version(/(?:Firefox|FxiOS)\/(\d+)/)}`;
  else if (/CriOS\//.test(s)) browser = `Chrome ${version(/CriOS\/(\d+)/)}`;
  else if (/Chrome\//.test(s)) browser = `Chrome ${version(/Chrome\/(\d+)/)}`;
  else if (/Version\/[\d.]+.*Safari\//.test(s)) browser = `Safari ${version(/Version\/(\d+)/)}`;
  else if (/node|axios|undici|got\/|python|java\/|okhttp|Go-http/i.test(s)) browser = 'Script / API client';
  browser = browser.trim();

  let os = 'Unknown OS';
  if (/Windows NT 10/.test(s)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/.test(s)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/.test(s)) os = 'Windows 7';
  else if (/Windows/.test(s)) os = 'Windows';
  else if (/iPhone/.test(s)) os = `iOS ${version(/OS (\d+)_/)}`.trim();
  else if (/iPad/.test(s)) os = 'iPadOS';
  else if (/Android/.test(s)) os = `Android ${version(/Android (\d+)/)}`.trim();
  else if (/CrOS/.test(s)) os = 'ChromeOS';
  else if (/Mac OS X|Macintosh/.test(s)) os = 'macOS';
  else if (/Linux/.test(s)) os = 'Linux';

  let type = 'desktop';
  if (/bot|crawl|spider|curl|Postman|node|axios|python|okhttp|Go-http/i.test(s)) type = 'script';
  else if (/iPad|Tablet/i.test(s)) type = 'tablet';
  else if (/Mobi|iPhone|Android/i.test(s)) type = 'mobile';

  const label = os === 'Unknown OS' ? browser : `${browser} on ${os}`;
  return { browser, os, type, label };
}

/**
 * Documents the user may see (issued documents, verification history): every document with documents.view_all,
 * the department's documents with documents.view_team, otherwise their own and those they received.
 */
function documentScope(req, alias = 'd') {
  const permissions = req.permissions || [];
  if (permissions.includes('documents.view_all')) return { scope: 'all', sql: '1 = 1', params: [] };
  const received = `EXISTS (SELECT 1 FROM document_recipients sr WHERE sr.document_id = ${alias}.id AND LOWER(sr.email) = LOWER(?))`;
  if (permissions.includes('documents.view_team')) {
    return {
      scope: 'team',
      sql: `(${alias}.user_id = ? OR ${received} OR ${alias}.user_id IN (
        SELECT p2.user_id FROM user_profiles p1 JOIN user_profiles p2 ON p2.department = p1.department WHERE p1.user_id = ?))`,
      params: [req.user.id, req.user.email || '', req.user.id]
    };
  }
  return { scope: 'own', sql: `(${alias}.user_id = ? OR ${received})`, params: [req.user.id, req.user.email || ''] };
}

const serverError = (res, label, err, message) => {
  console.error(`[Security] ${label}:`, err);
  res.status(500).json({ success: false, error: message });
};

/* ------------------------------------------------------------ failed access */

const FAILED_SOURCES = ['login', 'signing_link', 'api', 'verify', 'password_reset', 'permission'];

function failedAccessFilters(query) {
  const where = [];
  const params = [];
  const search = String(query.search || '').trim();
  if (search) {
    where.push('(f.email LIKE ? OR f.ip_address LIKE ? OR f.reason LIKE ?)');
    params.push(like(search), like(search), like(search));
  }
  if (FAILED_SOURCES.includes(query.source)) {
    where.push('f.source = ?');
    params.push(query.source);
  }
  const status = String(query.resolved ?? query.status ?? '').toLowerCase();
  if (['open', 'unresolved', '0', 'false'].includes(status)) where.push('f.resolved = 0');
  if (['resolved', '1', 'true'].includes(status)) where.push('f.resolved = 1');
  if (query.ip) {
    where.push('f.ip_address = ?');
    params.push(String(query.ip).trim());
  }
  if (query.email) {
    where.push('LOWER(f.email) = LOWER(?)');
    params.push(String(query.email).trim());
  }
  addDateRange('f.attempt_time', query, where, params);
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const FAILED_SELECT = `
  SELECT f.id, f.ip_address, f.reason, f.attempt_time, f.email, f.user_id, f.source, f.user_agent, f.document_id,
         f.resolved, f.resolved_by, f.resolved_at,
         u.first_name, u.last_name, r.first_name AS resolver_first, r.last_name AS resolver_last, r.email AS resolver_email,
         d.document_name
  FROM failed_access_logs f
  LEFT JOIN users u ON u.id = f.user_id
  LEFT JOIN users r ON r.id = f.resolved_by
  LEFT JOIN documents d ON d.id = f.document_id`;

function mapFailed(row) {
  return {
    id: row.id,
    ip: row.ip_address,
    reason: row.reason,
    email: row.email,
    user: row.user_id ? { id: row.user_id, name: fullName(row.first_name, row.last_name) } : null,
    source: row.source,
    userAgent: row.user_agent,
    device: parseUserAgent(row.user_agent),
    document: row.document_id ? { id: row.document_id, name: row.document_name || 'Deleted document' } : null,
    attemptTime: row.attempt_time,
    resolved: Boolean(row.resolved),
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by ? { id: row.resolved_by, name: fullName(row.resolver_first, row.resolver_last), email: row.resolver_email } : null
  };
}

async function failedAccessSummary() {
  const [[totals]] = await db.query(`
    SELECT COUNT(*) AS total,
           SUM(attempt_time >= NOW() - INTERVAL 1 DAY) AS last24h,
           SUM(attempt_time >= NOW() - INTERVAL 2 DAY AND attempt_time < NOW() - INTERVAL 1 DAY) AS previous24h,
           SUM(attempt_time >= NOW() - INTERVAL 7 DAY) AS last7d,
           COUNT(DISTINCT CASE WHEN attempt_time >= NOW() - INTERVAL 30 DAY THEN ip_address END) AS uniqueIps,
           SUM(resolved = 0) AS unresolved,
           MAX(attempt_time) AS lastAttemptAt
    FROM failed_access_logs`);
  const [topIps] = await db.query(`
    SELECT ip_address AS ip, COUNT(*) AS n, SUM(resolved = 0) AS open, COUNT(DISTINCT email) AS accounts, MAX(attempt_time) AS lastAt
    FROM failed_access_logs WHERE attempt_time >= NOW() - INTERVAL 30 DAY
    GROUP BY ip_address ORDER BY n DESC, lastAt DESC LIMIT 5`);
  const [topAccounts] = await db.query(`
    SELECT LOWER(f.email) AS email, COUNT(*) AS n, SUM(f.resolved = 0) AS open, COUNT(DISTINCT f.ip_address) AS ips, MAX(f.attempt_time) AS lastAt,
           MAX(u.id) AS userId, MAX(u.first_name) AS first_name, MAX(u.last_name) AS last_name
    FROM failed_access_logs f LEFT JOIN users u ON u.id = f.user_id
    WHERE f.attempt_time >= NOW() - INTERVAL 30 DAY AND f.email IS NOT NULL AND f.email <> ''
    GROUP BY LOWER(f.email) ORDER BY n DESC, lastAt DESC LIMIT 5`);
  const [perDay] = await db.query(`
    SELECT DATE_FORMAT(attempt_time, '%Y-%m-%d') AS day, COUNT(*) AS n
    FROM failed_access_logs WHERE attempt_time >= CURDATE() - INTERVAL 13 DAY GROUP BY day`);
  const [bySource] = await db.query('SELECT source, COUNT(*) AS n, SUM(resolved = 0) AS open FROM failed_access_logs GROUP BY source');
  return {
    total: num(totals.total),
    last24h: num(totals.last24h),
    previous24h: num(totals.previous24h),
    last7d: num(totals.last7d),
    uniqueIps: num(totals.uniqueIps),
    unresolved: num(totals.unresolved),
    lastAttemptAt: totals.lastAttemptAt || null,
    topIps: topIps.map((r) => ({ ip: r.ip, count: num(r.n), open: num(r.open), accounts: num(r.accounts), lastAt: r.lastAt })),
    topAccounts: topAccounts.map((r) => ({
      email: r.email,
      name: fullName(r.first_name, r.last_name),
      userId: r.userId || null,
      count: num(r.n),
      open: num(r.open),
      ips: num(r.ips),
      lastAt: r.lastAt
    })),
    perDay: fillDays(perDay, 14),
    bySource: Object.fromEntries(bySource.map((r) => [r.source, { count: num(r.n), open: num(r.open) }]))
  };
}

// @route GET /api/security/failed-access
router.get('/failed-access', canFailed, async (req, res) => {
  try {
    const { page, pageSize, offset } = paging(req.query);
    const filters = failedAccessFilters(req.query);
    const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM failed_access_logs f ${filters.sql}`, filters.params);
    const [rows] = await db.query(
      `${FAILED_SELECT} ${filters.sql} ORDER BY f.attempt_time DESC, f.id DESC LIMIT ? OFFSET ?`,
      [...filters.params, pageSize, offset]
    );
    res.json({ success: true, items: rows.map(mapFailed), total: num(count.n), page, pageSize, summary: await failedAccessSummary() });
  } catch (err) {
    serverError(res, 'failed access list', err, 'The failed access log could not be loaded.');
  }
});

// @route GET /api/security/failed-access/export (CSV with the list filters)
router.get('/failed-access/export', canFailed, async (req, res) => {
  try {
    const filters = failedAccessFilters(req.query);
    const [rows] = await db.query(`${FAILED_SELECT} ${filters.sql} ORDER BY f.attempt_time DESC, f.id DESC LIMIT 10000`, filters.params);
    sendCsv(
      res,
      'failed-access',
      ['Time', 'Source', 'Reason', 'Email', 'User', 'IP address', 'Device', 'User agent', 'Document', 'Status', 'Resolved by', 'Resolved at'],
      rows.map(mapFailed).map((r) => [
        r.attemptTime, r.source, r.reason, r.email, r.user?.name, r.ip, r.device?.label, r.userAgent, r.document?.name,
        r.resolved ? 'Resolved' : 'Open', r.resolvedBy?.name || r.resolvedBy?.email, r.resolvedAt
      ])
    );
  } catch (err) {
    serverError(res, 'failed access export', err, 'The failed access log could not be exported.');
  }
});

// @route PATCH /api/security/failed-access/:id/resolve  { resolved: true | false }
router.patch('/failed-access/:id/resolve', canFailed, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: 'Invalid entry.' });
  const resolved = !(req.body?.resolved === false || req.body?.resolved === 'false' || req.body?.resolved === 0);
  try {
    const [found] = await db.query('SELECT id, ip_address, email, source FROM failed_access_logs WHERE id = ?', [id]);
    if (!found[0]) return res.status(404).json({ success: false, error: 'This failed access entry no longer exists.' });
    await db.query(
      'UPDATE failed_access_logs SET resolved = ?, resolved_by = ?, resolved_at = IF(?, NOW(), NULL) WHERE id = ?',
      [resolved ? 1 : 0, resolved ? req.user.id : null, resolved ? 1 : 0, id]
    );
    await logActivity({
      req,
      category: 'security',
      action: resolved ? 'Resolved a failed access attempt' : 'Reopened a failed access attempt',
      entityType: 'failed_access',
      entityId: id,
      details: { ip: found[0].ip_address, email: found[0].email, source: found[0].source }
    });
    const [rows] = await db.query(`${FAILED_SELECT} WHERE f.id = ?`, [id]);
    res.json({ success: true, item: mapFailed(rows[0]), message: resolved ? 'Marked as resolved.' : 'Marked as open again.' });
  } catch (err) {
    serverError(res, 'failed access resolve', err, 'The entry could not be updated.');
  }
});

// @route POST /api/security/failed-access/resolve-all  { ids?: [..], ip?: '1.2.3.4' } (no ids: every open entry)
router.post('/failed-access/resolve-all', canFailed, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((v) => parseInt(v, 10)).filter((v) => v > 0).slice(0, 1000) : null;
  const ip = req.body?.ip ? String(req.body.ip).trim().slice(0, 45) : null;
  if (Array.isArray(req.body?.ids) && ids.length === 0) {
    return res.status(400).json({ success: false, error: 'Select the entries to resolve.' });
  }
  try {
    const where = ['resolved = 0'];
    const params = [];
    if (ids) {
      where.push('id IN (?)');
      params.push(ids);
    }
    if (ip) {
      where.push('ip_address = ?');
      params.push(ip);
    }
    const [result] = await db.query(
      `UPDATE failed_access_logs SET resolved = 1, resolved_by = ?, resolved_at = NOW() WHERE ${where.join(' AND ')}`,
      [req.user.id, ...params]
    );
    if (result.affectedRows > 0) {
      await logActivity({
        req,
        category: 'security',
        action: `Resolved ${result.affectedRows} failed access attempt${result.affectedRows === 1 ? '' : 's'}`,
        entityType: 'failed_access',
        details: { count: result.affectedRows, ip, ids: ids ? ids.length : 'all open' }
      });
    }
    res.json({ success: true, resolved: result.affectedRows, message: result.affectedRows ? `${result.affectedRows} entr${result.affectedRows === 1 ? 'y' : 'ies'} resolved.` : 'Nothing left to resolve.' });
  } catch (err) {
    serverError(res, 'failed access resolve all', err, 'The entries could not be resolved.');
  }
});

// @route POST /api/security/failed-access/purge  { olderThanDays >= 1, onlyResolved?, dryRun? }
router.post('/failed-access/purge', canFailed, async (req, res) => {
  const days = Number(req.body?.olderThanDays);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    return res.status(400).json({ success: false, error: 'Choose how old entries must be: a whole number of days between 1 and 3650.' });
  }
  const onlyResolved = req.body?.onlyResolved === true || req.body?.onlyResolved === 'true';
  const where = `attempt_time < NOW() - INTERVAL ? DAY${onlyResolved ? ' AND resolved = 1' : ''}`;
  try {
    if (req.body?.dryRun) {
      const [[count]] = await db.query(`SELECT COUNT(*) AS n FROM failed_access_logs WHERE ${where}`, [days]);
      return res.json({ success: true, dryRun: true, count: num(count.n), olderThanDays: days, onlyResolved });
    }
    const [result] = await db.query(`DELETE FROM failed_access_logs WHERE ${where}`, [days]);
    await logActivity({
      req,
      category: 'security',
      action: `Purged ${result.affectedRows} failed access entr${result.affectedRows === 1 ? 'y' : 'ies'} older than ${days} days`,
      entityType: 'failed_access',
      details: { olderThanDays: days, onlyResolved, deleted: result.affectedRows }
    });
    res.json({ success: true, deleted: result.affectedRows, olderThanDays: days, onlyResolved, message: `${result.affectedRows} entr${result.affectedRows === 1 ? 'y' : 'ies'} deleted.` });
  } catch (err) {
    serverError(res, 'failed access purge', err, 'Old entries could not be deleted.');
  }
});

/* -------------------------------------------------------- document validity */

const RESULT_FILTERS = ['valid', 'modified', 'unknown', 'invalid'];
const VALIDITY_SOURCES = ['upload', 'link', 'auto'];

function validityFilters(req, q = req.query) {
  const scope = documentScope(req, 'd');
  const where = [];
  const params = [];
  if (scope.scope !== 'all') {
    where.push(`(v.checked_by = ? OR (d.id IS NOT NULL AND ${scope.sql}))`);
    params.push(req.user.id, ...scope.params);
  }
  if (RESULT_FILTERS.includes(q.result)) {
    where.push('v.result = ?');
    params.push(q.result);
  } else if (q.result === 'failed') {
    where.push("v.result <> 'valid'");
  }
  if (VALIDITY_SOURCES.includes(q.source)) {
    where.push('v.source = ?');
    params.push(q.source);
  }
  const search = String(q.search || '').trim();
  if (search) {
    where.push(`(v.file_name LIKE ? OR v.sha256 LIKE ? OR v.certificate_id LIKE ? OR d.document_name LIKE ? OR u.email LIKE ?
      OR EXISTS (SELECT 1 FROM document_identifiers sdi WHERE sdi.document_id = v.document_id AND sdi.bexsign_doc_id LIKE ?))`);
    params.push(...Array(6).fill(like(search)));
  }
  addDateRange('v.checked_at', q, where, params);
  return { scope: scope.scope, sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const VALIDITY_FROM = `
  FROM document_validity v
  LEFT JOIN users u ON u.id = v.checked_by
  LEFT JOIN documents d ON d.id = v.document_id`;

// @route GET /api/security/document-validity (verification history)
router.get('/document-validity', canValidity, async (req, res) => {
  try {
    await ensureValiditySchema();
    const { page, pageSize, offset } = paging(req.query);
    const filters = validityFilters(req);
    const [[count]] = await db.query(`SELECT COUNT(*) AS n ${VALIDITY_FROM} ${filters.sql}`, filters.params);
    const [rows] = await db.query(
      `SELECT v.id, v.document_id, v.certificate_id, v.file_name, v.sha256, v.result, v.message, v.source, v.checked_at, v.ip_address,
              v.checked_by, u.first_name, u.last_name, u.email AS checker_email, d.document_name, d.status AS document_status,
              (SELECT di.bexsign_doc_id FROM document_identifiers di WHERE di.document_id = v.document_id ORDER BY di.id LIMIT 1) AS bexsign_doc_id
       ${VALIDITY_FROM} ${filters.sql}
       ORDER BY v.checked_at DESC, v.id DESC LIMIT ? OFFSET ?`,
      [...filters.params, pageSize, offset]
    );

    // Summary over everything the user can see (list filters not applied)
    const scoped = validityFilters(req, {});
    const [[totals]] = await db.query(
      `SELECT COUNT(*) AS checks, SUM(v.result = 'valid') AS valid, SUM(v.result = 'modified') AS modified,
              SUM(v.result = 'unknown') AS unknown, SUM(v.result = 'invalid') AS invalid,
              SUM(v.checked_at >= NOW() - INTERVAL 30 DAY) AS last30d, MAX(v.checked_at) AS lastCheckAt
       ${VALIDITY_FROM} ${scoped.sql}`,
      scoped.params
    );

    res.json({
      success: true,
      scope: filters.scope,
      items: rows.map((r) => ({
        id: r.id,
        reference: r.certificate_id,
        fileName: r.file_name,
        sha256: r.sha256,
        result: r.result,
        message: r.message,
        source: r.source,
        checkedAt: r.checked_at,
        ip: r.ip_address,
        checkedBy: r.checked_by ? { id: r.checked_by, name: fullName(r.first_name, r.last_name), email: r.checker_email } : null,
        document: r.document_id
          ? { id: r.document_id, name: r.document_name || 'Deleted document', bexsignDocId: r.bexsign_doc_id || null, status: r.document_status || null }
          : null
      })),
      total: num(count.n),
      page,
      pageSize,
      summary: {
        checks: num(totals.checks),
        valid: num(totals.valid),
        failed: num(totals.modified) + num(totals.unknown) + num(totals.invalid),
        modified: num(totals.modified),
        unknown: num(totals.unknown),
        invalid: num(totals.invalid),
        last30d: num(totals.last30d),
        lastCheckAt: totals.lastCheckAt || null
      }
    });
  } catch (err) {
    serverError(res, 'validity history', err, 'The verification history could not be loaded.');
  }
});

// @route GET /api/security/document-validity/documents (documents with issued, fingerprinted PDFs)
router.get('/document-validity/documents', canValidity, async (req, res) => {
  try {
    await ensureFingerprintTable();
    await ensureValiditySchema();
    const { page, pageSize, offset } = paging(req.query, 10);
    const scope = documentScope(req, 'd');
    const where = [];
    const params = [];
    if (scope.scope !== 'all') {
      where.push(`d.id IS NOT NULL AND ${scope.sql}`);
      params.push(...scope.params);
    }
    const scopeSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const scopeParams = [...params];
    const search = String(req.query.search || '').trim();
    if (search) {
      // A fingerprint is searched by its start (at least 6 hex characters)
      const hashPrefix = /^[a-f0-9]{6,64}$/i.test(search) ? `${search.toLowerCase()}%` : null;
      where.push(`(d.document_name LIKE ?
        OR EXISTS (SELECT 1 FROM document_identifiers sdi WHERE sdi.document_id = g.document_id AND sdi.bexsign_doc_id LIKE ?)
        OR EXISTS (SELECT 1 FROM issued_pdf_fingerprints sf WHERE sf.document_id = g.document_id
          AND (sf.file_name LIKE ?${hashPrefix ? ' OR sf.sha256 LIKE ?' : ''})))`);
      params.push(like(search), like(search), like(search), ...(hashPrefix ? [hashPrefix] : []));
    }
    if (req.query.status) {
      where.push('d.status = ?');
      params.push(String(req.query.status));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const from = `
      FROM (SELECT document_id, COUNT(*) AS fingerprints, MIN(created_at) AS first_issued_at, MAX(created_at) AS last_issued_at
            FROM issued_pdf_fingerprints GROUP BY document_id) g
      LEFT JOIN documents d ON d.id = g.document_id
      LEFT JOIN users o ON o.id = d.user_id`;

    const [[count]] = await db.query(`SELECT COUNT(*) AS n ${from} ${whereSql}`, params);
    const [docs] = await db.query(
      `SELECT g.document_id, g.fingerprints, g.first_issued_at, g.last_issued_at,
              d.document_name, d.status, d.sent_at, d.completed_at, o.first_name, o.last_name, o.email AS owner_email,
              (SELECT di.bexsign_doc_id FROM document_identifiers di WHERE di.document_id = g.document_id ORDER BY di.id LIMIT 1) AS bexsign_doc_id
       ${from} ${whereSql}
       ORDER BY g.last_issued_at DESC, g.document_id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const [[totals]] = await db.query(`SELECT COUNT(*) AS documents, COALESCE(SUM(g.fingerprints), 0) AS fingerprints ${from} ${scopeSql}`, scopeParams);

    const ids = docs.map((d) => d.document_id);
    const filesByDoc = new Map();
    const checksByDoc = new Map();
    if (ids.length) {
      const [files] = await db.query(
        `SELECT id, sha256, document_id, file_index, kind, file_name, recipient_email, file_path, layout_version, created_at
         FROM issued_pdf_fingerprints WHERE document_id IN (?) ORDER BY created_at DESC, id DESC`,
        [ids]
      );
      files.forEach((f) => {
        const list = filesByDoc.get(f.document_id) || [];
        list.push(f);
        filesByDoc.set(f.document_id, list);
      });
      const [checks] = await db.query(
        `SELECT v.document_id, v.result, v.checked_at, v.file_name, x.checks
         FROM document_validity v
         JOIN (SELECT document_id, MAX(id) AS last_id, COUNT(*) AS checks FROM document_validity WHERE document_id IN (?) GROUP BY document_id) x
           ON x.last_id = v.id`,
        [ids]
      );
      checks.forEach((c) => checksByDoc.set(c.document_id, c));
    }

    const items = docs.map((d) => {
      const seen = new Set();
      const files = (filesByDoc.get(d.document_id) || []).map((f) => {
        // Newest fingerprint of each file (kind, index, recipient) is the current copy; older ones stay authentic
        const key = `${f.kind}|${f.file_index}|${f.recipient_email || ''}`;
        const latest = !seen.has(key);
        seen.add(key);
        return {
          id: f.id,
          kind: f.kind,
          kindLabel: KIND_LABELS[f.kind] || f.kind,
          fileName: f.file_name,
          fileIndex: f.file_index,
          recipientEmail: f.recipient_email,
          sha256: f.sha256,
          issuedAt: f.created_at,
          layoutVersion: f.layout_version,
          stored: Boolean(f.file_path),
          latest
        };
      });
      const kinds = {};
      files.filter((f) => f.latest).forEach((f) => {
        kinds[f.kind] = (kinds[f.kind] || 0) + 1;
      });
      const check = checksByDoc.get(d.document_id);
      return {
        id: d.document_id,
        name: d.document_name || 'Deleted document',
        deleted: !d.document_name,
        bexsignDocId: d.bexsign_doc_id || null,
        status: d.status || (d.document_name ? null : 'Deleted'),
        sentAt: d.sent_at,
        completedAt: d.completed_at,
        owner: d.owner_email ? { name: fullName(d.first_name, d.last_name), email: d.owner_email } : null,
        firstIssuedAt: d.first_issued_at,
        lastIssuedAt: d.last_issued_at,
        fileCount: files.filter((f) => f.latest).length,
        fingerprintCount: num(d.fingerprints),
        kinds,
        files,
        lastCheck: check ? { result: check.result, checkedAt: check.checked_at, fileName: check.file_name, checks: num(check.checks) } : null
      };
    });

    res.json({
      success: true,
      scope: scope.scope,
      items,
      total: num(count.n),
      page,
      pageSize,
      summary: { documents: num(totals.documents), fingerprints: num(totals.fingerprints) }
    });
  } catch (err) {
    serverError(res, 'issued documents', err, 'The issued documents could not be loaded.');
  }
});

async function verificationResponse(req, outcome, source) {
  const details = outcome.match ? await describeIssuedFile(outcome.match) : { document: null, file: null, signers: [] };
  const check = await recordValidityCheck({
    req,
    documentId: outcome.match && outcome.matchType !== 'name' ? outcome.match.document_id : null,
    fileName: outcome.fileName,
    sha256: outcome.sha256,
    result: outcome.result,
    message: outcome.message,
    source
  });
  return {
    success: true,
    result: outcome.result,
    verified: outcome.result === 'valid',
    message: outcome.message,
    sha256: outcome.sha256,
    fileName: outcome.fileName,
    fileSize: outcome.fileSize ?? null,
    // exact: this file; original: the issued PDF this file was made from; name: an issued file with the same name
    matchType: outcome.matchType || null,
    document: details.document,
    file: details.file,
    signers: details.signers,
    check: check ? { id: check.id, reference: check.reference, checkedAt: new Date() } : null
  };
}

const verifyUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

// @route POST /api/security/document-validity/verify (multipart field "file")
router.post('/document-validity/verify', canValidity, (req, res, next) => {
  verifyUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    const error = err.code === 'LIMIT_FILE_SIZE'
      ? 'The file must be 25 MB or smaller.'
      : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Upload one PDF in the "file" field.' : err.message;
    res.status(400).json({ success: false, error });
  });
}, async (req, res) => {
  if (!req.file || !req.file.buffer?.length) {
    return res.status(400).json({ success: false, error: 'Choose the PDF file you want to verify.' });
  }
  try {
    const outcome = await verifyPdfBuffer(req.file.buffer, req.file.originalname);
    res.json(await verificationResponse(req, outcome, 'upload'));
  } catch (err) {
    serverError(res, 'verify upload', err, 'The document could not be verified.');
  }
});

// @route POST /api/security/document-validity/verify-hash { sha256 } (e.g. from a verification link)
router.post('/document-validity/verify-hash', canValidity, async (req, res) => {
  const hash = String(req.body?.sha256 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    return res.status(400).json({ success: false, error: 'Enter a SHA-256 fingerprint: 64 characters, 0-9 and a-f.' });
  }
  try {
    const match = await findFingerprint(hash);
    const outcome = match
      ? { result: 'valid', match, matchType: 'exact', sha256: hash, fileName: match.file_name, message: 'Authentic: BexSign issued a PDF with this fingerprint.' }
      : { result: 'unknown', match: null, matchType: null, sha256: hash, fileName: null, message: 'Not recognized: BexSign never issued a PDF with this fingerprint.' };
    res.json(await verificationResponse(req, outcome, 'link'));
  } catch (err) {
    serverError(res, 'verify hash', err, 'The fingerprint could not be verified.');
  }
});

/* --------------------------------------------------------- activity history */

const ACTIVITY_CATEGORIES = ['auth', 'user', 'permission', 'settings', 'document', 'template', 'api', 'report', 'security', 'system'];
const ACTIVITY_SOURCES = ['account', 'document', 'login'];

/**
 * The three feeds as SELECTs with the same columns. Filters run inside each branch so indexes are used;
 * `skip` leaves out one filter (for the chip and source counts).
 */
async function activityBranches(query, skip = null) {
  const category = skip !== 'category' && ACTIVITY_CATEGORIES.includes(query.category) ? query.category : null;
  const source = skip !== 'source' && ACTIVITY_SOURCES.includes(query.source) ? query.source : null;
  const search = String(query.search || '').trim();
  const user = String(query.user || '').trim();
  const userId = parseInt(query.userId, 10) || null;
  let userEmail = null;
  if (userId) {
    const [rows] = await db.query('SELECT email FROM users WHERE id = ?', [userId]);
    userEmail = rows[0]?.email || '';
  }

  const branches = [];

  if (!source || source === 'account') {
    const where = [];
    const params = [];
    if (category) {
      where.push('al.category = ?');
      params.push(category);
    }
    if (userId) {
      where.push('al.user_id = ?');
      params.push(userId);
    }
    if (user) {
      where.push("(al.user_email LIKE ? OR u.email LIKE ? OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ?)");
      params.push(like(user), like(user), like(user));
    }
    if (search) {
      where.push(`(al.action LIKE ? OR al.details LIKE ? OR al.ip_address LIKE ? OR al.user_email LIKE ?
        OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR ed.document_name LIKE ?)`);
      params.push(...Array(6).fill(like(search)));
    }
    addDateRange('al.created_at', query, where, params);
    branches.push({
      source: 'account',
      time: 'al.created_at',
      categoryExpr: 'al.category',
      from: `FROM activity_logs al
        LEFT JOIN users u ON u.id = al.user_id
        LEFT JOIN documents ed ON al.entity_type = 'document' AND ed.id = al.entity_id
        LEFT JOIN users eu ON al.entity_type = 'user' AND eu.id = al.entity_id
        LEFT JOIN templates et ON al.entity_type = 'template' AND et.id = al.entity_id
        LEFT JOIN webhooks ew ON al.entity_type = 'webhook' AND ew.id = al.entity_id
        LEFT JOIN api_keys ek ON al.entity_type = 'api_key' AND ek.id = al.entity_id
        LEFT JOIN scheduled_reports er ON al.entity_type = 'scheduled_report' AND er.id = al.entity_id`,
      select: `SELECT 'account' AS source, al.id AS row_id, al.category AS category, al.action AS action,
        al.user_id AS actor_id, COALESCE(al.user_email, u.email) AS actor_email, CONCAT_WS(' ', u.first_name, u.last_name) AS actor_name,
        al.entity_type AS entity_type, al.entity_id AS entity_id,
        COALESCE(ed.document_name, NULLIF(CONCAT_WS(' ', eu.first_name, eu.last_name), ''), et.title, ew.name, ek.name, er.name) AS entity_name,
        al.details AS details, al.ip_address AS ip, al.browser_info AS user_agent, NULL AS status, al.created_at AS created_at`,
      where,
      params
    });
  }

  if ((!source || source === 'document') && (!category || category === 'document')) {
    const where = [];
    const params = [];
    if (userId) {
      where.push('(d.user_id = ? OR ah.activity_description LIKE ?)');
      params.push(userId, like(userEmail || '\u0000'));
    }
    if (user) {
      where.push("(ah.activity_description LIKE ? OR o.email LIKE ? OR CONCAT_WS(' ', o.first_name, o.last_name) LIKE ?)");
      params.push(like(user), like(user), like(user));
    }
    if (search) {
      where.push('(ah.activity_description LIKE ? OR d.document_name LIKE ? OR ah.ip_address LIKE ?)');
      params.push(like(search), like(search), like(search));
    }
    addDateRange('ah.created_at', query, where, params);
    branches.push({
      source: 'document',
      time: 'ah.created_at',
      categoryExpr: "'document'",
      from: `FROM activity_history ah
        LEFT JOIN documents d ON d.id = ah.document_id
        LEFT JOIN users o ON o.id = d.user_id`,
      select: `SELECT 'document' AS source, ah.id AS row_id, 'document' AS category, ah.activity_description AS action,
        d.user_id AS actor_id, o.email AS actor_email, CONCAT_WS(' ', o.first_name, o.last_name) AS actor_name,
        'document' AS entity_type, ah.document_id AS entity_id, d.document_name AS entity_name,
        d.status AS details, ah.ip_address AS ip, NULL AS user_agent, NULL AS status, ah.created_at AS created_at`,
      where,
      params
    });
  }

  if ((!source || source === 'login') && (!category || category === 'auth')) {
    const where = [];
    const params = [];
    if (userId) {
      where.push('l.user_id = ?');
      params.push(userId);
    }
    if (user) {
      where.push("(l.email LIKE ? OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ?)");
      params.push(like(user), like(user));
    }
    if (search) {
      where.push("(l.email LIKE ? OR l.ip_address LIKE ? OR l.user_agent LIKE ? OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE ? OR IF(l.status = 'failed', 'Sign-in failed', 'Signed in') LIKE ?)");
      params.push(...Array(5).fill(like(search)));
    }
    addDateRange('l.login_at', query, where, params);
    branches.push({
      source: 'login',
      time: 'l.login_at',
      categoryExpr: "'auth'",
      from: 'FROM user_login_logs l LEFT JOIN users u ON u.id = l.user_id',
      select: `SELECT 'login' AS source, l.id AS row_id, 'auth' AS category,
        IF(l.status = 'failed', 'Sign-in failed', 'Signed in') AS action,
        l.user_id AS actor_id, l.email AS actor_email, CONCAT_WS(' ', u.first_name, u.last_name) AS actor_name,
        'user' AS entity_type, l.user_id AS entity_id, CONCAT_WS(' ', u.first_name, u.last_name) AS entity_name,
        l.role AS details, l.ip_address AS ip, l.user_agent AS user_agent, l.status AS status, l.login_at AS created_at`,
      where,
      params
    });
  }

  return branches.map((b) => ({ ...b, whereSql: b.where.length ? `WHERE ${b.where.join(' AND ')}` : '' }));
}

/** Newest rows across the branches: each branch returns at most offset + limit rows, then they are merged. */
async function activityRows(branches, limit, offset) {
  if (branches.length === 0) return [];
  const parts = [];
  const params = [];
  branches.forEach((b) => {
    parts.push(`(${b.select} ${b.from} ${b.whereSql} ORDER BY ${b.time} DESC, row_id DESC LIMIT ?)`);
    params.push(...b.params, offset + limit);
  });
  const [rows] = await db.query(
    `SELECT * FROM (${parts.join(' UNION ALL ')}) feed ORDER BY created_at DESC, source ASC, row_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

async function activityCount(branches) {
  const counts = await Promise.all(branches.map((b) => db.query(`SELECT COUNT(*) AS n ${b.from} ${b.whereSql}`, b.params)));
  return counts.reduce((sum, [[row]]) => sum + num(row.n), 0);
}

// Document events: "Name (email) signed the document" names the recipient who acted
const RECIPIENT_EVENT = /^([^"()]{1,80}) \(([^()\s]+@[^()\s]+)\) ([a-z].*)$/;
const SYSTEM_EVENT = /^(signature request emailed|completed documents|all recipients|reminder|automatic|request expired|expired)/i;
const DOCUMENT_EVENTS = [
  ['declined', /declin/i],
  ['signed', /\bsigned\b|\bsigned the\b/i],
  ['completed', /complet/i],
  ['viewed', /\bviewed\b|\bopened\b/i],
  ['sent', /sent for signature|\bresent\b/i],
  ['emailed', /emailed|email/i],
  ['recalled', /recall/i],
  ['expired', /expir/i],
  ['delegated', /reassign|delegat|assigned/i],
  ['created', /created/i],
  ['copied', /cop(y|ied)/i],
  ['updated', /updat|correct|edit|chang/i],
  ['deleted', /delet|trash/i]
];

function parseDetails(value) {
  if (value === null || value === undefined || value === '') return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' ? parsed : value;
  } catch (e) {
    return value;
  }
}

async function mapActivity(rows) {
  const docIds = [...new Set(rows.filter((r) => r.entity_type === 'document' && r.entity_id).map((r) => r.entity_id))];
  const bexIds = new Map();
  if (docIds.length) {
    const [ids] = await db.query('SELECT document_id, MIN(bexsign_doc_id) AS bexsign_doc_id FROM document_identifiers WHERE document_id IN (?) GROUP BY document_id', [docIds]);
    ids.forEach((r) => bexIds.set(r.document_id, r.bexsign_doc_id));
  }
  return rows.map((r) => {
    let actor = r.actor_email || r.actor_id ? { id: r.actor_id || null, name: r.actor_name || null, email: r.actor_email || null } : null;
    let event = null;
    let details = parseDetails(r.details);
    if (r.source === 'document') {
      const text = String(r.action || '');
      const recipient = RECIPIENT_EVENT.exec(text);
      if (recipient) actor = { id: null, name: recipient[1].trim(), email: recipient[2], recipient: true };
      else if (SYSTEM_EVENT.test(text)) actor = { id: null, name: 'BexSign', email: null, system: true };
      event = (DOCUMENT_EVENTS.find(([, re]) => re.test(text)) || ['other'])[0];
      details = { documentStatus: r.details || null };
    } else if (r.source === 'login') {
      event = r.status === 'failed' ? 'login_failed' : 'login';
      details = { role: r.details || null, result: r.status || 'success' };
    }
    const entity = r.entity_type
      ? {
        type: r.entity_type,
        id: r.entity_id || null,
        name: r.entity_name || (r.entity_type === 'document' && r.entity_id ? 'Deleted document' : null),
        ...(r.entity_type === 'document' && r.entity_id ? { bexsignDocId: bexIds.get(r.entity_id) || null } : {})
      }
      : null;
    return {
      id: `${r.source}-${r.row_id}`,
      source: r.source,
      category: r.category,
      action: r.action,
      event,
      actor,
      entity,
      ip: r.ip || null,
      userAgent: r.user_agent || null,
      device: parseUserAgent(r.user_agent),
      details,
      createdAt: r.created_at
    };
  });
}

/** Days shown in the per-day chart: the chosen range (up to 90 days) or the last 14 days. */
function activityWindow(query) {
  const end = isDate(query.to) ? new Date(`${query.to}T00:00:00`) : new Date();
  let days = 14;
  if (isDate(query.from)) {
    const start = new Date(`${query.from}T00:00:00`);
    days = Math.round((new Date(end.getFullYear(), end.getMonth(), end.getDate()) - start) / 86400000) + 1;
  }
  days = Math.min(90, Math.max(1, days || 14));
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
  return { days, end, startDay: localDay(start) };
}

async function activitySummary(query) {
  const [byCategoryBranches, bySourceBranches, allBranches] = await Promise.all([
    activityBranches(query, 'category'),
    activityBranches(query, 'source'),
    activityBranches(query)
  ]);
  const byCategory = Object.fromEntries(ACTIVITY_CATEGORIES.map((c) => [c, 0]));
  await Promise.all(byCategoryBranches.map(async (b) => {
    const [rows] = await db.query(`SELECT ${b.categoryExpr} AS k, COUNT(*) AS n ${b.from} ${b.whereSql} GROUP BY k`, b.params);
    rows.forEach((r) => {
      byCategory[r.k] = (byCategory[r.k] || 0) + num(r.n);
    });
  }));
  const bySource = Object.fromEntries(ACTIVITY_SOURCES.map((s) => [s, 0]));
  await Promise.all(bySourceBranches.map(async (b) => {
    const [[row]] = await db.query(`SELECT COUNT(*) AS n ${b.from} ${b.whereSql}`, b.params);
    bySource[b.source] = num(row.n);
  }));
  const window = activityWindow(query);
  const perDayCounts = new Map();
  await Promise.all(allBranches.map(async (b) => {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(${b.time}, '%Y-%m-%d') AS day, COUNT(*) AS n ${b.from}
       ${b.whereSql ? `${b.whereSql} AND` : 'WHERE'} ${b.time} >= ? AND ${b.time} < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY day`,
      [...b.params, `${window.startDay} 00:00:00`, localDay(window.end)]
    );
    rows.forEach((r) => perDayCounts.set(r.day, (perDayCounts.get(r.day) || 0) + num(r.n)));
  }));
  const perDay = fillDays([...perDayCounts].map(([day, n]) => ({ day, n })), window.days, window.end);
  return {
    byCategory,
    bySource,
    total: Object.values(byCategory).reduce((a, b) => a + b, 0),
    perDay
  };
}

// @route GET /api/security/activity
router.get('/activity', canActivity, async (req, res) => {
  try {
    const { page, pageSize, offset } = paging(req.query);
    const branches = await activityBranches(req.query);
    const [rows, total, summary] = await Promise.all([
      activityRows(branches, pageSize, offset),
      activityCount(branches),
      activitySummary(req.query)
    ]);
    res.json({ success: true, items: await mapActivity(rows), total, page, pageSize, summary });
  } catch (err) {
    serverError(res, 'activity list', err, 'The activity history could not be loaded.');
  }
});

// @route GET /api/security/activity/export (CSV with the list filters, newest 10,000)
router.get('/activity/export', canActivity, async (req, res) => {
  try {
    const branches = await activityBranches(req.query);
    const items = await mapActivity(await activityRows(branches, 10000, 0));
    sendCsv(
      res,
      'activity-history',
      ['Time', 'Source', 'Category', 'Action', 'Actor', 'Actor email', 'Entity type', 'Entity', 'BexSign ID', 'IP address', 'Device', 'Details'],
      items.map((i) => [
        i.createdAt, i.source, i.category, i.action, i.actor?.name, i.actor?.email, i.entity?.type, i.entity?.name,
        i.entity?.bexsignDocId, i.ip, i.device?.label, i.details && typeof i.details === 'object' ? JSON.stringify(i.details) : i.details
      ])
    );
  } catch (err) {
    serverError(res, 'activity export', err, 'The activity history could not be exported.');
  }
});

module.exports = router;
