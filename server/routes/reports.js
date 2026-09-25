/**
 * Reports module: overview (KPIs, charts, documents), activity timeline, CSV exports and scheduled report emails.
 * Visibility follows the document permissions: view_all → every document, view_team → the user's department,
 * otherwise the user's own documents.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const data = require('../utils/reportData');
const scheduler = require('../utils/reportScheduler');

// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);

const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ success: false, error: err.message, ...(err.fields ? { fields: err.fields } : {}) });
    }
    console.error(`[Reports] ${label}:`, err);
    return res.status(500).json({ success: false, error: `Could not ${label}. Please try again.` });
  }
};

function intParam(value, fallback, { min = 1, max = 100000, name }) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new data.ReportError(`${name} must be a whole number from ${min} to ${max}.`);
  return n;
}

/* ---------- Overview, timeline, export ---------- */

router.get('/overview', requirePermission('reports.view'), handle('load the report', async (req, res) => {
  const range = data.resolveRange(req.query.from, req.query.to);
  const filters = data.parseFilters(req.query);
  const sort = data.parseSort(req.query.sort);
  const page = intParam(req.query.page, 1, { name: 'page' });
  const pageSize = intParam(req.query.pageSize, 10, { max: 100, name: 'pageSize' });
  const scope = await data.getScope(req.user, req.permissions);
  const overview = await data.getOverview({ scope, range, filters, page, pageSize, sort });
  res.json({
    success: true,
    range: { from: range.from, to: range.to, days: range.days },
    scope: scope.kind,
    department: scope.department || null,
    filters,
    sort: `${sort.desc ? '-' : ''}${sort.key}`,
    ...overview
  });
}));

router.get('/timeline', requirePermission('reports.view'), handle('load the timeline', async (req, res) => {
  const range = data.resolveRange(req.query.from, req.query.to);
  const type = data.parseEventType(req.query.type);
  const search = String(req.query.search || '').trim().slice(0, 100);
  const page = intParam(req.query.page, 1, { name: 'page' });
  const pageSize = intParam(req.query.pageSize, 25, { max: 100, name: 'pageSize' });
  const scope = await data.getScope(req.user, req.permissions);
  const timeline = await data.getTimeline({ scope, range, type, search, page, pageSize });
  res.json({ success: true, range: { from: range.from, to: range.to, days: range.days }, scope: scope.kind, type, ...timeline });
}));

