import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, Plus, Lock, Search, Users, KeyRound, Layers, UserCog, Pencil, Trash2, Save, Check, Minus,
  ShieldPlus, ShieldX, RotateCcw, Crown
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { usePermissions } from '../../utils/permissions';
import {
  PageHeader, StatCard, Card, Badge, Button, EmptyState, ErrorBanner, LoadingBlock, SearchInput, Tabs, Modal,
  ConfirmDialog, Field, Toggle, inputClass, useToast, formatDateTime
} from '../../components/ui/kit';

const ROLE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#e11d48', '#475569'];
const DEFAULT_ROLE_COLOR = { manager: '#7c3aed', leader: '#2563eb', team_member: '#475569' };
const roleColor = (role) => role?.color || DEFAULT_ROLE_COLOR[role?.key] || '#059669';

function RoleDot({ role, size = 10 }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, backgroundColor: roleColor(role) }} aria-hidden="true" />;
}

const initials = (name) => String(name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function Permissions() {
  const { can, refresh: refreshMine } = usePermissions();
  const canManage = can('roles.manage');
  const [toast, showToast] = useToast();
  const [tab, setTab] = useState('roles');
  const [catalog, setCatalog] = useState({ status: 'loading', modules: [], roles: [], error: '' });
  const [selectedRole, setSelectedRole] = useState('manager');
  const [draft, setDraft] = useState(null);
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [roleForm, setRoleForm] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [reassignTo, setReassignTo] = useState('team_member');

  const loadCatalog = useCallback(async () => {
    try {
      const data = await apiFetch('/permissions/catalog');
      setCatalog({ status: 'ready', modules: data.modules, roles: data.roles, error: '' });
    } catch (err) {
      setCatalog((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const allPermissions = useMemo(() => catalog.modules.flatMap((m) => m.permissions.map((p) => ({ ...p, module: m.id }))), [catalog.modules]);
  const role = catalog.roles.find((r) => r.key === selectedRole) || catalog.roles[0];

  // Draft of the selected role's grants: { key: bool }
  useEffect(() => {
    if (!role) return;
    setDraft(Object.fromEntries(allPermissions.map((p) => [p.key, role.permissions.includes(p.key)])));
  }, [role?.key, catalog.roles, allPermissions]);

  const changes = useMemo(() => {
    if (!draft || !role) return [];
    return allPermissions.filter((p) => draft[p.key] !== role.permissions.includes(p.key)).map((p) => p.key);
  }, [draft, role, allPermissions]);

  const saveRole = async () => {
    setSaving(true);
    try {
      const grants = Object.fromEntries(changes.map((k) => [k, draft[k]]));
      const data = await apiFetch(`/permissions/roles/${role.key}/permissions`, { method: 'PUT', body: { grants } });
      setCatalog((prev) => ({ ...prev, roles: data.roles }));
      showToast('success', data.message);
      refreshMine();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitRoleForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = roleForm.key
        ? await apiFetch(`/permissions/roles/${roleForm.key}`, { method: 'PUT', body: roleForm })
        : await apiFetch('/permissions/roles', { method: 'POST', body: roleForm });
      setCatalog((prev) => ({ ...prev, roles: data.roles }));
      if (data.key) setSelectedRole(data.key);
      setRoleForm(null);
      showToast('success', data.message);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRole = async () => {
    setSaving(true);
    try {
      const data = await apiFetch(`/permissions/roles/${deleteRole.key}?reassignTo=${encodeURIComponent(reassignTo)}`, { method: 'DELETE' });
      setCatalog((prev) => ({ ...prev, roles: data.roles }));
      setSelectedRole('manager');
      setDeleteRole(null);
      showToast('success', data.message);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPermissions = allPermissions.length;
  const customRoles = catalog.roles.filter((r) => !r.isSystem).length;
  const totalUsers = catalog.roles.reduce((sum, r) => sum + r.userCount, 0);

  const filteredModules = catalog.modules
    .map((m) => ({
      ...m,
      permissions: m.permissions.filter((p) => !permSearch || `${p.label} ${p.description} ${p.key}`.toLowerCase().includes(permSearch.toLowerCase()))
    }))
    .filter((m) => m.permissions.length > 0);

  return (
    <div className="space-y-5 pb-24">
      {toast}
      <PageHeader
        eyebrow="Settings · Organization"
        title="Roles & permissions"
        description="Decide what each role can do in BexSign, compare roles side by side, and give individual users extra or fewer permissions."
        icon={ShieldCheck}
        actions={canManage && (
          <Button icon={Plus} onClick={() => setRoleForm({ name: '', description: '', color: ROLE_COLORS[3], copyFrom: 'team_member' })}>New role</Button>
        )}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Roles" value={catalog.roles.length} icon={Layers} tone="violet" hint={customRoles ? `${customRoles} custom` : 'Built-in roles'} />
          <StatCard label="Permissions" value={totalPermissions} icon={KeyRound} tone="emerald" hint={`${catalog.modules.length} modules`} />
          <StatCard label="Users" value={totalUsers} icon={Users} tone="sky" hint="with a role" />
          <StatCard label="Your access" value={canManage ? 'Admin' : 'View only'} icon={canManage ? Crown : Lock} tone={canManage ? 'amber' : 'slate'} hint={canManage ? 'You can change permissions' : 'Ask a manager to change them'} />
        </div>
      </PageHeader>

      <ErrorBanner message={catalog.status === 'error' ? catalog.error : ''} onRetry={loadCatalog} />

      <Card bodyClassName="p-0">
        <div className="px-3 sm:px-4 pt-2">
          <Tabs
            tabs={[
              { id: 'roles', label: 'Role permissions', icon: ShieldCheck },
              { id: 'compare', label: 'Compare roles', icon: Layers },
              { id: 'users', label: 'User permissions', icon: UserCog }
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {catalog.status === 'loading' ? (
          <LoadingBlock label="Loading permissions..." />
        ) : tab === 'roles' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
            {/* Roles */}
            <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Roles</p>
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1">
                {catalog.roles.map((r) => {
                  const active = r.key === role?.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        if (changes.length && !window.confirm('Discard the unsaved changes of this role?')) return;
                        setSelectedRole(r.key);
                      }}
                      aria-pressed={active}
                      className={`shrink-0 lg:shrink w-56 lg:w-full text-left rounded-xl border p-3 transition ${active ? 'border-[#007355] bg-emerald-50/60 ring-1 ring-[#007355]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <span className="flex items-center gap-2">
                        <RoleDot role={r} />
                        <span className="text-sm font-bold text-slate-900 truncate">{r.name}</span>
                        {r.isSystem && <Badge tone="slate" className="ml-auto">Built-in</Badge>}
                      </span>
                      <span className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{r.userCount} user{r.userCount === 1 ? '' : 's'}</span>
                        <span className="font-semibold text-slate-700">{r.permissions.length}/{totalPermissions}</span>
                      </span>
                      <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${(r.permissions.length / Math.max(1, totalPermissions)) * 100}%`, backgroundColor: roleColor(r) }} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Selected role */}
            {role && draft && (
              <div className="p-3 sm:p-5 space-y-4 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: roleColor(role) }}>
                      <ShieldCheck size={19} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-extrabold text-slate-900">{role.name}</h2>
                      <p className="text-xs text-slate-500">{role.description || 'No description.'}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {role.userCount} user{role.userCount === 1 ? '' : 's'} · {Object.values(draft).filter(Boolean).length} of {totalPermissions} permissions
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 shrink-0">
                      <Button variant="secondary" icon={Pencil} onClick={() => setRoleForm({ key: role.key, name: role.name, description: role.description, color: roleColor(role) })}>Edit</Button>
                      {!role.isSystem && (
                        <Button variant="subtleDanger" icon={Trash2} onClick={() => { setReassignTo('team_member'); setDeleteRole(role); }}>Delete</Button>
                      )}
                    </div>
                  )}
                </div>

                <SearchInput value={permSearch} onChange={setPermSearch} placeholder="Search permissions..." />
                {!canManage && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5"><Lock size={13} /> You can view permissions. Only users with "Manage roles and permissions" can change them.</p>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {filteredModules.map((m) => {
                    const onCount = m.permissions.filter((p) => draft[p.key]).length;
                    const allOn = onCount === m.permissions.length;
                    return (
                      <section key={m.id} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-extrabold text-slate-900">{m.label}</h3>
                            <p className="text-[10px] text-slate-500">{onCount} of {m.permissions.length} allowed</p>
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setDraft((prev) => ({
                                ...prev,
                                ...Object.fromEntries(m.permissions.map((p) => [p.key, role.locked.includes(p.key) ? true : !allOn]))
                              }))}
                              className="text-[11px] font-bold text-[#007355] hover:underline"
                            >
                              {allOn ? 'Remove all' : 'Allow all'}
                            </button>
                          )}
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {m.permissions.map((p) => {
                            const locked = role.locked.includes(p.key);
                            const changed = draft[p.key] !== role.permissions.includes(p.key);
                            return (
                              <li key={p.key} className={`px-3.5 py-2.5 ${changed ? 'bg-amber-50/60' : ''}`}>
                                {canManage && !locked ? (
                                  <Toggle checked={Boolean(draft[p.key])} onChange={(v) => setDraft((prev) => ({ ...prev, [p.key]: v }))} label={p.label} description={p.description} />
                                ) : (
                                  <div className="flex items-start justify-between gap-3">
                                    <span>
                                      <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
                                      <span className="block text-xs text-slate-500">{locked ? 'Always on for this role, so the organization cannot be locked out.' : p.description}</span>
                                    </span>
                                    {locked ? <Lock size={15} className="text-slate-400 mt-1" /> : draft[p.key] ? <Check size={16} className="text-[#007355] mt-1" /> : <Minus size={16} className="text-slate-300 mt-1" />}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                  {filteredModules.length === 0 && <EmptyState icon={Search} title="No permissions match" description="Try another word." />}
                </div>
              </div>
            )}
          </div>
        ) : tab === 'compare' ? (
          <CompareMatrix modules={catalog.modules} roles={catalog.roles} />
        ) : (
          <UserPermissions modules={catalog.modules} roles={catalog.roles} canManage={canManage} showToast={showToast} onChanged={() => { loadCatalog(); refreshMine(); }} />
        )}
      </Card>

      {/* Unsaved role changes */}
      {tab === 'roles' && changes.length > 0 && canManage && (
        <div className="fixed bottom-4 left-4 right-4 lg:left-72 z-40 flex justify-center">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col sm:flex-row items-center gap-3 max-w-xl w-full">
            <p className="text-xs font-semibold flex-1">
              {changes.length} unsaved change{changes.length === 1 ? '' : 's'} to <strong>{role?.name}</strong>. Users with this role get them right away.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDraft(Object.fromEntries(allPermissions.map((p) => [p.key, role.permissions.includes(p.key)])))} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:bg-white/10">Discard</button>
              <Button icon={Save} busy={saving} onClick={saveRole}>Save role</Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(roleForm)}
        onClose={() => setRoleForm(null)}
        title={roleForm?.key ? 'Edit role' : 'New role'}
        description={roleForm?.key ? 'Change the name, description or colour of the role.' : 'Create a role and start from the permissions of an existing one.'}
        icon={ShieldPlus}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRoleForm(null)}>Cancel</Button>
            <Button type="submit" form="role-form" busy={saving}>{roleForm?.key ? 'Save role' : 'Create role'}</Button>
          </>
        )}
      >
        {roleForm && (
          <form id="role-form" onSubmit={submitRoleForm} className="space-y-3">
            <Field label="Role name" required>
              <input className={inputClass} value={roleForm.name} maxLength={100} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Legal reviewer" autoFocus />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} rows={2} value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Who gets this role and why" />
            </Field>
            <fieldset>
              <legend className="text-xs font-bold text-slate-700 mb-1.5">Colour</legend>
              <div className="flex gap-2">
                {ROLE_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setRoleForm({ ...roleForm, color: c })} aria-label={`Colour ${c}`} aria-pressed={roleForm.color === c} className={`w-8 h-8 rounded-full border-2 ${roleForm.color === c ? 'border-slate-900 scale-110' : 'border-white shadow'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </fieldset>
            {!roleForm.key && (
              <Field label="Start with the permissions of">
                <select className={inputClass} value={roleForm.copyFrom} onChange={(e) => setRoleForm({ ...roleForm, copyFrom: e.target.value })}>
                  <option value="">Minimal (use templates, own documents, signatures)</option>
                  {catalog.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                </select>
              </Field>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(deleteRole)}
        onClose={() => setDeleteRole(null)}
        title={`Delete role "${deleteRole?.name}"?`}
        description="Its permissions are removed. This cannot be undone."
        icon={ShieldX}
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDeleteRole(null)}>Cancel</Button>
            <Button variant="danger" busy={saving} onClick={confirmDeleteRole}>Delete role</Button>
          </>
        )}
      >
        {deleteRole && (deleteRole.userCount > 0 ? (
          <Field label={`Move its ${deleteRole.userCount} user${deleteRole.userCount === 1 ? '' : 's'} to`}>
            <select className={inputClass} value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
              {catalog.roles.filter((r) => r.key !== deleteRole.key).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </Field>
        ) : <p className="text-sm text-slate-600">No users have this role.</p>)}
      </Modal>
    </div>
  );
}

/** Every permission against every role (read-only overview). */
function CompareMatrix({ modules, roles }) {
  return (
    <div className="p-3 sm:p-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 min-w-[220px]">Permission</th>
              {roles.map((r) => (
                <th key={r.key} className="px-3 py-3 text-center min-w-[110px]">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800"><RoleDot role={r} /> {r.name}</span>
                  <span className="block text-[10px] font-medium text-slate-400">{r.permissions.length} allowed</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <React.Fragment key={m.id}>
                <tr className="bg-slate-100/70">
                  <td colSpan={roles.length + 1} className="sticky left-0 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">{m.label}</td>
                </tr>
                {m.permissions.map((p) => (
                  <tr key={p.key} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                      <span className="block font-semibold text-slate-800">{p.label}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">{p.key}</span>
                    </td>
                    {roles.map((r) => (
                      <td key={r.key} className="px-3 py-2.5 text-center">
                        {r.locked.includes(p.key) ? (
                          <Lock size={14} className="inline text-slate-500" aria-label="Always allowed" />
                        ) : r.permissions.includes(p.key) ? (
                          <span className="inline-flex w-6 h-6 rounded-full bg-emerald-100 text-[#007355] items-center justify-center" aria-label="Allowed"><Check size={14} strokeWidth={3} /></span>
                        ) : (
                          <span className="inline-flex w-6 h-6 rounded-full bg-slate-100 text-slate-300 items-center justify-center" aria-label="Not allowed"><Minus size={14} /></span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Personal permissions: a user's role, plus overrides that allow or deny single permissions. */
function UserPermissions({ modules, roles, canManage, showToast, onChanged }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState({ status: 'loading', items: [], error: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState({ status: 'idle', data: null, error: '' });
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch(`/permissions/users?search=${encodeURIComponent(search)}`);
      setUsers({ status: 'ready', items: data.users, error: '' });
      if (!selectedId && data.users[0]) setSelectedId(data.users[0].id);
    } catch (err) {
      setUsers((prev) => ({ ...prev, status: 'error', error: err.message }));
    }
  }, [search, selectedId]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetail({ status: 'loading', data: null, error: '' });
    try {
      const data = await apiFetch(`/permissions/users/${id}`);
      setDetail({ status: 'ready', data, error: '' });
      setDraft(Object.fromEntries(data.overrides.filter((o) => !o.expired).map((o) => [o.permission_key, {
        allowed: o.allowed,
        reason: o.reason || '',
        expiresAt: o.expires_at ? String(o.expires_at).slice(0, 10) : ''
      }])));
    } catch (err) {
      setDetail({ status: 'error', data: null, error: err.message });
    }
  }, []);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const data = detail.data;
  const savedOverrides = data ? Object.fromEntries(data.overrides.filter((o) => !o.expired).map((o) => [o.permission_key, o])) : {};
  const pendingKeys = data ? modules.flatMap((m) => m.permissions.map((p) => p.key)).filter((key) => {
    const before = savedOverrides[key];
    const after = draft[key];
    if (!before && !after) return false;
    if (!before || !after) return true;
    return before.allowed !== after.allowed || (before.reason || '') !== after.reason || (before.expires_at ? String(before.expires_at).slice(0, 10) : '') !== after.expiresAt;
  }) : [];

  const setMode = (key, mode) => setDraft((prev) => {
    const next = { ...prev };
    if (mode === 'default') delete next[key];
    else next[key] = { reason: prev[key]?.reason || '', expiresAt: prev[key]?.expiresAt || '', allowed: mode === 'allow' };
    return next;
  });

  const saveOverrides = async () => {
    setSaving(true);
    try {
      const overrides = pendingKeys.map((key) => (draft[key]
        ? { key, allowed: draft[key].allowed, reason: draft[key].reason, expiresAt: draft[key].expiresAt || null }
        : { key, allowed: null }));
      const result = await apiFetch(`/permissions/users/${data.user.id}/overrides`, { method: 'PUT', body: { overrides } });
      showToast('success', result.message);
      await loadDetail(data.user.id);
      loadUsers();
      onChanged();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (roleKey) => {
    try {
      const result = await apiFetch(`/permissions/users/${data.user.id}/role`, { method: 'PUT', body: { role: roleKey } });
      showToast('success', result.message);
      await loadDetail(data.user.id);
      loadUsers();
      onChanged();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const effective = (key) => (draft[key] ? draft[key].allowed : data.rolePermissions.includes(key) || data.locked.includes(key));
  const effectiveCount = data ? modules.flatMap((m) => m.permissions).filter((p) => effective(p.key)).length : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r border-slate-100 p-3 sm:p-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
        <ErrorBanner message={users.status === 'error' ? users.error : ''} onRetry={loadUsers} />
        <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible lg:max-h-[640px] lg:overflow-y-auto pb-1">
          {users.items.map((u) => {
            const r = roles.find((x) => x.key === u.role);
            const active = u.id === selectedId;
            return (
              <li key={u.id} className="shrink-0 w-60 lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (pendingKeys.length && !window.confirm('Discard the unsaved permission changes of this user?')) return;
                    setSelectedId(u.id);
                  }}
                  aria-pressed={active}
                  className={`w-full text-left rounded-xl border p-2.5 flex items-center gap-2.5 transition ${active ? 'border-[#007355] bg-emerald-50/60 ring-1 ring-[#007355]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <span className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: roleColor(r) }}>{initials(u.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900 truncate">{u.name}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{u.email}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <RoleDot role={r} size={7} /> {r?.name || u.role}
                      {u.override_count > 0 && <Badge tone="amber">{u.override_count} override{u.override_count === 1 ? '' : 's'}</Badge>}
                      {u.status === 'inactive' && <Badge tone="rose">Inactive</Badge>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {users.status === 'ready' && users.items.length === 0 && <li className="text-xs text-slate-500 p-3">No users match.</li>}
        </ul>
      </aside>

      <div className="p-3 sm:p-5 min-w-0 space-y-4">
        {detail.status === 'loading' && <LoadingBlock label="Loading user permissions..." />}
        <ErrorBanner message={detail.status === 'error' ? detail.error : ''} onRetry={() => loadDetail(selectedId)} />
        {data && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: roleColor(roles.find((r) => r.key === data.role)) }}>{initials(data.user.name)}</span>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-slate-900 truncate">{data.user.name}</h2>
                  <p className="text-xs text-slate-500 truncate">{data.user.email} · {effectiveCount} of {modules.flatMap((m) => m.permissions).length} permissions</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                Role
                <select
                  value={data.role}
                  disabled={!canManage}
                  onChange={(e) => changeRole(e.target.value)}
                  className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white disabled:bg-slate-50"
                >
                  {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Allowed by role</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> Allowed for this user</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500" /> Denied for this user</span>
              <label className="ml-auto flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} className="w-4 h-4 accent-[#007355]" />
                Only personal overrides
              </label>
            </div>

            <div className="space-y-3">
              {modules.map((m) => {
                const perms = m.permissions.filter((p) => !onlyChanged || draft[p.key]);
                if (perms.length === 0) return null;
                return (
                  <section key={m.id} className="rounded-xl border border-slate-200 overflow-hidden">
                    <h3 className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-extrabold text-slate-900">{m.label}</h3>
                    <ul className="divide-y divide-slate-100">
                      {perms.map((p) => {
                        const fromRole = data.rolePermissions.includes(p.key) || data.locked.includes(p.key);
                        const override = draft[p.key];
                        const mode = override ? (override.allowed ? 'allow' : 'deny') : 'default';
                        const on = effective(p.key);
                        const locked = data.locked.includes(p.key);
                        return (
                          <li key={p.key} className={`px-3.5 py-3 ${pendingKeys.includes(p.key) ? 'bg-amber-50/60' : ''}`}>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <span className={`mt-1 w-2.5 h-2.5 rounded shrink-0 ${override ? (override.allowed ? 'bg-sky-500' : 'bg-rose-500') : on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
                                  <span className="block text-[11px] text-slate-500">
                                    Role: {fromRole ? 'allowed' : 'not allowed'} · Now: <strong className={on ? 'text-[#007355]' : 'text-slate-600'}>{on ? 'allowed' : 'not allowed'}</strong>
                                  </span>
                                </span>
                              </div>
                              <div className="inline-flex rounded-xl border border-slate-300 overflow-hidden text-[11px] font-bold shrink-0 self-start" role="group" aria-label={`${p.label} setting`}>
                                {[['default', 'Role default', RotateCcw], ['allow', 'Allow', Check], ['deny', 'Deny', Minus]].map(([id, label, Icon]) => (
                                  <button
                                    key={id}
                                    type="button"
                                    disabled={!canManage || (locked && id === 'deny')}
                                    onClick={() => setMode(p.key, id)}
                                    aria-pressed={mode === id}
                                    className={`px-2.5 py-1.5 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                      mode === id
                                        ? id === 'allow' ? 'bg-sky-600 text-white' : id === 'deny' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <Icon size={11} /> {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {override && (
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2 md:pl-5">
                                <input
                                  className={inputClass}
                                  value={override.reason}
                                  disabled={!canManage}
                                  onChange={(e) => setDraft((prev) => ({ ...prev, [p.key]: { ...prev[p.key], reason: e.target.value } }))}
                                  placeholder="Reason (optional), e.g. covers for the legal team"
                                  aria-label={`Reason for ${p.label}`}
                                />
                                <input
                                  type="date"
                                  className={inputClass}
                                  value={override.expiresAt}
                                  disabled={!canManage}
                                  min={new Date().toISOString().slice(0, 10)}
                                  onChange={(e) => setDraft((prev) => ({ ...prev, [p.key]: { ...prev[p.key], expiresAt: e.target.value } }))}
                                  aria-label={`Expiry of ${p.label}`}
                                  title="Expires on (optional)"
                                />
                              </div>
                            )}
                            {savedOverrides[p.key]?.granted_by_name && (
                              <p className="mt-1 md:pl-5 text-[10px] text-slate-400">Set by {savedOverrides[p.key].granted_by_name} on {formatDateTime(savedOverrides[p.key].created_at)}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
              {onlyChanged && Object.keys(draft).length === 0 && (
                <EmptyState icon={UserCog} title="No personal overrides" description="This user has exactly the permissions of their role." />
              )}
            </div>

            {pendingKeys.length > 0 && canManage && (
              <div className="sticky bottom-4 z-30 flex justify-center">
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-col sm:flex-row items-center gap-3 max-w-xl w-full">
                  <p className="text-xs font-semibold flex-1">{pendingKeys.length} unsaved change{pendingKeys.length === 1 ? '' : 's'} for {data.user.name}.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => loadDetail(data.user.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:bg-white/10">Discard</button>
                    <Button icon={Save} busy={saving} onClick={saveOverrides}>Save permissions</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
