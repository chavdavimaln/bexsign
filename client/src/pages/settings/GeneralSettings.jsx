import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Globe, FileSignature, Shield, Mail, Settings2, ImageOff, Clock } from 'lucide-react';
import { PageHeader, Card, Field, inputClass, Toggle, ErrorBanner, LoadingBlock, useToast, formatDateTime } from '../../components/ui/kit';
import { apiFetch, API_ORIGIN } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import { SaveBar, FieldError, ReadOnlyNotice, SectionTitle, useUnsavedChangesPrompt } from '../../components/settings/settingsUi';

/**
 * General settings: organization branding, regional formats, signing defaults for new requests, session timeout
 * and the email footer. Everyone can read them; changing them needs "settings.general".
 */

const FALLBACK_TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo', 'Australia/Sydney', 'Africa/Johannesburg'
];
const DEFAULT_OPTIONS = {
  dateFormats: ['MMM dd, yyyy', 'dd MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'dd.MM.yyyy'],
  timeFormats: ['12h', '24h'],
  languages: [{ value: 'en', label: 'English' }],
  signingOrders: ['parallel', 'sequential']
};
const SESSION_TIMEOUTS = [[15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [240, '4 hours'], [480, '8 hours'], [720, '12 hours'], [1440, '24 hours']];
const BRAND_SWATCHES = ['#007355', '#e71414', '#2563eb', '#7c3aed', '#ea580c', '#0f172a'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FOOTER_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function zoneParts(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset'
    }).formatToParts(new Date());
    return Object.fromEntries(parts.map((p) => [p.type, p.value]));
  } catch (e) {
    return null;
  }
}

function formatDateSample(format, timeZone) {
  const p = zoneParts(timeZone) || {};
  const now = new Date();
  const y = p.year || now.getFullYear();
  const m = Number(p.month || now.getMonth() + 1);
  const d = String(p.day || now.getDate()).padStart(2, '0');
  const values = { yyyy: y, MMM: MONTHS[m - 1], MM: String(m).padStart(2, '0'), dd: d };
  return String(format || '').replace(/yyyy|MMM|MM|dd/g, (t) => values[t]);
}

function formatTimeSample(timeFormat, timeZone) {
  const p = zoneParts(timeZone);
  if (!p) return '';
  const h = Number(p.hour) % 24;
  if (timeFormat === '24h') return `${String(h).padStart(2, '0')}:${p.minute}`;
  return `${h % 12 || 12}:${p.minute} ${h < 12 ? 'AM' : 'PM'}`;
}

