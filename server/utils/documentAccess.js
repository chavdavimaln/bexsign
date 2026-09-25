/**
 * Document permissions (server/utils/documentAccess.js): what a signed-in user may see and do with documents,
 * following Settings > Roles & permissions (role grants plus personal overrides).
 *
 *   documents.view_all    every document                      documents.create    create, edit, clone drafts
 *   documents.view_team   own + documents of their department  documents.send      send, remind, signing flow
 *   documents.view_own    documents they created               documents.recall    recall, correct, extend
 *   (everyone)            documents they received to sign      documents.download  download, print, email copies
 *                                                              documents.delete    move to trash, delete
 *
 * Requests without a sign-in come from public signing links and the verify page: they keep the access those pages
 * need (options.public) and are refused everywhere else.
 */
const db = require('../db');
const { getEffectivePermissions, CATALOG } = require('./permissions');

const labelOf = (key) => CATALOG.find(([k]) => k === key)?.[2] || key;

/** { authenticated, user, can(key) } for the request (cached on req). */
async function accessFor(req) {
  if (req.documentAccess) return req.documentAccess;
  if (!req.authenticated) {
    req.documentAccess = { authenticated: false, user: null, can: () => false };
    return req.documentAccess;
  }
  const { permissions } = await getEffectivePermissions(req.user.id, req.user.role);
  const granted = new Set(permissions);
  req.documentAccess = { authenticated: true, user: req.user, can: (key) => granted.has(key) };
  return req.documentAccess;
}

/** SQL condition (alias d) for the documents the user may see, with its parameters. */
function visibilityCondition(access, alias = 'd') {
  if (access.can('documents.view_all')) return { sql: '1=1', params: [] };
  const parts = [
    // Documents sent to them to sign, approve or receive a copy
    `EXISTS (SELECT 1 FROM document_recipients vr WHERE vr.document_id = ${alias}.id AND LOWER(vr.email) = LOWER(?))`
  ];
  const params = [access.user.email || ''];
  if (access.can('documents.view_own') || access.can('documents.view_team')) {
    parts.push(`${alias}.user_id = ?`);
    params.push(access.user.id);
  }
  if (access.can('documents.view_team') && access.user.department) {
    parts.push(`${alias}.user_id IN (SELECT tp.user_id FROM user_profiles tp WHERE tp.department = ?)`);
    params.push(access.user.department);
  }
  return { sql: `(${parts.join(' OR ')})`, params };
}

async function canSeeDocument(access, documentId) {
  if (access.can('documents.view_all')) return true;
  const { sql, params } = visibilityCondition(access);
  const [rows] = await db.query(`SELECT 1 FROM documents d WHERE d.id = ? AND ${sql} LIMIT 1`, [documentId, ...params]);
  return rows.length > 0;
}

async function isRecipientEmail(documentId, email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return false;
  const [rows] = await db.query('SELECT 1 FROM document_recipients WHERE document_id = ? AND LOWER(email) = ? LIMIT 1', [documentId, clean]);
  return rows.length > 0;
}

/**
 * Express guard for document routes.
 *   permission   the permission the action needs (optional)
 *   public       allowed without a sign-in (public signing link / verify page)
 *   recipientLink  a signed-in user may also act when the request names a recipient of the document in
 *                ?email= or body.email (they opened a signing link)
 *   own          the user must be able to see the document in :id (default true when the route has :id)
 */
function guardDocument({ permission = null, public: isPublic = false, recipientLink = false, own } = {}) {
  return async (req, res, next) => {
    try {
      const access = await accessFor(req);
      if (!access.authenticated) {
        if (isPublic) return next();
        return res.status(401).json({ success: false, error: 'Please sign in to continue.', sessionExpired: true });
      }
      const documentId = parseInt(req.params.id, 10) || 0;
      const linkEmail = req.query?.email || req.body?.email || req.body?.signerEmail || null;
      const viaLink = recipientLink && documentId && linkEmail && (await isRecipientEmail(documentId, linkEmail));
      if (permission && !access.can(permission) && !viaLink) {
        return res.status(403).json({ success: false, error: `You do not have permission for this action (${labelOf(permission)}). Ask a manager to grant it.` });
      }
      const mustSee = own === undefined ? Boolean(documentId) : own;
      if (mustSee && documentId && !viaLink && !(await canSeeDocument(access, documentId))) {
        return res.status(403).json({ success: false, error: 'You do not have access to this document.' });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { accessFor, visibilityCondition, canSeeDocument, guardDocument, isRecipientEmail };
