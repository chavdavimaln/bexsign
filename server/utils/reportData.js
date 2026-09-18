/**
 * Report data for the Reports module and the scheduled report emails: visibility scope, date ranges, the overview
 * (KPIs, charts, documents), the activity timeline and CSV exports. Status text in `documents` varies in casing, so
 * every query works with a normalized status (completed, in_progress, declined, recalled, expired, draft).
 */
const db = require('../db');

class ReportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In progress',
  declined: 'Declined',
  recalled: 'Recalled',
  expired: 'Expired',
  draft: 'Draft'
};
const STATUS_KEYS = Object.keys(STATUS_LABELS);

const EVENT_TYPES = ['sent', 'viewed', 'signed', 'completed', 'declined', 'reminder', 'recalled', 'assigned', 'other'];

const REPORT_KINDS = {
  documents: 'Document summary',
  timeline: 'Activity timeline',
  recipients: 'Recipient status',
  users: 'User activity'
};

const RAW_STATUS = "LOWER(TRIM(COALESCE(d.status, '')))";
const STATUS_SQL = `(CASE
  WHEN ${RAW_STATUS} IN ('completed', 'complete', 'signed') THEN 'completed'
  WHEN ${RAW_STATUS} IN ('declined', 'rejected') THEN 'declined'
  WHEN ${RAW_STATUS} IN ('recalled', 'cancelled', 'canceled', 'voided') THEN 'recalled'
  WHEN ${RAW_STATUS} = 'expired' THEN 'expired'
  WHEN ${RAW_STATUS} IN ('', 'draft') THEN 'draft'
  ELSE 'in_progress' END)`;
const NOT_TRASHED = `${RAW_STATUS} NOT IN ('trashed', 'trash', 'deleted')`;
const TYPE_SQL = "COALESCE(NULLIF(TRIM(d.document_type), ''), 'Others')";
const OWNER_NAME_SQL = "COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email, 'Unknown user')";
// Documents belong to the period in which they were sent (drafts: created)
const COHORT_DATE = 'COALESCE(d.sent_at, d.created_at)';
const SIGNING_ROLE = "(r.role IS NULL OR r.role IN ('signer', 'approver'))";

// Event type of an activity_history entry, derived from its text (most specific phrases first)
const DESC = 'LOWER(a.activity_description)';
const EVENT_SQL = `(CASE
  WHEN ${DESC} LIKE '%declined to sign%' OR ${DESC} LIKE '%declined the document%' THEN 'declined'
  WHEN ${DESC} LIKE '%assigned the signing%' OR ${DESC} LIKE '%delegated%' OR ${DESC} LIKE '%reassigned%' THEN 'assigned'
  WHEN ${DESC} LIKE 'document recalled%' OR ${DESC} LIKE '%recalled the document%' THEN 'recalled'
  WHEN ${DESC} LIKE '%reminder%' THEN 'reminder'
  WHEN ${DESC} LIKE 'all recipients completed%' OR ${DESC} LIKE '%marked completed%' OR ${DESC} LIKE 'completed documents%' THEN 'completed'
  WHEN ${DESC} LIKE '%signed the document%' OR ${DESC} LIKE '%approved the document%' OR ${DESC} LIKE '%uploaded a physically signed%' THEN 'signed'
  WHEN ${DESC} LIKE '%viewed the document%' OR ${DESC} LIKE '%opened the document%' THEN 'viewed'
  WHEN ${DESC} LIKE '%sent for signature%' OR ${DESC} LIKE 'signature request emailed%' THEN 'sent'
  ELSE 'other' END)`;

