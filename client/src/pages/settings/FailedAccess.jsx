import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  CalendarClock,
  Globe,
  AlertTriangle,
  RefreshCw,
  Download,
  Eraser,
  LogIn,
  Link2,
  Code2,
  ScanSearch,
  KeyRound,
  Lock,
  CheckCircle2,
  RotateCcw,
  X,
  UserX,
  FileText
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  Card,
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  SearchInput,
  SelectInput,
  Field,
  Toggle,
  Pagination,
  Modal,
  ConfirmDialog,
  useToast,
  thClass,
  tdClass,
  formatDateTime,
  formatRelative
} from '../../components/ui/kit';
import { apiFetch, apiDownload } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import { buildQuery, useDebouncedValue, DeviceLabel, DateRangeInputs, TrendChart } from '../../components/security/securityUi';

// What each source logs (badges, filters and the empty state)
const SOURCES = {
  login: { label: 'Sign-in', tone: 'rose', icon: LogIn, description: 'Wrong password, unknown account or deactivated user at sign-in.' },
  signing_link: { label: 'Signing link', tone: 'amber', icon: Link2, description: 'Invalid, expired or already used signing links opened by recipients.' },
  api: { label: 'API', tone: 'violet', icon: Code2, description: 'Missing, invalid, expired or revoked API keys and blocked IP addresses.' },
  verify: { label: 'Verification', tone: 'sky', icon: ScanSearch, description: 'Rejected document verification requests.' },
  password_reset: { label: 'Password reset', tone: 'orange', icon: KeyRound, description: 'Invalid or expired password reset links.' },
  permission: { label: 'Permission', tone: 'indigo', icon: Lock, description: 'Users trying actions their role does not allow.' }
};

const EMPTY_FILTERS = { search: '', source: 'all', status: 'all', from: '', to: '', ip: '', email: '' };
const PURGE_OPTIONS = [[30, '30 days'], [90, '90 days'], [180, '6 months'], [365, '1 year']];

