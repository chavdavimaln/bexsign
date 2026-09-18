const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateUser } = require('../middleware/authMiddleware');
const {
  CATALOG,
  MODULE_LABELS,
  LOCKED,
  normalizeRole,
  getRolePermissions,
  getEffectivePermissions,
  requirePermission
} = require('../utils/permissions');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const { notify, logActivity } = require('../utils/platformEvents');

router.use(async (req, res, next) => {
  try {
    await ensurePlatformSchema();
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'The permission tables could not be prepared.' });
  }
});
router.use(authenticateUser);

const catalogByModule = () => {
  const modules = [];
  CATALOG.forEach(([key, module, label, description]) => {
    let group = modules.find((m) => m.id === module);
    if (!group) {
      group = { id: module, label: MODULE_LABELS[module] || module, permissions: [] };
      modules.push(group);
    }
    group.permissions.push({ key, label, description });
  });
  return modules;
};

const displayName = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
const slugRole = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

async function listRoles() {
  const [roles] = await db.query(
    `SELECT r.role_key, r.role_name, r.description, r.is_system, r.color,
            (SELECT COUNT(*) FROM users u WHERE LOWER(COALESCE(u.role, 'team_member')) = r.role_key) AS user_count
     FROM roles r ORDER BY r.is_system DESC, r.id ASC`
  );
  const result = [];
  for (const role of roles) {
    const granted = await getRolePermissions(role.role_key);
    result.push({
      key: role.role_key,
      name: role.role_name,
      description: role.description || '',
      isSystem: Boolean(role.is_system),
      color: role.color || null,
      userCount: role.user_count,
      permissions: [...granted],
      locked: LOCKED[role.role_key] || []
    });
  }
  return result;
}

// @route GET /api/permissions/me — effective permissions of the signed-in user (menus and pages use them)
router.get('/me', async (req, res) => {
  try {
    const { role, permissions, overrides } = await getEffectivePermissions(req.user.id, req.user.role);
    res.json({ success: true, userId: req.user.id, role, permissions, overrides });
  } catch (err) {
    console.error('Permissions me error:', err);
    res.status(500).json({ success: false, error: 'Your permissions could not be loaded.' });
  }
});

// @route GET /api/permissions/catalog — permissions grouped by module, and every role with its grants
router.get('/catalog', requirePermission('roles.manage', 'users.view'), async (req, res) => {
  try {
    res.json({ success: true, modules: catalogByModule(), roles: await listRoles() });
  } catch (err) {
    console.error('Permissions catalog error:', err);
    res.status(500).json({ success: false, error: 'The permission catalog could not be loaded.' });
  }
});

// @route POST /api/permissions/roles { name, description, color, copyFrom } — a custom role
router.post('/roles', requirePermission('roles.manage'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  const key = slugRole(req.body.key || name);
  if (name.length < 2 || !key) return res.status(400).json({ success: false, error: 'Enter a role name of at least 2 characters.' });
  try {
    const [exists] = await db.query('SELECT 1 FROM roles WHERE role_key = ?', [key]);
    if (exists.length) return res.status(409).json({ success: false, error: `A role named "${name}" already exists.` });
    await db.query(
      'INSERT INTO roles (role_key, role_name, description, permissions, is_system, color) VALUES (?, ?, ?, ?, 0, ?)',
      [key, name.slice(0, 100), String(req.body.description || '').slice(0, 500) || null, '{}', req.body.color || null]
    );
    const source = req.body.copyFrom ? await getRolePermissions(req.body.copyFrom) : new Set(['documents.view_own', 'templates.view', 'signatures.manage']);
    for (const [permKey] of CATALOG) {
      await db.query(
        'INSERT INTO role_permissions (role_key, permission_key, allowed, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)',
        [key, permKey, source.has(permKey) ? 1 : 0, req.user.id]
      );
    }
    await logActivity({ req, category: 'permission', action: `Created role "${name}"`, entityType: 'role', details: { key, copyFrom: req.body.copyFrom || null } });
    res.status(201).json({ success: true, message: `Role "${name}" was created.`, roles: await listRoles(), key });
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ success: false, error: 'The role could not be created.' });
  }
});

// @route PUT /api/permissions/roles/:key { name, description, color }
router.put('/roles/:key', requirePermission('roles.manage'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ success: false, error: 'Enter a role name of at least 2 characters.' });
  try {
    const [result] = await db.query(
      'UPDATE roles SET role_name = ?, description = ?, color = ? WHERE role_key = ?',
      [name.slice(0, 100), String(req.body.description || '').slice(0, 500) || null, req.body.color || null, req.params.key]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Role not found.' });
    await logActivity({ req, category: 'permission', action: `Updated role "${name}"`, entityType: 'role' });
    res.json({ success: true, message: 'Role updated.', roles: await listRoles() });
  } catch (err) {
    res.status(500).json({ success: false, error: 'The role could not be updated.' });
  }
});

