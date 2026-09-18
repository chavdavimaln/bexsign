/**
 * Permission module: a catalog of permissions grouped by module, the grants of each role (role_permissions) and
 * per-user overrides (user_permissions: allow or deny, optionally until a date).
 * Effective permissions = role grants, then user overrides. The Manager role always keeps "roles.manage" so the
 * organization cannot lock itself out.
 */
const db = require('../db');

const CATALOG = [
  // Documents
  ['documents.view_own', 'documents', 'View own documents', 'See documents the user created or received'],
  ['documents.view_team', 'documents', 'View team documents', 'See documents created by members of the same department'],
  ['documents.view_all', 'documents', 'View all documents', 'See every document in the organization'],
  ['documents.create', 'documents', 'Create documents', 'Upload documents and create drafts'],
  ['documents.send', 'documents', 'Send for signature', 'Send requests to recipients'],
  ['documents.recall', 'documents', 'Recall and correct', 'Recall, correct or extend sent requests'],
  ['documents.download', 'documents', 'Download and print', 'Download signed PDFs and certificates'],
  ['documents.delete', 'documents', 'Delete documents', 'Move documents to trash and delete them'],
  // Templates
  ['templates.view', 'templates', 'Use templates', 'Browse and use templates'],
  ['templates.create', 'templates', 'Create templates', 'Save new templates'],
  ['templates.edit', 'templates', 'Edit templates', 'Change templates they can manage'],
  ['templates.delete', 'templates', 'Delete templates', 'Delete templates they can manage'],
  ['templates.share', 'templates', 'Share templates', 'Share templates with the whole organization'],
  // Signatures
  ['signatures.manage', 'signatures', 'Manage signatures', 'Create and change their saved signatures and stamps'],
  // Reports
  ['reports.view', 'reports', 'View reports', 'Open reports and the timeline'],
  ['reports.export', 'reports', 'Export reports', 'Download reports as CSV'],
  ['reports.schedule', 'reports', 'Schedule reports', 'Create scheduled report emails'],
  // Users
  ['users.view', 'users', 'View users', 'See the users of the organization'],
  ['users.invite', 'users', 'Add users', 'Create and invite users'],
  ['users.edit', 'users', 'Edit users', 'Change user details and roles'],
  ['users.deactivate', 'users', 'Activate or deactivate users', 'Block or restore access of users'],
  ['users.delete', 'users', 'Delete users', 'Remove users permanently'],
  // Roles and permissions
  ['roles.manage', 'permissions', 'Manage roles and permissions', 'Change role permissions and user overrides'],
  // Settings
  ['settings.general', 'settings', 'General settings', 'Change organization-wide settings'],
  ['settings.integrations', 'settings', 'Integrations', 'Connect and configure integrations'],
  ['settings.developer', 'settings', 'Developer settings', 'Change API and webhook settings'],
  // Security and compliance
  ['security.failed_access', 'security', 'Failed access log', 'View and resolve failed access attempts'],
  ['security.document_validity', 'security', 'Document validity', 'Verify documents and see verification history'],
  ['security.activity_history', 'security', 'Activity history', 'View the activity history of the organization'],
  // Developer API
  ['api.keys', 'api', 'API keys', 'Create and revoke API keys'],
  ['api.webhooks', 'api', 'Webhooks', 'Create and manage webhooks'],
  ['api.logs', 'api', 'API logs', 'View API request logs'],
  // Notifications
  ['notifications.broadcast', 'notifications', 'Send announcements', 'Send a notification to every user']
];

const MODULE_LABELS = {
  documents: 'Documents',
  templates: 'Templates',
  signatures: 'Signatures',
  reports: 'Reports',
  users: 'Users',
  permissions: 'Roles & permissions',
  settings: 'Settings',
  security: 'Security & compliance',
  api: 'Developer API',
  notifications: 'Notifications'
};

const ALL_KEYS = CATALOG.map(([key]) => key);

