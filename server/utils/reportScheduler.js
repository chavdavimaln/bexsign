/**
 * Scheduled report emails. Every minute the runner picks active schedules whose next_run_at has passed, claims each
 * one by moving next_run_at forward (so a second server process cannot send it again), builds the CSV for the period
 * (daily: previous day, weekly: last 7 days, monthly: previous calendar month), emails it, records a report_runs row
 * and notifies the owner.
 */
const db = require('../db');
const { getEffectivePermissions } = require('./permissions');
const { notify } = require('./platformEvents');
const { sendReportEmail } = require('./emailService');
const data = require('./reportData');

const TICK_MS = 60 * 1000;

const REPORT_TYPES = {
  document_summary: { label: 'Document summary', kind: 'documents' },
  activity_timeline: { label: 'Activity timeline', kind: 'timeline' },
  recipient_status: { label: 'Recipient status', kind: 'recipients' },
  user_activity: { label: 'User activity', kind: 'users' }
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

function parseTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '09:00'));
  const h = m ? Math.min(23, Number(m[1])) : 9;
  const min = m ? Math.min(59, Number(m[2])) : 0;
  return [h, min];
}

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

/** Next run strictly after fromDate (server local time). Accepts DB rows (snake_case) and camelCase objects. */
function computeNextRun(schedule, fromDate = new Date()) {
  const frequency = schedule.frequency || 'weekly';
  const [h, min] = parseTime(schedule.time_of_day ?? schedule.timeOfDay);
  const from = new Date(fromDate);
  if (frequency === 'daily') {
    const next = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h, min);
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === 'monthly') {
    const wanted = Number(schedule.day_of_month ?? schedule.dayOfMonth) || 1;
    // Short months run on their last day
    const at = (year, month) => new Date(year, month, Math.min(wanted, daysInMonth(year, month)), h, min);
    let next = at(from.getFullYear(), from.getMonth());
    if (next <= from) next = at(from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear(), (from.getMonth() + 1) % 12);
    return next;
  }
  const dow = Number(schedule.day_of_week ?? schedule.dayOfWeek);
  const weekday = Number.isInteger(dow) && dow >= 0 && dow <= 6 ? dow : 1;
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + ((weekday - from.getDay() + 7) % 7), h, min);
  if (next <= from) next.setDate(next.getDate() + 7);
  return next;
}

