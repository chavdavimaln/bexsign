import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Settings as SettingsIcon, Megaphone, Mail, MailOpen, ArrowUpRight, Inbox, Send } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { usePermissions } from '../utils/permissions';
import {
  PageHeader, StatCard, Card, Button, EmptyState, ErrorBanner, LoadingBlock, SearchInput, Tabs, Pagination,
  Modal, ConfirmDialog, Field, inputClass, useToast, formatDateTime, formatRelative
} from '../components/ui/kit';
import { NotificationIcon, NOTIFICATION_CATEGORY_META } from '../components/notifications/notificationUi';

const refreshBell = () => window.dispatchEvent(new Event('bexsign-notifications-changed'));

const dayLabel = (value) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Notifications() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [toast, showToast] = useToast();
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [state, setState] = useState({ status: 'loading', items: [], total: 0, unread: 0, categories: [], error: '' });
  const [confirmClear, setConfirmClear] = useState(false);
  const [broadcast, setBroadcast] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams({ filter, page, pageSize, ...(category ? { category } : {}), ...(search ? { search } : {}) });
    try {
      const data = await apiFetch(`/notifications?${params}`);
      setState({ status: 'ready', items: data.items, total: data.total, unread: data.unread, categories: data.categories, error: '' });
    } catch (err) {
      setState((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, [filter, category, search, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const groups = useMemo(() => {
    const out = [];
    state.items.forEach((n) => {
      const label = dayLabel(n.createdAt);
      const group = out.find((g) => g.label === label);
      if (group) group.items.push(n);
      else out.push({ label, items: [n] });
    });
    return out;
  }, [state.items]);

  const setRead = async (item, read) => {
    try {
      await apiFetch(`/notifications/${item.id}/read`, { method: 'PATCH', body: { read } });
      refreshBell();
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const remove = async (item) => {
    try {
      await apiFetch(`/notifications/${item.id}`, { method: 'DELETE' });
      refreshBell();
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const openItem = async (item) => {
    if (!item.isRead) await setRead(item, true);
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    setBusy('read-all');
    try {
      const data = await apiFetch('/notifications/read-all', { method: 'POST', body: category ? { category } : {} });
      showToast('success', `${data.updated} notification${data.updated === 1 ? '' : 's'} marked as read.`);
      refreshBell();
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy('');
    }
  };

  const clearRead = async () => {
    setBusy('clear');
    try {
      const data = await apiFetch('/notifications/clear-read', { method: 'POST', body: {} });
      showToast('success', data.message);
      setConfirmClear(false);
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy('');
    }
  };

  const sendTest = async () => {
    try {
      const data = await apiFetch('/notifications/test', { method: 'POST', body: {} });
      showToast('success', data.message);
      refreshBell();
      load();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    setBusy('broadcast');
    try {
      const data = await apiFetch('/notifications/broadcast', { method: 'POST', body: broadcast });
      showToast('success', data.message);
      setBroadcast(null);
      refreshBell();
      load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy('');
    }
  };

  const totalAll = state.categories.reduce((sum, c) => sum + c.total, 0);
  const securityUnread = state.categories.find((c) => c.id === 'security')?.unread || 0;
  const signingUnread = state.categories.find((c) => c.id === 'signing')?.unread || 0;

  return (
    <div className="space-y-5 pb-10">
      {toast}
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Updates about your documents, signing requests, email delivery, users and security. The bell in the header shows the latest ones."
        icon={Bell}
        actions={(
          <>
            <Button variant="secondary" icon={SettingsIcon} onClick={() => navigate('/settings/notifications')}>Preferences</Button>
            {can('notifications.broadcast') && (
              <Button variant="secondary" icon={Megaphone} onClick={() => setBroadcast({ title: '', message: '', link: '', severity: 'info', roles: [] })}>
                Announcement
              </Button>
            )}
            <Button icon={CheckCheck} busy={busy === 'read-all'} disabled={!state.unread} onClick={markAll}>Mark all read</Button>
          </>
        )}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Unread" value={state.unread} icon={Mail} tone="emerald" onClick={() => { setFilter('unread'); setCategory(''); setPage(1); }} active={filter === 'unread' && !category} />
          <StatCard label="All notifications" value={totalAll} icon={Inbox} tone="sky" onClick={() => { setFilter('all'); setCategory(''); setPage(1); }} active={filter === 'all' && !category} />
          <StatCard label="Signing requests" value={signingUnread} hint="unread" icon={NOTIFICATION_CATEGORY_META.signing.icon} tone="violet" onClick={() => { setCategory('signing'); setPage(1); }} active={category === 'signing'} />
          <StatCard label="Security alerts" value={securityUnread} hint="unread" icon={NOTIFICATION_CATEGORY_META.security.icon} tone="rose" onClick={() => { setCategory('security'); setPage(1); }} active={category === 'security'} />
        </div>
      </PageHeader>

      <Card bodyClassName="p-0">
        <div className="px-3 sm:px-4 pt-2">
          <Tabs
            tabs={[{ id: 'all', label: 'All', count: totalAll }, { id: 'unread', label: 'Unread', count: state.unread }]}
            active={filter}
            onChange={(id) => { setFilter(id); setPage(1); }}
          />
        </div>
        <div className="p-3 sm:p-4 space-y-3 border-b border-slate-100">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search notifications..." />
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter by category">
            <button
              type="button"
              onClick={() => { setCategory(''); setPage(1); }}
              aria-pressed={!category}
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition ${!category ? 'bg-[#007355] border-[#007355] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              All categories
            </button>
            {state.categories.filter((c) => c.total > 0 || c.id === category).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCategory(c.id); setPage(1); }}
                aria-pressed={category === c.id}
                className={`shrink-0 pl-1.5 pr-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition ${category === c.id ? 'bg-[#007355] border-[#007355] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                <NotificationIcon category={c.id} size={11} className="w-5 h-5 rounded-full" />
                {c.label}
                {c.unread > 0 && <span className={`text-[10px] font-bold ${category === c.id ? 'text-emerald-100' : 'text-[#007355]'}`}>{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <ErrorBanner message={state.status === 'error' ? state.error : ''} onRetry={load} />
          {state.status === 'loading' ? (
            <LoadingBlock label="Loading notifications..." />
          ) : state.items.length === 0 && state.status !== 'error' ? (
            <EmptyState
              icon={Bell}
              title={filter === 'unread' ? 'No unread notifications' : search || category ? 'No notifications match' : 'No notifications yet'}
              description={search || category ? 'Try another search or category.' : 'When documents are viewed, signed, declined or completed, or something needs your attention, it appears here.'}
              action={!search && !category && <Button variant="secondary" icon={Send} onClick={sendTest}>Send a test notification</Button>}
            />
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.label}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{group.label}</h3>
                  <ul className="space-y-2">
                    {group.items.map((n) => (
                      <li
                        key={n.id}
                        className={`group rounded-xl border p-3 sm:p-4 flex items-start gap-3 transition ${n.isRead ? 'bg-white border-slate-200' : 'bg-emerald-50/50 border-emerald-200'}`}
                      >
                        <NotificationIcon category={n.category} severity={n.severity} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${n.isRead ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'}`}>
                              {!n.isRead && <span className="inline-block w-2 h-2 rounded-full bg-[#007355] mr-1.5 align-middle" aria-label="Unread" />}
                              {n.title}
                            </p>
                            <span className="text-[11px] text-slate-400 whitespace-nowrap" title={formatDateTime(n.createdAt)}>{formatRelative(n.createdAt)}</span>
                          </div>
                          {n.message && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-slate-400">{NOTIFICATION_CATEGORY_META[n.category]?.label || n.category}</span>
                            {n.actorName && <span className="text-slate-400">by {n.actorName}</span>}
                            {n.emailSent && <span className="text-slate-400 flex items-center gap-1"><Mail size={11} /> Emailed</span>}
                            {n.link && (
                              <button type="button" onClick={() => openItem(n)} className="font-bold text-[#007355] hover:underline flex items-center gap-0.5">
                                Open <ArrowUpRight size={12} />
                              </button>
                            )}
                            <button type="button" onClick={() => setRead(n, !n.isRead)} className="font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                              {n.isRead ? <><Mail size={12} /> Mark unread</> : <><MailOpen size={12} /> Mark read</>}
                            </button>
                            <button type="button" onClick={() => remove(n)} className="font-semibold text-slate-400 hover:text-red-600 flex items-center gap-1" aria-label={`Delete ${n.title}`}>
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
        <Pagination page={page} pageSize={pageSize} total={state.total} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} pageSizes={[10, 20, 50]} />
        {totalAll > state.unread && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Button variant="ghost" icon={Trash2} onClick={() => setConfirmClear(true)}>Clear read notifications</Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Clear read notifications?"
        message="All notifications you have already read are deleted. Unread notifications are kept."
        confirmLabel="Clear"
        danger
        busy={busy === 'clear'}
        onConfirm={clearRead}
        onCancel={() => setConfirmClear(false)}
      />

      <Modal
        open={Boolean(broadcast)}
        onClose={() => setBroadcast(null)}
        title="Send an announcement"
        description="Every active user (or only the roles you choose) receives it in their notifications."
        icon={Megaphone}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setBroadcast(null)}>Cancel</Button>
            <Button icon={Send} busy={busy === 'broadcast'} type="submit" form="broadcast-form">Send announcement</Button>
          </>
        )}
      >
        {broadcast && (
          <form id="broadcast-form" onSubmit={sendBroadcast} className="space-y-3">
            <Field label="Title" required>
              <input className={inputClass} value={broadcast.title} maxLength={200} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} placeholder="e.g. Scheduled maintenance on Saturday" autoFocus />
            </Field>
            <Field label="Message">
              <textarea className={inputClass} rows={4} value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} placeholder="Details for your team" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Type">
                <select className={inputClass} value={broadcast.severity} onChange={(e) => setBroadcast({ ...broadcast, severity: e.target.value })}>
                  <option value="info">Information</option>
                  <option value="success">Good news</option>
                  <option value="warning">Warning</option>
                  <option value="error">Urgent</option>
                </select>
              </Field>
              <Field label="Link (optional)" hint="A page in BexSign, e.g. /templates">
                <input className={inputClass} value={broadcast.link} onChange={(e) => setBroadcast({ ...broadcast, link: e.target.value })} placeholder="/templates" />
              </Field>
            </div>
            <fieldset>
              <legend className="text-xs font-bold text-slate-700 mb-1.5">Send to</legend>
              <div className="flex flex-wrap gap-2">
                {[['manager', 'Managers'], ['leader', 'Leaders'], ['team_member', 'Team members']].map(([id, label]) => {
                  const on = broadcast.roles.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setBroadcast({ ...broadcast, roles: on ? broadcast.roles.filter((r) => r !== id) : [...broadcast.roles, id] })}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${on ? 'bg-[#007355] border-[#007355] text-white' : 'bg-white border-slate-300 text-slate-600'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{broadcast.roles.length ? 'Only the selected roles receive it.' : 'No role selected: everyone receives it.'}</p>
            </fieldset>
          </form>
        )}
      </Modal>
    </div>
  );
}