/* ---------- Dates ---------- */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function parseYmd(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

/** { from, to, days, start, end } for "YYYY-MM-DD" bounds (both inclusive). Default: the last 30 days. */
function resolveRange(fromValue, toValue, defaultDays = 30) {
  const to = toValue ? parseYmd(toValue) : startOfDay(new Date());
  if (!to) throw new ReportError('The end date must be a valid date (YYYY-MM-DD).');
  const from = fromValue ? parseYmd(fromValue) : addDays(to, -(defaultDays - 1));
  if (!from) throw new ReportError('The start date must be a valid date (YYYY-MM-DD).');
  if (from > to) throw new ReportError('The start date must be on or before the end date.');
  const days = Math.round((to - from) / 86400000) + 1;
  if (days > 1096) throw new ReportError('Choose a date range of at most 3 years.');
  // SQL bounds: start inclusive, end exclusive (the day after "to")
  return { from: ymd(from), to: ymd(to), days, start: `${ymd(from)} 00:00:00`, end: `${ymd(addDays(to, 1))} 00:00:00` };
}

function formatDateTime(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '';
  const s = Math.max(0, Number(seconds));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86400).toFixed(1)} days`;
}

/* ---------- Visibility and filters ---------- */

/**
 * Which documents a user may report on: documents.view_all → everything, documents.view_team → documents owned by
 * users of the same department, otherwise the user's own documents.
 */
async function getScope(user, permissions = []) {
  if (permissions.includes('documents.view_all')) return { kind: 'all', sql: '1 = 1', params: [] };
  if (permissions.includes('documents.view_team')) {
    let department = user.department;
    if (department === undefined) {
      const [rows] = await db.query('SELECT department FROM user_profiles WHERE user_id = ?', [user.id]);
      department = rows[0]?.department || null;
    }
    if (department) {
      return {
        kind: 'team',
        department,
        sql: '(d.user_id = ? OR d.user_id IN (SELECT tp.user_id FROM user_profiles tp WHERE tp.department = ?))',
        params: [user.id, department]
      };
    }
  }
  return { kind: 'own', sql: 'd.user_id = ?', params: [user.id] };
}

const likeValue = (value) => `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;

