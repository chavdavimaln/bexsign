# 10 — Reports

Page: `client/src/pages/Reports.jsx` (`/reports`, needs `reports.view`). Server: `server/routes/reports.js`,
`server/utils/reportData.js`, `server/utils/reportScheduler.js`.

---

## 1. Tabs

**All Reports** — the overview: sent, completed, in progress, declined, recalled/expired, drafts, completion rate and
average time to complete, with charts and a document table.
Filters: period (7 / 30 / 90 days, this month, custom range), status, owner and document type.

**Timeline** — every event in the period (sent, viewed, signed, declined, reminded, recalled, reassigned), grouped by
day, with the recipient and IP address.

**Scheduled Reports** — recurring reports emailed to a list of addresses.

---

## 2. Exports

`GET /api/reports/export?kind=documents|timeline|recipients|users` returns a CSV with the current filters applied
(needs `reports.export`). Exports are capped at 10,000 rows.

---

## 3. Scheduled reports

A schedule holds: name, report type, format, recipients, filters, frequency (daily, weekly with a day, monthly with a
date), time of day, and whether it is active. The scheduler polls every 60 seconds, claims anything due by
`next_run_at`, builds the report, emails it, and records the outcome in `report_runs` (`status`, `row_count`,
`file_name`, `error`). "Run now" is available for testing. Managing schedules needs `reports.schedule`.

---

## 4. What the numbers mean

| Metric | Definition |
|---|---|
| Sent | requests that left Draft in the period |
| Completed | every signer signed |
| In progress | sent, still waiting on at least one signer |
| Completion rate | completed ÷ sent in the period |
| Average time to complete | from `sent_at` to `completed_at` |

Scope follows the document permissions: `documents.view_all` reports on the organisation, `view_team` on the
department, otherwise on the user's own requests.

---

## 5. Endpoints

| Endpoint | Permission |
|---|---|
| `GET /api/reports/overview` | `reports.view` |
| `GET /api/reports/timeline` | `reports.view` |
| `GET /api/reports/export` | `reports.export` |
| `GET` / `POST` / `PUT` / `DELETE /api/reports/scheduled` | `reports.schedule` |
| `POST /api/reports/scheduled/:id/run` | `reports.schedule` |
| `GET /api/reports/runs` | `reports.schedule` |
