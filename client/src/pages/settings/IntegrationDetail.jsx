import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, PlugZap, Unplug, Zap, ListChecks, Settings2, BookOpen, CheckCircle2, XCircle, History, Link2, Info, Save, Eye, Lock, Workflow
} from 'lucide-react';
import {
  Card, Button, Badge, Field, inputClass, Toggle, ErrorBanner, LoadingBlock, EmptyState, ConfirmDialog, useToast, formatDateTime, formatRelative
} from '../../components/ui/kit';
import { SectionTitle, CopyButton, ReadOnlyNotice, useUnsavedChangesPrompt } from '../../components/settings/settingsUi';
import { apiFetch } from '../../utils/api';
import { AppTile, StatusBadge, ACTIVITY_LABELS } from '../../components/integrations/integrationUi';
import { EventPicker } from './Integrations';

/**
 * Configure one integration (/settings/integrations/:key): credentials, how it behaves with signature requests,
 * which signing events it receives, a setup guide, "Test connection" (with the values as typed) and its activity.
 */

const optionPairs = (options = []) => options.map((o) => (Array.isArray(o) ? o : [o, o]));

function visible(field, config) {
  if (!field.showIf) return true;
  return Object.entries(field.showIf).every(([k, v]) => [].concat(v).includes(config[k]));
}

function initialForm(detail) {
  const c = detail.connection;
  const config = {};
  detail.provider.fields.filter((f) => !f.secret).forEach((f) => {
    config[f.key] = c ? c.config[f.key] : (f.default !== undefined ? f.default : (f.type === 'toggle' ? false : ''));
  });
  return {
    config,
    secrets: {},
    events: c ? c.events : detail.provider.defaultEvents,
    name: detail.provider.name,
    description: c?.description || ''
  };
}

