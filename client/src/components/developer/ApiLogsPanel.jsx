import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, AlertTriangle, Timer, Gauge, RefreshCw, ScrollText, X } from 'lucide-react';
import {
  Card, StatCard, Badge, Button, EmptyState, ErrorBanner, LoadingBlock, SearchInput, SelectInput, Pagination,
  thClass, tdClass, formatDateTime
} from '../ui/kit';
import { apiFetch } from '../../utils/api';

/** API request logs: 24-hour figures, requests per day and a filterable, paginated log table. */

const OK_COLOR = '#10b981';
const ERROR_COLOR = '#e11d48';
const METHOD_TONE = { GET: 'sky', POST: 'emerald', PUT: 'amber', PATCH: 'amber', DELETE: 'rose' };
const statusTone = (code) => (code >= 500 ? 'rose' : code >= 400 ? 'amber' : code >= 200 && code < 300 ? 'emerald' : 'slate');
const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Bar with 4px rounded top corners and a square base on the baseline
function topRoundedBar(x, y, w, h, r = 4) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function niceMax(value) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= value) * pow;
  return step * 4;
}

/** Requests per day, stacked: successful (bottom) and errors (top), with hover/focus tooltips. */
function RequestsChart({ data }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setWidth(Math.max(260, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = 190;
  const pad = { top: 12, right: 8, bottom: 26, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.requests), 0));
  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(28, band * 0.6));
  const y = (v) => pad.top + plotH - (v / max) * plotH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 52))));
  const total = data.reduce((a, d) => a + d.requests, 0);

  return (
    <div ref={wrapRef} className="relative overflow-hidden">
      <svg width={width} height={height} role="img" aria-label={`Requests per day over the last ${data.length} days: ${total} in total.`} className="block">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.left} x2={width - pad.right} y1={y(max * f)} y2={y(max * f)} stroke="#e2e8f0" strokeDasharray={f === 0 ? undefined : '3 3'} />
            <text x={pad.left - 6} y={y(max * f) + 3} textAnchor="end" className="fill-slate-400" fontSize="10">{Math.round(max * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const x = cx - barW / 2;
          const ok = d.requests - d.errors;
          const okH = (ok / max) * plotH;
          const errH = (d.errors / max) * plotH;
          const gap = ok > 0 && d.errors > 0 ? 2 : 0;
          const active = hover === i;
          return (
            <g
              key={d.date}
              tabIndex={0}
              role="button"
              aria-label={`${shortDay(d.date)}: ${d.requests} requests, ${d.errors} errors`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none cursor-default"
            >
              <rect x={pad.left + band * i} y={pad.top} width={band} height={plotH} fill={active ? '#f1f5f9' : 'transparent'} />
              {ok > 0 && (d.errors > 0
                ? <rect x={x} y={y(ok)} width={barW} height={okH} fill={OK_COLOR} />
                : <path d={topRoundedBar(x, y(ok), barW, okH)} fill={OK_COLOR} />)}
              {d.errors > 0 && <path d={topRoundedBar(x, y(d.requests), barW, Math.max(1, errH - gap))} fill={ERROR_COLOR} />}
              {i % labelEvery === (data.length - 1) % labelEvery && (
                <text x={cx} y={height - 8} textAnchor="middle" fontSize="10" className="fill-slate-500">{shortDay(d.date)}</text>
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} stroke="#94a3b8" />
        {total === 0 && <text x={pad.left + plotW / 2} y={pad.top + plotH / 2} textAnchor="middle" fontSize="12" className="fill-slate-400">No API requests in this period</text>}
      </svg>
      {hover !== null && data[hover] && (
        <div
          role="tooltip"
          className="absolute z-10 pointer-events-none bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg whitespace-nowrap"
          style={{
            left: Math.min(Math.max(pad.left + band * hover + band / 2, 70), width - 70),
            top: Math.max(0, y(data[hover].requests) - 58),
            transform: 'translateX(-50%)'
          }}
        >
          <p className="font-bold">{shortDay(data[hover].date)}</p>
          <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: OK_COLOR }} /> {data[hover].requests - data[hover].errors} successful</p>
          <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: ERROR_COLOR }} /> {data[hover].errors} errors</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Requests per day</caption>
        <thead><tr><th>Day</th><th>Requests</th><th>Errors</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.requests}</td><td>{d.errors}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

const EMPTY_FILTERS = { status: 'all', method: 'all', keyId: 'all', from: '', to: '', search: '' };

export default function ApiLogsPanel() {
  const [summary, setSummary] = useState(null);
  const [keys, setKeys] = useState([]);
  const [canManageAll, setCanManageAll] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [logs, setLogs] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setSummaryError('');
    try {
      const data = await apiFetch('/developer/logs/summary?days=14');
      setSummary(data.summary);
      setKeys(data.keys || []);
      setCanManageAll(Boolean(data.canManageAll));
    } catch (err) {
      setSummaryError(err.message);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== 'all') params.set(k, v);
    });
    try {
      const data = await apiFetch(`/developer/logs?${params.toString()}`);
      setLogs({ rows: data.logs || [], total: data.total || 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Endpoint search is applied after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === search.trim() ? f : { ...f, search: search.trim() }));
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const filtered = Object.entries(filters).some(([k, v]) => v !== EMPTY_FILTERS[k]);
  const refresh = () => {
    loadSummary();
    loadLogs();
  };

  const keyOptions = useMemo(() => [
    ['all', 'All keys'],
    ...keys.map((k) => [String(k.id), `${k.name} (${k.prefix}…)${k.revoked ? ' · revoked' : ''}`]),
    ...(canManageAll ? [['none', 'No or invalid key']] : [])
  ], [keys, canManageAll]);

  return (
    <div className="space-y-4">
      {summaryError && <ErrorBanner message={summaryError} onRetry={loadSummary} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Requests (24 h)" value={summary ? summary.requests24h.toLocaleString() : '–'} icon={Activity} tone="emerald" hint={summary ? `${summary.totalRequests.toLocaleString()} in the last ${summary.retentionDays} days` : ''} />
        <StatCard label="Error rate (24 h)" value={summary ? `${summary.errorRate24h}%` : '–'} icon={AlertTriangle} tone={summary?.errorRate24h > 10 ? 'rose' : 'amber'} hint={summary ? `${summary.errors24h} responses with 4xx/5xx` : ''} />
        <StatCard label="Avg latency (24 h)" value={summary ? (summary.avgLatencyMs24h === null ? '–' : `${summary.avgLatencyMs24h} ms`) : '–'} icon={Timer} tone="sky" />
        <StatCard label="Rate limited (24 h)" value={summary ? summary.rateLimited24h.toLocaleString() : '–'} icon={Gauge} tone="violet" hint="HTTP 429 responses" />
      </div>

      <Card
        title="Requests per day"
        description="Last 14 days. Hover or focus a day for details."
        actions={(
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: OK_COLOR }} /> Successful</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ERROR_COLOR }} /> Errors</span>
          </div>
        )}
      >
        {summary ? (
          <RequestsChart data={summary.perDay} />
        ) : !summaryError && <LoadingBlock label="Loading usage..." />}
      </Card>

      <Card
        title="Request log"
        description={canManageAll ? 'Every request to /api/v1, including rejected ones.' : 'Requests made with your API keys.'}
        actions={<Button variant="secondary" icon={RefreshCw} onClick={refresh}>Refresh</Button>}
        bodyClassName=""
      >
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search endpoint..." className="col-span-2 md:col-span-3 xl:col-span-2" />
          <SelectInput value={filters.status} onChange={(v) => setFilter('status', v)} label="Status" options={[['all', 'All statuses'], ['2xx', '2xx success'], ['4xx', '4xx client errors'], ['5xx', '5xx server errors'], ['errors', 'All errors']]} />
          <SelectInput value={filters.method} onChange={(v) => setFilter('method', v)} label="Method" options={[['all', 'All methods'], ['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE']]} />
          <SelectInput value={filters.keyId} onChange={(v) => setFilter('keyId', v)} label="API key" options={keyOptions} className="col-span-2 md:col-span-1 xl:col-span-2 min-w-0" />
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 col-span-1">
            From
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className="min-w-0 flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700" />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 col-span-1">
            To
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className="min-w-0 flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-700" />
          </label>
          {filtered && (
            <Button variant="ghost" icon={X} onClick={() => { setFilters(EMPTY_FILTERS); setSearch(''); setPage(1); }} className="justify-self-start">Clear filters</Button>
          )}
        </div>

        {error && <div className="p-4"><ErrorBanner message={error} onRetry={loadLogs} /></div>}
        {loading && !logs.rows.length ? <LoadingBlock label="Loading requests..." /> : !error && (
          logs.rows.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title={filtered ? 'No requests match your filters' : 'No API requests yet'}
              description={filtered ? 'Try a wider date range or another status.' : 'Requests made with your API keys appear here, including rejected ones.'}
            />
          ) : (
            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={thClass}>Time</th>
                    <th className={thClass}>Request</th>
                    <th className={thClass}>Status</th>
                    <th className={`${thClass} hidden sm:table-cell text-right`}>Duration</th>
                    <th className={`${thClass} hidden md:table-cell`}>API key</th>
                    <th className={`${thClass} hidden lg:table-cell`}>IP address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.rows.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70">
                      <td className={`${tdClass} whitespace-nowrap text-slate-500`}>{formatDateTime(l.createdAt)}</td>
                      <td className={tdClass}>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Badge tone={METHOD_TONE[l.method] || 'slate'}>{l.method}</Badge>
                          <span className="font-mono text-[11px] text-slate-800 break-all">{l.endpoint}</span>
                        </span>
                      </td>
                      <td className={tdClass}><Badge tone={statusTone(l.statusCode)}>{l.statusCode}</Badge></td>
                      <td className={`${tdClass} hidden sm:table-cell text-right tabular-nums whitespace-nowrap`}>{l.durationMs ?? '-'} ms</td>
                      <td className={`${tdClass} hidden md:table-cell`}>
                        {l.key ? (
                          <>
                            <p className={`font-semibold ${l.key.deleted ? 'text-slate-400 italic' : 'text-slate-800'}`}>{l.key.name}</p>
                            {l.key.prefix && <p className="font-mono text-[10px] text-slate-500">{l.key.prefix}…</p>}
                          </>
                        ) : <span className="text-slate-400">No valid key</span>}
                      </td>
                      <td className={`${tdClass} hidden lg:table-cell font-mono text-[11px]`} title={l.userAgent || ''}>{l.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        <Pagination page={page} pageSize={pageSize} total={logs.total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      </Card>
    </div>
  );
}