/** Validated document filters from a query string or a saved schedule: { owner, status, type, search } */
function parseFilters(source = {}) {
  const filters = {};
  const owner = source.owner ?? source.ownerId;
  if (owner !== undefined && owner !== null && owner !== '' && owner !== 'all') {
    const id = Number(owner);
    if (!Number.isInteger(id) || id < 1) throw new ReportError('Owner must be a user id.');
    filters.owner = id;
  }
  const status = String(source.status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (status && status !== 'all') {
    if (!STATUS_KEYS.includes(status)) throw new ReportError(`Status must be one of: ${STATUS_KEYS.join(', ')}.`);
    filters.status = status;
  }
  const type = String(source.type ?? '').trim();
  if (type && type !== 'all') filters.type = type.slice(0, 50);
  const search = String(source.search ?? '').trim();
  if (search) filters.search = search.slice(0, 100);
  return filters;
}

function filterSql(filters, { withSearch = true } = {}) {
  const parts = [];
  const params = [];
  if (filters.owner) { parts.push('d.user_id = ?'); params.push(filters.owner); }
  if (filters.status) { parts.push(`${STATUS_SQL} = ?`); params.push(filters.status); }
  if (filters.type) { parts.push(`${TYPE_SQL} = ?`); params.push(filters.type); }
  if (withSearch && filters.search) {
    const like = likeValue(filters.search);
    parts.push(`(d.document_name LIKE ? OR u.email LIKE ? OR ${OWNER_NAME_SQL} LIKE ?)`);
    params.push(like, like, like);
  }
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', params };
}

/** Non-trashed documents of the period (by sent date, drafts by created date), visible to the scope. */
function cohortSql(scope, range, filters, { withSearch = false } = {}) {
  const f = filterSql(filters, { withSearch });
  return {
    sql: `SELECT d.id, d.user_id, d.document_name, d.created_at, d.sent_at, d.completed_at, d.updated_at,
             ${STATUS_SQL} AS st, ${TYPE_SQL} AS doc_type, ${OWNER_NAME_SQL} AS owner_name, u.email AS owner_email
          FROM documents d LEFT JOIN users u ON u.id = d.user_id
          WHERE ${scope.sql} AND ${NOT_TRASHED} AND ${COHORT_DATE} >= ? AND ${COHORT_DATE} < ?${f.sql}`,
    params: [...scope.params, range.start, range.end, ...f.params]
  };
}

/* ---------- Overview ---------- */

const DOC_SORTS = {
  name: 'x.document_name',
  owner: 'x.owner_name',
  type: 'x.doc_type',
  sent_on: 'COALESCE(x.sent_at, x.created_at)',
  completed_on: 'x.completed_at',
  status: 'x.st',
  recipients: 'recipients'
};

function parseSort(value, fallback = '-sent_on') {
  const raw = String(value || fallback).trim();
  const desc = raw.startsWith('-');
  const key = raw.replace(/^[-+]/, '');
  if (!DOC_SORTS[key]) throw new ReportError(`Sort must be one of: ${Object.keys(DOC_SORTS).join(', ')} (prefix "-" for descending).`);
  return { key, desc, sql: `${DOC_SORTS[key]} ${desc ? 'DESC' : 'ASC'}, x.id DESC` };
}

const toNumber = (v) => (v === null || v === undefined ? 0 : Number(v));

async function getOverview({ scope, range, filters, page = 1, pageSize = 10, sort = parseSort() }) {
  const cohort = cohortSql(scope, range, filters);
  const withSearch = cohortSql(scope, range, filters, { withSearch: true });
  const events = filterSql(filters, { withSearch: false });
  const eventWhere = `${scope.sql} AND ${NOT_TRASHED}${events.sql}`;
  const eventParams = [...scope.params, ...events.params];
  const declinedAt = 'COALESCE((SELECT MAX(r.declined_at) FROM document_recipients r WHERE r.document_id = d.id), d.updated_at)';

  const [
    [[kpis]],
    [[recipients]],
    [statusRows],
    [senderRows],
    [typeRows],
    [sentDays],
    [completedDays],
    [declinedDays],
    [[{ total }]],
    [docRows],
    [ownerRows],
    [typeOptionRows]
  ] = await Promise.all([
    db.query(
      `SELECT COUNT(*) AS total, SUM(x.st <> 'draft') AS sent, SUM(x.st = 'completed') AS completed,
              SUM(x.st = 'in_progress') AS in_progress, SUM(x.st = 'declined') AS declined, SUM(x.st = 'recalled') AS recalled,
              SUM(x.st = 'expired') AS expired, SUM(x.st = 'draft') AS drafts,
              AVG(CASE WHEN x.st = 'completed' AND x.sent_at IS NOT NULL AND x.completed_at >= x.sent_at
                  THEN TIMESTAMPDIFF(SECOND, x.sent_at, x.completed_at) END) AS avg_seconds
       FROM (${cohort.sql}) x`,
      cohort.params
    ),
    db.query(
      `SELECT COUNT(*) AS recipients,
              SUM(${SIGNING_ROLE} AND x.st <> 'draft' AND (r.sent_at IS NOT NULL OR r.status IN ('sent', 'viewed', 'signed', 'declined'))) AS funnel_sent,
              SUM(${SIGNING_ROLE} AND x.st <> 'draft' AND (r.viewed_at IS NOT NULL OR r.status IN ('viewed', 'signed', 'declined'))) AS funnel_viewed,
              SUM(${SIGNING_ROLE} AND x.st <> 'draft' AND r.status = 'signed') AS funnel_signed,
              SUM(${SIGNING_ROLE} AND x.st <> 'draft' AND r.status = 'declined') AS funnel_declined,
              SUM(${SIGNING_ROLE} AND x.st = 'in_progress' AND r.status NOT IN ('signed', 'declined')) AS pending
       FROM (${cohort.sql}) x JOIN document_recipients r ON r.document_id = x.id`,
      cohort.params
    ),
    db.query(`SELECT x.st AS status, COUNT(*) AS count FROM (${cohort.sql}) x GROUP BY x.st`, cohort.params),
    db.query(
      `SELECT x.user_id, MAX(x.owner_name) AS name, MAX(x.owner_email) AS email, SUM(x.st <> 'draft') AS sent,
              SUM(x.st = 'completed') AS completed, SUM(x.st = 'in_progress') AS in_progress, SUM(x.st = 'declined') AS declined
       FROM (${cohort.sql}) x GROUP BY x.user_id HAVING sent > 0 ORDER BY sent DESC, completed DESC LIMIT 5`,
      cohort.params
    ),
    db.query(
      `SELECT x.doc_type AS type, COUNT(*) AS total, SUM(x.st = 'completed') AS completed
       FROM (${cohort.sql}) x GROUP BY x.doc_type ORDER BY total DESC`,
      cohort.params
    ),
    db.query(
      `SELECT DATE_FORMAT(d.sent_at, '%Y-%m-%d') AS day, COUNT(*) AS n FROM documents d LEFT JOIN users u ON u.id = d.user_id
       WHERE ${eventWhere} AND d.sent_at >= ? AND d.sent_at < ? GROUP BY day`,
      [...eventParams, range.start, range.end]
    ),
    db.query(
      `SELECT DATE_FORMAT(d.completed_at, '%Y-%m-%d') AS day, COUNT(*) AS n FROM documents d LEFT JOIN users u ON u.id = d.user_id
       WHERE ${eventWhere} AND ${STATUS_SQL} = 'completed' AND d.completed_at >= ? AND d.completed_at < ? GROUP BY day`,
      [...eventParams, range.start, range.end]
    ),
    db.query(
      `SELECT DATE_FORMAT(${declinedAt}, '%Y-%m-%d') AS day, COUNT(*) AS n FROM documents d LEFT JOIN users u ON u.id = d.user_id
       WHERE ${eventWhere} AND ${STATUS_SQL} = 'declined' AND ${declinedAt} >= ? AND ${declinedAt} < ? GROUP BY day`,
      [...eventParams, range.start, range.end]
    ),
    db.query(`SELECT COUNT(*) AS total FROM (${withSearch.sql}) x`, withSearch.params),
    db.query(
      `SELECT x.*,
              (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id) AS recipients,
              (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id AND ${SIGNING_ROLE}) AS signers,
              (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id AND r.status = 'signed') AS signed
       FROM (${withSearch.sql}) x ORDER BY ${sort.sql} LIMIT ? OFFSET ?`,
      [...withSearch.params, pageSize, (page - 1) * pageSize]
    ),
    db.query(
      `SELECT DISTINCT d.user_id AS id, ${OWNER_NAME_SQL} AS name, u.email FROM documents d LEFT JOIN users u ON u.id = d.user_id
       WHERE ${scope.sql} AND ${NOT_TRASHED} ORDER BY name`,
      scope.params
    ),
    db.query(`SELECT DISTINCT ${TYPE_SQL} AS type FROM documents d WHERE ${scope.sql} AND ${NOT_TRASHED} ORDER BY type`, scope.params)
  ]);

  // One entry per day of the range, zero-filled
  const byDay = (rows) => Object.fromEntries(rows.map((r) => [r.day, Number(r.n)]));
  const sentMap = byDay(sentDays);
  const completedMap = byDay(completedDays);
  const declinedMap = byDay(declinedDays);
  const series = [];
  for (let d = parseYmd(range.from), last = parseYmd(range.to); d <= last; d = addDays(d, 1)) {
    const key = ymd(d);
    series.push({ date: key, sent: sentMap[key] || 0, completed: completedMap[key] || 0, declined: declinedMap[key] || 0 });
  }

  const sent = toNumber(kpis.sent);
  const completed = toNumber(kpis.completed);
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));

  return {
    kpis: {
      total: toNumber(kpis.total),
      sent,
      completed,
      inProgress: toNumber(kpis.in_progress),
      declined: toNumber(kpis.declined),
      recalled: toNumber(kpis.recalled),
      expired: toNumber(kpis.expired),
      recalledOrExpired: toNumber(kpis.recalled) + toNumber(kpis.expired),
      drafts: toNumber(kpis.drafts),
      completionRate: sent ? Math.round((completed / sent) * 1000) / 10 : null,
      avgCompletionSeconds: kpis.avg_seconds === null ? null : Math.round(Number(kpis.avg_seconds)),
      pendingSignatures: toNumber(recipients.pending),
      recipients: toNumber(recipients.recipients)
    },
    series,
    statusBreakdown: STATUS_KEYS.map((key) => ({ status: key, label: STATUS_LABELS[key], count: statusCounts[key] || 0 })),
    topSenders: senderRows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      sent: toNumber(r.sent),
      completed: toNumber(r.completed),
      inProgress: toNumber(r.in_progress),
      declined: toNumber(r.declined)
    })),
    documentTypes: typeRows.map((r) => ({ type: r.type, total: toNumber(r.total), completed: toNumber(r.completed) })),
    funnel: {
      sent: toNumber(recipients.funnel_sent),
      viewed: toNumber(recipients.funnel_viewed),
      signed: toNumber(recipients.funnel_signed),
      declined: toNumber(recipients.funnel_declined)
    },
    documents: docRows.map((r) => ({
      id: r.id,
      name: r.document_name,
      owner: { id: r.user_id, name: r.owner_name, email: r.owner_email },
      type: r.doc_type,
      status: r.st,
      statusLabel: STATUS_LABELS[r.st],
      createdAt: r.created_at,
      sentOn: r.sent_at,
      completedAt: r.completed_at,
      recipients: toNumber(r.recipients),
      signers: toNumber(r.signers),
      signed: toNumber(r.signed)
    })),
    pagination: { page, pageSize, total: toNumber(total) },
    filterOptions: {
      owners: ownerRows.map((r) => ({ id: r.id, name: r.name, email: r.email })),
      types: typeOptionRows.map((r) => r.type),
      statuses: STATUS_KEYS.map((key) => ({ value: key, label: STATUS_LABELS[key] }))
    }
  };
}