// @route DELETE /api/permissions/roles/:key?reassignTo= — custom roles only; users move to another role
router.delete('/roles/:key', requirePermission('roles.manage'), async (req, res) => {
  try {
    const [roles] = await db.query('SELECT role_key, role_name, is_system FROM roles WHERE role_key = ?', [req.params.key]);
    const role = roles[0];
    if (!role) return res.status(404).json({ success: false, error: 'Role not found.' });
    if (role.is_system) return res.status(400).json({ success: false, error: 'Built-in roles cannot be deleted.' });
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM users WHERE LOWER(role) = ?', [role.role_key]);
    const reassignTo = normalizeRole(req.query.reassignTo || 'team_member');
    if (n > 0) {
      const [target] = await db.query('SELECT 1 FROM roles WHERE role_key = ?', [reassignTo]);
      if (!target.length || reassignTo === role.role_key) {
        return res.status(400).json({ success: false, error: 'Choose another role for the users of this role.' });
      }
      await db.query('UPDATE users SET role = ? WHERE LOWER(role) = ?', [reassignTo, role.role_key]);
    }
    await db.query('DELETE FROM role_permissions WHERE role_key = ?', [role.role_key]);
    await db.query('DELETE FROM roles WHERE role_key = ?', [role.role_key]);
    await logActivity({ req, category: 'permission', action: `Deleted role "${role.role_name}"`, entityType: 'role', details: { movedUsers: n, reassignTo } });
    res.json({ success: true, message: `Role "${role.role_name}" was deleted${n ? `; ${n} user${n === 1 ? '' : 's'} moved to ${reassignTo}` : ''}.`, roles: await listRoles() });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ success: false, error: 'The role could not be deleted.' });
  }
});

// @route PUT /api/permissions/roles/:key/permissions { grants: { permissionKey: true|false } }
router.put('/roles/:key/permissions', requirePermission('roles.manage'), async (req, res) => {
  const roleKey = normalizeRole(req.params.key);
  const grants = req.body.grants && typeof req.body.grants === 'object' ? req.body.grants : null;
  if (!grants) return res.status(400).json({ success: false, error: 'No permission changes were sent.' });
  try {
    const [roles] = await db.query('SELECT role_name FROM roles WHERE role_key = ?', [roleKey]);
    if (!roles.length) return res.status(404).json({ success: false, error: 'Role not found.' });
    const known = new Set(CATALOG.map(([k]) => k));
    const locked = LOCKED[roleKey] || [];
    const before = await getRolePermissions(roleKey);
    const changes = [];
    for (const [key, allowed] of Object.entries(grants)) {
      if (!known.has(key) || (locked.includes(key) && !allowed)) continue;
      if (before.has(key) !== Boolean(allowed)) changes.push(`${allowed ? '+' : '-'}${key}`);
      await db.query(
        'INSERT INTO role_permissions (role_key, permission_key, allowed, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), updated_by = VALUES(updated_by)',
        [roleKey, key, allowed ? 1 : 0, req.user.id]
      );
    }
    if (changes.length) {
      await logActivity({ req, category: 'permission', action: `Changed ${changes.length} permission${changes.length === 1 ? '' : 's'} of role "${roles[0].role_name}"`, entityType: 'role', details: changes });
      const [users] = await db.query('SELECT id FROM users WHERE LOWER(COALESCE(role, ?)) = ?', ['team_member', roleKey]);
      await notify({
        userIds: users.map((u) => u.id),
        excludeUserId: req.user.id,
        category: 'user',
        title: 'Your permissions were updated',
        message: `An administrator changed the permissions of your role "${roles[0].role_name}". Some menus or actions may have changed.`,
        link: '/settings/permissions'
      });
    }
    res.json({ success: true, message: changes.length ? `Saved ${changes.length} change${changes.length === 1 ? '' : 's'} to "${roles[0].role_name}".` : 'No changes to save.', roles: await listRoles() });
  } catch (err) {
    console.error('Save role permissions error:', err);
    res.status(500).json({ success: false, error: 'The permissions could not be saved.' });
  }
});

