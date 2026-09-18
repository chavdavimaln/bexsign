import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  Activity,
  CalendarClock,
  Download,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Undo2,
  FileText,
  Percent,
  Timer,
  PenLine,
  Users,
  Eye,
  BellRing,
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  History,
  Mail,
  X,
  Lock,
  ChevronDown,
  Table2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Calendar,
  FileSpreadsheet
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
  inputClass,
  Toggle,
  Tabs,
  Pagination,
  Modal,
  ConfirmDialog,
  useToast,
  tone,
  thClass,
  tdClass,
  formatDateTime,
  formatRelative
} from '../components/ui/kit';
import {
  ActivityChart,
  StatusDonut,
  TopSenders,
  RecipientFunnel,
  DocumentTypes,
  STATUS_META,
  bucketSeries,
  fmtDay,
  fmtNumber,
  ymd
} from '../components/reports/ReportCharts';
import { apiFetch, apiDownload } from '../utils/api';
import { usePermissions } from '../utils/permissions';
import { getLoggedInUser } from '../utils/currentUser';

const TABS = [
  { id: 'all', label: 'All Reports', icon: BarChart3 },
  { id: 'timeline', label: 'Timeline', icon: Activity },
  { id: 'scheduled', label: 'Scheduled Reports', icon: CalendarClock }
];

const TAB_TEXT = {
  all: { title: 'All Reports', description: 'Sending, signing and completion activity of your documents, with charts and a document list you can export.' },
  timeline: { title: 'Timeline', description: 'Every document event in order: sent, viewed, signed, completed, declined, reminders and more.' },
  scheduled: { title: 'Scheduled Reports', description: 'Email CSV reports automatically every day, week or month.' }
};

const PRESETS = [
  ['7d', '7 days'],
  ['30d', '30 days'],
  ['90d', '90 days'],
  ['month', 'This month'],
  ['custom', 'Custom']
];

const SCOPE_TEXT = {
  all: 'All documents in the organization',
  team: 'Documents of your department',
  own: 'Your documents'
};

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function presetRange(id) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (id === '7d') return { from: ymd(addDays(today, -6)), to: ymd(today) };
  if (id === '90d') return { from: ymd(addDays(today, -89)), to: ymd(today) };
  if (id === 'month') return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
  return { from: ymd(addDays(today, -29)), to: ymd(today) };
}

const query = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== 'all')
).toString();

function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ---------- Shared controls ---------- */

function DateRangeControl({ range, onChange }) {
  const pick = (id) => onChange(id === 'custom' ? { ...range, preset: 'custom' } : { preset: id, ...presetRange(id) });
  const setBound = (key, value) => {
    if (!value) return;
    const next = { ...range, preset: 'custom', [key]: value };
    if (next.from > next.to) {
      if (key === 'from') next.to = value;
      else next.from = value;
    }
    onChange(next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Date range" className="grid grid-cols-3 sm:inline-flex sm:flex-wrap rounded-xl border border-slate-300 bg-white p-0.5 w-full sm:w-auto">
        {PRESETS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            aria-pressed={range.preset === id}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${range.preset === id ? 'bg-[#007355] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {range.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={range.from} max={range.to} onChange={(e) => setBound('from', e.target.value)} aria-label="From date" className={`${inputClass} !w-auto !py-1.5 text-xs`} />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={range.to} min={range.from} onChange={(e) => setBound('to', e.target.value)} aria-label="To date" className={`${inputClass} !w-auto !py-1.5 text-xs`} />
        </div>
      )}
    </div>
  );
}

function rangeLabel(range) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return range.from === range.to ? fmtDay(range.from, opts) : `${fmtDay(range.from, opts)} - ${fmtDay(range.to, opts)}`;
}