/* ---------- Timeline ---------- */

function timelineSql(scope, range, { type, search } = {}) {
  const parts = [];
  const params = [...scope.params, range.start, range.end];
  if (search) {
    const like = likeValue(search);
    parts.push('(d.document_name LIKE ? OR a.activity_description LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like);
  }
  const typeParams = [];
  let typeSql = '';
  if (type) {
    typeSql = ` AND ${EVENT_SQL} = ?`;
    typeParams.push(type);
  }
  const where = `${scope.sql} AND ${NOT_TRASHED} AND a.created_at >= ? AND a.created_at < ?${parts.length ? ` AND ${parts.join(' AND ')}` : ''}`;
  return {
    from: 'FROM activity_history a JOIN documents d ON d.id = a.document_id LEFT JOIN users u ON u.id = d.user_id',
    where,
    params,
    typeSql,
    typeParams
  };
}

function parseEventType(value) {
  const type = String(value || '').trim().toLowerCase();
  if (!type || type === 'all') return null;
  if (!EVENT_TYPES.includes(type)) throw new ReportError(`Event type must be one of: ${EVENT_TYPES.join(', ')}.`);
  return type;
}

const actorOf = (text) => /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(String(text || ''))?.[0] || null;

function mapEvent(r) {
  return {
    id: r.id,
    type: r.event_type,
    description: r.activity_description,
    actor: actorOf(r.activity_description),
    ip: r.ip_address,
    createdAt: r.created_at,
    document: { id: r.document_id, name: r.document_name, status: r.st, statusLabel: STATUS_LABELS[r.st] },
    owner: { id: r.user_id, name: r.owner_name, email: r.owner_email }
  };
}

const EVENT_COLUMNS = `a.id, a.document_id, a.activity_description, a.ip_address, a.created_at, d.document_name, d.user_id,
  ${STATUS_SQL} AS st, ${OWNER_NAME_SQL} AS owner_name, u.email AS owner_email, ${EVENT_SQL} AS event_type`;

async function getTimeline({ scope, range, type = null, search = '', page = 1, pageSize = 25 }) {
  const t = timelineSql(scope, range, { type, search });
  const [[[{ total }]], [rows], [countRows]] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total ${t.from} WHERE ${t.where}${t.typeSql}`, [...t.params, ...t.typeParams]),
    db.query(
      `SELECT ${EVENT_COLUMNS} ${t.from} WHERE ${t.where}${t.typeSql} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
      [...t.params, ...t.typeParams, pageSize, (page - 1) * pageSize]
    ),
    // Counts per type ignore the type filter so the filter chips always show every type
    db.query(`SELECT ${EVENT_SQL} AS event_type, COUNT(*) AS n ${t.from} WHERE ${t.where} GROUP BY event_type`, t.params)
  ]);
  const counts = Object.fromEntries(EVENT_TYPES.map((k) => [k, 0]));
  countRows.forEach((r) => { counts[r.event_type] = Number(r.n); });
  counts.all = Object.values(counts).reduce((a, b) => a + b, 0);
  return { events: rows.map(mapEvent), counts, pagination: { page, pageSize, total: toNumber(total) } };
}