/** IANA zones grouped by region, labelled with their current UTC offset. */
function buildTimezoneGroups(current) {
  let zones = [];
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch (e) {
    zones = [];
  }
  if (!zones.length) zones = FALLBACK_TIMEZONES;
  zones = [...new Set(['UTC', ...zones, ...(current ? [current] : [])])];
  const groups = new Map();
  zones.forEach((zone) => {
    const region = zone.includes('/') ? zone.split('/')[0] : 'Other';
    const offset = zoneParts(zone)?.timeZoneName || '';
    if (!groups.has(region)) groups.set(region, []);
    groups.get(region).push({ value: zone, label: `${zone.replace(/_/g, ' ')}${offset ? ` (${offset})` : ''}` });
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function validate(form) {
  const errors = {};
  if (!String(form.organization_name || '').trim()) errors.organization_name = 'Organization name is required.';
  else if (form.organization_name.length > 150) errors.organization_name = 'Use 150 characters or fewer.';
  if (form.organization_email && !EMAIL_RE.test(form.organization_email.trim())) errors.organization_email = 'Enter a valid email address.';
  if (form.logo_url) {
    const value = form.logo_url.trim();
    let ok = /^\/[\w./-]+$/.test(value);
    try {
      ok = ok || ['http:', 'https:'].includes(new URL(value).protocol);
    } catch (e) {}
    if (!ok) errors.logo_url = 'Use an http(s) URL or a path such as /uploads/logo.png.';
  }
  if (!HEX_RE.test(form.brand_color || '')) errors.brand_color = 'Use a hex color such as #007355.';
  const range = (key, min, max, label) => {
    const n = Number(form[key]);
    if (form[key] === '' || !Number.isInteger(n) || n < min || n > max) errors[key] = `${label} must be a whole number from ${min} to ${max}.`;
  };
  range('default_expiry_days', 1, 365, 'Expiry');
  range('reminder_frequency_days', 1, 30, 'Reminder frequency');
  if ((form.email_footer || '').length > FOOTER_MAX) errors.email_footer = `Use ${FOOTER_MAX} characters or fewer.`;
  return errors;
}

const normalize = (s) => ({ ...s, organization_email: s.organization_email || '', logo_url: s.logo_url || '', email_footer: s.email_footer || '' });
const logoSrc = (url) => (url && url.startsWith('/') ? `${API_ORIGIN}${url}` : url);

export default function GeneralSettings() {
  const { can } = usePermissions();
  const canEdit = can('settings.general');
  const [toast, showToast] = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [meta, setMeta] = useState({ updatedAt: null, updatedBy: null });
  const [serverErrors, setServerErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await apiFetch('/platform-settings/general');
      const s = normalize(data.settings);
      setSaved(s);
      setForm(s);
      setOptions({ ...DEFAULT_OPTIONS, ...(data.options || {}) });
      setMeta({ updatedAt: data.updatedAt, updatedBy: data.updatedBy });
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changedKeys = useMemo(() => (form && saved ? Object.keys(form).filter((k) => String(form[k] ?? '') !== String(saved[k] ?? '')) : []), [form, saved]);
  const dirty = canEdit && changedKeys.length > 0;
  const errors = useMemo(() => (form ? { ...validate(form), ...serverErrors } : {}), [form, serverErrors]);
  const hasErrors = Object.keys(errors).length > 0;
  useUnsavedChangesPrompt(dirty);

  const timezoneGroups = useMemo(() => buildTimezoneGroups(saved?.timezone), [saved?.timezone]);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (serverErrors[key]) setServerErrors(({ [key]: _, ...rest }) => rest);
    if (key === 'logo_url') setLogoBroken(false);
  };

  const discard = () => {
    setForm(saved);
    setServerErrors({});
    setLogoBroken(false);
  };

  const save = async () => {
    if (hasErrors) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(changedKeys.map((k) => [k, ['default_expiry_days', 'reminder_frequency_days', 'session_timeout_minutes'].includes(k) ? Number(form[k]) : form[k]]));
      const data = await apiFetch('/platform-settings/general', { method: 'PUT', body });
      const s = normalize(data.settings);
      setSaved(s);
      setForm(s);
      setMeta({ updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      setServerErrors({});
      showToast('success', data.message || 'General settings saved.');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = (key, props = {}) => ({
    id: `gs-${key}`,
    value: form[key] ?? '',
    onChange: (e) => set(key, e.target.value),
    disabled: !canEdit,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `gs-${key}-error` : undefined,
    className: `${inputClass} ${errors[key] ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`,
    ...props
  });

  const header = (
    <PageHeader
      eyebrow="Settings"
      title="General settings"
      icon={Settings2}
      description="Organization details, regional formats and the defaults every new signing request starts with."
      actions={meta.updatedAt && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Clock size={13} /> Last saved {formatDateTime(meta.updatedAt)}{meta.updatedBy ? ` by ${meta.updatedBy}` : ''}
        </p>
      )}
    />
  );

  if (loading) return <div className="space-y-5">{header}<Card><LoadingBlock label="Loading general settings..." /></Card></div>;
  if (loadError || !form) return <div className="space-y-5">{header}<ErrorBanner message={loadError || 'General settings could not be loaded.'} onRetry={load} /></div>;

  const brandColor = HEX_RE.test(form.brand_color) ? form.brand_color : '#007355';
  const pickerColor = brandColor.length === 4 ? `#${brandColor.slice(1).split('').map((c) => c + c).join('')}` : brandColor;

  return (
    <div className="space-y-5 max-w-5xl">
      {header}
      {!canEdit && <ReadOnlyNotice>You can view these settings but not change them. Ask a manager for the “General settings” permission.</ReadOnlyNotice>}

      <Card title={<SectionTitle icon={Building2}>Organization</SectionTitle>} description="Shown in emails, on signing pages and on certificates.">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Organization name" required>
              <input {...input('organization_name', { maxLength: 150, autoComplete: 'organization' })} />
              <FieldError id="gs-organization_name-error" message={errors.organization_name} />
            </Field>
            <Field label="Organization email" hint="Reply-to address for request emails.">
              <input {...input('organization_email', { type: 'email', placeholder: 'contracts@company.com', autoComplete: 'email' })} />
              <FieldError id="gs-organization_email-error" message={errors.organization_email} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Logo URL" hint="A PNG or SVG with a transparent background works best (at least 200 px wide).">
                <input {...input('logo_url', { type: 'url', placeholder: 'https://company.com/logo.png', inputMode: 'url' })} />
                <FieldError id="gs-logo_url-error" message={errors.logo_url} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <span className="block text-xs font-bold text-slate-700 mb-1" id="gs-brand-label">Brand color</span>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-labelledby="gs-brand-label">
                <input
                  type="color"
                  value={pickerColor}
                  onChange={(e) => set('brand_color', e.target.value)}
                  disabled={!canEdit}
                  aria-label="Pick brand color"
                  className="w-10 h-10 rounded-xl border border-slate-300 bg-white p-1 cursor-pointer disabled:cursor-not-allowed"
                />
                <input {...input('brand_color', { maxLength: 7, 'aria-label': 'Brand color hex value', className: `${input('brand_color').className} !w-28 font-mono uppercase` })} />
                <div className="flex gap-1.5">
                  {BRAND_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => set('brand_color', c)}
                      aria-label={`Use ${c}`}
                      aria-pressed={form.brand_color.toLowerCase() === c}
                      className={`w-7 h-7 rounded-lg border-2 transition cursor-pointer disabled:cursor-not-allowed ${form.brand_color.toLowerCase() === c ? 'border-slate-900 scale-110' : 'border-white shadow ring-1 ring-slate-200'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <FieldError id="gs-brand_color-error" message={errors.brand_color} />
            </div>
          </div>

          <div aria-label="Brand preview" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Preview</p>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: brandColor }} />
              <div className="p-3 space-y-3">
                <div className="h-10 flex items-center">
                  {form.logo_url && !logoBroken && !errors.logo_url ? (
                    <img src={logoSrc(form.logo_url)} alt={`${form.organization_name || 'Organization'} logo`} onError={() => setLogoBroken(true)} className="max-h-10 max-w-full object-contain" />
                  ) : (
                    <span className="flex items-center gap-2 text-[11px] text-slate-400">
                      {form.logo_url ? <><ImageOff size={15} /> Logo could not be loaded</> : <span className="text-sm font-black text-slate-900 truncate">{form.organization_name || 'Your organization'}</span>}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">{form.organization_name || 'Your organization'}</strong> sent you a document to sign.
                </p>
                <span className="inline-block px-3 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: brandColor }}>Review and sign</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card title={<SectionTitle icon={Globe}>Regional</SectionTitle>} description="How dates and times are shown in emails, reports and the audit trail.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Time zone" hint={`Current time there: ${formatTimeSample(form.time_format, form.timezone)}`}>
            <select {...input('timezone')}>
              {timezoneGroups.map(([region, zones]) => (
                <optgroup key={region} label={region}>
                  {zones.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Language" hint="Language of emails and signing pages.">
            <select {...input('language')}>
              {options.languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="Date format" hint={`Today: ${formatDateSample(form.date_format, form.timezone)}`}>
            <select {...input('date_format')}>
              {options.dateFormats.map((f) => <option key={f} value={f}>{f} ({formatDateSample(f, form.timezone)})</option>)}
            </select>
          </Field>
          <fieldset>
            <legend className="block text-xs font-bold text-slate-700 mb-1">Time format</legend>
            <div className="grid grid-cols-2 gap-2">
              {options.timeFormats.map((f) => (
                <label key={f} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${form.time_format === f ? 'border-[#007355] bg-emerald-50 text-[#007355]' : 'border-slate-300 text-slate-700'} ${canEdit ? 'cursor-pointer' : 'opacity-70'}`}>
                  <span className="flex items-center gap-2">
                    <input type="radio" name="gs-time-format" value={f} checked={form.time_format === f} onChange={() => set('time_format', f)} disabled={!canEdit} className="accent-[#007355]" />
                    {f === '12h' ? '12-hour' : '24-hour'}
                  </span>
                  <span className="text-[11px] text-slate-500 tabular-nums">{formatTimeSample(f, form.timezone)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card title={<SectionTitle icon={FileSignature}>Signing defaults</SectionTitle>} description="Starting values for new signing requests. Senders can still change them per request.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Request expires after (days)" hint="1 to 365 days after sending.">
            <input {...input('default_expiry_days', { type: 'number', min: 1, max: 365, inputMode: 'numeric' })} />
            <FieldError id="gs-default_expiry_days-error" message={errors.default_expiry_days} />
          </Field>
          <Field label="Send reminders every (days)" hint="1 to 30 days, while a recipient has not signed.">
            <input {...input('reminder_frequency_days', { type: 'number', min: 1, max: 30, inputMode: 'numeric', disabled: !canEdit || !form.auto_reminders })} />
            <FieldError id="gs-reminder_frequency_days-error" message={errors.reminder_frequency_days} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="block text-xs font-bold text-slate-700 mb-1">Default signing order</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ['parallel', 'Everyone at once', 'All recipients receive the request at the same time.'],
                ['sequential', 'In order', 'Recipients receive it one after another, in the listed order.']
              ].map(([value, label, hint]) => (
                <label key={value} className={`flex items-start gap-2.5 p-3 rounded-xl border transition ${form.default_signing_order === value ? 'border-[#007355] bg-emerald-50' : 'border-slate-300'} ${canEdit ? 'cursor-pointer' : 'opacity-70'}`}>
                  <input type="radio" name="gs-signing-order" value={value} checked={form.default_signing_order === value} onChange={() => set('default_signing_order', value)} disabled={!canEdit} className="mt-0.5 accent-[#007355]" />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Toggle label="Automatic reminders" description="Email recipients who have not signed yet." checked={Boolean(form.auto_reminders)} onChange={(v) => set('auto_reminders', v)} disabled={!canEdit} />
          <Toggle label="Allow recipients to decline" description="Recipients can decline with a reason." checked={Boolean(form.allow_decline)} onChange={(v) => set('allow_decline', v)} disabled={!canEdit} />
          <Toggle label="Allow reassigning" description="Recipients can forward the request to someone else." checked={Boolean(form.allow_reassign)} onChange={(v) => set('allow_reassign', v)} disabled={!canEdit} />
          <Toggle label="Allow print & sign" description="Recipients can sign on paper and upload a scan." checked={Boolean(form.allow_print_sign)} onChange={(v) => set('allow_print_sign', v)} disabled={!canEdit} />
          <Toggle label="Require email OTP from signers" description="Signers confirm a one-time code before signing." checked={Boolean(form.require_signer_otp)} onChange={(v) => set('require_signer_otp', v)} disabled={!canEdit} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5">
        <Card title={<SectionTitle icon={Shield}>Security</SectionTitle>} description="Applies to everyone in the organization.">
          <Field label="Sign out after inactivity" hint="Users are signed out after this much idle time.">
            <select {...input('session_timeout_minutes')}>
              {(SESSION_TIMEOUTS.some(([v]) => v === Number(form.session_timeout_minutes)) ? SESSION_TIMEOUTS : [[Number(form.session_timeout_minutes), `${form.session_timeout_minutes} minutes`], ...SESSION_TIMEOUTS])
                .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </Card>

        <Card title={<SectionTitle icon={Mail}>Email footer</SectionTitle>} description="Added to the bottom of every email BexSign sends for your organization.">
          <Field label="Footer text">
            <textarea {...input('email_footer', { rows: 4, maxLength: FOOTER_MAX, placeholder: 'e.g. Company Pvt. Ltd., 21 Market Street, Ahmedabad. This email is confidential.' })} />
          </Field>
          <div className="flex items-center justify-between gap-2 mt-1">
            <FieldError id="gs-email_footer-error" message={errors.email_footer} />
            <span className={`ml-auto text-[11px] tabular-nums ${(form.email_footer || '').length > FOOTER_MAX - 100 ? 'text-amber-600' : 'text-slate-400'}`}>{(form.email_footer || '').length}/{FOOTER_MAX}</span>
          </div>
          {form.email_footer && (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Preview</p>
              <p className="text-[11px] text-slate-500 whitespace-pre-line break-words">{form.email_footer}</p>
            </div>
          )}
        </Card>
      </div>

      <SaveBar visible={dirty} saving={saving} onSave={save} onDiscard={discard} count={changedKeys.length} blocked={hasErrors} />
      {toast}
    </div>
  );
}
