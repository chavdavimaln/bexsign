import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Mail, MonitorSmartphone, PauseCircle, Send, Save, Lock } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { PageHeader, Card, Button, Toggle, ErrorBanner, LoadingBlock, useToast, formatDateTime } from '../../components/ui/kit';
import { NotificationIcon } from '../../components/notifications/notificationUi';

const PAUSE_OPTIONS = [
  ['', 'Not paused'],
  ['1', '1 hour'],
  ['8', '8 hours'],
  ['24', '1 day'],
  ['168', '1 week']
];

/** My Notifications: which categories appear in the app and which are also emailed. */
export default function NotificationSettings() {
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [state, setState] = useState({ status: 'loading', catalog: [], categories: {}, mutedUntil: null, error: '' });
  const [draft, setDraft] = useState(null);
  const [pause, setPause] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await apiFetch('/notifications/preferences');
      setState({ status: 'ready', catalog: data.catalog, categories: data.categories, mutedUntil: data.mutedUntil, error: '' });
      setDraft(data.categories);
      setPause('');
    } catch (err) {
      setState((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dirty = draft && (JSON.stringify(draft) !== JSON.stringify(state.categories) || pause !== '');
  const paused = state.mutedUntil && new Date(state.mutedUntil) > new Date();

  const setChannel = (id, channel, value) => setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [channel]: value } }));
  const setAll = (channel, value) => setDraft((prev) => Object.fromEntries(Object.entries(prev).map(([id, v]) => [id, { ...v, [channel]: channel === 'inApp' && id === 'security' ? true : value }])));

  const save = async (extra = {}) => {
    setSaving(true);
    try {
      const body = { categories: draft, ...extra };
      if (pause) body.mutedUntil = new Date(Date.now() + Number(pause) * 3600000).toISOString();
      const data = await apiFetch('/notifications/preferences', { method: 'PUT', body });
      setState((prev) => ({ ...prev, categories: data.categories, mutedUntil: data.mutedUntil }));
      setDraft(data.categories);
      setPause('');
      showToast('success', data.message);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    try {
      const data = await apiFetch('/notifications/test', { method: 'POST', body: {} });
      window.dispatchEvent(new Event('bexsign-notifications-changed'));
      showToast('success', data.message);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {toast}
      <PageHeader
        eyebrow="Settings · My account"
        title="My notifications"
        description="Choose which updates appear in BexSign (the bell and the Notifications page) and which are also sent to your email."
        icon={BellRing}
        actions={(
          <>
            <Button variant="secondary" icon={Send} onClick={sendTest}>Send test</Button>
            <Button variant="secondary" onClick={() => navigate('/notifications')}>Open notifications</Button>
          </>
        )}
      />

      <ErrorBanner message={state.status === 'error' ? state.error : ''} onRetry={load} />
      {state.status === 'loading' && <LoadingBlock label="Loading your preferences..." />}

      {draft && (
        <>
          <Card
            title="Notification categories"
            description="Signing emails to recipients are always sent; these settings only control your own notifications."
            actions={(
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button type="button" onClick={() => setAll('email', true)} className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Email all</button>
                <button type="button" onClick={() => setAll('email', false)} className="px-2.5 py-1 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">Email none</button>
              </div>
            )}
            bodyClassName="p-0"
          >
            <div className="hidden sm:grid grid-cols-[1fr_110px_110px] px-5 py-2 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100">
              <span>Category</span>
              <span className="flex items-center justify-center gap-1"><MonitorSmartphone size={12} /> In app</span>
              <span className="flex items-center justify-center gap-1"><Mail size={12} /> Email</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {state.catalog.map((c) => (
                <li key={c.id} className="px-4 sm:px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[1fr_110px_110px] gap-3 sm:items-center">
                  <div className="flex items-start gap-3 min-w-0">
                    <NotificationIcon category={c.id} size={15} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{c.label}</p>
                      <p className="text-xs text-slate-500">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex sm:justify-center items-center gap-2">
                    <span className="sm:hidden text-xs text-slate-500 w-16">In app</span>
                    {c.id === 'security' ? (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1" title="Security alerts always appear in the app"><Lock size={12} /> Always</span>
                    ) : (
                      <Toggle checked={draft[c.id]?.inApp !== false} onChange={(v) => setChannel(c.id, 'inApp', v)} label={`${c.label} in app`} />
                    )}
                  </div>
                  <div className="flex sm:justify-center items-center gap-2">
                    <span className="sm:hidden text-xs text-slate-500 w-16">Email</span>
                    <Toggle checked={Boolean(draft[c.id]?.email)} onChange={(v) => setChannel(c.id, 'email', v)} label={`${c.label} by email`} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Pause email notifications" description="Notifications keep appearing in the app while emails are paused.">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <PauseCircle size={20} className={paused ? 'text-amber-600' : 'text-slate-400'} />
              <p className="text-sm text-slate-700 flex-1">
                {paused ? <>Emails are paused until <strong>{formatDateTime(state.mutedUntil)}</strong>.</> : 'Emails are not paused.'}
              </p>
              <select value={pause} onChange={(e) => setPause(e.target.value)} aria-label="Pause emails for" className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white">
                {PAUSE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{v ? `Pause for ${l}` : l}</option>)}
              </select>
              {paused && <Button variant="secondary" busy={saving} onClick={() => save({ mutedUntil: null })}>Resume emails</Button>}
            </div>
          </Card>
        </>
      )}

      {dirty && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-72 z-40 flex justify-center">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col sm:flex-row items-center gap-3 max-w-xl w-full">
            <p className="text-xs font-semibold flex-1">You have unsaved changes to your notification preferences.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDraft(state.categories); setPause(''); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:bg-white/10">Discard</button>
              <Button icon={Save} busy={saving} onClick={() => save()}>Save preferences</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
