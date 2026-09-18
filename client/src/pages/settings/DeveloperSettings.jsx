import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2, Power, ShieldCheck, Webhook, ScrollText, Eye, EyeOff, RotateCw, X, Plus, ArrowRight, Clock, KeyRound, TriangleAlert, Lock } from 'lucide-react';
import { PageHeader, Card, Field, inputClass, Toggle, ErrorBanner, LoadingBlock, EmptyState, Button, Modal, ConfirmDialog, useToast, formatDateTime } from '../../components/ui/kit';
import { apiFetch } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import { SaveBar, FieldError, SectionTitle, CopyButton, useUnsavedChangesPrompt } from '../../components/settings/settingsUi';

/**
 * Developer settings: API on/off and sandbox mode, rate limit, CORS origins and IP allowlist, the webhook signing
 * secret with retry and timeout, the default callback URL and log retention. Needs "settings.developer".
 */

const RETENTION = [[7, '7 days'], [14, '14 days'], [30, '30 days'], [60, '60 days'], [90, '90 days'], [180, '180 days'], [365, '1 year']];
const FORM_KEYS = ['api_enabled', 'sandbox_mode', 'rate_limit_per_minute', 'allowed_origins', 'ip_allowlist', 'webhook_retry_count', 'webhook_timeout_seconds', 'default_callback_url', 'log_retention_days'];

function isOrigin(value) {
  if (value === '*') return true;
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && u.origin === value;
  } catch (e) {
    return false;
  }
}

function isIpOrCidr(value) {
  const [ip, bits, extra] = value.split('/');
  if (extra !== undefined) return false;
  const v4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip);
  const v6 = !v4 && ip.includes(':') && /^[0-9a-f:.]+$/i.test(ip);
  if (!v4 && !v6) return false;
  if (bits === undefined) return true;
  return /^\d+$/.test(bits) && Number(bits) <= (v4 ? 32 : 128);
}

function isHttpUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch (e) {
    return false;
  }
}

