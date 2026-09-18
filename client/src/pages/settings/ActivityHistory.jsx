import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  RefreshCw,
  Download,
  KeyRound,
  Users,
  Lock,
  Settings,
  FileText,
  LayoutTemplate,
  Code2,
  BarChart3,
  ShieldAlert,
  Server,
  LayoutGrid,
  ListTree,
  LayoutList,
  ChevronDown,
  ChevronRight,
  PenLine,
  Eye,
  Send,
  Mail,
  CheckCircle2,
  XCircle,
  Undo2,
  Clock,
  UserRoundCheck,
  FilePlus,
  Copy,
  Pencil,
  Trash2,
  LogIn,
  Bot,
  UserRound,
  X
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  SearchInput,
  SelectInput,
  Pagination,
  useToast,
  tone,
  thClass,
  tdClass,
  formatDateTime,
  formatRelative
} from '../../components/ui/kit';
import { apiFetch, apiDownload } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import { buildQuery, useDebouncedValue, DeviceLabel, DateRangeInputs, DayColumns, CopyButton } from '../../components/security/securityUi';

const CATEGORIES = {
  auth: { label: 'Sign-in', icon: KeyRound, tone: 'sky' },
  user: { label: 'Users', icon: Users, tone: 'violet' },
  permission: { label: 'Permissions', icon: Lock, tone: 'indigo' },
  settings: { label: 'Settings', icon: Settings, tone: 'slate' },
  document: { label: 'Documents', icon: FileText, tone: 'emerald' },
  template: { label: 'Templates', icon: LayoutTemplate, tone: 'orange' },
  api: { label: 'Developer API', icon: Code2, tone: 'amber' },
  report: { label: 'Reports', icon: BarChart3, tone: 'sky' },
  security: { label: 'Security', icon: ShieldAlert, tone: 'rose' },
  system: { label: 'System', icon: Server, tone: 'slate' }
};
const SOURCES = {
  account: { label: 'Account & system', description: 'Changes made by users: settings, users, permissions, API, reports' },
  document: { label: 'Document events', description: 'Created, sent, viewed, signed, completed...' },
  login: { label: 'Sign-ins', description: 'Successful and failed sign-ins' }
};
// Icons of document and sign-in events
const EVENT_ICONS = {
  signed: PenLine,
  viewed: Eye,
  sent: Send,
  emailed: Mail,
  completed: CheckCircle2,
  declined: XCircle,
  recalled: Undo2,
  expired: Clock,
  delegated: UserRoundCheck,
  created: FilePlus,
  copied: Copy,
  updated: Pencil,
  deleted: Trash2,
  login: LogIn,
  login_failed: ShieldAlert
};
const PERIODS = [['any', 'Any time'], ['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom range']];
const EMPTY_FILTERS = { search: '', user: '', category: 'all', source: 'all', period: 'any', from: '', to: '' };
const VIEW_KEY = 'bexsign.activityHistory.view';

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodRange(period) {
  const today = new Date();
  if (period === 'today') return { from: isoDay(today), to: isoDay(today) };
  const days = Number(period);
  if (days) return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1))), to: isoDay(today) };
  return { from: '', to: '' };
}

function dayHeading(day) {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (day === isoDay(today)) return 'Today';
  if (day === isoDay(yesterday)) return 'Yesterday';
  return new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

const humanize = (key) => String(key).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function CategoryIcon({ item, size = 15, className = 'w-8 h-8' }) {
  const meta = CATEGORIES[item.category] || CATEGORIES.system;
  const Icon = EVENT_ICONS[item.event] || meta.icon;
  const t = tone(item.event === 'login_failed' || item.event === 'declined' ? 'rose' : meta.tone);
  return (
    <span className={`rounded-full flex items-center justify-center shrink-0 ring-4 ring-white ${t.icon} ${className}`} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}

function ActorLabel({ actor, onPick }) {
  if (!actor) return <span className="text-slate-400">Unknown</span>;
  if (actor.system) {
    return <span className="inline-flex items-center gap-1 text-slate-600"><Bot size={12} /> BexSign</span>;
  }
  const label = actor.name || actor.email || 'Unknown';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPick(actor.email || actor.name);
      }}
      title={`Show activity of ${actor.email || label}`}
      className="font-semibold text-slate-700 hover:text-[#007355] hover:underline cursor-pointer text-left truncate max-w-full"
    >
      {label}{actor.recipient ? ' (recipient)' : ''}
    </button>
  );
}