function FieldInput({ field, form, setConfig, setSecret, secretState, disabled }) {
  if (field.type === 'toggle') {
    return (
      <div className="rounded-xl border border-slate-200 px-3.5 py-3">
        <Toggle checked={Boolean(form.config[field.key])} onChange={(v) => setConfig(field.key, v)} label={field.label} description={field.help} disabled={disabled} />
      </div>
    );
  }
  const id = `field-${field.key}`;
  let control;
  if (field.type === 'select') {
    control = (
      <select id={id} className={inputClass} value={form.config[field.key] ?? ''} onChange={(e) => setConfig(field.key, e.target.value)} disabled={disabled}>
        {optionPairs(field.options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  } else if (field.secret) {
    const saved = secretState?.set;
    control = (
      <div className="relative">
        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type="password"
          autoComplete="new-password"
          className={`${inputClass} pl-8`}
          value={form.secrets[field.key] || ''}
          onChange={(e) => setSecret(field.key, e.target.value)}
          placeholder={saved ? `Saved ${secretState.masked} · leave empty to keep` : (field.placeholder || '')}
          disabled={disabled}
        />
      </div>
    );
  } else {
    control = (
      <input
        id={id}
        type={field.type === 'url' ? 'url' : 'text'}
        className={inputClass}
        value={form.config[field.key] ?? ''}
        onChange={(e) => setConfig(field.key, e.target.value)}
        placeholder={field.placeholder || ''}
        disabled={disabled}
      />
    );
  }
  return (
    <Field label={<>{field.label}{field.secret && secretState?.set && <Badge tone="emerald" className="ml-2">Saved</Badge>}</>} required={field.required} hint={field.help}>
      {control}
    </Field>
  );
}

export default function IntegrationDetail() {
  const { key } = useParams();
  const navigate = useNavigate();
  const [toast, showToast] = useToast();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [revealed, setRevealed] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch(`/integrations/${encodeURIComponent(key)}`);
      setDetail(data);
      const f = initialForm(data);
      setForm(f);
      setBaseline(JSON.stringify(f));
    } catch (err) {
      setError(err.message);
    }
  }, [key]);

  useEffect(() => {
    load();
    setTestResult(null);
    setRevealed('');
  }, [load]);

  const dirty = Boolean(form) && JSON.stringify(form) !== baseline;
  useUnsavedChangesPrompt(dirty);

  const setConfig = (k, v) => setForm((f) => ({ ...f, config: { ...f.config, [k]: v } }));
  const setSecret = (k, v) => setForm((f) => ({ ...f, secrets: { ...f.secrets, [k]: v } }));

  const provider = detail?.provider;
  const connection = detail?.connection;
  const canManage = Boolean(detail?.canManage);
  const sections = useMemo(() => {
    if (!provider || !form) return { connection: [], signing: [] };
    const shown = provider.fields.filter((f) => visible(f, form.config));
    return { connection: shown.filter((f) => f.section === 'connection'), signing: shown.filter((f) => f.section === 'signing') };
  }, [provider, form]);

  const body = () => ({ config: form.config, secrets: form.secrets, events: form.events, name: form.name, description: form.description, enabled: connection ? connection.status !== 'disabled' : true });

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await apiFetch(`/integrations/${encodeURIComponent(key)}`, { method: 'PUT', body: body() });
      showToast('success', res.message);
      await load();
    } catch (err) {
      setSaveError(err.message);
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch(`/integrations/${encodeURIComponent(key)}/test`, { method: 'POST', body: body() });
      setTestResult(res);
      if (connection) {
        const fresh = await apiFetch(`/integrations/${encodeURIComponent(key)}`);
        setDetail(fresh);
      }
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async (enabled) => {
    setToggling(true);
    try {
      const res = await apiFetch(`/integrations/${encodeURIComponent(key)}/enable`, { method: 'POST', body: { enabled } });
      showToast('success', res.message);
      setDetail((d) => ({ ...d, connection: res.connection }));
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setToggling(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const res = await apiFetch(`/integrations/${encodeURIComponent(key)}`, { method: 'DELETE' });
      showToast('success', res.message);
      setConfirmRemove(false);
      if (connection?.isCustom) navigate('/settings/integrations');
      else await load();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setRemoving(false);
    }
  };

  const reveal = async () => {
    try {
      const res = await apiFetch(`/integrations/${encodeURIComponent(key)}/reveal-signing-secret`, { method: 'POST' });
      setRevealed(res.secret);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/settings/integrations" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"><ArrowLeft size={14} /> Integrations</Link>
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }
  if (!detail || !form) return <LoadingBlock label="Loading integration..." />;

  const isCustom = Boolean(connection?.isCustom);
  const eventLabels = Object.fromEntries((detail.events || []).map((e) => [e.key, e.label]));

  return (
    <div className="space-y-5">
      <Link to="/settings/integrations" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} /> All integrations
      </Link>

      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: provider.color }} aria-hidden="true" />
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <AppTile provider={provider} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{provider.name}</h1>
                <StatusBadge connection={connection} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{provider.categoryLabel}</p>
              <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">{provider.description}</p>
            </div>
          </div>
          {connection && (
            <div className="grid grid-cols-3 gap-2 lg:w-[360px] shrink-0">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Events</p>
                <p className="text-lg font-black text-slate-900 tabular-nums">{connection.eventCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Last event</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{connection.lastEventAt ? formatRelative(connection.lastEventAt) : '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Last test</p>
                <p className={`text-xs font-bold mt-1 ${connection.lastTestOk === false ? 'text-rose-600' : connection.lastTestOk ? 'text-emerald-700' : 'text-slate-800'}`}>
                  {connection.lastTestedAt ? (connection.lastTestOk ? 'Passed' : 'Failed') : '-'}
                </p>
              </div>
            </div>
          )}
        </div>
        {connection && canManage && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="sm:w-80">
              <Toggle
                checked={connection.status !== 'disabled'}
                onChange={toggleEnabled}
                disabled={toggling}
                label={connection.status !== 'disabled' ? 'Integration is on' : 'Integration is off'}
                description={provider.delivery ? 'Off: no events are sent.' : 'Off: this sign-in option is hidden.'}
              />
            </div>
            <Button variant="subtleDanger" icon={Unplug} onClick={() => setConfirmRemove(true)}>{isCustom ? 'Delete integration' : 'Disconnect'}</Button>
          </div>
        )}
      </section>

      {!canManage && <ReadOnlyNotice>You can see this integration, but only people with the "Integrations" permission can configure it.</ReadOnlyNotice>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <Card title={<SectionTitle icon={Settings2}>Connection</SectionTitle>} description="Credentials are stored encrypted and never shown again after saving.">
            <div className="space-y-4">
              {isCustom && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Name" required>
                    <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} disabled={!canManage} maxLength={120} />
                  </Field>
                  <Field label="Description">
                    <input className={inputClass} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} disabled={!canManage} maxLength={255} />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.connection.map((field) => (
                  <div key={field.key} className={field.type === 'url' || field.secret ? 'md:col-span-2' : ''}>
                    <FieldInput field={field} form={form} setConfig={setConfig} setSecret={setSecret} secretState={connection?.secrets?.[field.key]} disabled={!canManage} />
                  </div>
                ))}
              </div>
              {isCustom && connection?.secrets?.signing_secret?.set && canManage && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700">Current signing secret</p>
                    <code className="block text-[11px] text-slate-600 break-all mt-0.5">{revealed || connection.secrets.signing_secret.masked}</code>
                  </div>
                  {revealed ? <CopyButton text={revealed} /> : <Button variant="secondary" icon={Eye} onClick={reveal}>Reveal</Button>}
                </div>
              )}
            </div>
          </Card>

          {sections.signing.length > 0 && (
            <Card title={<SectionTitle icon={Workflow}>Signing workflow</SectionTitle>} description="How this app takes part in your signature requests.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sections.signing.map((field) => (
                  <div key={field.key} className={field.type === 'toggle' ? 'md:col-span-2' : ''}>
                    <FieldInput field={field} form={form} setConfig={setConfig} setSecret={setSecret} disabled={!canManage} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {provider.delivery && (
            <Card title={<SectionTitle icon={ListChecks}>Signing events</SectionTitle>} description={provider.fixedEvents ? 'This app runs on one event.' : 'Choose which events are sent to this app.'}>
              {provider.fixedEvents ? (
                <p className="flex items-center gap-2 text-xs text-slate-700">
                  <Zap size={14} className="text-amber-500" /> Runs when a document is <strong>completed</strong> (every recipient signed).
                </p>
              ) : (
                <EventPicker events={(detail.events || []).filter((e) => e.key !== 'ping')} value={form.events} onChange={(events) => setForm((f) => ({ ...f, events }))} />
              )}
            </Card>
          )}

          {canManage && (
            <div className="sticky bottom-3 z-10">
              <div className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${dirty || !connection ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                <p className="text-xs font-semibold">
                  {saveError ? <span className="text-red-300">{saveError}</span>
                    : !connection ? 'Not connected yet: test the settings, then save to connect.'
                      : dirty ? 'You have unsaved changes.' : 'All changes saved.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" icon={PlugZap} busy={testing} onClick={test} className="flex-1 sm:flex-none">Test connection</Button>
                  {dirty && connection && <Button variant="secondary" onClick={() => setForm(JSON.parse(baseline))} className="flex-1 sm:flex-none">Discard</Button>}
                  <Button icon={Save} busy={saving} onClick={save} disabled={connection && !dirty} className="flex-1 sm:flex-none">{connection ? 'Save changes' : 'Save & connect'}</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Guide, test result, activity */}
        <div className="space-y-5">
          {testResult && (
            <div role="status" className={`rounded-2xl border p-4 flex items-start gap-3 ${testResult.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
              {testResult.ok ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <XCircle size={20} className="text-rose-600 shrink-0" />}
              <div className="min-w-0">
                <p className={`text-sm font-extrabold ${testResult.ok ? 'text-emerald-800' : 'text-rose-800'}`}>{testResult.ok ? 'Connection works' : 'Connection failed'}</p>
                <p className={`text-xs mt-0.5 break-words ${testResult.ok ? 'text-emerald-800' : 'text-rose-700'}`}>{testResult.message}</p>
                {testResult.durationMs ? <p className="text-[11px] text-slate-500 mt-1">{testResult.statusCode ? `HTTP ${testResult.statusCode} · ` : ''}{testResult.durationMs} ms</p> : null}
              </div>
            </div>
          )}

          <Card title={<SectionTitle icon={BookOpen}>Setup guide</SectionTitle>}>
            <ol className="space-y-3">
              {provider.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-[#007355] text-[11px] font-black flex items-center justify-center shrink-0 ring-1 ring-emerald-100">{i + 1}</span>
                  <p className="text-xs text-slate-700 leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
            {provider.redirectUri && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5"><Link2 size={13} /> Redirect URI</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 min-w-0 text-[11px] text-slate-700 break-all">{provider.redirectUri}</code>
                  <CopyButton text={provider.redirectUri} iconOnly ariaLabel="Copy redirect URI" />
                </div>
              </div>
            )}
            <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-500">
              <Info size={13} className="shrink-0 mt-0.5" /> <span><strong className="text-slate-700">Test connection:</strong> {provider.test}</span>
            </p>
          </Card>

          <Card title={<SectionTitle icon={History}>Activity</SectionTitle>} bodyClassName="p-0">
            {detail.activity?.length ? (
              <ul className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {detail.activity.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    {a.success ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" /> : <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">
                        {ACTIVITY_LABELS[a.action] || a.action}
                        {a.event && a.event !== 'ping' && <span className="font-semibold text-slate-500"> · {eventLabels[a.event] || a.event}</span>}
                        {a.document_id ? <Link to={`/documents/${a.document_id}`} className="font-semibold text-[#007355] hover:underline"> · doc #{a.document_id}</Link> : null}
                      </p>
                      {a.message && <p className="text-[11px] text-slate-500 break-words">{a.message}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0" title={formatDateTime(a.created_at)}>{formatRelative(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={History} title="No activity yet" description={connection ? 'Tests and deliveries appear here.' : 'Connect the app to see its tests and deliveries here.'} />
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title={isCustom ? `Delete ${provider.name}?` : `Disconnect ${provider.name}?`}
        message={`Its saved settings, credentials and activity are removed and no more events are sent. ${isCustom ? 'The integration is deleted.' : 'You can configure it again later.'}`}
        confirmLabel={isCustom ? 'Delete' : 'Disconnect'}
        danger
        busy={removing}
        onConfirm={remove}
        onCancel={() => setConfirmRemove(false)}
      />
      {toast}
    </div>
  );
}