const DEFAULT_GRANTS = {
  manager: ALL_KEYS,
  leader: [
    'documents.view_own', 'documents.view_team', 'documents.create', 'documents.send', 'documents.recall', 'documents.download',
    'templates.view', 'templates.create', 'templates.edit', 'templates.share',
    'signatures.manage',
    'reports.view', 'reports.export', 'reports.schedule',
    'users.view', 'users.invite',
    'security.document_validity', 'security.activity_history'
  ],
  team_member: [
    'documents.view_own', 'documents.create', 'documents.send', 'documents.download',
    'templates.view', 'templates.create',
    'signatures.manage',
    'reports.view'
  ]
};

// Permissions a role can never lose (lock-out protection)
const LOCKED = { manager: ['roles.manage'] };

async function seedPermissions() {
  for (let i = 0; i < CATALOG.length; i += 1) {
    const [key, module, label, description] = CATALOG[i];
    await db.query(
      `INSERT INTO permissions (permission_key, module, label, description, sort_order) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE module = VALUES(module), label = VALUES(label), description = VALUES(description), sort_order = VALUES(sort_order)`,
      [key, module, label, description, i]
    );
  }
  await db.query("UPDATE roles SET is_system = 1 WHERE role_key IN ('manager', 'leader', 'team_member')");
  // Default grants only for role/permission pairs that were never set (admins' changes are kept)
  for (const [role, keys] of Object.entries(DEFAULT_GRANTS)) {
    for (const key of ALL_KEYS) {
      await db.query(
        'INSERT IGNORE INTO role_permissions (role_key, permission_key, allowed) VALUES (?, ?, ?)',
        [role, key, keys.includes(key) ? 1 : 0]
      );
    }
  }
}

const normalizeRole = (role) => {
  const r = String(role || 'team_member').toLowerCase();
  if (r === 'admin' || r === 'super_admin') return 'manager';
  if (r === 'member') return 'team_member';
  return r;
};

async function getRolePermissions(roleKey) {
  const [rows] = await db.query('SELECT permission_key, allowed FROM role_permissions WHERE role_key = ?', [normalizeRole(roleKey)]);
  const granted = new Set(rows.filter((r) => r.allowed).map((r) => r.permission_key));
  (LOCKED[normalizeRole(roleKey)] || []).forEach((k) => granted.add(k));
  return granted;
}

/** Effective permissions of a user: { user, role, permissions: [keys], overrides: [...] } */
async function getEffectivePermissions(userId, fallbackRole = null) {
  const [users] = await db.query('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?', [userId]);
  const user = users[0] || null;
  const role = normalizeRole(user?.role || fallbackRole);
  const granted = await getRolePermissions(role);
  const [overrides] = user
    ? await db.query(
      'SELECT permission_key, allowed, reason, expires_at FROM user_permissions WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())',
      [user.id]
    )
    : [[]];
  overrides.forEach((o) => {
    if (o.allowed) granted.add(o.permission_key);
    else if (!(LOCKED[role] || []).includes(o.permission_key)) granted.delete(o.permission_key);
  });
  return { user, role, permissions: [...granted].sort(), overrides };
}

async function userCan(user, permissionKey) {
  if (!user) return false;
  const { permissions } = await getEffectivePermissions(user.id, user.role);
  return permissions.includes(permissionKey);
}

/** Express guard: the authenticated user (req.user) must have one of the given permissions. */
function requirePermission(...keys) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required.' });
      const { permissions } = await getEffectivePermissions(req.user.id, req.user.role);
      req.permissions = permissions;
      if (keys.some((k) => permissions.includes(k))) return next();
      const labels = keys.map((k) => CATALOG.find(([key]) => key === k)?.[2] || k).join(' or ');
      return res.status(403).json({ success: false, error: `You do not have permission for this action (${labels}). Ask a manager to grant it.` });
    } catch (err) {
      next(err);
    }
  };
}

/** User ids that hold a permission (for notifications to admins, e.g. failed access). */
async function usersWithPermission(permissionKey) {
  const [users] = await db.query(
    `SELECT u.id, u.role FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE COALESCE(p.status, 'active') = 'active'`
  );
  const result = [];
  for (const u of users) {
    if (await userCan(u, permissionKey)) result.push(u.id);
  }
  return result;
}

module.exports = {
  CATALOG,
  MODULE_LABELS,
  DEFAULT_GRANTS,
  LOCKED,
  seedPermissions,
  normalizeRole,
  getRolePermissions,
  getEffectivePermissions,
  userCan,
  requirePermission,
  usersWithPermission
};
