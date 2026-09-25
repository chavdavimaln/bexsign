import React, { useCallback, useEffect, useState } from 'react';
import { Webhook, Plus, Pencil, Trash2, Send, History, CheckCircle2, XCircle, ChevronDown, RefreshCw, TriangleAlert } from 'lucide-react';
import {
  Card, Badge, Button, EmptyState, ErrorBanner, LoadingBlock, SelectInput, Field, inputClass, Toggle, Modal, ConfirmDialog, Pagination,
  formatDateTime, formatRelative
} from '../ui/kit';
import { apiFetch } from '../../utils/api';

/** Webhooks of the Developer API page: list with on/off switch, create/edit, test ping and delivery history. */

const safeHost = (url) => {
  try {
    return new URL(url).host;
  } catch (e) {
    return url;
  }
};

/** Compact on/off switch for list rows (the kit Toggle shows its label as text). */
function RowSwitch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition cursor-pointer disabled:opacity-60 disabled:cursor-wait ${checked ? 'bg-[#007355]' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

const statusTone = (code) => (!code ? 'rose' : code >= 200 && code < 300 ? 'emerald' : code >= 500 ? 'rose' : 'amber');

function prettyJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch (e) {
    return text;
  }
}

function WebhookModal({ state, onClose, events, defaultUrl, onSaved }) {
  const editing = state?.mode === 'edit' ? state.hook : null;
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state) return;
    setError('');
    setForm(editing
      ? { name: editing.name, url: editing.url, events: editing.events, isActive: editing.isActive, secretMode: editing.hasSecret ? 'custom' : 'org', secret: '' }
      : { name: '', url: defaultUrl || '', events: ['document.completed'], isActive: true, secretMode: 'org', secret: '' });
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state || !form) return null;
  const all = form.events.includes('*');
  const toggleEvent = (key) => setForm((f) => ({ ...f, events: f.events.includes(key) ? f.events.filter((e) => e !== key) : [...f.events.filter((e) => e !== '*'), key] }));

  const submit = async (e) => {
    e.preventDefault();
    let url;
    try {
      url = new URL(form.url.trim());
    } catch (err) {
      url = null;
    }
    if (!url || !['http:', 'https:'].includes(url.protocol)) return setError('Enter the full endpoint URL, starting with https:// (or http:// for local testing).');
    if (!form.events.length) return setError('Choose at least one event.');
    if (form.secretMode === 'custom' && !(editing?.hasSecret && !form.secret) && form.secret.trim().length < 16) {
      return setError('A custom signing secret must be at least 16 characters.');
    }
    const body = { name: form.name.trim(), url: form.url.trim(), events: form.events, isActive: form.isActive };
    if (form.secretMode === 'custom' && form.secret.trim()) body.secret = form.secret.trim();
    if (form.secretMode === 'org' && editing?.hasSecret) body.secret = null;
    setBusy(true);
    setError('');
    try {
      const data = editing
        ? await apiFetch(`/developer/webhooks/${editing.id}`, { method: 'PUT', body })
        : await apiFetch('/developer/webhooks', { method: 'POST', body });
      onSaved(data.webhook, Boolean(editing));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit webhook' : 'Add webhook'}
      description="BexSign sends a signed POST request to your endpoint when the chosen events happen."
      icon={Webhook}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="webhook-form" busy={busy}>{editing ? 'Save webhook' : 'Add webhook'}</Button>
        </>
      )}
    >
      <form id="webhook-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Endpoint URL" required>
            <input type="url" inputMode="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://api.example.com/bexsign/webhook" className={inputClass} autoFocus />
          </Field>
          <Field label="Name" hint="Optional, to recognise it in the list.">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} placeholder="CRM sync" className={inputClass} />
          </Field>
        </div>

        <fieldset>
          <legend className="block text-xs font-bold text-slate-700 mb-1">Events <span className="text-red-500">*</span></legend>
          <label className={`flex items-start gap-2.5 p-2.5 mb-2 rounded-xl border cursor-pointer ${all ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200'}`}>
            <input type="checkbox" checked={all} onChange={() => setForm({ ...form, events: all ? [] : ['*'] })} className="mt-0.5 w-4 h-4 accent-[#007355]" />
            <span>
              <span className="block text-xs font-bold text-slate-800">All events</span>
              <span className="block text-[11px] text-slate-500">Including events added in the future.</span>
            </span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {events.map((ev) => (
              <label key={ev.key} className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition ${all ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'} ${!all && form.events.includes(ev.key) ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200'}`}>
                <input type="checkbox" disabled={all} checked={all || form.events.includes(ev.key)} onChange={() => toggleEvent(ev.key)} className="mt-0.5 w-4 h-4 accent-[#007355]" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 font-mono">{ev.key}</span>
                  <span className="block text-[11px] text-slate-500">{ev.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="block text-xs font-bold text-slate-700 mb-1">Signing secret</legend>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="radio" name="wh-secret" checked={form.secretMode === 'org'} onChange={() => setForm({ ...form, secretMode: 'org' })} className="mt-0.5 accent-[#007355]" />
              <span><strong className="text-slate-800">Organization signing secret</strong> <span className="text-slate-500">(from Developer settings)</span></span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input type="radio" name="wh-secret" checked={form.secretMode === 'custom'} onChange={() => setForm({ ...form, secretMode: 'custom' })} className="mt-0.5 accent-[#007355]" />
              <span><strong className="text-slate-800">Custom secret for this webhook</strong></span>
            </label>
            {form.secretMode === 'custom' && (
              <input
                type="text"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={editing?.hasSecret ? `Keep current secret (${editing.secretMasked})` : 'At least 16 characters'}
                aria-label="Custom signing secret"
                autoComplete="off"
                className={`${inputClass} font-mono`}
              />
            )}
          </div>
        </fieldset>

        <Toggle label="Active" description="Inactive webhooks receive no events (you can still send a test)." checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
      </form>
    </Modal>
  );
}

function DeliveriesModal({ hook, onClose }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [data, setData] = useState({ deliveries: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    if (!hook) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/developer/webhooks/${hook.id}/deliveries?page=${page}&pageSize=10${status !== 'all' ? `&status=${status}` : ''}`);
      setData({ deliveries: res.deliveries, total: res.total });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hook, page, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setStatus('all');
    setOpenId(null);
  }, [hook]);

  if (!hook) return null;
  return (
    <Modal open onClose={onClose} title="Delivery history" description={hook.name || hook.url} icon={History} size="lg">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SelectInput value={status} onChange={(v) => { setStatus(v); setPage(1); }} label="Filter deliveries" options={[['all', 'All attempts'], ['success', 'Succeeded'], ['failed', 'Failed']]} />
          <Button variant="ghost" icon={RefreshCw} onClick={load} busy={loading}>Refresh</Button>
          <span className="text-[11px] text-slate-500 ml-auto">{data.total} attempt{data.total === 1 ? '' : 's'}</span>
        </div>
        {error && <ErrorBanner message={error} onRetry={load} />}
        {loading && !data.deliveries.length ? <LoadingBlock label="Loading deliveries..." /> : !error && (
          data.deliveries.length === 0 ? (
            <EmptyState icon={History} title="No deliveries yet" description="Deliveries appear here after an event is sent or you send a test." />
          ) : (
            <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {data.deliveries.map((d) => {
                const open = openId === d.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : d.id)}
                      aria-expanded={open}
                      className="w-full px-3 py-2.5 flex items-center gap-2 sm:gap-3 text-left hover:bg-slate-50 cursor-pointer"
                    >
                      {d.success ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-label="Succeeded" /> : <XCircle size={16} className="text-rose-600 shrink-0" aria-label="Failed" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800 font-mono truncate">{d.event}</span>
                        <span className="block text-[11px] text-slate-500">{formatDateTime(d.createdAt)}{d.attempt > 1 ? ` · attempt ${d.attempt}` : ''}</span>
                      </span>
                      <Badge tone={statusTone(d.statusCode)}>{d.statusCode || 'No response'}</Badge>
                      <span className="hidden sm:inline text-[11px] text-slate-500 tabular-nums w-14 text-right">{d.durationMs ?? '-'} ms</span>
                      <ChevronDown size={15} className={`text-slate-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="px-3 pb-3 space-y-2 bg-slate-50/60">
                        <p className="text-[11px] text-slate-500 pt-2 break-words">
                          Delivery <span className="font-mono break-all">{d.deliveryId || d.id}</span> · {d.durationMs ?? '-'} ms
                        </p>
                        {d.error && <p className="text-[11px] font-semibold text-rose-700 break-words">{d.error}</p>}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Response</p>
                          <pre className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[11px] text-slate-700 whitespace-pre-wrap break-all">{d.responseBody ? prettyJson(d.responseBody) : '(empty)'}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Payload</p>
                          <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-2 text-[11px] text-slate-100">{prettyJson(d.payload)}</pre>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}
        <Pagination page={page} pageSize={10} total={data.total} onPage={setPage} />
      </div>
    </Modal>
  );
}

export default function WebhooksPanel({ meta, showToast }) {
  const [hooks, setHooks] = useState([]);
  const [events, setEvents] = useState(meta?.events || []);
  const [canManageAll, setCanManageAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [history, setHistory] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [results, setResults] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/developer/webhooks');
      setHooks(data.webhooks || []);
      setEvents(data.events || []);
      setCanManageAll(Boolean(data.canManageAll));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (hook) => setHooks((list) => list.map((h) => (h.id === hook.id ? hook : h)));

  const toggleActive = async (hook, isActive) => {
    setToggling(hook.id);
    try {
      const data = await apiFetch(`/developer/webhooks/${hook.id}`, { method: 'PATCH', body: { isActive } });
      replace(data.webhook);
      showToast('success', `Webhook turned ${isActive ? 'on' : 'off'}.`);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setToggling(null);
    }
  };

  const sendTest = async (hook) => {
    setTesting(hook.id);
    try {
      const data = await apiFetch(`/developer/webhooks/${hook.id}/test`, { method: 'POST' });
      replace(data.webhook);
      setResults((r) => ({ ...r, [hook.id]: data.result }));
      showToast(data.delivered ? 'success' : 'error', data.message);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setTesting(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/developer/webhooks/${confirmDelete.id}`, { method: 'DELETE' });
      setHooks((list) => list.filter((h) => h.id !== confirmDelete.id));
      showToast('success', 'Webhook deleted.');
      setConfirmDelete(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const eventLabel = (key) => (key === '*' ? 'All events' : key);

  return (
    <Card
      title="Webhooks"
      description={canManageAll ? 'Every webhook in the organization. Organization-wide webhooks (of administrators) receive events for all documents.' : 'Your webhooks receive events for documents and templates you own.'}
      actions={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })} className="whitespace-nowrap w-full sm:w-auto">Add webhook</Button>}
      bodyClassName="p-4 sm:p-5"
    >
      {meta && !meta.apiEnabled && (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          <TriangleAlert size={14} className="shrink-0 mt-0.5" /> Deliveries are paused while the API is turned off in Developer settings.
        </p>
      )}
      {error && <ErrorBanner message={error} onRetry={load} />}
      {loading ? <LoadingBlock label="Loading webhooks..." /> : !error && (
        hooks.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No webhooks yet"
            description="Add an endpoint to be told when documents are sent, viewed, signed, completed, declined or recalled."
            action={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Add webhook</Button>}
          />
        ) : (
          <ul className="space-y-3">
            {hooks.map((h) => {
              const result = results[h.id];
              return (
                <li key={h.id} className={`rounded-2xl border p-3 sm:p-4 transition ${h.isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate min-w-0 max-w-full">{h.name || safeHost(h.url)}</h3>
                        {h.isActive ? <Badge tone="emerald" dot>Active</Badge> : <Badge tone="slate" dot>{h.failureCount >= 10 ? 'Disabled after failures' : 'Off'}</Badge>}
                        {h.hasSecret && <Badge tone="violet">Own secret</Badge>}
                        {canManageAll && !h.isOwn && <Badge tone="sky" className="max-w-full overflow-hidden">{h.owner?.name}</Badge>}
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 mt-1 break-all">{h.url}</p>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      <RowSwitch checked={h.isActive} onChange={(v) => toggleActive(h, v)} disabled={toggling === h.id} label={`${h.isActive ? 'Turn off' : 'Turn on'} ${h.name || 'webhook'}`} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {h.events.map((e) => <span key={e} className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-mono break-all">{eventLabel(e)}</span>)}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      Last delivery:
                      {h.lastDeliveryAt ? <><Badge tone={statusTone(h.lastStatus)}>{h.lastStatus || 'No response'}</Badge><span title={formatDateTime(h.lastDeliveryAt)}>{formatRelative(h.lastDeliveryAt)}</span></> : <span className="text-slate-400">never</span>}
                    </span>
                    <span>Last 7 days: <strong className="text-slate-700">{h.deliveries7d}</strong> {h.deliveries7d === 1 ? 'delivery' : 'deliveries'}{h.failed7d ? <>, <strong className="text-rose-700">{h.failed7d} failed</strong></> : ''}</span>
                    {h.failureCount > 0 && h.isActive && (
                      <span className="flex items-center gap-1 text-amber-700 font-semibold"><TriangleAlert size={12} /> {h.failureCount} failed in a row (turned off at 10)</span>
                    )}
                  </div>

                  {result && (
                    <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-semibold flex items-start gap-1.5 ${result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                      {result.success ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
                      <span className="break-all">Test ping: {result.success ? `HTTP ${result.statusCode} in ${result.durationMs} ms` : result.error}</span>
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    <Button variant="secondary" icon={Send} busy={testing === h.id} onClick={() => sendTest(h)}>Send test</Button>
                    <Button variant="secondary" icon={History} onClick={() => setHistory(h)}>Deliveries</Button>
                    <Button variant="ghost" icon={Pencil} onClick={() => setModal({ mode: 'edit', hook: h })}>Edit</Button>
                    <Button variant="subtleDanger" icon={Trash2} onClick={() => setConfirmDelete(h)} className="sm:ml-auto">Delete</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      <WebhookModal
        state={modal}
        onClose={() => setModal(null)}
        events={events}
        defaultUrl={meta?.defaultCallbackUrl}
        onSaved={(hook, edited) => {
          if (edited) replace(hook);
          else setHooks((list) => [hook, ...list]);
          setModal(null);
          showToast('success', edited ? 'Webhook saved.' : 'Webhook added. Send a test to check your endpoint.');
        }}
      />
      <DeliveriesModal hook={history} onClose={() => setHistory(null)} />
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this webhook?"
        message={`${confirmDelete?.url || ''} will stop receiving events and its delivery history is deleted.`}
        confirmLabel="Delete webhook"
        danger
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </Card>
  );
}