/** Reporting period of a run: { from, to, label } */
function getReportPeriod(frequency, runDate = new Date()) {
  const today = data.startOfDay(runDate);
  const fmt = (d) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  if (frequency === 'daily') {
    const day = data.addDays(today, -1);
    return { from: data.ymd(day), to: data.ymd(day), label: fmt(day) };
  }
  if (frequency === 'monthly') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: data.ymd(first), to: data.ymd(last), label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}` };
  }
  const start = data.addDays(today, -7);
  const end = data.addDays(today, -1);
  return { from: data.ymd(start), to: data.ymd(end), label: `${fmt(start)} - ${fmt(end)}` };
}

function parseRecipients(row) {
  try {
    const list = JSON.parse(row.recipients || '[]');
    if (Array.isArray(list) && list.length) return list.map(String);
  } catch (e) {
    // Legacy rows: comma separated
  }
  return String(row.recipients || row.recipient_email || '').split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
}

function parseFiltersJson(raw) {
  try {
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (e) {
    return {};
  }
}

const running = new Set();

/**
 * Builds and emails one scheduled report. triggeredBy: 'schedule' | 'manual'. Returns the report_runs row
 * ({ id, status: success | partial | failed, rowCount, recipients, fileName, error, runAt }).
 */
async function runScheduledReport(id, { triggeredBy = 'manual' } = {}) {
  const scheduleId = Number(id);
  if (running.has(scheduleId)) {
    const err = new Error('This report is already being sent. Try again in a moment.');
    err.status = 409;
    throw err;
  }
  running.add(scheduleId);
  try {
    const [rows] = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email AS owner_email, u.role AS owner_role, p.department
       FROM scheduled_reports s LEFT JOIN users u ON u.id = s.user_id LEFT JOIN user_profiles p ON p.user_id = s.user_id
       WHERE s.id = ?`,
      [scheduleId]
    );
    const schedule = rows[0];
    if (!schedule) {
      const err = new Error('Scheduled report not found.');
      err.status = 404;
      throw err;
    }

    const type = REPORT_TYPES[schedule.report_type] || REPORT_TYPES.document_summary;
    const recipients = parseRecipients(schedule);
    const period = getReportPeriod(schedule.frequency);
    let status = 'failed';
    let error = null;
    let rowCount = 0;
    let fileName = null;

    try {
      if (!schedule.owner_email) throw new Error('The owner of this schedule no longer exists.');
      if (!recipients.length) throw new Error('The schedule has no recipients.');
      const { permissions } = await getEffectivePermissions(schedule.user_id, schedule.owner_role);
      if (!permissions.includes('reports.schedule')) throw new Error('The owner no longer has the "Schedule reports" permission.');

      // The report covers what the owner is allowed to see
      const scope = await data.getScope({ id: schedule.user_id, department: schedule.department || null }, permissions);
      const range = data.resolveRange(period.from, period.to);
      const filters = data.parseFilters(parseFiltersJson(schedule.filters));
      const report = await data.buildReport(type.kind, { scope, range, filters });
      rowCount = report.rows.length;
      const slug = String(schedule.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'report';
      fileName = `bexsign-${slug}-${period.from}${period.to !== period.from ? `_to_${period.to}` : ''}.csv`;
      const content = data.toCsv(report.columns, report.rows);

      // One email per recipient: addresses stay private and one bad address does not block the others
      const failures = [];
      for (const to of recipients) {
        const result = await sendReportEmail({
          to,
          reportName: schedule.name,
          periodLabel: period.label,
          rowCount,
          attachments: [{ filename: fileName, content, contentType: 'text/csv' }],
          summary: [['Report', type.label], ['Period', period.label], ...report.summary]
        });
        if (!result?.success) failures.push(`${to}: ${result?.error || 'not delivered'}`);
      }
      if (!failures.length) status = 'success';
      else {
        status = failures.length < recipients.length ? 'partial' : 'failed';
        error = `Email could not be delivered to ${failures.join('; ')}`;
      }
    } catch (err) {
      status = 'failed';
      error = err.message;
    }

    const [insert] = await db.query(
      `INSERT INTO report_runs (scheduled_report_id, report_type, triggered_by, status, row_count, recipients, file_name, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [scheduleId, schedule.report_type, triggeredBy, status, rowCount, JSON.stringify(recipients), fileName, error ? String(error).slice(0, 2000) : null]
    );
    await db.query('UPDATE scheduled_reports SET last_run_at = NOW(), last_status = ? WHERE id = ?', [status, scheduleId]);

    const sentTo = recipients.join(', ');
    await notify({
      userIds: [schedule.user_id],
      category: 'report',
      severity: status === 'success' ? 'success' : 'error',
      title: status === 'success'
        ? `Report "${schedule.name}" sent`
        : `Report "${schedule.name}" ${status === 'partial' ? 'was only partly sent' : 'could not be sent'}`,
      message: status === 'success'
        ? `${rowCount} row${rowCount === 1 ? '' : 's'} for ${period.label} emailed to ${sentTo}.`
        : `${error || 'Unknown error'}`,
      link: '/reports/scheduled',
      entityType: 'scheduled_report',
      entityId: scheduleId
    });

    const [runRows] = await db.query('SELECT * FROM report_runs WHERE id = ?', [insert.insertId]);
    return formatRun(runRows[0]);
  } finally {
    running.delete(scheduleId);
  }
}

function formatRun(r) {
  let recipients = [];
  try {
    recipients = JSON.parse(r.recipients || '[]');
  } catch (e) {
    recipients = [];
  }
  return {
    id: r.id,
    scheduledReportId: r.scheduled_report_id,
    reportType: r.report_type,
    triggeredBy: r.triggered_by,
    status: r.status,
    rowCount: r.row_count,
    recipients,
    fileName: r.file_name,
    error: r.error,
    runAt: r.run_at
  };
}

let timer = null;
let ticking = false;

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    const [due] = await db.query(
      `SELECT id, frequency, day_of_week, day_of_month, time_of_day, next_run_at FROM scheduled_reports
       WHERE is_active = 1 AND next_run_at IS NOT NULL AND next_run_at <= NOW() ORDER BY next_run_at ASC LIMIT 25`
    );
    for (const schedule of due) {
      // Claim the run: only the process that moves next_run_at forward sends the report
      const next = computeNextRun(schedule, new Date());
      const [claim] = await db.query(
        'UPDATE scheduled_reports SET next_run_at = ? WHERE id = ? AND is_active = 1 AND next_run_at = ?',
        [next, schedule.id, schedule.next_run_at]
      );
      if (claim.affectedRows !== 1) continue;
      try {
        await runScheduledReport(schedule.id, { triggeredBy: 'schedule' });
      } catch (err) {
        console.warn(`[Reports] scheduled report ${schedule.id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[Reports] scheduler tick failed:', err.message);
  } finally {
    ticking = false;
  }
}

function startReportScheduler() {
  if (timer) return;
  timer = setInterval(tick, TICK_MS);
  if (timer.unref) timer.unref();
  const first = setTimeout(tick, 5000);
  if (first.unref) first.unref();
  console.log('[Reports] Scheduled report runner started');
}

module.exports = { startReportScheduler, runScheduledReport, computeNextRun, getReportPeriod, formatRun, REPORT_TYPES, parseRecipients };
