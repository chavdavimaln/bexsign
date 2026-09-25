import React, { useCallback, useEffect, useState } from 'react';
import {
  Trash2, RotateCcw, FileText, PenTool, FileBox, Contact, FileSignature, Hourglass, Timer, Layers, User, Settings2, Info, ShieldAlert
} from 'lucide-react';
import {
  PageHeader, StatCard, Card, Button, Badge, SearchInput, SelectInput, Tabs, EmptyState, ErrorBanner, LoadingBlock, Pagination, ConfirmDialog,
  Modal, Field, inputClass, useToast, formatDateTime, formatRelative, thClass, tdClass
} from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';

/**
 * Trash (Settings > Trash): everything deleted on the site - request documents, self-sign documents, templates,
 * saved signatures and contacts. Restore or delete for good, one by one or in bulk; items are removed
 * automatically when the retention period ends. People with "Organization trash" can see everyone's items and
 * change the retention period.
 */

const TYPE_UI = {
  document: { icon: FileText, tone: 'sky', color: 'bg-sky-50 text-sky-600' },
  self_sign: { icon: FileSignature, tone: 'violet', color: 'bg-violet-50 text-violet-600' },
  template: { icon: FileBox, tone: 'amber', color: 'bg-amber-50 text-amber-600' },
  signature: { icon: PenTool, tone: 'emerald', color: 'bg-emerald-50 text-[#007355]' },
  contact: { icon: Contact, tone: 'indigo', color: 'bg-indigo-50 text-indigo-600' }
};

function DaysLeft({ item }) {
  if (item.days_left === null || item.days_left === undefined) return <span className="text-slate-400">-</span>;
  const urgent = item.days_left <= 3;
  return (
    <span title={`Deleted for good on ${formatDateTime(item.purge_after)}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${urgent ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
      <Hourglass size={11} /> {item.days_left === 0 ? 'Today' : `${item.days_left} day${item.days_left === 1 ? '' : 's'}`}
    </span>
  );
}

function ItemCell({ item }) {
  const ui = TYPE_UI[item.item_type] || TYPE_UI.document;
  const Icon = ui.icon;
  return (
    <span className="flex items-center gap-3 min-w-0">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ui.color}`}><Icon size={17} /></span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900 truncate max-w-[340px]" title={item.title}>{item.title}</span>
        <span className="block text-[11px] text-slate-500 truncate max-w-[340px]">{[item.subtitle, item.size_hint].filter(Boolean).join(' · ') || item.type_label}</span>
      </span>
    </span>
  );
}