/* ---------- CSV reports ---------- */

const MAX_EXPORT_ROWS = 50000;

function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = value instanceof Date ? formatDateTime(value) : String(value);
  // Spreadsheet formula injection guard
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s) || /^\s|\s$/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(columns, rows) {
  return `﻿${[columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

async function documentsReport({ scope, range, filters }) {
  const c = cohortSql(scope, range, filters, { withSearch: true });
  const [rows] = await db.query(
    `SELECT x.*, (SELECT MAX(di.bexsign_doc_id) FROM document_identifiers di WHERE di.document_id = x.id) AS bexsign_doc_id,
            (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id) AS recipients,
            (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id AND r.status = 'signed') AS signed,
            (SELECT COUNT(*) FROM document_recipients r WHERE r.document_id = x.id AND r.status = 'declined') AS declined
     FROM (${c.sql}) x
     ORDER BY COALESCE(x.sent_at, x.created_at) DESC, x.id DESC LIMIT ${MAX_EXPORT_ROWS}`,
    c.params
  );
  const count = (st) => rows.filter((r) => r.st === st).length;
  return {
    columns: ['Document ID', 'Document name', 'Owner', 'Owner email', 'Document type', 'Status', 'Created on', 'Sent on',
      'Completed on', 'Recipients', 'Signed', 'Declined', 'Time to complete'],
    rows: rows.map((r) => [
      r.bexsign_doc_id || `#${r.id}`,
      r.document_name,
      r.owner_name,
      r.owner_email,
      r.doc_type,
      STATUS_LABELS[r.st],
      r.created_at,
      r.sent_at,
      r.completed_at,
      toNumber(r.recipients),
      toNumber(r.signed),
      toNumber(r.declined),
      r.st === 'completed' && r.sent_at && r.completed_at ? formatDuration((new Date(r.completed_at) - new Date(r.sent_at)) / 1000) : ''
    ]),
    summary: [
      ['Documents', rows.length],
      ['Completed', count('completed')],
      ['In progress', count('in_progress')],
      ['Declined', count('declined')],
      ['Drafts', count('draft')]
    ]
  };
}