function SourceBadge({ source }) {
  const meta = SOURCES[source] || { label: source || 'Other', tone: 'slate' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function StatusBadge({ item }) {
  if (!item.resolved) return <Badge tone="amber" dot>Open</Badge>;
  const by = item.resolvedBy?.name || item.resolvedBy?.email;
  return (
    <span title={`Resolved${by ? ` by ${by}` : ''} ${formatDateTime(item.resolvedAt)}`}>
      <Badge tone="emerald" dot>Resolved</Badge>
    </span>
  );
}

// Ranked list with a thin magnitude bar (Top IPs, most targeted accounts)
function RankList({ rows, empty, renderLabel, renderMeta, onPick, activeKey, keyOf, action }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100 -my-1">
      {rows.map((row) => {
        const key = keyOf(row);
        return (
          <li key={key} className="py-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPick(row)}
              aria-pressed={activeKey === key}
              title="Show only these attempts"
              className={`flex-1 min-w-0 text-left rounded-lg px-2 py-1 -mx-2 transition cursor-pointer ${activeKey === key ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-slate-50'}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-bold text-slate-800">{renderLabel(row)}</span>
                <span className="text-xs font-black text-slate-900 tabular-nums shrink-0">{row.count}</span>
              </span>
              <span className="mt-1 block h-1.5 rounded-full bg-slate-100">
                <span className="block h-1.5 rounded-full bg-rose-500" style={{ width: `${Math.max(4, (row.count / max) * 100)}%` }} />
              </span>
              <span className="mt-1 block text-[11px] text-slate-500 truncate">{renderMeta(row)}</span>
            </button>
            {action && action(row)}
          </li>
        );
      })}
    </ul>
  );
}

export default function FailedAccess() {
  const { can } = usePermissions();
  const allowed = can('security.failed_access');
  const [toast, showToast] = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, summary: null });
  const [selected, setSelected] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmResolveAll, setConfirmResolveAll] = useState(false);
  const [purge, setPurge] = useState({ open: false, days: 90, onlyResolved: false, count: null, checking: false, confirm: false, busy: false });
  const search = useDebouncedValue(filters.search.trim(), 350);

  const query = useMemo(() => ({
    search,
    source: filters.source,
    resolved: filters.status,
    from: filters.from,
    to: filters.to,
    ip: filters.ip,
    email: filters.email
  }), [search, filters.source, filters.status, filters.from, filters.to, filters.ip, filters.email]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiFetch(`/security/failed-access${buildQuery({ ...query, page, pageSize })}`);
      setState({ loading: false, error: '', items: data.items || [], total: data.total || 0, summary: data.summary || null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  // Selection only keeps rows that are still visible and open
  useEffect(() => {
    setSelected((ids) => ids.filter((id) => state.items.some((i) => i.id === id && !i.resolved)));
  }, [state.items]);

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const hasFilters = Object.keys(EMPTY_FILTERS).some((k) => filters[k] !== EMPTY_FILTERS[k]);
  const summary = state.summary;
  const openRows = state.items.filter((i) => !i.resolved);
  const allSelected = openRows.length > 0 && openRows.every((i) => selected.includes(i.id));

  const toggleResolved = async (item) => {
    setBusyId(item.id);
    try {
      const data = await apiFetch(`/security/failed-access/${item.id}/resolve`, { method: 'PATCH', body: { resolved: !item.resolved } });
      showToast('success', data.message || 'Updated.');
      await load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const resolveMany = async (body, after) => {
    setBulkBusy(true);
    try {
      const data = await apiFetch('/security/failed-access/resolve-all', { method: 'POST', body });
      showToast('success', data.message || 'Resolved.');
      setSelected([]);
      after?.();
      await load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/security/failed-access/export${buildQuery(query)}`, 'failed-access.csv');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setExporting(false);
    }
  };

  // Purge preview: how many entries the chosen options delete
  useEffect(() => {
    if (!purge.open) return undefined;
    let cancelled = false;
    setPurge((p) => ({ ...p, checking: true }));
    apiFetch('/security/failed-access/purge', { method: 'POST', body: { olderThanDays: purge.days, onlyResolved: purge.onlyResolved, dryRun: true } })
      .then((data) => !cancelled && setPurge((p) => ({ ...p, count: data.count, checking: false, error: '' })))
      .catch((err) => !cancelled && setPurge((p) => ({ ...p, count: null, checking: false, error: err.message })));
    return () => {
      cancelled = true;
    };
  }, [purge.open, purge.days, purge.onlyResolved]);

  const runPurge = async () => {
    setPurge((p) => ({ ...p, busy: true }));
    try {
      const data = await apiFetch('/security/failed-access/purge', { method: 'POST', body: { olderThanDays: purge.days, onlyResolved: purge.onlyResolved } });
      showToast('success', data.message || 'Old entries deleted.');
      setPurge((p) => ({ ...p, open: false, confirm: false, busy: false }));
      await load();
    } catch (err) {
      showToast('error', err.message);
      setPurge((p) => ({ ...p, confirm: false, busy: false }));
    }
  };

  if (!allowed) {
    return (
      <div className="space-y-5 pb-10">
        <PageHeader eyebrow="Settings · Security" icon={ShieldAlert} title="Failed access" />
        <Card>
          <EmptyState icon={Lock} title="You don't have access to the failed access log" description="Ask a manager to grant you the “Failed access log” permission." />
        </Card>
      </div>
    );
  }

  const trendDelta = summary ? summary.last24h - summary.previous24h : 0;

  return (
    <div className="space-y-5 pb-10 font-sans text-slate-900">
      <PageHeader
        eyebrow="Settings · Security"
        icon={ShieldAlert}
        title="Failed access"
        description="Failed sign-ins, rejected signing links and API keys, and blocked actions. Review suspicious activity and mark it resolved once it has been checked."
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={state.loading}>Refresh</Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv} busy={exporting} disabled={!state.total}>Export CSV</Button>
            <Button variant="subtleDanger" icon={Eraser} onClick={() => setPurge((p) => ({ ...p, open: true, count: null, error: '' }))}>Purge old entries</Button>
          </>
        )}
      />

      <ErrorBanner message={state.error} onRetry={load} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Last 24 hours"
          value={summary ? summary.last24h : '…'}
          icon={ShieldAlert}
          tone="rose"
          hint={summary ? (trendDelta === 0 ? 'Same as the day before' : `${trendDelta > 0 ? '+' : ''}${trendDelta} vs the day before`) : ' '}
        />
        <StatCard label="Last 7 days" value={summary ? summary.last7d : '…'} icon={CalendarClock} tone="amber" hint={summary ? `${summary.total} logged in total` : ' '} />
        <StatCard label="Unique IPs" value={summary ? summary.uniqueIps : '…'} icon={Globe} tone="sky" hint="Last 30 days" />
        <StatCard
          label="Unresolved"
          value={summary ? summary.unresolved : '…'}
          icon={AlertTriangle}
          tone="orange"
          hint={filters.status === 'open' ? 'Showing open attempts' : 'Click to review'}
          onClick={() => setFilter({ status: filters.status === 'open' ? 'all' : 'open' })}
          active={filters.status === 'open'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0" title="Attempts per day" description="Last 14 days, all sources">
          {summary ? (
            <TrendChart data={summary.perDay} label="Attempts" caption="Failed access attempts per day, last 14 days" height={110} />
          ) : <LoadingBlock label="Loading chart..." />}
          {summary?.lastAttemptAt && (
            <p className="mt-3 text-[11px] text-slate-500">Last attempt {formatRelative(summary.lastAttemptAt)} · {formatDateTime(summary.lastAttemptAt)}</p>
          )}
        </Card>
        <Card className="min-w-0" title="Top IP addresses" description="Most attempts in the last 30 days">
          {summary ? (
            <RankList
              rows={summary.topIps}
              empty="No attempts in the last 30 days."
              keyOf={(r) => r.ip}
              activeKey={filters.ip}
              onPick={(r) => setFilter({ ip: filters.ip === r.ip ? '' : r.ip })}
              renderLabel={(r) => <span className="font-mono">{r.ip}</span>}
              renderMeta={(r) => `${r.accounts} account${r.accounts === 1 ? '' : 's'} · ${r.open} open · ${formatRelative(r.lastAt)}`}
              action={(r) => r.open > 0 && (
                <button
                  type="button"
                  onClick={() => resolveMany({ ip: r.ip })}
                  disabled={bulkBusy}
                  title={`Resolve all ${r.open} open attempts from ${r.ip}`}
                  aria-label={`Resolve all open attempts from ${r.ip}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#007355] hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            />
          ) : <LoadingBlock label="Loading..." />}
        </Card>
        <Card className="min-w-0" title="Most targeted accounts" description="Emails with the most failures, last 30 days">
          {summary ? (
            <RankList
              rows={summary.topAccounts}
              empty="No account was targeted in the last 30 days."
              keyOf={(r) => r.email}
              activeKey={filters.email.toLowerCase()}
              onPick={(r) => setFilter({ email: filters.email.toLowerCase() === r.email ? '' : r.email })}
              renderLabel={(r) => r.email}
              renderMeta={(r) => `${r.name || 'Not a BexSign user'} · ${r.ips} IP${r.ips === 1 ? '' : 's'} · ${formatRelative(r.lastAt)}`}
            />
          ) : <LoadingBlock label="Loading..." />}
        </Card>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-3 sm:p-4 border-b border-slate-100 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_10rem_10rem_18rem]">
            <SearchInput value={filters.search} onChange={(v) => setFilter({ search: v })} placeholder="Search email, IP address or reason..." className="sm:col-span-2 xl:col-span-1" />
            <SelectInput
              label="Source"
              value={filters.source}
              onChange={(v) => setFilter({ source: v })}
              options={[['all', 'All sources'], ...Object.entries(SOURCES).map(([k, m]) => [k, m.label])]}
              className="w-full"
            />
            <SelectInput
              label="Status"
              value={filters.status}
              onChange={(v) => setFilter({ status: v })}
              options={[['all', 'All statuses'], ['open', 'Unresolved'], ['resolved', 'Resolved']]}
              className="w-full"
            />
            <DateRangeInputs from={filters.from} to={filters.to} onChange={(range) => setFilter(range)} className="sm:col-span-2 xl:col-span-1" />
          </div>
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {filters.ip && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-1 font-semibold text-slate-700">
                  IP <span className="font-mono">{filters.ip}</span>
                  <button type="button" onClick={() => setFilter({ ip: '' })} aria-label="Remove IP filter" className="p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {filters.email && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-1 font-semibold text-slate-700 max-w-full">
                  <span className="truncate">Account {filters.email}</span>
                  <button type="button" onClick={() => setFilter({ email: '' })} aria-label="Remove account filter" className="p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              <button type="button" onClick={() => setFilter(EMPTY_FILTERS)} className="font-bold text-[#007355] hover:underline cursor-pointer">Clear all filters</button>
            </div>
          )}
        </div>

        <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
          <p className="text-xs text-slate-600">
            {selected.length > 0 ? (
              <>
                <strong>{selected.length}</strong> selected
                <button type="button" onClick={() => setSelected([])} className="ml-2 font-bold text-[#007355] hover:underline cursor-pointer">Clear</button>
              </>
            ) : (
              <>
                <strong>{state.total}</strong> attempt{state.total === 1 ? '' : 's'}{hasFilters ? ` match${state.total === 1 ? 'es' : ''} the filters` : ' logged'}
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.length > 0 && (
              <Button icon={CheckCircle2} busy={bulkBusy} onClick={() => resolveMany({ ids: selected })}>Resolve selected</Button>
            )}
            {selected.length === 0 && summary?.unresolved > 0 && (
              <Button variant="secondary" icon={CheckCircle2} onClick={() => setConfirmResolveAll(true)}>
                {filters.ip ? `Resolve all open from ${filters.ip}` : 'Resolve all open'}
              </Button>
            )}
          </div>
        </div>

        {state.loading && state.items.length === 0 ? (
          <LoadingBlock label="Loading failed access attempts..." />
        ) : state.items.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={ShieldAlert} title="No attempts match these filters" description="Try another search, source, status or date range." action={<Button variant="secondary" onClick={() => setFilter(EMPTY_FILTERS)}>Clear filters</Button>} />
          ) : (
            <div className="py-10 px-4">
              <div className="text-center">
                <span className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-[#007355] flex items-center justify-center mb-3"><CheckCircle2 size={26} /></span>
                <p className="text-sm font-bold text-slate-800">No failed access attempts</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">Every rejected attempt to reach BexSign is recorded here with its IP address, device and reason. Account owners are told about failed sign-ins, and managers are alerted after repeated failures.</p>
              </div>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                {Object.entries(SOURCES).map(([key, meta]) => (
                  <li key={key} className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><meta.icon size={15} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800">{meta.label}</span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">{meta.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : (
          <>
            {/* Phones and tablets: cards */}
            <ul className={`lg:hidden divide-y divide-slate-100 ${state.loading ? 'opacity-60' : ''}`}>
              {state.items.map((item) => (
                <li key={item.id} className="p-3 flex gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-[#007355] shrink-0"
                    disabled={item.resolved}
                    checked={selected.includes(item.id)}
                    onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id)))}
                    aria-label={`Select attempt from ${item.ip}`}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SourceBadge source={item.source} />
                      <StatusBadge item={item} />
                      <span className="text-[11px] text-slate-500 ml-auto" title={formatDateTime(item.attemptTime)}>{formatRelative(item.attemptTime)}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 break-words">{item.reason}</p>
                    <p className="text-xs text-slate-600 break-all">
                      {item.email || 'No account'} · <button type="button" onClick={() => setFilter({ ip: item.ip })} className="font-mono hover:underline cursor-pointer">{item.ip}</button>
                    </p>
                    <p className="text-xs text-slate-500"><DeviceLabel device={item.device} userAgent={item.userAgent} /></p>
                    <Button variant={item.resolved ? 'ghost' : 'secondary'} icon={item.resolved ? RotateCcw : CheckCircle2} busy={busyId === item.id} onClick={() => toggleResolved(item)} className="!px-2.5 !py-1.5">
                      {item.resolved ? 'Reopen' : 'Resolve'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {/* Laptops and up: table */}
            <div className={`hidden lg:block relative overflow-x-auto ${state.loading ? 'opacity-60' : ''}`}>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#007355]"
                        checked={allSelected}
                        disabled={openRows.length === 0}
                        onChange={(e) => setSelected(e.target.checked ? openRows.map((i) => i.id) : [])}
                        aria-label="Select all open attempts on this page"
                      />
                    </th>
                    <th className={thClass}>Time</th>
                    <th className={thClass}>Reason</th>
                    <th className={thClass}>Account</th>
                    <th className={thClass}>IP address · device</th>
                    <th className={thClass}>Status</th>
                    <th className={`${thClass} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.items.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/70 ${selected.includes(item.id) ? 'bg-emerald-50/40' : ''}`}>
                      <td className={tdClass}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-[#007355]"
                          disabled={item.resolved}
                          checked={selected.includes(item.id)}
                          onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id)))}
                          aria-label={`Select attempt from ${item.ip}`}
                        />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <span className="block font-semibold text-slate-800">{formatRelative(item.attemptTime)}</span>
                        <span className="block text-[11px] text-slate-400">{formatDateTime(item.attemptTime)}</span>
                      </td>
                      <td className={`${tdClass} max-w-[14rem]`}>
                        <SourceBadge source={item.source} />
                        <span className="mt-1 block font-semibold text-slate-800 break-words">{item.reason}</span>
                        {item.document && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 truncate"><FileText size={11} className="shrink-0" /> {item.document.name}</span>
                        )}
                      </td>
                      <td className={`${tdClass} max-w-[12rem]`}>
                        {item.email ? (
                          <button type="button" onClick={() => setFilter({ email: item.email })} className="block max-w-full truncate text-left font-semibold text-slate-800 hover:underline cursor-pointer" title={`Show attempts for ${item.email}`}>{item.email}</button>
                        ) : <span className="inline-flex items-center gap-1 text-slate-400"><UserX size={13} /> No account</span>}
                        {item.user?.name && <span className="block text-[11px] text-slate-500 truncate">{item.user.name}</span>}
                      </td>
                      <td className={`${tdClass} max-w-[11rem]`}>
                        <button type="button" onClick={() => setFilter({ ip: item.ip })} className="font-mono text-slate-800 hover:underline cursor-pointer" title={`Show attempts from ${item.ip}`}>{item.ip}</button>
                        <span className="block text-[11px] text-slate-500 mt-0.5"><DeviceLabel device={item.device} userAgent={item.userAgent} /></span>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge item={item} />
                        {item.resolved && item.resolvedBy && <span className="block text-[11px] text-slate-400 mt-0.5 truncate max-w-[9rem]">by {item.resolvedBy.name || item.resolvedBy.email}</span>}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <Button
                          variant={item.resolved ? 'ghost' : 'secondary'}
                          icon={item.resolved ? RotateCcw : CheckCircle2}
                          busy={busyId === item.id}
                          onClick={() => toggleResolved(item)}
                          className="!px-2.5 !py-1.5"
                          aria-label={item.resolved ? 'Reopen' : 'Resolve'}
                          title={item.resolved ? 'Reopen' : 'Resolve'}
                        >
                          <span className="hidden xl:inline">{item.resolved ? 'Reopen' : 'Resolve'}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={state.total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </>
        )}
      </section>

      <Modal
        open={purge.open}
        onClose={() => setPurge((p) => ({ ...p, open: false }))}
        title="Purge old entries"
        description="Permanently delete old failed access entries to keep the log focused."
        icon={Eraser}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setPurge((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button variant="danger" icon={Eraser} disabled={!purge.count || purge.checking} onClick={() => setPurge((p) => ({ ...p, confirm: true }))}>
              {purge.count ? `Delete ${purge.count} entr${purge.count === 1 ? 'y' : 'ies'}` : 'Delete'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="Delete entries older than">
            <SelectInput label="Delete entries older than" value={String(purge.days)} onChange={(v) => setPurge((p) => ({ ...p, days: Number(v) }))} options={PURGE_OPTIONS.map(([d, l]) => [String(d), l])} className="w-full" />
          </Field>
          <Toggle
            checked={purge.onlyResolved}
            onChange={(v) => setPurge((p) => ({ ...p, onlyResolved: v }))}
            label="Only resolved entries"
            description="Keep open attempts that nobody has reviewed yet."
          />
          <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${purge.count ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`} role="status">
            {purge.checking ? 'Counting entries...' : purge.error ? purge.error : purge.count ? `${purge.count} entr${purge.count === 1 ? 'y' : 'ies'} will be deleted permanently.` : 'No entries are that old. Nothing to delete.'}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={purge.confirm}
        danger
        title="Delete old entries permanently?"
        message={`${purge.count || 0} failed access entr${purge.count === 1 ? 'y' : 'ies'} older than ${PURGE_OPTIONS.find(([d]) => d === purge.days)?.[1] || `${purge.days} days`}${purge.onlyResolved ? ' (resolved only)' : ''} will be deleted. This cannot be undone.`}
        confirmLabel="Delete permanently"
        busy={purge.busy}
        onConfirm={runPurge}
        onCancel={() => setPurge((p) => ({ ...p, confirm: false }))}
      />

      <ConfirmDialog
        open={confirmResolveAll}
        title={filters.ip ? `Resolve all open attempts from ${filters.ip}?` : 'Resolve all open attempts?'}
        message={filters.ip
          ? 'Every open attempt from this IP address is marked as reviewed. You can reopen entries later.'
          : `All ${summary?.unresolved || 0} open attempts are marked as reviewed. You can reopen entries later.`}
        confirmLabel="Resolve all"
        busy={bulkBusy}
        onConfirm={() => resolveMany(filters.ip ? { ip: filters.ip } : {}, () => setConfirmResolveAll(false))}
        onCancel={() => setConfirmResolveAll(false)}
      />

      {toast}
    </div>
  );
}