export default function Trash() {
  const [toast, showToast] = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('all');
  const [scope, setScope] = useState('mine');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null); // { action: 'delete' | 'empty', ids }
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState([]);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retention, setRetention] = useState(30);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [debounced, type, sort, scope, pageSize]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ type: type === 'all' ? '' : type, search: debounced, sort, scope, page, pageSize });
      const res = await apiFetch(`/trash/items?${qs}`);
      setData(res);
      setRetention(res.retentionDays);
      setSelected((prev) => prev.filter((id) => res.items.some((i) => i.id === id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, debounced, sort, scope, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items || [];
  const counts = data?.counts || {};
  const allOnPage = items.length > 0 && items.every((i) => selected.includes(i.id));

  const restore = async (ids) => {
    setRestoring(ids);
    try {
      const res = await apiFetch('/trash/items/restore', { method: 'POST', body: { ids } });
      showToast(res.failed?.length ? 'error' : 'success', res.failed?.length ? `${res.message} ${res.failed[0].error}` : res.message);
      setSelected((s) => s.filter((id) => !ids.includes(id)));
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setRestoring([]);
    }
  };

  const runConfirm = async () => {
    setBusy(true);
    try {
      const res = confirm.action === 'empty'
        ? await apiFetch('/trash/empty', { method: 'POST', body: { type: type === 'all' ? null : type, scope } })
        : await apiFetch('/trash/items/delete', { method: 'POST', body: { ids: confirm.ids } });
      showToast('success', res.message);
      setConfirm(null);
      setSelected([]);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRetention = async () => {
    setBusy(true);
    try {
      const res = await apiFetch('/trash/settings', { method: 'PUT', body: { retentionDays: Number(retention) } });
      showToast('success', res.message);
      setRetentionOpen(false);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All items', icon: Layers, count: counts.all ?? 0 },
    ...((data?.types || []).map((t) => ({ id: t.key, label: t.plural, icon: TYPE_UI[t.key]?.icon, count: counts[t.key] ?? 0 })))
  ];
  const typeLabel = type === 'all' ? 'items' : (data?.types || []).find((t) => t.key === type)?.plural.toLowerCase() || 'items';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Trash"
        icon={Trash2}
        description={`Everything deleted from BexSign: documents, self-sign documents, templates, signatures and contacts. Restore what you need; items are deleted for good ${data ? `${data.retentionDays} days` : 'some days'} after they were moved here.`}
        actions={(
          <>
            {data?.canManageAll && (
              <SelectInput value={scope} onChange={setScope} label="Whose items" options={[['mine', 'My items'], ['all', "Everyone's items"]]} />
            )}
            <Button variant="subtleDanger" icon={Trash2} disabled={!counts.all} onClick={() => setConfirm({ action: 'empty' })}>
              {type === 'all' ? 'Empty trash' : `Empty ${typeLabel}`}
            </Button>
          </>
        )}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="In the trash" value={counts.all ?? '-'} icon={Trash2} tone="slate" hint={scope === 'all' ? 'Across the organization' : 'Owned or deleted by you'} />
        <StatCard label="Deleted soon" value={data?.expiringSoon ?? '-'} icon={Timer} tone="rose" hint="Within the next 3 days" onClick={() => setSort(sort === 'expiring' ? 'newest' : 'expiring')} active={sort === 'expiring'} />
        <StatCard label="Documents" value={counts.document ?? '-'} icon={FileText} tone="sky" hint="Signature requests" onClick={() => setType(type === 'document' ? 'all' : 'document')} active={type === 'document'} />
        <StatCard
          label="Kept for"
          value={data ? `${data.retentionDays} days` : '-'}
          icon={Hourglass}
          tone="violet"
          hint={data?.canManageAll ? 'Click to change' : 'Set by your administrator'}
          onClick={data?.canManageAll ? () => setRetentionOpen(true) : undefined}
        />
      </div>

      <Card bodyClassName="p-0">
        <div className="px-3 sm:px-4 pt-2">
          <Tabs tabs={tabs} active={type} onChange={setType} />
        </div>
        <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search deleted items" className="sm:w-80" />
          <SelectInput value={sort} onChange={setSort} label="Sort" className="sm:ml-auto" options={[['newest', 'Recently deleted'], ['oldest', 'Deleted longest ago'], ['expiring', 'Deleted for good soonest'], ['name', 'Name A-Z']]} />
        </div>

        {selected.length > 0 && (
          <div className="px-3 sm:px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-emerald-900">{selected.length} selected</span>
            <Button icon={RotateCcw} busy={restoring.length > 1} onClick={() => restore(selected)} className="!py-1.5">Restore</Button>
            <Button variant="subtleDanger" icon={Trash2} onClick={() => setConfirm({ action: 'delete', ids: selected })} className="!py-1.5">Delete forever</Button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs font-bold text-emerald-800 hover:underline cursor-pointer">Clear selection</button>
          </div>
        )}

        {!data && loading && <LoadingBlock label="Loading the trash..." />}
        {data && items.length === 0 && (
          <EmptyState
            icon={Trash2}
            title={debounced ? 'Nothing matches your search' : 'The trash is empty'}
            description={debounced ? 'Try another search or type.' : `Deleted ${typeLabel} appear here for ${data.retentionDays} days, so you can restore them.`}
          />
        )}

        {items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10`}>
                      <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={() => setSelected(allOnPage ? [] : items.map((i) => i.id))} className="accent-[#007355]" />
                    </th>
                    <th className={thClass}>Item</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Deleted by</th>
                    <th className={thClass}>Deleted</th>
                    <th className={thClass}>Deleted for good in</th>
                    <th className={`${thClass} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
                  {items.map((item) => (
                    <tr key={item.id} className={`hover:bg-slate-50/70 ${selected.includes(item.id) ? 'bg-emerald-50/40' : ''}`}>
                      <td className={tdClass}>
                        <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={() => setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]))} className="accent-[#007355]" />
                      </td>
                      <td className={tdClass}><ItemCell item={item} /></td>
                      <td className={tdClass}><Badge tone={TYPE_UI[item.item_type]?.tone}>{item.type_label}</Badge></td>
                      <td className={tdClass}>
                        <span className="flex items-center gap-1.5 text-slate-700"><User size={12} className="text-slate-400" /> {item.deleted_by_name || item.owner_name || '-'}</span>
                        {scope === 'all' && item.owner_email && <span className="block text-[11px] text-slate-400">Owner: {item.owner_email}</span>}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`} title={formatDateTime(item.deleted_at)}>{formatRelative(item.deleted_at)}</td>
                      <td className={tdClass}><DaysLeft item={item} /></td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <div className="inline-flex gap-1.5">
                          <Button variant="secondary" icon={RotateCcw} busy={restoring.includes(item.id) && restoring.length === 1} onClick={() => restore([item.id])} className="!py-1.5">Restore</Button>
                          <button type="button" title="Delete forever" aria-label={`Delete ${item.title} forever`} onClick={() => setConfirm({ action: 'delete', ids: [item.id], title: item.title })} className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="p-3 flex items-start gap-3">
                  <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={() => setSelected((s) => (s.includes(item.id) ? s.filter((x) => x !== item.id) : [...s, item.id]))} className="mt-3 accent-[#007355]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <ItemCell item={item} />
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <Badge tone={TYPE_UI[item.item_type]?.tone}>{item.type_label}</Badge>
                      <span>{formatRelative(item.deleted_at)}</span>
                      <DaysLeft item={item} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" icon={RotateCcw} onClick={() => restore([item.id])} className="!py-1.5 flex-1">Restore</Button>
                      <Button variant="subtleDanger" icon={Trash2} onClick={() => setConfirm({ action: 'delete', ids: [item.id], title: item.title })} className="!py-1.5">Delete</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} pageSize={pageSize} total={data?.total || 0} onPage={setPage} onPageSize={setPageSize} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600">
        <p className="flex items-start gap-2 rounded-xl bg-white border border-slate-200 p-3"><RotateCcw size={14} className="text-[#007355] shrink-0" /> Restoring puts an item back where it was: a document returns with the status it had, a template to Templates, a signature to My Signatures.</p>
        <p className="flex items-start gap-2 rounded-xl bg-white border border-slate-200 p-3"><Hourglass size={14} className="text-violet-600 shrink-0" /> Items are deleted for good automatically {data?.retentionDays || 30} days after they were moved here.</p>
        <p className="flex items-start gap-2 rounded-xl bg-white border border-slate-200 p-3"><ShieldAlert size={14} className="text-rose-600 shrink-0" /> "Delete forever" cannot be undone. Signed PDFs already emailed to recipients are not affected.</p>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.action === 'empty'
          ? (type === 'all' ? 'Empty the trash?' : `Delete all ${typeLabel} in the trash?`)
          : confirm?.ids?.length > 1 ? `Delete ${confirm.ids.length} items forever?` : `Delete "${confirm?.title || 'this item'}" forever?`}
        message={confirm?.action === 'empty'
          ? `Every ${type === 'all' ? 'item' : typeLabel.replace(/s$/, '')} in ${scope === 'all' ? "everyone's" : 'your'} trash is deleted permanently. This cannot be undone.`
          : 'It is deleted permanently and cannot be restored.'}
        confirmLabel={confirm?.action === 'empty' ? 'Empty trash' : 'Delete forever'}
        danger
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />

      <Modal
        open={retentionOpen}
        onClose={() => setRetentionOpen(false)}
        title="How long deleted items are kept"
        description="Applies to everyone's trash, including items already in it."
        icon={Settings2}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRetentionOpen(false)}>Cancel</Button>
            <Button busy={busy} onClick={saveRetention}>Save</Button>
          </>
        )}
      >
        <Field label="Keep deleted items for" hint="After this, items are deleted for good automatically.">
          <select className={inputClass} value={retention} onChange={(e) => setRetention(e.target.value)}>
            {[7, 14, 30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </Field>
        <p className="mt-3 flex items-start gap-2 text-[11px] text-amber-700">
          <Info size={13} className="shrink-0 mt-0.5" /> A shorter period can delete items already in the trash at the next cleanup.
        </p>
      </Modal>
      {toast}
    </div>
  );
}

