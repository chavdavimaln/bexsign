import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, Pencil, Ban, Trash2, TriangleAlert, FlaskConical, Radio } from 'lucide-react';
import {
  Card, Badge, Button, EmptyState, ErrorBanner, LoadingBlock, SearchInput, SelectInput, Field, inputClass, Modal, ConfirmDialog,
  thClass, tdClass, formatDateTime, formatRelative
} from '../ui/kit';
import { apiFetch } from '../../utils/api';
import { CopyButton } from '../settings/settingsUi';

/** API keys of the Developer API page: list, create (the full key is shown once), rename / change scopes, revoke, delete. */

const EXPIRY_OPTIONS = [['', 'Never'], ['30', '30 days'], ['60', '60 days'], ['90', '90 days'], ['180', '180 days'], ['365', '1 year']];
const STATUS_TONE = { active: 'emerald', revoked: 'rose', expired: 'amber' };

export function ScopePicker({ scopes, value, onChange, idPrefix }) {
  const toggle = (key) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  return (
    <fieldset>
      <legend className="block text-xs font-bold text-slate-700 mb-1">Scopes <span className="text-red-500">*</span></legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {scopes.map((s) => (
          <label key={s.key} htmlFor={`${idPrefix}-${s.key}`} className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${value.includes(s.key) ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
            <input id={`${idPrefix}-${s.key}`} type="checkbox" checked={value.includes(s.key)} onChange={() => toggle(s.key)} className="mt-0.5 w-4 h-4 accent-[#007355]" />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-slate-800 font-mono">{s.key}</span>
              <span className="block text-[11px] text-slate-500">{s.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CreateKeyModal({ open, onClose, meta, onCreated }) {
  const [form, setForm] = useState({ name: '', environment: 'live', scopes: ['documents:read'], expiresInDays: '90' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ name: '', environment: 'live', scopes: ['documents:read'], expiresInDays: '90' });
      setError('');
      setCreated(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Give the key a name so you can recognise it later.');
    if (!form.scopes.length) return setError('Choose at least one scope.');
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch('/developer/keys', {
        method: 'POST',
        body: { name: form.name.trim(), environment: form.environment, scopes: form.scopes, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : null }
      });
      setCreated(data);
      onCreated(data.key);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Modal open={open} onClose={onClose} title="Copy your API key" description={`“${created.key.name}” is ready to use.`} icon={KeyRound} footer={<Button onClick={onClose}>I've saved it</Button>}>
        <div className="space-y-4">
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <TriangleAlert size={15} className="shrink-0 mt-0.5" />
            <p className="font-semibold">This is the only time the full key is shown. Store it in a password manager or your server's secret store. If you lose it, revoke it and create a new one.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-300 text-xs font-mono break-all">{created.apiKey}</code>
            <CopyButton text={created.apiKey} ariaLabel="Copy API key" className="!px-3 !py-2 !rounded-xl" />
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <p>Use it in the <code className="font-mono text-slate-700">Authorization</code> header:</p>
            <code className="block px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-700 break-all">Authorization: Bearer {created.key.prefix}…</code>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create API key"
      description="Keys act on behalf of your account with the scopes you choose."
      icon={KeyRound}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="create-key-form" icon={Plus} busy={busy}>Create key</Button>
        </>
      )}
    >
      <form id="create-key-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Name" required hint="For example: CRM integration, Zapier, nightly export.">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} autoFocus className={inputClass} placeholder="CRM integration" />
        </Field>
        <fieldset>
          <legend className="block text-xs font-bold text-slate-700 mb-1">Environment</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['live', 'Live', 'Works with your real documents.', Radio, true],
              ['sandbox', 'Sandbox', meta?.sandboxMode === false ? 'Sandbox mode is off in Developer settings.' : 'For testing: keys start with bxs_test_.', FlaskConical, meta?.sandboxMode !== false]
            ].map(([value, label, hint, Icon, enabled]) => (
              <label key={value} className={`flex items-start gap-2.5 p-3 rounded-xl border transition ${form.environment === value ? 'border-[#007355] bg-emerald-50/60' : 'border-slate-200'} ${enabled ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'}`}>
                <input type="radio" name="key-env" value={value} checked={form.environment === value} disabled={!enabled} onChange={() => setForm({ ...form, environment: value })} className="mt-0.5 accent-[#007355]" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Icon size={14} /> {label}</span>
                  <span className="block text-[11px] text-slate-500">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <ScopePicker scopes={meta?.scopes || []} value={form.scopes} onChange={(scopes) => setForm({ ...form, scopes })} idPrefix="new-key-scope" />
        <Field label="Expires" hint="Keys that never expire should be rotated regularly.">
          <select value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} className={inputClass}>
            {EXPIRY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

function EditKeyModal({ apiKey, onClose, meta, onSaved }) {
  const [form, setForm] = useState({ name: '', scopes: [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (apiKey) setForm({ name: apiKey.name, scopes: apiKey.scopes });
    setError('');
  }, [apiKey]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.scopes.length) return setError('Choose at least one scope.');
    setBusy(true);
    try {
      const data = await apiFetch(`/developer/keys/${apiKey.id}`, { method: 'PATCH', body: { name: form.name.trim(), scopes: form.scopes } });
      onSaved(data.key);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(apiKey)}
      onClose={onClose}
      title="Edit API key"
      description={apiKey ? apiKey.maskedKey : ''}
      icon={Pencil}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-key-form" busy={busy}>Save</Button>
        </>
      )}
    >
      <form id="edit-key-form" onSubmit={submit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <Field label="Name" required>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className={inputClass} />
        </Field>
        <ScopePicker scopes={meta?.scopes || []} value={form.scopes} onChange={(scopes) => setForm({ ...form, scopes })} idPrefix="edit-key-scope" />
        <p className="text-[11px] text-slate-500">Scope changes apply to the next request made with this key.</p>
      </form>
    </Modal>
  );
}

export default function ApiKeysPanel({ meta, showToast }) {
  const [keys, setKeys] = useState([]);
  const [canManageAll, setCanManageAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/developer/keys');
      setKeys(data.keys || []);
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

  const replace = (key) => setKeys((list) => list.map((k) => (k.id === key.id ? key : k)));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((k) => (status === 'all' || k.status === status)
      && (!q || [k.name, k.maskedKey, k.owner?.name, k.owner?.email].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [keys, search, status]);

  const counts = useMemo(() => keys.reduce((acc, k) => ({ ...acc, [k.status]: (acc[k.status] || 0) + 1 }), {}), [keys]);

  const runConfirm = async () => {
    const { type, key } = confirm;
    setBusy(true);
    try {
      if (type === 'revoke') {
        const data = await apiFetch(`/developer/keys/${key.id}/revoke`, { method: 'POST' });
        replace(data.key);
        showToast('success', `“${key.name}” was revoked.`);
      } else {
        await apiFetch(`/developer/keys/${key.id}`, { method: 'DELETE' });
        setKeys((list) => list.filter((k) => k.id !== key.id));
        showToast('success', `“${key.name}” was deleted.`);
      }
      setConfirm(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="API keys"
      description={canManageAll ? 'Every key in the organization. Keys act with the permissions of their owner.' : 'Your keys. Each key acts on your behalf with the scopes you choose.'}
      actions={<Button icon={Plus} onClick={() => setCreating(true)} className="whitespace-nowrap">Create API key</Button>}
      bodyClassName=""
    >
      <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row gap-2 border-b border-slate-100">
        <SearchInput value={search} onChange={setSearch} placeholder="Search keys..." className="sm:max-w-xs flex-1" />
        <SelectInput
          value={status}
          onChange={setStatus}
          label="Filter by status"
          options={[['all', `All statuses (${keys.length})`], ['active', `Active (${counts.active || 0})`], ['revoked', `Revoked (${counts.revoked || 0})`], ['expired', `Expired (${counts.expired || 0})`]]}
        />
      </div>

      {error && <div className="p-4"><ErrorBanner message={error} onRetry={load} /></div>}
      {loading ? <LoadingBlock label="Loading API keys..." /> : !error && (
        filtered.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title={keys.length ? 'No keys match your filters' : 'No API keys yet'}
            description={keys.length ? 'Try another search or status.' : 'Create a key to call the BexSign REST API from your own systems.'}
            action={!keys.length && <Button icon={Plus} onClick={() => setCreating(true)}>Create API key</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Key</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Status</th>
                  <th className={`${thClass} hidden md:table-cell`}>Scopes</th>
                  <th className={`${thClass} hidden sm:table-cell`}>Last used</th>
                  <th className={`${thClass} hidden lg:table-cell text-right`}>Requests</th>
                  <th className={`${thClass} hidden lg:table-cell`}>Expires</th>
                  {canManageAll && <th className={`${thClass} hidden xl:table-cell`}>Owner</th>}
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((k) => (
                  <tr key={k.id} className={`hover:bg-slate-50/70 ${k.status !== 'active' ? 'opacity-70' : ''}`}>
                    <td className={tdClass}>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {k.name}
                        <Badge tone={k.environment === 'sandbox' ? 'amber' : 'sky'}>{k.environment}</Badge>
                        <span className="sm:hidden"><Badge tone={STATUS_TONE[k.status]} dot>{k.status}</Badge></span>
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">{k.maskedKey}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Created {formatDateTime(k.createdAt, { withTime: false })}</p>
                    </td>
                    <td className={`${tdClass} hidden sm:table-cell`}><Badge tone={STATUS_TONE[k.status]} dot>{k.status}</Badge></td>
                    <td className={`${tdClass} hidden md:table-cell`}>
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {k.scopes.map((s) => <span key={s} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono">{s}</span>)}
                      </div>
                    </td>
                    <td className={`${tdClass} hidden sm:table-cell whitespace-nowrap`} title={k.lastUsedAt ? formatDateTime(k.lastUsedAt) : ''}>{k.lastUsedAt ? formatRelative(k.lastUsedAt) : <span className="text-slate-400">Never</span>}</td>
                    <td className={`${tdClass} hidden lg:table-cell text-right tabular-nums`}>{k.requestCount.toLocaleString()}</td>
                    <td className={`${tdClass} hidden lg:table-cell whitespace-nowrap`}>
                      {k.revokedAt ? <span className="text-slate-400">Revoked {formatDateTime(k.revokedAt, { withTime: false })}</span> : k.expiresAt ? formatDateTime(k.expiresAt, { withTime: false }) : <span className="text-slate-400">Never</span>}
                    </td>
                    {canManageAll && (
                      <td className={`${tdClass} hidden xl:table-cell`}>
                        <p className="font-semibold text-slate-800">{k.isOwn ? 'You' : k.owner?.name}</p>
                        {!k.isOwn && <p className="text-[11px] text-slate-500">{k.owner?.email}</p>}
                      </td>
                    )}
                    <td className={`${tdClass} text-right`}>
                      <div className="flex justify-end gap-1">
                        {k.status !== 'revoked' && (
                          <button type="button" onClick={() => setEditing(k)} aria-label={`Edit ${k.name}`} title="Rename or change scopes" className="p-2 rounded-lg text-slate-500 hover:text-[#007355] hover:bg-emerald-50 cursor-pointer"><Pencil size={15} /></button>
                        )}
                        {k.status !== 'revoked' && (
                          <button type="button" onClick={() => setConfirm({ type: 'revoke', key: k })} aria-label={`Revoke ${k.name}`} title="Revoke" className="p-2 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"><Ban size={15} /></button>
                        )}
                        <button type="button" onClick={() => setConfirm({ type: 'delete', key: k })} aria-label={`Delete ${k.name}`} title="Delete" className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <CreateKeyModal open={creating} onClose={() => setCreating(false)} meta={meta} onCreated={(key) => setKeys((list) => [key, ...list])} />
      <EditKeyModal apiKey={editing} onClose={() => setEditing(null)} meta={meta} onSaved={(key) => { replace(key); setEditing(null); showToast('success', 'API key updated.'); }} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === 'revoke' ? `Revoke “${confirm?.key.name}”?` : `Delete “${confirm?.key.name}”?`}
        message={confirm?.type === 'revoke'
          ? 'Requests using this key are rejected immediately. This cannot be undone; the key stays in the list as revoked.'
          : `The key is removed permanently${confirm?.key.status === 'active' ? ' and stops working immediately' : ''}. Its request logs are kept.`}
        confirmLabel={confirm?.type === 'revoke' ? 'Revoke key' : 'Delete key'}
        danger
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </Card>
  );
}