async function timelineReport({ scope, range, filters, type = null }) {
  const t = timelineSql(scope, range, { type, search: filters.search });
  const [rows] = await db.query(
    `SELECT ${EVENT_COLUMNS} ${t.from} WHERE ${t.where}${t.typeSql} ORDER BY a.created_at DESC, a.id DESC LIMIT ${MAX_EXPORT_ROWS}`,
    [...t.params, ...t.typeParams]
  );
  const byType = {};
  rows.forEach((r) => { byType[r.event_type] = (byType[r.event_type] || 0) + 1; });
  return {
    columns: ['Date', 'Event', 'Document', 'Document status', 'Owner', 'Owner email', 'Performed by', 'Details', 'IP address'],
    rows: rows.map((r) => [
      r.created_at,
      r.event_type,
      r.document_name,
      STATUS_LABELS[r.st],
      r.owner_name,
      r.owner_email,
      actorOf(r.activity_description) || 'System',
      r.activity_description,
      r.ip_address
    ]),
    summary: [
      ['Events', rows.length],
      ['Sent', byType.sent || 0],
      ['Viewed', byType.viewed || 0],
      ['Signed', byType.signed || 0],
      ['Completed', byType.completed || 0]
    ]
  };
}

async function recipientsReport({ scope, range, filters }) {
  const c = cohortSql(scope, range, filters, { withSearch: true });
  const [rows] = await db.query(
    `SELECT x.document_name, x.st, x.owner_name, x.owner_email, r.name, r.email, r.role, r.role_label, r.status,
            r.signing_order_index, r.sent_at, r.viewed_at, r.signed_at, r.declined_at, r.decline_reason
     FROM (${c.sql}) x JOIN document_recipients r ON r.document_id = x.id
     ORDER BY COALESCE(x.sent_at, x.created_at) DESC, x.id DESC, r.signing_order_index ASC, r.id ASC LIMIT ${MAX_EXPORT_ROWS}`,
    c.params
  );
  const count = (status) => rows.filter((r) => r.status === status).length;
  return {
    columns: ['Document', 'Document status', 'Owner', 'Owner email', 'Recipient', 'Recipient email', 'Role', 'Step',
      'Recipient status', 'Sent at', 'Viewed at', 'Signed at', 'Declined at', 'Decline reason'],
    rows: rows.map((r) => [
      r.document_name,
      STATUS_LABELS[r.st],
      r.owner_name,
      r.owner_email,
      r.name,
      r.email,
      r.role_label || r.role || 'signer',
      toNumber(r.signing_order_index),
      r.status,
      r.sent_at,
      r.viewed_at,
      r.signed_at,
      r.declined_at,
      r.decline_reason
    ]),
    summary: [
      ['Recipients', rows.length],
      ['Signed', count('signed')],
      ['Viewed (not signed)', count('viewed')],
      ['Waiting', count('pending') + count('sent')],
      ['Declined', count('declined')]
    ]
  };
}

