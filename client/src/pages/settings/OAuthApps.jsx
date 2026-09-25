import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppWindow, Plus, KeyRound, Activity, Timer, ShieldCheck, Code2, RotateCw, Trash2, Ban, Settings2, TriangleAlert, Power, ExternalLink, BookOpen
} from 'lucide-react';
import {
  PageHeader, StatCard, Card, Button, Badge, Field, inputClass, Toggle, Tabs, EmptyState, ErrorBanner, LoadingBlock, Modal, ConfirmDialog,
  useToast, formatDateTime, formatRelative, thClass, tdClass
} from '../../components/ui/kit';
import { CopyButton, CodeBlock, SectionTitle } from '../../components/settings/settingsUi';
import { apiFetch, API_ORIGIN } from '../../utils/api';

/**
 * OAuth apps (Settings > Developer > OAuth apps). An external application gets a client ID and secret, exchanges
 * them for short-lived access tokens (OAuth 2.0 client credentials) at /api/oauth/token and calls the BexSign API
 * (/api/v1) with "Authorization: Bearer <token>". Needs the "API keys" permission.
 */

const TTL_OPTIONS = [[15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [480, '8 hours'], [1440, '24 hours']];

function ScopePicker({ scopes, value, onChange }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {scopes.map((s) => (
        <label key={s.key} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${value.includes(s.key) ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
          <input type="checkbox" checked={value.includes(s.key)} onChange={() => toggle(s.key)} className="mt-0.5 accent-[#007355]" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-slate-800 font-mono">{s.key}</span>
            <span className="block text-[11px] text-slate-500">{s.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function AppForm({ form, setForm, scopes }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="App name" required><input className={inputClass} value={form.name} onChange={set('name')} maxLength={120} placeholder="e.g. HR Portal" /></Field>
        <Field label="Access token lifetime">
          <select className={inputClass} value={form.token_ttl_minutes} onChange={set('token_ttl_minutes')}>
            {TTL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description"><input className={inputClass} value={form.description} onChange={set('description')} maxLength={255} placeholder="What the app does with BexSign" /></Field>
      <Field label="Homepage URL"><input className={inputClass} type="url" value={form.homepage_url} onChange={set('homepage_url')} placeholder="https://portal.example.com" /></Field>
      <Field label="Redirect URIs" hint="One per line. Kept for your records and future user-consent sign-in; the client credentials flow does not use them.">
        <textarea className={`${inputClass} min-h-[64px] font-mono text-xs`} value={form.redirect_uris} onChange={set('redirect_uris')} placeholder="https://portal.example.com/oauth/callback" />
      </Field>
      <div>
        <p className="text-xs font-bold text-slate-700 mb-2">Scopes the app may request <span className="text-red-500">*</span></p>
        <ScopePicker scopes={scopes} value={form.scopes} onChange={(v) => setForm((f) => ({ ...f, scopes: v }))} />
      </div>
    </div>
  );
}

const toBody = (form) => ({
  name: form.name,
  description: form.description,
  homepage_url: form.homepage_url,
  redirect_uris: String(form.redirect_uris || '').split(/\s+/).filter(Boolean),
  scopes: form.scopes,
  token_ttl_minutes: Number(form.token_ttl_minutes)
});

function SecretPanel({ title, value, note }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">{title}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 min-w-0 break-all text-[11px] font-mono bg-white border border-emerald-200 rounded-lg px-2.5 py-2 text-slate-800">{value}</code>
        <CopyButton text={value} />
      </div>
      {note && <p className="mt-2 text-[11px] text-emerald-800">{note}</p>}
    </div>
  );
}

function curlToken(clientId, secret = '<client_secret>', scope = '') {
  return `curl -X POST ${API_ORIGIN}/api/oauth/token \\
  -u "${clientId}:${secret}" \\
  -d "grant_type=client_credentials"${scope ? ` \\\n  -d "scope=${scope}"` : ''}`;
}
const curlCall = (token = '<access_token>') => `curl ${API_ORIGIN}/api/v1/documents?page_size=10 \\
  -H "Authorization: Bearer ${token}"`;

function AppDetail({ appId, scopes, onClose, onChanged, showToast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [issued, setIssued] = useState(null);
  const [secret, setSecret] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/developer/oauth-apps/${appId}`);
      setData(res);
      setForm({
        name: res.app.name,
        description: res.app.description,
        homepage_url: res.app.homepage_url,
        redirect_uris: res.app.redirect_uris.join('\n'),
        scopes: res.app.scopes,
        token_ttl_minutes: res.app.token_ttl_minutes
      });
    } catch (err) {
      setError(err.message);
    }
  }, [appId]);

  useEffect(() => {
    if (appId) {
      setTab('overview');
      setIssued(null);
      setSecret('');
      setError('');
      setData(null);
      load();
    }
  }, [appId, load]);

  const run = async (name, fn) => {
    setBusy(name);
    try {
      await fn();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy('');
    }
  };

  const save = () => run('save', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}`, { method: 'PUT', body: toBody(form) });
    showToast('success', res.message);
    await load();
    onChanged();
  });
  const setActive = (active) => run('active', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}`, { method: 'PUT', body: { is_active: active } });
    showToast('success', res.message);
    await load();
    onChanged();
  });
  const generate = () => run('token', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}/token`, { method: 'POST', body: {} });
    setIssued(res);
    await load();
    onChanged();
  });
  const rotate = () => run('rotate', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}/rotate-secret`, { method: 'POST' });
    setSecret(res.client_secret);
    setConfirm(null);
    showToast('success', 'New client secret created.');
    await load();
  });
  const revokeToken = (id) => run(`revoke-${id}`, async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}/tokens/${id}/revoke`, { method: 'POST' });
    showToast('success', res.message);
    await load();
    onChanged();
  });
  const revokeAll = () => run('revoke-all', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}/revoke-all`, { method: 'POST' });
    showToast('success', res.message);
    setConfirm(null);
    await load();
    onChanged();
  });
  const remove = () => run('delete', async () => {
    const res = await apiFetch(`/developer/oauth-apps/${appId}`, { method: 'DELETE' });
    showToast('success', res.message);
    setConfirm(null);
    onChanged();
    onClose();
  });

  const app = data?.app;
  return (
    <Modal
      open={Boolean(appId)}
      onClose={onClose}
      title={app ? app.name : 'OAuth app'}
      description={app ? <span className="font-mono">{app.client_id}</span> : ''}
      icon={AppWindow}
      size="xl"
      footer={app && (
        <>
          <Button variant="subtleDanger" icon={Trash2} onClick={() => setConfirm('delete')} className="mr-auto">Delete app</Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {tab === 'overview' && <Button busy={busy === 'save'} onClick={save}>Save changes</Button>}
        </>
      )}
    >
      {error && <ErrorBanner message={error} />}
      {!app && !error && <LoadingBlock />}
      {app && form && (
        <div className="space-y-4">
          <Tabs
            tabs={[
              { id: 'overview', label: 'Settings', icon: Settings2 },
              { id: 'credentials', label: 'Credentials', icon: KeyRound },
              { id: 'tokens', label: 'Access tokens', icon: ShieldCheck, count: app.active_tokens },
              { id: 'requests', label: 'Recent requests', icon: Activity, count: data.logs.length }
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                <Toggle
                  checked={app.is_active}
                  onChange={setActive}
                  disabled={busy === 'active'}
                  label={app.is_active ? 'App is on' : 'App is off'}
                  description={app.is_active ? 'Turning it off revokes its tokens and refuses new ones.' : 'The app cannot get tokens until you turn it on.'}
                />
              </div>
              <AppForm form={form} setForm={setForm} scopes={scopes} />
            </div>
          )}

          {tab === 'credentials' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Client ID</p>
                  <div className="mt-1 flex items-center gap-2"><code className="flex-1 min-w-0 break-all text-xs font-mono text-slate-800">{app.client_id}</code><CopyButton text={app.client_id} /></div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Client secret</p>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-slate-600">{app.secret_hint}</code>
                    <Button variant="secondary" icon={RotateCw} onClick={() => setConfirm('rotate')}>Rotate secret</Button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{app.secret_rotated_at ? `Last rotated ${formatRelative(app.secret_rotated_at)}.` : 'Created with the app.'} The secret is only shown when it is created.</p>
                </div>
              </div>
              {secret && <SecretPanel title="New client secret - copy it now" value={secret} note="It is not shown again. Update your application: the old secret no longer works." />}
              <CodeBlock title="1. Get an access token" code={curlToken(app.client_id, secret || '<client_secret>')} />
              <CodeBlock title="2. Call the API" code={curlCall()} />
            </div>
          )}

          {tab === 'tokens' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={KeyRound} busy={busy === 'token'} onClick={generate} disabled={!app.is_active}>Generate access token</Button>
                <Button variant="subtleDanger" icon={Ban} onClick={() => setConfirm('revoke-all')} disabled={!app.active_tokens}>Revoke all</Button>
                <span className="text-[11px] text-slate-500 sm:ml-auto">Tokens last {app.token_ttl_minutes} minutes · {app.token_count} issued in total</span>
              </div>
              {issued && (
                <>
                  <SecretPanel title="Access token - copy it now" value={issued.access_token} note={`Valid until ${formatDateTime(issued.expires_at)} · scope: ${issued.scope}`} />
                  <CodeBlock title="Try it" code={curlCall(issued.access_token)} />
                </>
              )}
              {data.tokens.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No tokens yet" description="Generate one here, or let your application request one from the token endpoint." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full">
                    <thead><tr><th className={thClass}>Token</th><th className={thClass}>State</th><th className={thClass}>Scopes</th><th className={thClass}>Issued</th><th className={thClass}>Expires</th><th className={thClass}>Requests</th><th className={thClass} /></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.tokens.map((t) => (
                        <tr key={t.id}>
                          <td className={`${tdClass} font-mono`}>{t.token_prefix}…<span className="block text-[10px] text-slate-400 font-sans">{t.grant_type === 'console' ? 'Generated here' : 'Token endpoint'}</span></td>
                          <td className={tdClass}><Badge tone={t.state === 'active' ? 'emerald' : t.state === 'revoked' ? 'rose' : 'slate'} dot>{t.state}</Badge></td>
                          <td className={tdClass}><span className="font-mono text-[11px]">{t.scopes.join(' ')}</span></td>
                          <td className={`${tdClass} whitespace-nowrap`} title={formatDateTime(t.created_at)}>{formatRelative(t.created_at)}</td>
                          <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(t.expires_at)}</td>
                          <td className={tdClass}>{t.request_count}</td>
                          <td className={`${tdClass} text-right`}>
                            {t.state === 'active' && <Button variant="ghost" busy={busy === `revoke-${t.id}`} onClick={() => revokeToken(t.id)} className="!py-1 text-rose-600">Revoke</Button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'requests' && (
            data.logs.length === 0 ? (
              <EmptyState icon={Activity} title="No API requests yet" description="Calls made with this app's tokens appear here." />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead><tr><th className={thClass}>Request</th><th className={thClass}>Status</th><th className={thClass}>Time</th><th className={thClass}>IP</th><th className={thClass}>When</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.logs.map((l, i) => (
                      <tr key={i}>
                        <td className={`${tdClass} font-mono text-[11px]`}><Badge>{l.method}</Badge> {l.endpoint}</td>
                        <td className={tdClass}><Badge tone={l.status_code < 300 ? 'emerald' : l.status_code < 500 ? 'amber' : 'rose'}>{l.status_code}</Badge></td>
                        <td className={tdClass}>{l.duration_ms != null ? `${l.duration_ms} ms` : '-'}</td>
                        <td className={`${tdClass} font-mono text-[11px]`}>{l.ip_address || '-'}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>{formatRelative(l.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'delete' ? `Delete "${app?.name}"?` : confirm === 'rotate' ? 'Rotate the client secret?' : 'Revoke every active token?'}
        message={confirm === 'delete'
          ? 'Its client ID, secret and every token stop working at once. This cannot be undone.'
          : confirm === 'rotate' ? 'A new secret is created and the current one stops working immediately. Your application must use the new secret to get tokens.'
            : 'Applications using these tokens get 401 errors until they request new ones.'}
        confirmLabel={confirm === 'delete' ? 'Delete app' : confirm === 'rotate' ? 'Rotate secret' : 'Revoke all'}
        danger
        busy={Boolean(busy)}
        onConfirm={confirm === 'delete' ? remove : confirm === 'rotate' ? rotate : revokeAll}
        onCancel={() => setConfirm(null)}
      />
    </Modal>
  );
}

export default function OAuthApps() {
  const [toast, showToast] = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(null);
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [openApp, setOpenApp] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await apiFetch('/developer/oauth-apps'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scopes = data?.scopes || [];
  const startCreate = () => {
    setForm({ name: '', description: '', homepage_url: '', redirect_uris: '', scopes: scopes.filter((s) => s.key.endsWith(':read')).map((s) => s.key), token_ttl_minutes: 60 });
    setCreateError('');
    setCreating(true);
  };

  const create = async () => {
    setBusy(true);
    setCreateError('');
    try {
      const res = await apiFetch('/developer/oauth-apps', { method: 'POST', body: toBody(form) });
      setCreating(false);
      setCreated(res);
      load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stats = data?.stats || {};

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Developer"
        title="OAuth apps"
        icon={AppWindow}
        description="Give external applications their own OAuth credentials. They exchange the client ID and secret for short-lived access tokens and call the BexSign API; revoke or rotate at any time."
        actions={(
          <>
            <Link to="/settings/developer-api" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700">
              <Code2 size={14} /> API keys & docs
            </Link>
            <Button icon={Plus} onClick={startCreate} disabled={!data}>Register app</Button>
          </>
        )}
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Apps" value={stats.apps ?? '-'} icon={AppWindow} tone="emerald" hint={stats.apps ? `${stats.activeApps} turned on` : undefined} />
        <StatCard label="Active tokens" value={stats.activeTokens ?? '-'} icon={ShieldCheck} tone="sky" hint="Valid right now" />
        <StatCard label="Tokens issued" value={stats.tokensIssued ?? '-'} icon={KeyRound} tone="violet" hint="Kept for a day after expiry" />
        <StatCard label="Last 24 hours" value={stats.tokensLast24h ?? '-'} icon={Timer} tone="amber" hint="Tokens issued" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-4">
          {!data && !error && <LoadingBlock label="Loading OAuth apps..." />}
          {data && data.apps.length === 0 && (
            <Card>
              <EmptyState
                icon={AppWindow}
                title="No OAuth apps yet"
                description="Register an app to get a client ID and secret for an external application, such as your HR portal or CRM."
                action={<Button icon={Plus} onClick={startCreate}>Register app</Button>}
              />
            </Card>
          )}
          {data?.apps.map((app) => (
            <article key={app.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-white flex items-center justify-center shrink-0 font-black">
                  {app.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">{app.name}</h2>
                    <Badge tone={app.is_active ? 'emerald' : 'amber'} dot>{app.is_active ? 'Active' : 'Off'}</Badge>
                    {app.active_tokens > 0 && <Badge tone="sky">{app.active_tokens} active token{app.active_tokens === 1 ? '' : 's'}</Badge>}
                  </div>
                  {app.description && <p className="text-xs text-slate-600 mt-1">{app.description}</p>}
                  <div className="mt-2 flex items-center gap-2 min-w-0">
                    <code className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 truncate">{app.client_id}</code>
                    <CopyButton text={app.client_id} iconOnly ariaLabel="Copy client ID" />
                    {app.homepage_url && <a href={app.homepage_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700" aria-label="Open homepage"><ExternalLink size={14} /></a>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {app.scopes.map((s) => <span key={s} className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Tokens last {TTL_OPTIONS.find(([v]) => v === app.token_ttl_minutes)?.[1] || `${app.token_ttl_minutes} min`} · {app.last_used_at ? `last used ${formatRelative(app.last_used_at)}` : 'never used'} · created {formatRelative(app.created_at)}
                    {data.canSeeAll && app.owner?.email ? ` by ${app.owner.name || app.owner.email}` : ''}
                  </p>
                </div>
                <Button variant="secondary" icon={Settings2} onClick={() => setOpenApp(app.id)} className="shrink-0">Manage</Button>
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-5">
          <Card title={<SectionTitle icon={BookOpen}>How it works</SectionTitle>}>
            <ol className="space-y-3 text-xs text-slate-700">
              {[
                'Register an app and choose the scopes it may use. Copy the client secret: it is shown once.',
                'Your application posts its client ID and secret to the token endpoint (grant_type=client_credentials).',
                'It calls the BexSign API with "Authorization: Bearer <access_token>" until the token expires, then asks for a new one.',
                'Turn the app off, revoke tokens or rotate the secret here whenever you need to.'
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-[#007355] text-[11px] font-black flex items-center justify-center shrink-0 ring-1 ring-emerald-100">{i + 1}</span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 space-y-2 text-[11px]">
              <p className="font-bold text-slate-700">Endpoints</p>
              {[['Token', '/api/oauth/token'], ['Revoke', '/api/oauth/revoke'], ['Introspect', '/api/oauth/introspect'], ['API', '/api/v1']].map(([label, path]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-slate-500">{label}</span>
                  <code className="flex-1 min-w-0 truncate font-mono text-slate-700">{API_ORIGIN}{path}</code>
                  <CopyButton text={`${API_ORIGIN}${path}`} iconOnly ariaLabel={`Copy ${label} URL`} />
                </div>
              ))}
            </div>
          </Card>
          <CodeBlock title="Token request" code={curlToken('<client_id>')} />
          <p className="flex items-start gap-2 text-[11px] text-slate-500">
            <TriangleAlert size={13} className="shrink-0 mt-0.5 text-amber-500" />
            Tokens act as the app owner and follow the API switch, rate limit, allowed origins and IP allowlist in Developer settings.
          </p>
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Register an OAuth app"
        description="You get a client ID and secret for the application."
        icon={Plus}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button icon={Power} busy={busy} onClick={create}>Register app</Button>
          </>
        )}
      >
        {createError && <div className="mb-4"><ErrorBanner message={createError} /></div>}
        {form && <AppForm form={form} setForm={setForm} scopes={scopes} />}
      </Modal>

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="App registered"
        description={created?.app?.name}
        icon={ShieldCheck}
        size="lg"
        footer={<Button onClick={() => setCreated(null)}>I copied the secret</Button>}
      >
        {created && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Client ID</p>
              <div className="mt-1 flex items-center gap-2"><code className="flex-1 min-w-0 break-all text-xs font-mono text-slate-800">{created.app.client_id}</code><CopyButton text={created.app.client_id} /></div>
            </div>
            <SecretPanel title="Client secret - copy it now" value={created.client_secret} note="It is not shown again. If you lose it, rotate the secret." />
            <CodeBlock title="Get an access token" code={curlToken(created.app.client_id, created.client_secret)} />
          </div>
        )}
      </Modal>

      <AppDetail appId={openApp} scopes={scopes} onClose={() => setOpenApp(null)} onChanged={load} showToast={showToast} />
      {toast}
    </div>
  );
}