// @route GET /api/permissions/users?search=&role= — users with their role and number of personal overrides
router.get('/users', requirePermission('roles.manage', 'users.view'), async (req, res) => {
  try {
    const search = `%${String(req.query.search || '').trim()}%`;
    const params = [search, search, search];
    let where = "WHERE (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)";
    if (req.query.role) {
      where += ' AND LOWER(COALESCE(u.role, \'team_member\')) = ?';
      params.push(normalizeRole(req.query.role));
    }
    const [users] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, LOWER(COALESCE(u.role, 'team_member')) AS role,
              p.department, p.designation, COALESCE(p.status, 'active') AS status,
              (SELECT COUNT(*) FROM user_permissions up WHERE up.user_id = u.id AND (up.expires_at IS NULL OR up.expires_at > NOW())) AS override_count
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id
       ${where} ORDER BY u.first_name, u.last_name`,
      params
    );
    res.json({ success: true, users: users.map((u) => ({ ...u, name: displayName(u) })) });
  } catch (err) {
    console.error('Permission users error:', err);
    res.status(500).json({ success: false, error: 'Users could not be loaded.' });
  }
});

// @route GET /api/permissions/users/:id — role grants, overrides and effective permissions of one user
router.get('/users/:id', requirePermission('roles.manage', 'users.view'), async (req, res) => {
  try {
    const effective = await getEffectivePermissions(req.params.id);
    if (!effective.user) return res.status(404).json({ success: false, error: 'User not found.' });
    const roleGrants = await getRolePermissions(effective.role);
    const [overrides] = await db.query(
      `SELECT up.permission_key, up.allowed, up.reason, up.expires_at, up.created_at,
              NULLIF(TRIM(CONCAT(COALESCE(g.first_name, ''), ' ', COALESCE(g.last_name, ''))), '') AS granted_by_name
       FROM user_permissions up LEFT JOIN users g ON g.id = up.granted_by WHERE up.user_id = ?`,
      [effective.user.id]
    );
    res.json({
      success: true,
      user: { ...effective.user, name: displayName(effective.user) },
      role: effective.role,
      rolePermissions: [...roleGrants],
      overrides: overrides.map((o) => ({ ...o, allowed: Boolean(o.allowed), expired: o.expires_at && new Date(o.expires_at) <= new Date() })),
      permissions: effective.permissions,
      locked: LOCKED[effective.role] || []
    });
  } catch (err) {
    console.error('Permission user error:', err);
    res.status(500).json({ success: false, error: 'The user\'s permissions could not be loaded.' });
  }
});

// @route PUT /api/permissions/users/:id/overrides { overrides: [{ key, allowed: true|false|null, reason, expiresAt }] }
router.put('/users/:id/overrides', requirePermission('roles.manage'), async (req, res) => {
  const list = Array.isArray(req.body.overrides) ? req.body.overrides : [];
  try {
    const effective = await getEffectivePermissions(req.params.id);
    if (!effective.user) return res.status(404).json({ success: false, error: 'User not found.' });
    const known = new Set(CATALOG.map(([k]) => k));
    let changed = 0;
    for (const o of list) {
      if (!known.has(o.key)) continue;
      if (o.allowed === null || o.allowed === undefined) {
        const [r] = await db.query('DELETE FROM user_permissions WHERE user_id = ? AND permission_key = ?', [effective.user.id, o.key]);
        changed += r.affectedRows;
        continue;
      }
      if (o.expiresAt && Number.isNaN(new Date(o.expiresAt).getTime())) {
        return res.status(400).json({ success: false, error: `The expiry date of ${o.key} is not valid.` });
      }
      await db.query(
        `INSERT INTO user_permissions (user_id, permission_key, allowed, reason, expires_at, granted_by) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed), reason = VALUES(reason), expires_at = VALUES(expires_at), granted_by = VALUES(granted_by)`,
        [effective.user.id, o.key, o.allowed ? 1 : 0, String(o.reason || '').slice(0, 255) || null, o.expiresAt ? new Date(o.expiresAt) : null, req.user.id]
      );
      changed += 1;
    }
    if (changed) {
      await logActivity({ req, category: 'permission', action: `Changed personal permissions of ${displayName(effective.user)}`, entityType: 'user', entityId: effective.user.id, details: list });
      await notify({
        userIds: [effective.user.id],
        excludeUserId: req.user.id,
        category: 'user',
        title: 'Your permissions were updated',
        message: 'An administrator changed your personal permissions. Some menus or actions may have changed.',
        link: '/notifications'
      });
    }
    const updated = await getEffectivePermissions(effective.user.id);
    res.json({ success: true, message: changed ? 'Personal permissions saved.' : 'No changes to save.', permissions: updated.permissions });
  } catch (err) {
    console.error('Save overrides error:', err);
    res.status(500).json({ success: false, error: 'The personal permissions could not be saved.' });
  }
});

// @route PUT /api/permissions/users/:id/role { role }
router.put('/users/:id/role', requirePermission('roles.manage', 'users.edit'), async (req, res) => {
  const role = normalizeRole(req.body.role);
  try {
    const [roles] = await db.query('SELECT role_name FROM roles WHERE role_key = ?', [role]);
    if (!roles.length) return res.status(400).json({ success: false, error: 'Choose an existing role.' });
    const effective = await getEffectivePermissions(req.params.id);
    if (!effective.user) return res.status(404).json({ success: false, error: 'User not found.' });
    if (effective.user.id === req.user.id && role !== 'manager' && effective.role === 'manager') {
      const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE LOWER(role) = 'manager'");
      if (n <= 1) return res.status(400).json({ success: false, error: 'You are the only manager. Make someone else a manager first.' });
    }
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, effective.user.id]);
    await logActivity({ req, category: 'permission', action: `Changed role of ${displayName(effective.user)} to ${roles[0].role_name}`, entityType: 'user', entityId: effective.user.id });
    await notify({
      userIds: [effective.user.id],
      excludeUserId: req.user.id,
      category: 'user',
      title: `Your role is now ${roles[0].role_name}`,
      message: `An administrator changed your role to ${roles[0].role_name}.`,
      link: '/notifications'
    });
    res.json({ success: true, message: `${displayName(effective.user)} is now ${roles[0].role_name}.` });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ success: false, error: 'The role could not be changed.' });
  }
});

module.exports = router;