async function usersReport({ scope, range, filters }) {
  const c = cohortSql(scope, range, filters, { withSearch: true });
  const [rows] = await db.query(
    `SELECT x.user_id, MAX(x.owner_name) AS name, MAX(x.owner_email) AS email, MAX(p.department) AS department,
            COUNT(*) AS total, SUM(x.st <> 'draft') AS sent, SUM(x.st = 'completed') AS completed,
            SUM(x.st = 'in_progress') AS in_progress, SUM(x.st = 'declined') AS declined,
            SUM(x.st IN ('recalled', 'expired')) AS closed, SUM(x.st = 'draft') AS drafts,
            AVG(CASE WHEN x.st = 'completed' AND x.sent_at IS NOT NULL AND x.completed_at >= x.sent_at
                THEN TIMESTAMPDIFF(SECOND, x.sent_at, x.completed_at) END) AS avg_seconds
     FROM (${c.sql}) x LEFT JOIN user_profiles p ON p.user_id = x.user_id
     GROUP BY x.user_id ORDER BY sent DESC, total DESC`,
    c.params
  );
  const sum = (key) => rows.reduce((a, r) => a + toNumber(r[key]), 0);
  return {
    columns: ['User', 'Email', 'Department', 'Documents', 'Sent', 'Completed', 'In progress', 'Declined', 'Recalled or expired',
      'Drafts', 'Completion rate', 'Average time to complete'],
    rows: rows.map((r) => [
      r.name,
      r.email,
      r.department || '',
      toNumber(r.total),
      toNumber(r.sent),
      toNumber(r.completed),
      toNumber(r.in_progress),
      toNumber(r.declined),
      toNumber(r.closed),
      toNumber(r.drafts),
      toNumber(r.sent) ? `${Math.round((toNumber(r.completed) / toNumber(r.sent)) * 100)}%` : '',
      r.avg_seconds === null ? '' : formatDuration(r.avg_seconds)
    ]),
    summary: [
      ['Users', rows.length],
      ['Documents sent', sum('sent')],
      ['Completed', sum('completed')],
      ['In progress', sum('in_progress')]
    ]
  };
}

const REPORT_BUILDERS = { documents: documentsReport, timeline: timelineReport, recipients: recipientsReport, users: usersReport };

/** { columns, rows, summary } of a CSV report kind (documents | timeline | recipients | users). */
async function buildReport(kind, options) {
  const builder = REPORT_BUILDERS[kind];
  if (!builder) throw new ReportError(`Report kind must be one of: ${Object.keys(REPORT_BUILDERS).join(', ')}.`);
  return builder(options);
}

module.exports = {
  ReportError,
  STATUS_LABELS,
  STATUS_KEYS,
  EVENT_TYPES,
  REPORT_KINDS,
  ymd,
  parseYmd,
  addDays,
  startOfDay,
  resolveRange,
  formatDateTime,
  getScope,
  parseFilters,
  parseSort,
  parseEventType,
  getOverview,
  getTimeline,
  buildReport,
  toCsv
};