router.get('/export', requirePermission('reports.export'), handle('export the report', async (req, res) => {
  const kind = String(req.query.kind || 'documents').trim().toLowerCase();
  if (!data.REPORT_KINDS[kind]) {
    throw new data.ReportError(`Report kind must be one of: ${Object.keys(data.REPORT_KINDS).join(', ')}.`);
  }
  const range = data.resolveRange(req.query.from, req.query.to);
  // On the timeline "type" is the event type; elsewhere it is the document type
  const eventType = kind === 'timeline' ? data.parseEventType(req.query.type) : null;
  const filters = data.parseFilters(kind === 'timeline' ? { search: req.query.search } : req.query);
  const scope = await data.getScope(req.user, req.permissions);
  const report = await data.buildReport(kind, { scope, range, filters, type: eventType });
  const fileName = `bexsign-${kind}-${range.from}_to_${range.to}.csv`;

  await logActivity({
    req,
    category: 'report',
    action: `Exported ${data.REPORT_KINDS[kind].toLowerCase()} report (${report.rows.length} rows)`,
    entityType: 'report',
    details: { kind, from: range.from, to: range.to, filters, eventType }
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Cache-Control', 'no-store');
  res.send(data.toCsv(report.columns, report.rows));
}));

/* ---------- Scheduled reports ---------- */

const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i;
const MAX_RECIPIENTS = 20;

const isManager = (req) => (req.permissions || []).includes('documents.view_all');
const canManage = (req, row) => Number(row.user_id) === Number(req.user.id) || isManager(req);

function parseJsonObject(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return Array.isArray(raw) ? {} : raw;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

function serializeSchedule(row, req) {
  const type = scheduler.REPORT_TYPES[row.report_type];
  return {
    id: row.id,
    name: row.name,
    reportType: row.report_type,
    reportTypeLabel: type?.label || row.report_type,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    timeOfDay: row.time_of_day,
    recipients: scheduler.parseRecipients(row),
    format: row.format || 'csv',
    filters: parseJsonObject(row.filters),
    isActive: Boolean(row.is_active),
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    lastStatus: row.last_status,
    runCount: Number(row.run_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    owner: {
      id: row.user_id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.owner_email || 'Unknown user',
      email: row.owner_email || null
    },
    canManage: canManage(req, row)
  };
}

const SCHEDULE_SELECT = `SELECT s.*, u.first_name, u.last_name, u.email AS owner_email,
    (SELECT COUNT(*) FROM report_runs rr WHERE rr.scheduled_report_id = s.id) AS run_count
  FROM scheduled_reports s LEFT JOIN users u ON u.id = s.user_id`;

async function loadSchedule(id) {
  const scheduleId = Number(id);
  if (!Number.isInteger(scheduleId) || scheduleId < 1) throw new data.ReportError('Scheduled report not found.', 404);
  const [rows] = await db.query(`${SCHEDULE_SELECT} WHERE s.id = ?`, [scheduleId]);
  if (!rows[0]) throw new data.ReportError('Scheduled report not found.', 404);
  return rows[0];
}

async function loadManageableSchedule(req) {
  const row = await loadSchedule(req.params.id);
  if (!canManage(req, row)) {
    throw new data.ReportError('Only the owner of this scheduled report or a manager can manage it.', 403);
  }
  return row;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

/** Validated schedule values from the request body, merged over the existing row on update. */
function readScheduleInput(body = {}, existing = null) {
  const pick = (camel, snake) => (body[camel] !== undefined ? body[camel] : body[snake]);
  const current = existing
    ? {
      name: existing.name,
      reportType: existing.report_type,
      frequency: existing.frequency,
      dayOfWeek: existing.day_of_week,
      dayOfMonth: existing.day_of_month,
      timeOfDay: existing.time_of_day,
      recipients: scheduler.parseRecipients(existing),
      format: existing.format || 'csv',
      filters: parseJsonObject(existing.filters),
      isActive: Boolean(existing.is_active)
    }
    : { reportType: 'document_summary', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, timeOfDay: '09:00', format: 'csv', filters: {}, isActive: true };
  const input = { ...current };
  [
    ['name', 'name'], ['reportType', 'report_type'], ['frequency', 'frequency'], ['dayOfWeek', 'day_of_week'],
    ['dayOfMonth', 'day_of_month'], ['timeOfDay', 'time_of_day'], ['recipients', 'recipients'], ['format', 'format'],
    ['filters', 'filters'], ['isActive', 'is_active']
  ].forEach(([camel, snake]) => {
    const value = pick(camel, snake);
    if (value !== undefined) input[camel] = value;
  });

  const fields = {};
  const name = String(input.name ?? '').trim();
  if (!name) fields.name = 'Give the report a name.';
  else if (name.length > 150) fields.name = 'The name must be 150 characters or fewer.';

  const reportType = String(input.reportType || '').trim();
  if (!scheduler.REPORT_TYPES[reportType]) fields.reportType = `Report type must be one of: ${Object.keys(scheduler.REPORT_TYPES).join(', ')}.`;

  const frequency = String(input.frequency || '').trim().toLowerCase();
  if (!FREQUENCIES.includes(frequency)) fields.frequency = 'Frequency must be daily, weekly or monthly.';

  let dayOfWeek = null;
  let dayOfMonth = null;
  if (frequency === 'weekly') {
    dayOfWeek = input.dayOfWeek === null || input.dayOfWeek === undefined || input.dayOfWeek === '' ? 1 : Number(input.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) fields.dayOfWeek = 'Day of week must be 0 (Sunday) to 6 (Saturday).';
  }
  if (frequency === 'monthly') {
    dayOfMonth = input.dayOfMonth === null || input.dayOfMonth === undefined || input.dayOfMonth === '' ? 1 : Number(input.dayOfMonth);
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) fields.dayOfMonth = 'Day of month must be from 1 to 31.';
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(String(input.timeOfDay || '').trim());
  let timeOfDay = null;
  if (!timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59) fields.timeOfDay = 'Time must be HH:MM (24-hour).';
  else timeOfDay = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

  const rawRecipients = Array.isArray(input.recipients) ? input.recipients : String(input.recipients || '').split(/[,;\s]+/);
  const recipients = [...new Set(rawRecipients.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
  const invalid = recipients.filter((e) => e.length > 254 || !EMAIL_RE.test(e));
  if (!recipients.length) fields.recipients = 'Add at least one recipient email.';
  else if (invalid.length) fields.recipients = `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}.`;
  else if (recipients.length > MAX_RECIPIENTS) fields.recipients = `Add at most ${MAX_RECIPIENTS} recipients.`;

  const format = String(input.format || 'csv').trim().toLowerCase();
  if (format !== 'csv') fields.format = 'Only CSV reports can be scheduled.';

  let filters = {};
  try {
    const parsed = data.parseFilters(parseJsonObject(input.filters));
    delete parsed.search;
    filters = parsed;
  } catch (err) {
    fields.filters = err.message;
  }

  const isActive = toBool(input.isActive);
  if (isActive === undefined) fields.isActive = 'Active must be true or false.';

  const keys = Object.keys(fields);
  if (keys.length) {
    const err = new data.ReportError(fields[keys[0]]);
    err.fields = fields;
    throw err;
  }
  return { name, reportType, frequency, dayOfWeek, dayOfMonth, timeOfDay, recipients, format, filters, isActive };
}

router.get('/scheduled', requirePermission('reports.schedule'), handle('load scheduled reports', async (req, res) => {
  const [rows] = isManager(req)
    ? await db.query(`${SCHEDULE_SELECT} ORDER BY s.is_active DESC, s.next_run_at IS NULL, s.next_run_at ASC, s.id DESC`)
    : await db.query(`${SCHEDULE_SELECT} WHERE s.user_id = ? ORDER BY s.is_active DESC, s.next_run_at IS NULL, s.next_run_at ASC, s.id DESC`, [req.user.id]);
  res.json({
    success: true,
    schedules: rows.map((row) => serializeSchedule(row, req)),
    reportTypes: Object.entries(scheduler.REPORT_TYPES).map(([value, t]) => ({ value, label: t.label })),
    canSeeAll: isManager(req)
  });
}));

router.post('/scheduled', requirePermission('reports.schedule'), handle('create the scheduled report', async (req, res) => {
  const input = readScheduleInput(req.body);
  const nextRun = input.isActive ? scheduler.computeNextRun(input) : null;
  const [result] = await db.query(
    `INSERT INTO scheduled_reports (user_id, name, report_type, frequency, day_of_week, day_of_month, time_of_day,
       recipients, recipient_email, format, filters, is_active, next_run_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id, input.name, input.reportType, input.frequency, input.dayOfWeek, input.dayOfMonth, input.timeOfDay,
      JSON.stringify(input.recipients), input.recipients[0], input.format, JSON.stringify(input.filters), input.isActive ? 1 : 0, nextRun
    ]
  );
  await logActivity({
    req,
    category: 'report',
    action: `Scheduled report "${input.name}" created`,
    entityType: 'scheduled_report',
    entityId: result.insertId,
    details: { reportType: input.reportType, frequency: input.frequency, recipients: input.recipients }
  });
  res.status(201).json({ success: true, schedule: serializeSchedule(await loadSchedule(result.insertId), req) });
}));

router.put('/scheduled/:id', requirePermission('reports.schedule'), handle('update the scheduled report', async (req, res) => {
  const existing = await loadManageableSchedule(req);
  const input = readScheduleInput(req.body, existing);
  const timingChanged = input.frequency !== existing.frequency
    || input.dayOfWeek !== existing.day_of_week
    || input.dayOfMonth !== existing.day_of_month
    || input.timeOfDay !== existing.time_of_day
    || input.isActive !== Boolean(existing.is_active)
    || !existing.next_run_at;
  let nextRun = null;
  if (input.isActive) nextRun = timingChanged ? scheduler.computeNextRun(input) : existing.next_run_at;

  await db.query(
    `UPDATE scheduled_reports SET name = ?, report_type = ?, frequency = ?, day_of_week = ?, day_of_month = ?, time_of_day = ?,
       recipients = ?, recipient_email = ?, format = ?, filters = ?, is_active = ?, next_run_at = ? WHERE id = ?`,
    [
      input.name, input.reportType, input.frequency, input.dayOfWeek, input.dayOfMonth, input.timeOfDay,
      JSON.stringify(input.recipients), input.recipients[0], input.format, JSON.stringify(input.filters), input.isActive ? 1 : 0,
      nextRun, existing.id
    ]
  );
  const onlyToggled = Object.keys(req.body || {}).every((k) => ['isActive', 'is_active'].includes(k));
  await logActivity({
    req,
    category: 'report',
    action: onlyToggled
      ? `Scheduled report "${input.name}" ${input.isActive ? 'resumed' : 'paused'}`
      : `Scheduled report "${input.name}" updated`,
    entityType: 'scheduled_report',
    entityId: existing.id,
    details: { reportType: input.reportType, frequency: input.frequency, recipients: input.recipients, isActive: input.isActive }
  });
  res.json({ success: true, schedule: serializeSchedule(await loadSchedule(existing.id), req) });
}));

router.delete('/scheduled/:id', requirePermission('reports.schedule'), handle('delete the scheduled report', async (req, res) => {
  const existing = await loadManageableSchedule(req);
  await db.query('DELETE FROM report_runs WHERE scheduled_report_id = ?', [existing.id]);
  await db.query('DELETE FROM scheduled_reports WHERE id = ?', [existing.id]);
  await logActivity({
    req,
    category: 'report',
    action: `Scheduled report "${existing.name}" deleted`,
    entityType: 'scheduled_report',
    entityId: existing.id
  });
  res.json({ success: true, message: 'Scheduled report deleted.' });
}));

router.post('/scheduled/:id/run', requirePermission('reports.schedule'), handle('send the report', async (req, res) => {
  const existing = await loadManageableSchedule(req);
  const run = await scheduler.runScheduledReport(existing.id, { triggeredBy: 'manual' });
  await logActivity({
    req,
    category: 'report',
    action: `Scheduled report "${existing.name}" sent manually (${run.status})`,
    entityType: 'scheduled_report',
    entityId: existing.id,
    details: { runId: run.id, rowCount: run.rowCount, recipients: run.recipients }
  });
  const schedule = serializeSchedule(await loadSchedule(existing.id), req);
  if (run.status === 'failed') {
    return res.status(502).json({ success: false, error: `The report could not be sent: ${run.error || 'unknown error'}`, run, schedule });
  }
  res.json({
    success: true,
    message: run.status === 'success' ? `Report emailed to ${run.recipients.join(', ')}.` : run.error,
    run,
    schedule
  });
}));

router.get('/scheduled/:id/runs', requirePermission('reports.schedule'), handle('load the run history', async (req, res) => {
  const existing = await loadManageableSchedule(req);
  const limit = intParam(req.query.limit, 50, { max: 200, name: 'limit' });
  const [rows] = await db.query(
    'SELECT * FROM report_runs WHERE scheduled_report_id = ? ORDER BY run_at DESC, id DESC LIMIT ?',
    [existing.id, limit]
  );
  res.json({ success: true, runs: rows.map(scheduler.formatRun) });
}));

module.exports = router;