function EntityLabel({ entity }) {
  if (!entity || (!entity.name && !entity.id)) return null;
  const type = humanize(entity.type || 'item').toLowerCase();
  return (
    <span className="truncate">
      {entity.name || `${type} #${entity.id}`}
    </span>
  );
}

function DetailsPanel({ item }) {
  const detailEntries = item.details && typeof item.details === 'object' ? Object.entries(item.details).filter(([, v]) => v !== null && v !== undefined && v !== '') : [];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3 text-xs">
      <dl className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">When</dt>
          <dd className="font-semibold text-slate-800">{formatDateTime(item.createdAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Actor</dt>
          <dd className="font-semibold text-slate-800 break-all">{item.actor?.system ? 'BexSign (automatic)' : [item.actor?.name, item.actor?.email].filter(Boolean).join(' · ') || '-'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Category · source</dt>
          <dd className="font-semibold text-slate-800">{CATEGORIES[item.category]?.label || item.category} · {SOURCES[item.source]?.label || item.source}</dd>
        </div>
        {item.entity && (item.entity.name || item.entity.id) && (
          <div className="min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{humanize(item.entity.type || 'Item')}</dt>
            <dd className="font-semibold text-slate-800 break-words">
              {item.entity.name || '-'}{item.entity.id ? <span className="text-slate-400 font-normal"> #{item.entity.id}</span> : null}
              {item.entity.bexsignDocId && (
                <span className="flex items-center gap-1 mt-0.5">
                  <code className="text-[11px] text-slate-500 break-all font-normal">{item.entity.bexsignDocId}</code>
                  <CopyButton value={item.entity.bexsignDocId} label="Copy BexSign ID" />
                </span>
              )}
            </dd>
          </div>
        )}
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">IP address</dt>
          <dd className="font-mono text-slate-800">{item.ip || '-'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Device</dt>
          <dd className="text-slate-800">{item.device ? <DeviceLabel device={item.device} userAgent={item.userAgent} /> : '-'}</dd>
        </div>
      </dl>
      {detailEntries.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Details</p>
          <dl className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {detailEntries.map(([key, value]) => (
              <div key={key} className="px-3 py-1.5 grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3">
                <dt className="text-slate-500 truncate">{humanize(key)}</dt>
                <dd className="text-slate-800 font-semibold break-words">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {typeof item.details === 'string' && <p className="text-slate-700 break-words">{item.details}</p>}
      {item.userAgent && <p className="text-[11px] text-slate-400 break-all">{item.userAgent}</p>}
    </div>
  );
}

function Timeline({ items, open, toggle, onPickUser }) {
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const day = isoDay(new Date(item.createdAt));
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    });
    return [...map.entries()];
  }, [items]);

  return (
    <div className="p-3 sm:p-5 space-y-6">
      {groups.map(([day, dayItems]) => (
        <section key={day} aria-label={dayHeading(day)}>
          <h3 className="sticky top-0 z-[1] -mx-1 px-1 py-1 bg-white/95 backdrop-blur text-xs font-black uppercase tracking-wide text-slate-500 flex items-center gap-2">
            {dayHeading(day)} <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal">{dayItems.length} event{dayItems.length === 1 ? '' : 's'}</span>
          </h3>
          <ol className="relative mt-2 ml-4 border-l border-slate-200 space-y-1">
            {dayItems.map((item) => {
              const expanded = open === item.id;
              return (
                <li key={item.id} className="relative pl-6 sm:pl-7">
                  <span className="absolute -left-4 top-2"><CategoryIcon item={item} /></span>
                  <div className={`rounded-xl px-3 py-2 transition ${expanded ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                    <div className="flex items-start gap-2">
                      <button type="button" onClick={() => toggle(item.id)} aria-expanded={expanded} className="flex-1 min-w-0 text-left cursor-pointer">
                        <span className="block text-sm font-bold text-slate-900 break-words">{item.action}</span>
                      </button>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap pt-0.5" title={formatDateTime(item.createdAt)}>
                        {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 min-w-0">
                      <ActorLabel actor={item.actor} onPick={onPickUser} />
                      {item.entity && item.entity.type !== 'user' && (item.entity.name || item.entity.id) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 min-w-0 max-w-full"><EntityLabel entity={item.entity} /></span>
                        </>
                      )}
                      {item.ip && <><span aria-hidden="true">·</span><span className="font-mono">{item.ip}</span></>}
                      <Badge tone={CATEGORIES[item.category]?.tone || 'slate'}>{CATEGORIES[item.category]?.label || item.category}</Badge>
                      <button type="button" onClick={() => toggle(item.id)} className="inline-flex items-center gap-0.5 font-bold text-[#007355] hover:underline cursor-pointer" aria-expanded={expanded}>
                        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Details
                      </button>
                    </div>
                    {expanded && <div className="mt-2"><DetailsPanel item={item} /></div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ActivityTable({ items, open, toggle, onPickUser }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className={`${thClass} w-8`}><span className="sr-only">Details</span></th>
            <th className={thClass}>Time</th>
            <th className={thClass}>Action</th>
            <th className={`${thClass} hidden sm:table-cell`}>Actor</th>
            <th className={`${thClass} hidden md:table-cell`}>Category</th>
            <th className={`${thClass} hidden lg:table-cell`}>IP address</th>
            <th className={`${thClass} hidden xl:table-cell`}>Device</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const expanded = open === item.id;
            return (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-slate-50/70 cursor-pointer" onClick={() => toggle(item.id)}>
                  <td className={`${tdClass} !pr-0`}>
                    <button type="button" aria-expanded={expanded} aria-label={expanded ? 'Hide details' : 'Show details'} onClick={(e) => { e.stopPropagation(); toggle(item.id); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                      {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <span className="block font-semibold text-slate-800">{formatRelative(item.createdAt)}</span>
                    <span className="block text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                  </td>
                  <td className={`${tdClass} min-w-[12rem] max-w-[28rem]`}>
                    <span className="flex items-start gap-2">
                      <CategoryIcon item={item} size={13} className="w-6 h-6 !ring-0" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-slate-800 break-words">{item.action}</span>
                        {item.entity && item.entity.type !== 'user' && (item.entity.name || item.entity.id) && (
                          <span className="block text-[11px] text-slate-500 truncate"><EntityLabel entity={item.entity} /></span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className={`${tdClass} hidden sm:table-cell max-w-[14rem]`}>
                    <ActorLabel actor={item.actor} onPick={onPickUser} />
                    {item.actor?.email && item.actor?.name && <span className="block text-[11px] text-slate-400 truncate">{item.actor.email}</span>}
                  </td>
                  <td className={`${tdClass} hidden md:table-cell`}><Badge tone={CATEGORIES[item.category]?.tone || 'slate'}>{CATEGORIES[item.category]?.label || item.category}</Badge></td>
                  <td className={`${tdClass} hidden lg:table-cell font-mono whitespace-nowrap`}>{item.ip || '-'}</td>
                  <td className={`${tdClass} hidden xl:table-cell max-w-[12rem]`}><DeviceLabel device={item.device} userAgent={item.userAgent} /></td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={7} className="px-3 sm:px-4 pb-3"><DetailsPanel item={item} /></td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ActivityHistory() {
  const { can } = usePermissions();
  const allowed = can('security.activity_history');
  const [toast, showToast] = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [state, setState] = useState({ loading: true, error: '', items: [], total: 0, summary: null });
  const [open, setOpen] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'timeline';
    } catch (e) {
      return 'timeline';
    }
  });
  const search = useDebouncedValue(filters.search.trim(), 350);
  const user = useDebouncedValue(filters.user.trim(), 350);

  const query = useMemo(() => ({
    search,
    user,
    category: filters.category,
    source: filters.source,
    from: filters.from,
    to: filters.to
  }), [search, user, filters.category, filters.source, filters.from, filters.to]);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiFetch(`/security/activity${buildQuery({ ...query, page, pageSize })}`);
      setState({ loading: false, error: '', items: data.items || [], total: data.total || 0, summary: data.summary || null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [query, page, pageSize]);

  useEffect(() => {
    if (allowed) load();
  }, [load, allowed]);

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setOpen(null);
  };
  const changeView = (next) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch (e) {}
  };
  const toggle = (id) => setOpen((current) => (current === id ? null : id));
  const pickUser = (value) => value && setFilter({ user: value });
  const hasFilters = Object.keys(EMPTY_FILTERS).some((k) => filters[k] !== EMPTY_FILTERS[k]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/security/activity/export${buildQuery(query)}`, 'activity-history.csv');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setExporting(false);
    }
  };

  const summary = state.summary;
  const chips = useMemo(() => {
    const counts = summary?.byCategory || {};
    return Object.keys(CATEGORIES).filter((key) => counts[key] > 0 || filters.category === key);
  }, [summary, filters.category]);
  const periodTotal = summary ? summary.perDay.reduce((sum, d) => sum + d.count, 0) : 0;

  if (!allowed) {
    return (
      <div className="space-y-5 pb-10">
        <PageHeader eyebrow="Settings · Security" icon={History} title="Activity history" />
        <Card>
          <EmptyState icon={Lock} title="You don't have access to the activity history" description="Ask a manager to grant you the “Activity history” permission." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 font-sans text-slate-900">
      <PageHeader
        eyebrow="Settings · Security"
        icon={History}
        title="Activity history"
        description="Everything that happened in your organization: account and settings changes, document events and sign-ins, in one audit trail."
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={load} disabled={state.loading}>Refresh</Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv} busy={exporting} disabled={!state.total}>Export CSV</Button>
          </>
        )}
      />

      <ErrorBanner message={state.error} onRetry={load} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2 min-w-0"
          title="Activity per day"
          description={summary ? `${periodTotal} event${periodTotal === 1 ? '' : 's'} over ${summary.perDay.length} day${summary.perDay.length === 1 ? '' : 's'}${hasFilters ? ', filters applied' : ''}` : 'Loading...'}
        >
          {summary ? <DayColumns data={summary.perDay} label="Events" caption="Activity events per day" height={110} /> : <LoadingBlock label="Loading chart..." />}
        </Card>
        <Card className="min-w-0" title="Sources" description="Click a source to show only its events">
          <ul className="space-y-2">
            {Object.entries(SOURCES).map(([key, meta]) => {
              const active = filters.source === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setFilter({ source: active ? 'all' : key })}
                    aria-pressed={active}
                    className={`w-full text-left rounded-xl border px-3 py-2 flex items-center justify-between gap-3 transition cursor-pointer ${active ? 'border-[#007355] bg-emerald-50 ring-2 ring-emerald-100' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800">{meta.label}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{meta.description}</span>
                    </span>
                    <span className="text-lg font-black text-slate-900 tabular-nums">{summary ? summary.bySource[key] || 0 : '…'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-3 sm:p-4 border-b border-slate-100 space-y-3">
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by category">
            {[['all', { label: 'All', icon: LayoutGrid, tone: 'slate' }], ...chips.map((k) => [k, CATEGORIES[k]])].map(([key, meta]) => {
              const active = filters.category === key;
              const count = key === 'all' ? summary?.total : summary?.byCategory?.[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter({ category: key })}
                  aria-pressed={active}
                  className={`shrink-0 pl-1.5 pr-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    active ? 'bg-[#007355] border-[#007355] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? 'bg-white/20' : tone(meta.tone).icon}`}><meta.icon size={11} /></span>
                  <span>{meta.label}</span>
                  <span className={`text-[10px] tabular-nums ${active ? 'text-emerald-100' : 'text-slate-400'}`}>{count ?? '…'}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_10rem_10rem]">
            <SearchInput value={filters.search} onChange={(v) => setFilter({ search: v })} placeholder="Search actions, documents, IP addresses..." className="sm:col-span-2 xl:col-span-1" />
            <div className="relative">
              <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={filters.user}
                onChange={(e) => setFilter({ user: e.target.value })}
                placeholder="User name or email"
                aria-label="Filter by user name or email"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-[#007355] focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <SelectInput label="Source" value={filters.source} onChange={(v) => setFilter({ source: v })} options={[['all', 'All sources'], ...Object.entries(SOURCES).map(([k, m]) => [k, m.label])]} className="w-full" />
            <SelectInput
              label="Period"
              value={filters.period}
              onChange={(v) => setFilter({ period: v, ...(v === 'custom' ? {} : periodRange(v)) })}
              options={PERIODS}
              className="w-full"
            />
          </div>
          {filters.period === 'custom' && (
            <DateRangeInputs from={filters.from} to={filters.to} onChange={(range) => setFilter({ ...range, period: 'custom' })} className="max-w-sm" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span><strong>{state.total}</strong> event{state.total === 1 ? '' : 's'}{hasFilters ? ` match${state.total === 1 ? 'es' : ''} the filters` : ''}</span>
              {filters.user && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 pl-2.5 pr-1 py-0.5 font-semibold text-slate-700 max-w-full">
                  <span className="truncate">User: {filters.user}</span>
                  <button type="button" onClick={() => setFilter({ user: '' })} aria-label="Remove user filter" className="p-0.5 rounded-full hover:bg-slate-200 cursor-pointer"><X size={12} /></button>
                </span>
              )}
              {hasFilters && <button type="button" onClick={() => setFilter(EMPTY_FILTERS)} className="font-bold text-[#007355] hover:underline cursor-pointer">Clear filters</button>}
            </div>
            <div className="flex border border-slate-300 rounded-xl overflow-hidden self-start sm:self-auto" role="group" aria-label="View">
              {[['timeline', ListTree, 'Timeline'], ['table', LayoutList, 'Table']].map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeView(id)}
                  aria-pressed={view === id}
                  className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold transition cursor-pointer ${view === id ? 'bg-[#007355] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {state.loading && state.items.length === 0 ? (
          <LoadingBlock label="Loading activity..." />
        ) : state.items.length === 0 ? (
          hasFilters ? (
            <EmptyState icon={History} title="No activity matches these filters" description="Try another category, user, source or period." action={<Button variant="secondary" onClick={() => setFilter(EMPTY_FILTERS)}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={History} title="No activity recorded yet" description="Sign-ins, document events (sent, viewed, signed, completed) and changes to users, permissions and settings appear here as they happen." />
          )
        ) : (
          <div className={state.loading ? 'opacity-60 transition' : 'transition'}>
            {view === 'timeline' ? (
              <Timeline items={state.items} open={open} toggle={toggle} onPickUser={pickUser} />
            ) : (
              <ActivityTable items={state.items} open={open} toggle={toggle} onPickUser={pickUser} />
            )}
            <Pagination page={page} pageSize={pageSize} total={state.total} onPage={(p) => { setPage(p); setOpen(null); }} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </section>

      {toast}
    </div>
  );
}
