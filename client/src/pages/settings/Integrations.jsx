import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plug, Plus, PlugZap, Activity, CircleAlert, LayoutGrid, ArrowRight, CheckCircle2, XCircle, Webhook, Info } from 'lucide-react';
import {
  PageHeader, StatCard, Card, Button, Badge, SearchInput, EmptyState, ErrorBanner, LoadingBlock, Modal, Field, inputClass,
  SelectInput, useToast, formatRelative
} from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';
import { AppTile, StatusBadge, connectionState, CATEGORY_ICONS, ACTIVITY_LABELS } from '../../components/integrations/integrationUi';

/**
 * Integrations (Settings > Integrations): every app BexSign connects to, with its status. "Configure" opens the
 * app's page (/settings/integrations/:key); "Add integration" creates a custom one that receives signing events.
 */

function EventPicker({ events, value, onChange }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {events.map((e) => (
        <label key={e.key} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${value.includes(e.key) ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
          <input type="checkbox" checked={value.includes(e.key)} onChange={() => toggle(e.key)} className="mt-0.5 accent-[#007355]" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-slate-800">{e.label}</span>
            <span className="block text-[11px] text-slate-500">{e.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function AddIntegrationModal({ open, onClose, events, defaultEvents, onCreated }) {
  const empty = { name: '', description: '', endpoint_url: '', auth_type: 'none', auth_header: 'X-API-Key', auth_value: '' };
  const [form, setForm] = useState(empty);
  const [picked, setPicked] = useState(defaultEvents || ['document.completed']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(empty);
      setPicked(defaultEvents || ['document.completed']);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch('/integrations/custom', {
        method: 'POST',
        body: {
          name: form.name,
          description: form.description,
          config: { endpoint_url: form.endpoint_url, auth_type: form.auth_type, auth_header: form.auth_header },
          secrets: { auth_value: form.auth_value },
          events: picked
        }
      });
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add integration"
      description="Send signing events to your own system or any service that accepts webhooks."
      icon={Webhook}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button icon={Plus} busy={busy} onClick={submit}>Add integration</Button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name" required>
            <input className={inputClass} value={form.name} onChange={set('name')} placeholder="e.g. Internal ERP" maxLength={120} autoFocus />
          </Field>
          <Field label="Description">
            <input className={inputClass} value={form.description} onChange={set('description')} placeholder="What it is used for" maxLength={255} />
          </Field>
        </div>
        <Field label="Endpoint URL" required hint="BexSign sends a JSON POST here for every event you choose below.">
          <input className={inputClass} type="url" value={form.endpoint_url} onChange={set('endpoint_url')} placeholder="https://erp.example.com/webhooks/bexsign" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Authentication">
            <select className={inputClass} value={form.auth_type} onChange={set('auth_type')}>
              <option value="none">None</option>
              <option value="bearer">Bearer token</option>
              <option value="header">Custom header</option>
              <option value="basic">Basic (user:password)</option>
            </select>
          </Field>
          {form.auth_type === 'header' && (
            <Field label="Header name">
              <input className={inputClass} value={form.auth_header} onChange={set('auth_header')} placeholder="X-API-Key" />
            </Field>
          )}
          {form.auth_type !== 'none' && (
            <Field label={form.auth_type === 'basic' ? 'user:password' : 'Token / key'}>
              <input className={inputClass} type="password" autoComplete="new-password" value={form.auth_value} onChange={set('auth_value')} />
            </Field>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-700 mb-2">Signing events to send</p>
          <EventPicker events={events} value={picked} onChange={setPicked} />
        </div>
        <p className="flex items-start gap-2 text-[11px] text-slate-500">
          <Info size={13} className="shrink-0 mt-0.5" />
          A signing secret is generated for you: every request carries X-BexSign-Signature (HMAC SHA-256 of the body) so your system can check it came from BexSign.
        </p>
      </form>
    </Modal>
  );
}

export default function Integrations() {
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await apiFetch('/integrations'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.integrations || [];
  const stats = useMemo(() => {
    const connected = items.filter((i) => connectionState(i.connection).key === 'connected').length;
    const attention = items.filter((i) => connectionState(i.connection).key === 'attention').length;
    const events = items.reduce((sum, i) => sum + (i.connection?.eventCount || 0), 0);
    return { connected, attention, events, available: items.filter((i) => !i.connection).length };
  }, [items]);

  const categories = useMemo(() => {
    const present = [...new Set(items.map((i) => i.provider.category))];
    return present.map((key) => ({ key, label: data?.categories?.[key] || key, count: items.filter((i) => i.provider.category === key).length }));
  }, [items, data]);

  const shown = items.filter((i) => {
    if (category !== 'all' && i.provider.category !== category) return false;
    if (status !== 'all' && connectionState(i.connection).key !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || `${i.provider.name} ${i.provider.tagline} ${i.provider.categoryLabel}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Settings"
        title="Integrations"
        icon={Plug}
        description="Connect BexSign to your CRM, sign-in provider, identity verification, cloud storage and automation tools. Each app is configured on its own page with a step-by-step guide."
        actions={data?.canManage && <Button icon={Plus} onClick={() => setAdding(true)}>Add integration</Button>}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Connected" value={stats.connected} icon={PlugZap} tone="emerald" hint="Active and working" onClick={() => setStatus(status === 'connected' ? 'all' : 'connected')} active={status === 'connected'} />
        <StatCard label="Available" value={stats.available} icon={LayoutGrid} tone="sky" hint="Ready to configure" onClick={() => setStatus(status === 'available' ? 'all' : 'available')} active={status === 'available'} />
        <StatCard label="Events delivered" value={stats.events} icon={Activity} tone="violet" hint="Sent to connected apps" />
        <StatCard label="Needs attention" value={stats.attention} icon={CircleAlert} tone="rose" hint="Failed test or delivery" onClick={() => setStatus(status === 'attention' ? 'all' : 'attention')} active={status === 'attention'} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {[{ key: 'all', label: 'All apps', count: items.length }, ...categories].map((c) => {
            const Icon = c.key === 'all' ? LayoutGrid : CATEGORY_ICONS[c.key];
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${category === c.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {Icon && <Icon size={13} />} {c.label}
                <span className={`text-[10px] ${category === c.key ? 'text-white/70' : 'text-slate-400'}`}>{c.count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 lg:ml-auto">
          <SelectInput
            value={status}
            onChange={setStatus}
            label="Status"
            options={[['all', 'Any status'], ['connected', 'Connected'], ['available', 'Not configured'], ['off', 'Turned off'], ['attention', 'Needs attention']]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search apps" className="w-full sm:w-64" />
        </div>
      </div>

      {!data && !error && <LoadingBlock label="Loading integrations..." />}

      {data && shown.length === 0 && (
        <Card>
          <EmptyState
            icon={Plug}
            title="No apps match"
            description="Try another category or search, or add your own integration."
            action={data.canManage && <Button icon={Plus} onClick={() => setAdding(true)}>Add integration</Button>}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {shown.map(({ provider, connection }) => {
          const state = connectionState(connection);
          return (
            <article key={provider.key} className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition">
              <div className="flex items-start gap-3.5">
                <AppTile provider={provider} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900 leading-snug">{provider.name}</h2>
                    <StatusBadge connection={connection} />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{provider.categoryLabel}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-3 flex-1">{provider.tagline}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 truncate">
                  {!connection && (provider.delivery ? `Receives ${provider.defaultEvents.length} event type${provider.defaultEvents.length === 1 ? '' : 's'} by default` : 'Sign-in and verification settings')}
                  {connection && (connection.lastEventAt
                    ? `Last event ${formatRelative(connection.lastEventAt)} · ${connection.eventCount} sent`
                    : connection.lastTestedAt ? `Tested ${formatRelative(connection.lastTestedAt)}` : `Configured ${formatRelative(connection.updatedAt || connection.createdAt)}`)}
                </span>
                <Link
                  to={`/settings/integrations/${provider.key}`}
                  className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${state.key === 'available' ? 'bg-[#007355] text-white hover:bg-[#005c44]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {state.key === 'available' ? 'Configure' : 'Manage'} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {data?.recentActivity?.length > 0 && (
        <Card title="Recent activity" description="The latest tests and deliveries across all integrations.">
          <ul className="divide-y divide-slate-100 -my-2">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="py-2.5 flex items-start gap-3">
                {a.success ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-800">
                    <Link to={`/settings/integrations/${a.provider_key}`} className="font-bold hover:underline">{a.connection_name}</Link>
                    {' · '}{ACTIVITY_LABELS[a.action] || a.action}{a.event && a.event !== 'ping' ? <> <Badge tone="slate">{a.event}</Badge></> : null}
                  </p>
                  {a.message && <p className="text-[11px] text-slate-500 truncate">{a.message}</p>}
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{formatRelative(a.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <AddIntegrationModal
        open={adding}
        onClose={() => setAdding(false)}
        events={data?.events || []}
        defaultEvents={data?.customTemplate?.defaultEvents}
        onCreated={(res) => {
          setAdding(false);
          showToast('success', res.message);
          navigate(`/settings/integrations/${res.key}`);
        }}
      />
      {toast}
    </div>
  );
}

export { EventPicker };