/** Text input that turns entries into removable chips (Enter, comma or paste of several values). */
function ChipInput({ id, label, values, onChange, validateItem, placeholder, disabled, invalidMessage, max = 50 }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const add = (raw) => {
    const items = String(raw).split(/[\s,]+/).map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
    if (!items.length) return;
    const bad = items.find((v) => !validateItem(v));
    if (bad) {
      setError(invalidMessage(bad));
      return;
    }
    const next = [...new Set([...values, ...items])];
    if (next.length > max) {
      setError(`You can add at most ${max} entries.`);
      return;
    }
    onChange(next);
    setDraft('');
    setError('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <div className={`flex flex-wrap items-center gap-1.5 p-1.5 border rounded-xl bg-white min-h-[42px] focus-within:border-[#007355] focus-within:ring-2 focus-within:ring-emerald-100 ${error ? 'border-red-400' : 'border-slate-300'} ${disabled ? 'bg-slate-50' : ''}`}>
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 max-w-full pl-2 pr-1 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700">
            <span className="truncate">{v}</span>
            {!disabled && (
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-white cursor-pointer">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[\s,]/.test(text.trim())) {
              e.preventDefault();
              add(text);
            }
          }}
          disabled={disabled}
          placeholder={values.length ? '' : placeholder}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          className="flex-1 min-w-[140px] px-1.5 py-1 text-sm bg-transparent focus:outline-none disabled:cursor-not-allowed"
        />
        {!disabled && draft && (
          <button type="button" onClick={() => add(draft)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#007355] hover:bg-emerald-50 cursor-pointer">
            <Plus size={12} /> Add
          </button>
        )}
      </div>
      <FieldError message={error} />
    </div>
  );
}

const pick = (s) => Object.fromEntries(FORM_KEYS.map((k) => [k, k === 'default_callback_url' ? (s[k] || '') : s[k]]));
const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

export default function DeveloperSettings() {
  const { can, loading: permsLoading } = usePermissions();
  const allowed = can('settings.developer');
  const [toast, showToast] = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: null });
  const [secretMasked, setSecretMasked] = useState('');
  const [revealed, setRevealed] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const apply = (data) => {
    const s = pick(data.settings);
    setSaved(s);
    setForm(s);
    setSecretMasked(data.settings.webhook_signing_secret_masked || '');
    setMeta({ updatedAt: data.updatedAt, updatedBy: data.updatedBy });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      apply(await apiFetch('/platform-settings/developer'));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!permsLoading && allowed) load();
    else if (!permsLoading) setLoading(false);
  }, [permsLoading, allowed, load]);

  const changedKeys = useMemo(() => (form && saved ? FORM_KEYS.filter((k) => !same(form[k], saved[k])) : []), [form, saved]);
  const dirty = changedKeys.length > 0;
  useUnsavedChangesPrompt(dirty);

  const errors = useMemo(() => {
    if (!form) return {};
    const e = {};
    const range = (key, min, max, label) => {
      const n = Number(form[key]);
      if (form[key] === '' || !Number.isInteger(n) || n < min || n > max) e[key] = `${label} must be a whole number from ${min} to ${max}.`;
    };
    range('rate_limit_per_minute', 1, 10000, 'Rate limit');
    range('webhook_timeout_seconds', 1, 60, 'Timeout');
    if (form.default_callback_url && !isHttpUrl(form.default_callback_url.trim())) e.default_callback_url = 'Use a full http:// or https:// URL.';
    return { ...e, ...serverErrors };
  }, [form, serverErrors]);
  const hasErrors = Object.keys(errors).length > 0;

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (serverErrors[key]) setServerErrors(({ [key]: _, ...rest }) => rest);
  };

  const save = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const numeric = ['rate_limit_per_minute', 'webhook_retry_count', 'webhook_timeout_seconds', 'log_retention_days'];
      const body = Object.fromEntries(changedKeys.map((k) => [k, numeric.includes(k) ? Number(form[k]) : form[k]]));
      const data = await apiFetch('/platform-settings/developer', { method: 'PUT', body });
      apply(data);
      setServerErrors({});
      showToast('success', data.message || 'Developer settings saved.');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const reveal = async () => {
    if (revealed) {
      setRevealed('');
      return;
    }
    setRevealing(true);
    try {
      const data = await apiFetch('/platform-settings/developer/reveal-secret', { method: 'POST' });
      setRevealed(data.secret || '');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setRevealing(false);
    }
  };

  const secretForCopy = async () => {
    if (revealed) return revealed;
    const data = await apiFetch('/platform-settings/developer/reveal-secret', { method: 'POST' });
    return data.secret || '';
  };

  const rotate = async () => {
    setRotating(true);
    try {
      const data = await apiFetch('/platform-settings/developer/rotate-secret', { method: 'POST' });
      setSecretMasked(data.masked || '');
      setRevealed('');
      setNewSecret(data.secret);
      setConfirmRotate(false);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setRotating(false);
    }
  };

  const header = (
    <PageHeader
      eyebrow="Settings"
      title="Developer settings"
      icon={Code2}
      description="Control access to the BexSign REST API and how webhook events are signed and delivered."
      actions={(
        <>
          {meta.updatedAt && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Clock size={13} /> Last saved {formatDateTime(meta.updatedAt)}{meta.updatedBy ? ` by ${meta.updatedBy}` : ''}
            </p>
          )}
          <Link to="/settings/developer-api" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700">
            <KeyRound size={14} /> API keys & webhooks
          </Link>
        </>
      )}
    />
  );

  if (permsLoading || loading) return <div className="space-y-5">{header}<Card><LoadingBlock label="Loading developer settings..." /></Card></div>;
  if (!allowed) {
    return (
      <div className="space-y-5">
        {header}
        <Card>
          <EmptyState
            icon={Lock}
            title="You don't have access to developer settings"
            description="Ask a manager for the “Developer settings” permission. You may still be able to manage your own API keys and webhooks."
            action={<Link to="/settings/developer-api" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#007355] hover:bg-[#005c44] text-white">Open Developer API <ArrowRight size={14} /></Link>}
          />
        </Card>
      </div>
    );
  }
  if (loadError || !form) return <div className="space-y-5">{header}<ErrorBanner message={loadError || 'Developer settings could not be loaded.'} onRetry={load} /></div>;

  const numInput = (key, props) => (
    <>
      <input
        id={`ds-${key}`}
        type="number"
        inputMode="numeric"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        className={`${inputClass} ${errors[key] ? 'border-red-400' : ''}`}
        {...props}
      />
      <FieldError message={errors[key]} />
    </>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      {header}

      {!form.api_enabled && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <p className="font-semibold">API access is off{changedKeys.includes('api_enabled') ? ' once you save' : ''}: every API request is rejected (HTTP 503) and webhook deliveries are paused.</p>
        </div>
      )}

      <Card title={<SectionTitle icon={Power}>API access</SectionTitle>} description="Applies to every API key in the organization.">
        <div className="space-y-5">
          <Toggle label="Enable the REST API" description="Turn off to reject every API request and pause webhook deliveries." checked={Boolean(form.api_enabled)} onChange={(v) => set('api_enabled', v)} />
          <Toggle label="Sandbox mode" description="Allow sandbox keys (bxs_test_…) for building and testing integrations. Turning it off blocks existing sandbox keys." checked={Boolean(form.sandbox_mode)} onChange={(v) => set('sandbox_mode', v)} />
          <div className="max-w-xs">
            <Field label="Rate limit (requests per minute, per key)" hint="Extra requests get HTTP 429 with a Retry-After header.">
              {numInput('rate_limit_per_minute', { min: 1, max: 10000 })}
            </Field>
          </div>
        </div>
      </Card>

      <Card title={<SectionTitle icon={ShieldCheck}>Access restrictions</SectionTitle>} description="Leave a list empty to allow any origin or IP address.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="min-w-0">
            <label htmlFor="ds-origins" className="block text-xs font-bold text-slate-700 mb-1">Allowed CORS origins</label>
            <ChipInput
              id="ds-origins"
              label="Add allowed origin"
              values={form.allowed_origins || []}
              onChange={(v) => set('allowed_origins', v)}
              validateItem={isOrigin}
              invalidMessage={(v) => `"${v}" is not an origin. Use scheme and host only, e.g. https://app.example.com`}
              placeholder="https://app.example.com"
            />
            <p className="text-[11px] text-slate-400 mt-1">Browser apps on other origins are refused. Server-to-server calls are not affected.</p>
            <FieldError message={serverErrors.allowed_origins} />
          </div>
          <div className="min-w-0">
            <label htmlFor="ds-ips" className="block text-xs font-bold text-slate-700 mb-1">IP allowlist</label>
            <ChipInput
              id="ds-ips"
              label="Add IP address or CIDR range"
              values={form.ip_allowlist || []}
              onChange={(v) => set('ip_allowlist', v)}
              validateItem={isIpOrCidr}
              invalidMessage={(v) => `"${v}" is not an IP address or CIDR range (e.g. 203.0.113.7 or 10.0.0.0/8).`}
              placeholder="203.0.113.7 or 10.0.0.0/8"
              max={100}
            />
            <p className="text-[11px] text-slate-400 mt-1">Requests from other addresses get HTTP 403 and appear in the failed access log. Include 127.0.0.1 to test locally.</p>
            <FieldError message={serverErrors.ip_allowlist} />
          </div>
        </div>
      </Card>

      <Card title={<SectionTitle icon={Webhook}>Webhooks</SectionTitle>} description="How BexSign signs and delivers webhook events.">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold text-slate-700 mb-1">Signing secret</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <code className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 break-all" aria-live="polite">
                {revealed || secretMasked || 'Not created yet'}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={revealed ? EyeOff : Eye} busy={revealing} onClick={reveal}>{revealed ? 'Hide' : 'Reveal'}</Button>
                <CopyButton text={secretForCopy} label="Copy" ariaLabel="Copy signing secret" className="!px-3 !py-2 !rounded-xl !text-xs" />
                <Button variant="subtleDanger" icon={RotateCw} onClick={() => setConfirmRotate(true)}>Rotate</Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Each delivery has an <code className="font-mono">X-BexSign-Signature: sha256=…</code> header: an HMAC-SHA256 of the raw body with this secret (or the webhook's own secret when it has one).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Retries after a failed delivery" hint="Backoff: 1 s, 2 s, 4 s…">
              <select id="ds-retry" value={form.webhook_retry_count} onChange={(e) => set('webhook_retry_count', Number(e.target.value))} className={inputClass}>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i === 0 ? 'No retries' : `${i} ${i === 1 ? 'retry' : 'retries'}`}</option>)}
              </select>
            </Field>
            <Field label="Timeout (seconds)" hint="1 to 60 seconds per attempt.">
              {numInput('webhook_timeout_seconds', { min: 1, max: 60 })}
            </Field>
            <Field label="Default callback URL" hint="Suggested when creating a webhook.">
              <input
                id="ds-callback"
                type="url"
                inputMode="url"
                value={form.default_callback_url}
                onChange={(e) => set('default_callback_url', e.target.value)}
                placeholder="https://api.example.com/bexsign"
                aria-invalid={errors.default_callback_url ? true : undefined}
                className={`${inputClass} ${errors.default_callback_url ? 'border-red-400' : ''}`}
              />
              <FieldError message={errors.default_callback_url} />
            </Field>
          </div>
          <p className="text-[11px] text-slate-500">A webhook is turned off automatically after 10 failed deliveries in a row, and its owner is notified.</p>
        </div>
      </Card>

      <Card title={<SectionTitle icon={ScrollText}>Logs</SectionTitle>} description="API request logs and webhook delivery history.">
        <div className="max-w-xs">
          <Field label="Keep logs for" hint="Older entries are deleted automatically.">
            <select id="ds-retention" value={form.log_retention_days} onChange={(e) => set('log_retention_days', Number(e.target.value))} className={inputClass}>
              {(RETENTION.some(([v]) => v === Number(form.log_retention_days)) ? RETENTION : [[Number(form.log_retention_days), `${form.log_retention_days} days`], ...RETENTION])
                .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Link to="/settings/developer-api" className="group flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-[#007355] hover:shadow-md transition">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-emerald-100 text-[#007355] flex items-center justify-center shrink-0"><KeyRound size={19} /></span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-slate-900">Developer API</span>
            <span className="block text-xs text-slate-500">Create API keys, manage webhooks, read request logs and the API documentation.</span>
          </span>
        </span>
        <ArrowRight size={18} className="text-slate-400 group-hover:text-[#007355] shrink-0" />
      </Link>

      <SaveBar visible={dirty} saving={saving} onSave={save} onDiscard={() => { setForm(saved); setServerErrors({}); }} count={changedKeys.length} blocked={hasErrors} />

      <ConfirmDialog
        open={confirmRotate}
        title="Rotate the signing secret?"
        message="A new secret is created and used for every delivery from now on. Receivers that verify signatures with the old secret will reject events until you update them. Webhooks with their own secret are not affected."
        confirmLabel="Rotate secret"
        danger
        busy={rotating}
        onConfirm={rotate}
        onCancel={() => setConfirmRotate(false)}
      />

      <Modal
        open={Boolean(newSecret)}
        onClose={() => setNewSecret('')}
        title="New signing secret"
        description="Copy it now and update your webhook receivers."
        icon={RotateCw}
        size="sm"
        footer={<Button onClick={() => setNewSecret('')}>Done</Button>}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            <TriangleAlert size={14} className="shrink-0 mt-0.5" /> The previous secret no longer signs deliveries.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono break-all">{newSecret}</code>
            <CopyButton text={newSecret} iconOnly ariaLabel="Copy new signing secret" className="!p-2" />
          </div>
        </div>
      </Modal>
      {toast}
    </div>
  );
}