/** Export button; with several `options` it opens a small menu. */
function ExportMenu({ options, onExport, busy }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  if (options.length === 1) {
    return <Button variant="secondary" icon={Download} busy={busy} onClick={() => onExport(options[0].kind)}>Export CSV</Button>;
  }
  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" icon={Download} busy={busy} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        Export CSV <ChevronDown size={13} />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5">
          {options.map((o) => (
            <button
              key={o.kind}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onExport(o.kind); }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 cursor-pointer"
            >
              <FileSpreadsheet size={15} className="text-[#007355] mt-0.5 shrink-0" />
              <span>
                <span className="block text-xs font-bold text-slate-800">{o.label}</span>
                <span className="block text-[11px] text-slate-500">{o.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

/* ---------- All Reports ---------- */

const DOC_EXPORTS = [
  { kind: 'documents', label: 'Documents', description: 'One row per document with status and signing progress' },
  { kind: 'recipients', label: 'Recipients', description: 'One row per recipient with sent, viewed and signed times' },
  { kind: 'users', label: 'User activity', description: 'Documents sent and completed per user' }
];

function SortHeader({ label, field, sort, onSort, className = '' }) {
  const active = sort.replace(/^-/, '') === field;
  const desc = sort.startsWith('-');
  const Icon = active ? (desc ? ArrowDown : ArrowUp) : ArrowUpDown;
  const next = active ? (desc ? field : `-${field}`) : (['sent_on', 'recipients'].includes(field) ? `-${field}` : field);
  return (
    <th scope="col" className={`${thClass} ${className}`} aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}>
      <button type="button" onClick={() => onSort(next)} className={`inline-flex items-center gap-1 uppercase cursor-pointer hover:text-slate-800 ${active ? 'text-slate-800' : ''}`}>
        {label} <Icon size={12} className={active ? 'text-[#007355]' : 'text-slate-400'} />
      </button>
    </th>
  );
}

function ChartTable({ series }) {
  const rows = bucketSeries(series).filter((b) => b.sent || b.completed || b.declined);
  if (!rows.length) return <p className="py-10 text-center text-xs text-slate-500">No activity in this period.</p>;
  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
      <table className="w-full text-xs">
        <thead className="sticky top-0">
          <tr>
            <th scope="col" className={thClass}>{series.length > 62 ? 'Week' : 'Day'}</th>
            <th scope="col" className={`${thClass} text-right`}>Sent</th>
            <th scope="col" className={`${thClass} text-right`}>Completed</th>
            <th scope="col" className={`${thClass} text-right`}>Declined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((b) => (
            <tr key={b.key}>
              <td className={tdClass}>{b.title}</td>
              <td className={`${tdClass} text-right tabular-nums`}>{b.sent}</td>
              <td className={`${tdClass} text-right tabular-nums`}>{b.completed}</td>
              <td className={`${tdClass} text-right tabular-nums`}>{b.declined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllReports({ range, onRangeChange, showToast }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [filters, setFilters] = useState({ status: 'all', owner: 'all', type: 'all' });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [sort, setSort] = useState('-sent_on');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [chartView, setChartView] = useState('chart');
  const requestId = useRef(0);

  const params = useMemo(() => ({
    from: range.from,
    to: range.to,
    status: filters.status,
    owner: filters.owner,
    type: filters.type,
    search: debouncedSearch
  }), [range.from, range.to, filters, debouncedSearch]);

  // A new filter starts again on page 1
  useEffect(() => { setPage(1); }, [params, pageSize]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch(`/reports/overview?${query({ ...params, sort, page, pageSize })}`);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [params, sort, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const toggleStatus = (status) => setFilter('status', filters.status === status ? 'all' : status);
  const clearFilters = () => {
    setFilters({ status: 'all', owner: 'all', type: 'all' });
    setSearch('');
  };
  const filtered = filters.status !== 'all' || filters.owner !== 'all' || filters.type !== 'all' || search.trim();

  const exportCsv = async (kind) => {
    setExporting(true);
    try {
      await apiDownload(`/reports/export?${query({ ...params, kind })}`, `bexsign-${kind}.csv`);
      showToast('success', 'CSV downloaded.');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setExporting(false);
    }
  };

  const k = data?.kpis;
  const options = data?.filterOptions;

  return (
    <div className="space-y-5">
      {/* Filters scope everything below */}
      <section className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <DateRangeControl range={range} onChange={onRangeChange} />
          <div className="flex flex-wrap items-center gap-2">
            <SelectInput
              label="Status"
              value={filters.status}
              onChange={(v) => setFilter('status', v)}
              options={[['all', 'All statuses'], ...Object.entries(STATUS_META).map(([key, m]) => [key, m.label])]}
            />
            <SelectInput
              label="Owner"
              value={String(filters.owner)}
              onChange={(v) => setFilter('owner', v)}
              options={[['all', 'All owners'], ...(options?.owners || []).map((o) => [String(o.id), o.name])]}
              className="max-w-[12rem]"
            />
            <SelectInput
              label="Document type"
              value={filters.type}
              onChange={(v) => setFilter('type', v)}
              options={[['all', 'All types'], ...(options?.types || []).map((t) => [t, t])]}
            />
            {can('reports.export') && <ExportMenu options={DOC_EXPORTS} onExport={exportCsv} busy={exporting} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Calendar size={13} className="text-slate-400" />
          <span className="font-semibold text-slate-700">{rangeLabel(range)}</span>
          {data?.scope && <Badge tone="slate">{SCOPE_TEXT[data.scope]}{data.department ? ` · ${data.department}` : ''}</Badge>}
          {filtered && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 font-bold text-[#007355] hover:underline cursor-pointer">
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      </section>

      <ErrorBanner message={error} onRetry={load} />

      {!data && loading && <LoadingBlock label="Loading report..." />}

      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatCard label="Sent" value={fmtNumber(k.sent)} icon={Send} tone="sky" hint={`${fmtNumber(k.total)} documents in total`} />
            <StatCard label="Completed" value={fmtNumber(k.completed)} icon={CheckCircle2} tone="emerald" onClick={() => toggleStatus('completed')} active={filters.status === 'completed'} hint="Click to filter" />
            <StatCard label="In progress" value={fmtNumber(k.inProgress)} icon={Clock} tone="sky" onClick={() => toggleStatus('in_progress')} active={filters.status === 'in_progress'} hint="Awaiting signatures" />
            <StatCard label="Declined" value={fmtNumber(k.declined)} icon={XCircle} tone="rose" onClick={() => toggleStatus('declined')} active={filters.status === 'declined'} />
            <StatCard label="Recalled / expired" value={fmtNumber(k.recalledOrExpired)} icon={Undo2} tone="violet" hint={`${k.recalled} recalled · ${k.expired} expired`} />
            <StatCard label="Drafts" value={fmtNumber(k.drafts)} icon={FileText} tone="slate" onClick={() => toggleStatus('draft')} active={filters.status === 'draft'} hint="Not sent yet" />
            <StatCard label="Completion rate" value={k.completionRate === null ? '-' : `${k.completionRate}%`} icon={Percent} tone="emerald" hint="Completed of sent" />
            <StatCard label="Avg. time to complete" value={fmtDuration(k.avgCompletionSeconds)} icon={Timer} tone="indigo" hint="From sent to completed" />
            <StatCard label="Pending signatures" value={fmtNumber(k.pendingSignatures)} icon={PenLine} tone="orange" hint="Signers still to sign" />
            <StatCard label="Recipients" value={fmtNumber(k.recipients)} icon={Users} tone="sky" hint="On these documents" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card
              className="lg:col-span-2 min-w-0"
              title={data.series.length > 62 ? 'Weekly activity' : 'Daily activity'}
              description="Documents sent, completed and declined per day"
              actions={(
                <div role="group" aria-label="Chart or table" className="inline-flex rounded-lg border border-slate-200 p-0.5">
                  {[['chart', 'Chart', BarChart3], ['table', 'Table', Table2]].map(([id, label, Icon]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChartView(id)}
                      aria-pressed={chartView === id}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${chartView === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              )}
            >
              {chartView === 'chart' ? <ActivityChart series={data.series} /> : <ChartTable series={data.series} />}
            </Card>
            <Card className="min-w-0" title="Status distribution" description="Click a status to filter the report">
              {k.total ? (
                <StatusDonut breakdown={data.statusBreakdown} selected={filters.status === 'all' ? '' : filters.status} onSelect={toggleStatus} />
              ) : (
                <EmptyState icon={BarChart3} title="No documents" description="Nothing was sent or drafted in this period." />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <Card className="min-w-0" title="Top senders" description="Documents sent in this period">
              {data.topSenders.length ? <TopSenders senders={data.topSenders} /> : <EmptyState icon={Send} title="No documents sent" />}
            </Card>
            <Card className="min-w-0" title="Recipient funnel" description="From request to signature">
              {data.funnel.sent ? <RecipientFunnel funnel={data.funnel} /> : <EmptyState icon={Users} title="No signing requests" />}
            </Card>
            <Card className="min-w-0 md:col-span-2 xl:col-span-1" title="Document types" description="Documents per type">
              {data.documentTypes.length ? <DocumentTypes types={data.documentTypes} /> : <EmptyState icon={FileText} title="No documents" />}
            </Card>
          </div>

          <Card
            className="min-w-0"
            bodyClassName="p-0"
            title="Documents"
            description={`${fmtNumber(data.pagination.total)} document${data.pagination.total === 1 ? '' : 's'} sent or created in this period`}
            actions={<SearchInput value={search} onChange={setSearch} placeholder="Search documents or owners" className="w-full sm:w-64" />}
          >
            {data.documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={filtered ? 'No documents match these filters' : 'No documents in this period'}
                description={filtered ? 'Try another status, owner or search.' : 'Choose a longer date range to see more.'}
                action={filtered ? <Button variant="secondary" icon={X} onClick={clearFilters}>Clear filters</Button> : null}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <SortHeader label="Document" field="name" sort={sort} onSort={setSort} />
                      <SortHeader label="Owner" field="owner" sort={sort} onSort={setSort} className="hidden md:table-cell" />
                      <SortHeader label="Type" field="type" sort={sort} onSort={setSort} className="hidden lg:table-cell" />
                      <SortHeader label="Sent on" field="sent_on" sort={sort} onSort={setSort} className="hidden sm:table-cell" />
                      <SortHeader label="Signed" field="recipients" sort={sort} onSort={setSort} className="hidden md:table-cell" />
                      <SortHeader label="Status" field="status" sort={sort} onSort={setSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.documents.map((d) => (
                      <tr
                        key={d.id}
                        tabIndex={0}
                        onClick={() => navigate(`/documents/${d.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/documents/${d.id}`); }}
                        className="hover:bg-slate-50 cursor-pointer focus:outline-none focus-visible:bg-emerald-50"
                        aria-label={`Open ${d.name}`}
                      >
                        <td className={`${tdClass} max-w-[14rem] sm:max-w-xs`}>
                          <p className="font-bold text-slate-900 truncate">{d.name}</p>
                          <p className="text-[11px] text-slate-500 truncate md:hidden">{d.owner.name}</p>
                          <p className="text-[11px] text-slate-500 sm:hidden">{d.sentOn ? formatDateTime(d.sentOn) : 'Not sent'}</p>
                        </td>
                        <td className={`${tdClass} hidden md:table-cell max-w-[12rem]`}>
                          <p className="font-semibold text-slate-800 truncate">{d.owner.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{d.owner.email}</p>
                        </td>
                        <td className={`${tdClass} hidden lg:table-cell`}>{d.type}</td>
                        <td className={`${tdClass} hidden sm:table-cell whitespace-nowrap`}>
                          {d.sentOn ? formatDateTime(d.sentOn) : <span className="text-slate-400">Not sent · created {formatDateTime(d.createdAt, { withTime: false })}</span>}
                        </td>
                        <td className={`${tdClass} hidden md:table-cell whitespace-nowrap tabular-nums`}>
                          <span className="font-bold text-slate-900">{d.signed}</span>
                          <span className="text-slate-500"> / {d.signers} signer{d.signers === 1 ? '' : 's'}</span>
                          {d.recipients > d.signers && <span className="block text-[11px] text-slate-400">{d.recipients} recipients</span>}
                        </td>
                        <td className={tdClass}><StatusBadge status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} pageSize={pageSize} total={data.pagination.total} onPage={setPage} onPageSize={setPageSize} pageSizes={[10, 25, 50]} />
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------- Timeline ---------- */

const EVENT_META = {
  sent: { label: 'Sent', icon: Send, tone: 'sky' },
  viewed: { label: 'Viewed', icon: Eye, tone: 'indigo' },
  signed: { label: 'Signed', icon: PenLine, tone: 'emerald' },
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'emerald' },
  declined: { label: 'Declined', icon: XCircle, tone: 'rose' },
  reminder: { label: 'Reminder', icon: BellRing, tone: 'amber' },
  recalled: { label: 'Recalled', icon: Undo2, tone: 'violet' },
  assigned: { label: 'Reassigned', icon: UserCheck, tone: 'orange' },
  other: { label: 'Other', icon: Activity, tone: 'slate' }
};

function dayHeading(key) {
  const now = new Date();
  const today = ymd(now);
  const yesterday = ymd(addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -1));
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return fmtDay(key, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function TimelineTab({ range, onRangeChange, showToast }) {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [events, setEvents] = useState([]);
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);
  const PAGE_SIZE = 25;

  const params = useMemo(() => ({ from: range.from, to: range.to, type, search: debouncedSearch }), [range.from, range.to, type, debouncedSearch]);

  const load = useCallback(async (nextPage = 1) => {
    const id = ++requestId.current;
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const result = await apiFetch(`/reports/timeline?${query({ ...params, page: nextPage, pageSize: PAGE_SIZE })}`);
      if (id !== requestId.current) return;
      setEvents((prev) => (nextPage === 1 ? result.events : [...prev, ...result.events]));
      setCounts(result.counts);
      setTotal(result.pagination.total);
      setPage(nextPage);
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [params]);

  useEffect(() => { load(1); }, [load]);

  const groups = useMemo(() => {
    const out = [];
    events.forEach((e) => {
      const key = ymd(new Date(e.createdAt));
      if (!out.length || out[out.length - 1].key !== key) out.push({ key, items: [] });
      out[out.length - 1].items.push(e);
    });
    return out;
  }, [events]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await apiDownload(`/reports/export?${query({ ...params, kind: 'timeline' })}`, 'bexsign-timeline.csv');
      showToast('success', 'CSV downloaded.');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setExporting(false);
    }
  };

  const filtered = type !== 'all' || search.trim();

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <DateRangeControl range={range} onChange={onRangeChange} />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search events, documents, emails" className="w-full sm:w-72" />
            {can('reports.export') && <ExportMenu options={[{ kind: 'timeline' }]} onExport={exportCsv} busy={exporting} />}
          </div>
        </div>
        <div role="group" aria-label="Event type" className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {[['all', { label: 'All events', icon: Activity, tone: 'slate' }], ...Object.entries(EVENT_META)].map(([id, meta]) => {
            const active = type === id;
            const count = counts ? counts[id] : null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-xs font-bold transition cursor-pointer ${active ? 'border-[#007355] bg-emerald-50 text-[#007355]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${tone(meta.tone).icon}`}><meta.icon size={11} /></span>
                {meta.label}
                {count !== null && <span className="text-[10px] tabular-nums text-slate-400">{count}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <ErrorBanner message={error} onRetry={() => load(1)} />

      {loading && !events.length ? (
        <LoadingBlock label="Loading timeline..." />
      ) : !events.length && !error ? (
        <Card>
          <EmptyState
            icon={Activity}
            title={filtered ? 'No events match these filters' : 'No activity in this period'}
            description={filtered ? 'Try another event type or search.' : `Nothing happened between ${rangeLabel(range)}.`}
          />
        </Card>
      ) : (
        <Card
          className={`min-w-0 transition-opacity ${loading ? 'opacity-60' : ''}`}
          title={`${fmtNumber(total)} event${total === 1 ? '' : 's'}`}
          description={rangeLabel(range)}
        >
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key} aria-label={dayHeading(group.key)}>
                <h3 className="sticky top-0 z-10 bg-white/95 backdrop-blur py-1 mb-3 text-[11px] font-black uppercase tracking-wide text-slate-500 flex items-center gap-2">
                  {dayHeading(group.key)}
                  <span className="text-slate-400 font-bold normal-case tracking-normal">{group.items.length} event{group.items.length === 1 ? '' : 's'}</span>
                </h3>
                <ol className="relative">
                  {group.items.map((e, i) => {
                    const meta = EVENT_META[e.type] || EVENT_META.other;
                    const last = i === group.items.length - 1;
                    return (
                      <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && <span className="absolute left-[17px] top-10 bottom-0 w-px bg-slate-200" aria-hidden="true" />}
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone(meta.tone).icon}`}>
                          <meta.icon size={16} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300 transition">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            <time dateTime={e.createdAt} className="text-[11px] font-semibold text-slate-500" title={formatDateTime(e.createdAt)}>
                              {new Date(e.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </time>
                            <span className="text-[11px] text-slate-400">{formatRelative(e.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-800 mt-1 break-words">{e.description}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <button
                              type="button"
                              onClick={() => navigate(`/documents/${e.document.id}`)}
                              className="inline-flex items-center gap-1 font-bold text-[#007355] hover:underline cursor-pointer min-w-0 max-w-full"
                            >
                              <FileText size={12} className="shrink-0" />
                              <span className="truncate">{e.document.name}</span>
                            </button>
                            <span className="truncate max-w-full">Owner: {e.owner.name}</span>
                            {e.ip && <span>IP {e.ip}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
          {events.length < total && (
            <div className="mt-5 flex flex-col items-center gap-1.5">
              <Button variant="secondary" busy={loadingMore} onClick={() => load(page + 1)}>Load more</Button>
              <span className="text-[11px] text-slate-500">Showing {fmtNumber(events.length)} of {fmtNumber(total)}</span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ---------- Scheduled reports ---------- */

const REPORT_TYPES = [
  { value: 'document_summary', label: 'Document summary', description: 'Every document with its status, recipients and time to complete' },
  { value: 'activity_timeline', label: 'Activity timeline', description: 'All document events: sent, viewed, signed, completed, declined...' },
  { value: 'recipient_status', label: 'Recipient status', description: 'Each recipient with sent, viewed, signed and declined times' },
  { value: 'user_activity', label: 'User activity', description: 'Documents sent and completed per user' }
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_TEXT = { daily: 'previous day', weekly: 'last 7 days', monthly: 'previous calendar month' };
const RUN_TONES = { success: 'emerald', partial: 'amber', failed: 'rose' };
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[a-z]{2,}$/i;

function formatTime(hhmm) {
  const [h, m] = String(hhmm || '09:00').split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function describeSchedule(s) {
  const at = formatTime(s.timeOfDay);
  if (s.frequency === 'daily') return `Daily at ${at}`;
  if (s.frequency === 'weekly') return `Every ${WEEKDAYS[s.dayOfWeek ?? 1]} at ${at}`;
  return `Monthly on day ${s.dayOfMonth ?? 1} at ${at}`;
}

function formatUntil(value) {
  if (!value) return '';
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  if (Number.isNaN(diff)) return '';
  if (diff <= 60) return 'due now';
  if (diff < 3600) return `in ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `in ${Math.round(diff / 3600)} h`;
  return `in ${Math.round(diff / 86400)} d`;
}

function RecipientInput({ value, onChange, error }) {
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState('');
  const commit = (text = draft) => {
    const parts = text.split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return true;
    const bad = parts.filter((p) => !EMAIL_RE.test(p));
    const good = parts.filter((p) => EMAIL_RE.test(p) && !value.includes(p));
    if (good.length) onChange([...value, ...good]);
    setDraft(bad.join(', '));
    setInvalid(bad.length ? `${bad.join(', ')} ${bad.length === 1 ? 'is not a valid email' : 'are not valid emails'}.` : '');
    return !bad.length;
  };
  return (
    <div>
      <div className={`flex flex-wrap items-center gap-1.5 px-2 py-1.5 border rounded-xl bg-white focus-within:border-[#007355] focus-within:ring-2 focus-within:ring-emerald-100 ${error || invalid ? 'border-red-300' : 'border-slate-300'}`}>
        {value.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 max-w-full">
            <span className="truncate">{email}</span>
            <button type="button" onClick={() => onChange(value.filter((e) => e !== email))} aria-label={`Remove ${email}`} className="p-0.5 rounded-full hover:bg-emerald-100 cursor-pointer">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            const text = e.target.value;
            if (/[,;\s]$/.test(text)) commit(text);
            else setDraft(text);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => commit()}
          placeholder={value.length ? 'Add another email' : 'name@company.com'}
          aria-label="Recipient email"
          className="flex-1 min-w-[10rem] px-1 py-1 text-sm bg-transparent focus:outline-none"
        />
      </div>
      {(invalid || error) && <p className="text-[11px] text-red-600 mt-1" role="alert">{invalid || error}</p>}
      <p className="text-[11px] text-slate-400 mt-1">Press Enter or comma after each email. Each recipient gets their own email.</p>
    </div>
  );
}

const emptySchedule = () => {
  const me = getLoggedInUser();
  return {
    name: '',
    reportType: 'document_summary',
    frequency: 'weekly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timeOfDay: '09:00',
    recipients: me?.email ? [me.email.toLowerCase()] : [],
    status: 'all',
    isActive: true
  };
};

function ScheduleModal({ open, schedule, onClose, onSaved }) {
  const [form, setForm] = useState(emptySchedule);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setServerError('');
    setForm(schedule ? {
      name: schedule.name,
      reportType: schedule.reportType,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek ?? 1,
      dayOfMonth: schedule.dayOfMonth ?? 1,
      timeOfDay: schedule.timeOfDay,
      recipients: schedule.recipients,
      status: schedule.filters?.status || 'all',
      isActive: schedule.isActive
    } : emptySchedule());
  }, [open, schedule]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e?.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Give the report a name.';
    if (!form.recipients.length) next.recipients = 'Add at least one recipient email.';
    if (!/^\d{2}:\d{2}$/.test(form.timeOfDay)) next.timeOfDay = 'Choose a time.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setServerError('');
    try {
      const body = {
        name: form.name.trim(),
        reportType: form.reportType,
        frequency: form.frequency,
        dayOfWeek: Number(form.dayOfWeek),
        dayOfMonth: Number(form.dayOfMonth),
        timeOfDay: form.timeOfDay,
        recipients: form.recipients,
        filters: form.status !== 'all' && form.reportType !== 'activity_timeline' ? { status: form.status } : {},
        isActive: form.isActive
      };
      const result = await apiFetch(schedule ? `/reports/scheduled/${schedule.id}` : '/reports/scheduled', { method: schedule ? 'PUT' : 'POST', body });
      onSaved(result.schedule, Boolean(schedule));
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const type = REPORT_TYPES.find((t) => t.value === form.reportType);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CalendarClock}
      title={schedule ? 'Edit scheduled report' : 'New scheduled report'}
      description="The report is emailed as a CSV attachment."
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={schedule ? CheckCircle2 : Plus} busy={saving} onClick={save}>{schedule ? 'Save changes' : 'Create schedule'}</Button>
        </>
      )}
    >
      <form onSubmit={save} className="space-y-4" noValidate>
        <ErrorBanner message={serverError} />
        <Field label="Name" required>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={150} placeholder="e.g. Weekly signing summary" className={inputClass} aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="block text-[11px] text-red-600 mt-1">{errors.name}</span>}
        </Field>
        <Field label="Report" hint={type?.description}>
          <select value={form.reportType} onChange={(e) => set('reportType', e.target.value)} className={inputClass}>
            {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <div>
          <span className="block text-xs font-bold text-slate-700 mb-1">Frequency</span>
          <div role="radiogroup" aria-label="Frequency" className="grid grid-cols-3 gap-1.5">
            {['daily', 'weekly', 'monthly'].map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={form.frequency === f}
                onClick={() => set('frequency', f)}
                className={`py-2 rounded-xl border text-xs font-bold capitalize transition cursor-pointer ${form.frequency === f ? 'border-[#007355] bg-emerald-50 text-[#007355]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Each email covers the {PERIOD_TEXT[form.frequency]}.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {form.frequency === 'weekly' && (
            <Field label="Day of week">
              <select value={form.dayOfWeek} onChange={(e) => set('dayOfWeek', Number(e.target.value))} className={inputClass}>
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Field>
          )}
          {form.frequency === 'monthly' && (
            <Field label="Day of month" hint="Shorter months send on their last day.">
              <select value={form.dayOfMonth} onChange={(e) => set('dayOfMonth', Number(e.target.value))} className={inputClass}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          )}
          <Field label="Time" hint="Server time">
            <input type="time" value={form.timeOfDay} onChange={(e) => set('timeOfDay', e.target.value)} className={inputClass} aria-invalid={Boolean(errors.timeOfDay)} />
            {errors.timeOfDay && <span className="block text-[11px] text-red-600 mt-1">{errors.timeOfDay}</span>}
          </Field>
        </div>
        {form.reportType !== 'activity_timeline' && (
          <Field label="Documents" hint="Limit the report to one document status.">
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_META).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
            </select>
          </Field>
        )}
        <div>
          <span className="block text-xs font-bold text-slate-700 mb-1">Recipients <span className="text-red-500">*</span></span>
          <RecipientInput value={form.recipients} onChange={(v) => set('recipients', v)} error={errors.recipients} />
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active" description="Paused schedules keep their settings but send nothing." />
        </div>
      </form>
    </Modal>
  );
}

function RunHistoryModal({ schedule, onClose }) {
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!schedule) return;
    setRuns(null);
    setError('');
    try {
      const result = await apiFetch(`/reports/scheduled/${schedule.id}/runs`);
      setRuns(result.runs);
    } catch (err) {
      setError(err.message);
      setRuns([]);
    }
  }, [schedule]);
  useEffect(() => { load(); }, [load]);

  return (
    <Modal open={Boolean(schedule)} onClose={onClose} icon={History} size="lg" title="Run history" description={schedule?.name}>
      <ErrorBanner message={error} onRetry={load} />
      {runs === null ? (
        <LoadingBlock label="Loading runs..." />
      ) : runs.length === 0 && !error ? (
        <EmptyState icon={History} title="No runs yet" description="Runs appear here after the first scheduled or manual send." />
      ) : runs.length > 0 && (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className={thClass}>Run at</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={`${thClass} text-right`}>Rows</th>
                <th scope="col" className={thClass}>Sent to</th>
                <th scope="col" className={thClass}>File / error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <p className="font-semibold text-slate-800">{formatDateTime(r.runAt)}</p>
                    <p className="text-[11px] text-slate-500">{r.triggeredBy === 'manual' ? 'Sent manually' : 'On schedule'}</p>
                  </td>
                  <td className={tdClass}><Badge tone={RUN_TONES[r.status] || 'slate'} dot>{r.status}</Badge></td>
                  <td className={`${tdClass} text-right tabular-nums`}>{fmtNumber(r.rowCount)}</td>
                  <td className={`${tdClass} max-w-[12rem]`}>
                    <p className="truncate" title={r.recipients.join(', ')}>{r.recipients.join(', ') || '-'}</p>
                  </td>
                  <td className={`${tdClass} max-w-[16rem]`}>
                    {r.error ? <p className="text-red-600 break-words">{r.error}</p> : <p className="truncate text-slate-600" title={r.fileName}>{r.fileName}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function ScheduleCard({ schedule: s, showOwner, busy, onToggle, onRun, onHistory, onEdit, onDelete }) {
  const shown = s.recipients.slice(0, 3);
  return (
    <li className={`bg-white border rounded-2xl shadow-sm flex flex-col min-w-0 ${s.isActive ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.isActive ? 'bg-emerald-100 text-[#007355]' : 'bg-slate-100 text-slate-400'}`}>
              <CalendarClock size={19} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900 break-words">{s.name}</h3>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge tone="indigo">{s.reportTypeLabel}</Badge>
                {!s.canManage && <Badge tone={s.isActive ? 'emerald' : 'slate'}>{s.isActive ? 'Active' : 'Paused'}</Badge>}
              </div>
            </div>
          </div>
          {s.canManage && (
            <div className="shrink-0">
              <Toggle checked={s.isActive} onChange={(v) => onToggle(s, v)} label="Active" disabled={busy} />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-600">
          <strong className="text-slate-800">{describeSchedule(s)}</strong>
          <span className="text-slate-500"> · covers the {PERIOD_TEXT[s.frequency]}</span>
          {s.filters?.status && <span className="text-slate-500"> · {STATUS_META[s.filters.status]?.label.toLowerCase()} only</span>}
        </p>
        <div className="flex flex-wrap gap-1.5" aria-label="Recipients">
          {shown.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 max-w-full">
              <Mail size={11} className="shrink-0 text-slate-400" /><span className="truncate">{email}</span>
            </span>
          ))}
          {s.recipients.length > shown.length && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-500" title={s.recipients.slice(3).join(', ')}>+{s.recipients.length - shown.length} more</span>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Next run</dt>
            <dd className="font-semibold text-slate-800 mt-0.5">
              {s.isActive && s.nextRunAt ? (
                <>
                  <span className="block">{formatDateTime(s.nextRunAt)}</span>
                  <span className="text-[11px] text-slate-500">{formatUntil(s.nextRunAt)}</span>
                </>
              ) : <span className="text-slate-400">Paused</span>}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Last run</dt>
            <dd className="mt-0.5">
              {s.lastRunAt ? (
                <>
                  <Badge tone={RUN_TONES[s.lastStatus] || 'slate'} dot>{s.lastStatus || 'unknown'}</Badge>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{formatRelative(s.lastRunAt)}</span>
                </>
              ) : <span className="font-semibold text-slate-400">Never</span>}
            </dd>
          </div>
        </dl>
        {showOwner && <p className="text-[11px] text-slate-500 truncate">Owner: <strong className="text-slate-700">{s.owner.name}</strong> {s.owner.email && `(${s.owner.email})`}</p>}
      </div>
      <div className="px-3 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1">
        {s.canManage && <Button variant="ghost" icon={Send} busy={busy} onClick={() => onRun(s)}>Send now</Button>}
        {s.canManage && <Button variant="ghost" icon={History} onClick={() => onHistory(s)}>History{s.runCount ? ` (${s.runCount})` : ''}</Button>}
        {s.canManage && (
          <span className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => onEdit(s)} aria-label={`Edit ${s.name}`} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"><Pencil size={15} /></button>
            <button type="button" onClick={() => onDelete(s)} aria-label={`Delete ${s.name}`} className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 size={15} /></button>
          </span>
        )}
      </div>
    </li>
  );
}

function ScheduledTab({ showToast }) {
  const { can, loading: permsLoading } = usePermissions();
  const allowed = can('reports.schedule');
  const [schedules, setSchedules] = useState(null);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [history, setHistory] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await apiFetch('/reports/scheduled');
      setSchedules(result.schedules);
      setCanSeeAll(result.canSeeAll);
    } catch (err) {
      setError(err.message);
      setSchedules((prev) => prev || []);
    }
  }, []);

  useEffect(() => {
    if (!permsLoading && allowed) load();
  }, [permsLoading, allowed, load]);

  const replace = (schedule) => setSchedules((list) => (list || []).map((s) => (s.id === schedule.id ? schedule : s)));

  const toggle = async (s, isActive) => {
    replace({ ...s, isActive });
    setBusyId(s.id);
    try {
      const result = await apiFetch(`/reports/scheduled/${s.id}`, { method: 'PUT', body: { isActive } });
      replace(result.schedule);
      showToast('success', `"${s.name}" ${isActive ? 'resumed' : 'paused'}.`);
    } catch (err) {
      replace(s);
      showToast('error', err.message);
    } finally {
      setBusyId(null);
    }
  };

  const run = async (s) => {
    setBusyId(s.id);
    try {
      const result = await apiFetch(`/reports/scheduled/${s.id}/run`, { method: 'POST' });
      if (result.schedule) replace(result.schedule);
      showToast(result.run?.status === 'partial' ? 'error' : 'success', result.message || 'Report sent.');
    } catch (err) {
      showToast('error', err.message);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await apiFetch(`/reports/scheduled/${deleting.id}`, { method: 'DELETE' });
      setSchedules((list) => list.filter((s) => s.id !== deleting.id));
      showToast('success', `"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEditor = (schedule = null) => {
    setEditing(schedule);
    setModalOpen(true);
  };

  if (permsLoading) return <LoadingBlock />;
  if (!allowed) {
    return (
      <Card>
        <EmptyState icon={Lock} title="Scheduled reports are not available to you" description="Scheduling report emails needs the &quot;Schedule reports&quot; permission. Ask a manager to grant it." />
      </Card>
    );
  }

  const active = (schedules || []).filter((s) => s.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {schedules && (
            <>
              <strong className="text-slate-800">{schedules.length}</strong> scheduled report{schedules.length === 1 ? '' : 's'} · <strong className="text-slate-800">{active}</strong> active
              {canSeeAll && <span> · showing every user&apos;s schedules</span>}
            </>
          )}
        </div>
        <Button icon={Plus} onClick={() => openEditor(null)}>New schedule</Button>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {schedules === null ? (
        <LoadingBlock label="Loading scheduled reports..." />
      ) : schedules.length === 0 ? (
        !error && (
          <Card>
            <EmptyState
              icon={CalendarClock}
              title="No scheduled reports yet"
              description="Get a CSV report by email every day, week or month, for example a weekly summary of completed documents."
              action={<Button icon={Plus} onClick={() => openEditor(null)}>Create your first schedule</Button>}
            />
          </Card>
        )
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              showOwner={canSeeAll}
              busy={busyId === s.id}
              onToggle={toggle}
              onRun={run}
              onHistory={setHistory}
              onEdit={openEditor}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}

      <ScheduleModal
        open={modalOpen}
        schedule={editing}
        onClose={() => setModalOpen(false)}
        onSaved={(schedule, updated) => {
          setModalOpen(false);
          if (updated) replace(schedule);
          else setSchedules((list) => [schedule, ...(list || [])]);
          showToast('success', updated ? 'Schedule saved.' : `"${schedule.name}" scheduled.`);
        }}
      />
      <RunHistoryModal schedule={history} onClose={() => setHistory(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete scheduled report?"
        message={deleting ? `"${deleting.name}" and its run history will be deleted. No more emails will be sent.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/* ---------- Page ---------- */

export default function Reports() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const active = TABS.some((t) => t.id === tab) ? tab : 'all';
  const [range, setRange] = useState(() => ({ preset: '30d', ...presetRange('30d') }));
  const [toast, showToast] = useToast();

  useEffect(() => {
    if (tab !== active) navigate(`/reports/${active}`, { replace: true });
  }, [tab, active, navigate]);

  const text = TAB_TEXT[active];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Reports" title={text.title} description={text.description} icon={BarChart3}>
        {/* 1px bottom padding: the kit tab strip otherwise overflows by 1px and shows a scrollbar */}
        <div className="[&_[role=tablist]]:pb-px">
          <Tabs tabs={TABS} active={active} onChange={(id) => navigate(`/reports/${id}`)} />
        </div>
      </PageHeader>

      {!can('reports.view') ? (
        <Card>
          <EmptyState icon={Lock} title="Reports are not available to you" description="Viewing reports needs the &quot;View reports&quot; permission. Ask a manager to grant it." />
        </Card>
      ) : (
        <>
          {active === 'all' && <AllReports range={range} onRangeChange={setRange} showToast={showToast} />}
          {active === 'timeline' && <TimelineTab range={range} onRangeChange={setRange} showToast={showToast} />}
          {active === 'scheduled' && <ScheduledTab showToast={showToast} />}
        </>
      )}
      {toast}
    </div>
  );
}
