/**
 * Trash bin API (/api/trash). Lists everything deleted on the site (documents, self-sign documents, templates,
 * signatures, contacts) with restore and permanent delete, one by one or in bulk. People see what they own or
 * deleted; "settings.trash" (Organization trash) sees and manages everyone's items and sets the retention period.
 *
 * The older document endpoints (move, bulk-move, restore, bulk-restore, delete, bulk-delete) take document ids and
 * keep working for the documents list.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { OWNER_JOIN, OWNER_COLUMNS } = require('../utils/requestHelpers');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { userCan } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const trash = require('../utils/trashStore');
const { accessFor, canSeeDocument } = require('../utils/documentAccess');

// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);
router.use(async (req, res, next) => {
    try {
        await ensurePlatformSchema();
        next();
    } catch (err) {
        next(err);
    }
});

const idList = (value) => [...new Set((Array.isArray(value) ? value : []).map((v) => parseInt(v, 10)).filter(Boolean))];
const canManageAll = (req) => userCan(req.user, 'settings.trash');

/** Trash rows by id that the caller may act on. */
async function accessibleItems(req, ids) {
    if (!ids.length) return [];
    const [rows] = await db.query('SELECT * FROM trash_items WHERE id IN (?)', [ids]);
    if (await canManageAll(req)) return rows;
    return rows.filter((r) => Number(r.owner_id) === Number(req.user.id) || Number(r.deleted_by) === Number(req.user.id));
}

/** Restores or deletes each item; one failure does not stop the others. */
async function runEach(items, action) {
    const done = [];
    const failed = [];
    for (const item of items) {
        try {
            await action(item);
            done.push(item.id);
        } catch (err) {
            console.error(`[Trash] ${item.item_type} ${item.item_id} failed:`, err.message);
            failed.push({ id: item.id, title: item.title, error: err.message });
        }
    }
    return { done, failed };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ---------------------------------------------------------------- trash bin */

// @route   GET /api/trash/items?type=&search=&scope=mine|all&sort=newest|oldest|name|expiring&page=&pageSize=
// @desc    Items in the trash with counts per type, the retention period and days left for each item
router.get('/items', async (req, res) => {
    try {
        await trash.purgeExpired();
        const manageAll = await canManageAll(req);
        const scopeAll = manageAll && req.query.scope === 'all';
        const where = [];
        const params = [];
        if (!scopeAll) {
            where.push('(t.owner_id = ? OR t.deleted_by = ?)');
            params.push(req.user.id, req.user.id);
        }
        const search = String(req.query.search || '').trim();
        if (search) {
            where.push('(t.title LIKE ? OR t.subtitle LIKE ? OR t.deleted_by_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';

        // Counts per type ignore the type filter so the tabs always show their numbers
        const [countRows] = await db.query(`SELECT t.item_type, COUNT(*) AS n FROM trash_items t ${baseWhere} GROUP BY t.item_type`, params);
        const counts = Object.fromEntries(trash.TYPE_KEYS.map((k) => [k, 0]));
        countRows.forEach((r) => { counts[r.item_type] = Number(r.n); });
        counts.all = Object.values(counts).reduce((a, b) => a + b, 0);

        const type = trash.TYPE_KEYS.includes(req.query.type) ? req.query.type : null;
        const typeWhere = type ? `${baseWhere ? `${baseWhere} AND` : 'WHERE'} t.item_type = ?` : baseWhere;
        const typeParams = type ? [...params, type] : params;

        const order = {
            oldest: 't.deleted_at ASC, t.id ASC',
            name: 't.title ASC, t.id ASC',
            expiring: 't.purge_after ASC, t.id ASC'
        }[req.query.sort] || 't.deleted_at DESC, t.id DESC';
        const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize, 10) || 25));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM trash_items t ${typeWhere}`, typeParams);
        const [rows] = await db.query(
            `SELECT t.id, t.item_type, t.item_id, t.title, t.subtitle, t.owner_id, t.deleted_by, t.deleted_by_name, t.previous_status,
                    t.size_hint, t.deleted_at, t.purge_after, TIMESTAMPDIFF(HOUR, NOW(), t.purge_after) AS hours_left,
                    TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS owner_name, u.email AS owner_email
             FROM trash_items t LEFT JOIN users u ON u.id = t.owner_id
             ${typeWhere} ORDER BY ${order} LIMIT ? OFFSET ?`,
            [...typeParams, pageSize, (page - 1) * pageSize]
        );
        const [[expiring]] = await db.query(
            `SELECT COUNT(*) AS n FROM trash_items t ${baseWhere ? `${baseWhere} AND` : 'WHERE'} t.purge_after <= DATE_ADD(NOW(), INTERVAL 3 DAY)`,
            params
        );

        res.json({
            success: true,
            items: rows.map((r) => ({
                ...r,
                type_label: trash.TYPES[r.item_type]?.label || r.item_type,
                days_left: r.hours_left === null ? null : Math.max(0, Math.ceil(Number(r.hours_left) / 24))
            })),
            total: Number(total),
            page,
            pageSize,
            counts,
            expiringSoon: Number(expiring.n),
            retentionDays: await trash.getRetentionDays(),
            canManageAll: manageAll,
            scope: scopeAll ? 'all' : 'mine',
            types: trash.TYPE_KEYS.map((key) => ({ key, ...trash.TYPES[key] }))
        });
    } catch (err) {
        console.error('[Trash] list failed:', err);
        res.status(500).json({ success: false, error: 'The trash could not be loaded.' });
    }
});

// @route   POST /api/trash/items/restore { ids: [trash item ids] }
router.post('/items/restore', async (req, res) => {
    try {
        const items = await accessibleItems(req, idList(req.body?.ids));
        if (!items.length) return res.status(400).json({ success: false, error: 'Select the items to restore.' });
        const { done, failed } = await runEach(items, trash.restoreItem);
        if (done.length) {
            await logActivity({ req, category: 'trash', action: `Restored ${plural(done.length, 'item')} from the trash`, entityType: 'trash', details: items.filter((i) => done.includes(i.id)).map((i) => `${i.item_type}: ${i.title}`) });
        }
        res.json({
            success: failed.length === 0 || done.length > 0,
            restored: done,
            failed,
            message: failed.length ? `${plural(done.length, 'item')} restored, ${failed.length} could not be restored.` : `${plural(done.length, 'item')} restored.`
        });
    } catch (err) {
        console.error('[Trash] restore failed:', err);
        res.status(500).json({ success: false, error: 'The items could not be restored.' });
    }
});

// @route   POST /api/trash/items/delete { ids: [trash item ids] }
router.post('/items/delete', async (req, res) => {
    try {
        const items = await accessibleItems(req, idList(req.body?.ids));
        if (!items.length) return res.status(400).json({ success: false, error: 'Select the items to delete.' });
        const { done, failed } = await runEach(items, trash.deleteItemForGood);
        if (done.length) {
            await logActivity({ req, category: 'trash', action: `Permanently deleted ${plural(done.length, 'item')} from the trash`, entityType: 'trash', details: items.filter((i) => done.includes(i.id)).map((i) => `${i.item_type}: ${i.title}`) });
        }
        res.json({ success: true, deleted: done, failed, message: `${plural(done.length, 'item')} permanently deleted.` });
    } catch (err) {
        console.error('[Trash] delete failed:', err);
        res.status(500).json({ success: false, error: 'The items could not be deleted.' });
    }
});

// @route   POST /api/trash/empty { type?, scope?: 'mine' | 'all' }
router.post('/empty', async (req, res) => {
    try {
        const scopeAll = req.body?.scope === 'all' && (await canManageAll(req));
        const where = [];
        const params = [];
        if (!scopeAll) {
            where.push('(owner_id = ? OR deleted_by = ?)');
            params.push(req.user.id, req.user.id);
        }
        if (trash.TYPE_KEYS.includes(req.body?.type)) {
            where.push('item_type = ?');
            params.push(req.body.type);
        }
        const [items] = await db.query(`SELECT * FROM trash_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`, params);
        const { done } = await runEach(items, trash.deleteItemForGood);
        if (done.length) await logActivity({ req, category: 'trash', action: `Emptied the trash (${plural(done.length, 'item')})`, entityType: 'trash' });
        res.json({ success: true, deleted: done.length, message: done.length ? `The trash was emptied: ${plural(done.length, 'item')} deleted.` : 'The trash is already empty.' });
    } catch (err) {
        console.error('[Trash] empty failed:', err);
        res.status(500).json({ success: false, error: 'The trash could not be emptied.' });
    }
});

// @route   PUT /api/trash/settings { retentionDays }
router.put('/settings', async (req, res) => {
    try {
        if (!(await canManageAll(req))) return res.status(403).json({ success: false, error: 'Only people with the Organization trash permission can change how long items are kept.' });
        const days = parseInt(req.body?.retentionDays, 10);
        if (!Number.isInteger(days) || days < 1 || days > 365) return res.status(400).json({ success: false, error: 'Choose between 1 and 365 days.' });
        await trash.setRetentionDays(days);
        await logActivity({ req, category: 'trash', action: `Set the trash retention period to ${days} days`, entityType: 'trash' });
        res.json({ success: true, retentionDays: days, message: `Deleted items are now kept for ${days} days.` });
    } catch (err) {
        console.error('[Trash] settings failed:', err);
        res.status(500).json({ success: false, error: 'The retention period could not be saved.' });
    }
});

/* ---------------------------------------------------------------- documents (older endpoints, document ids) */

// @route   GET /api/trash
// @desc    Trashed documents (documents list, trash view)
router.get('/', async (req, res) => {
    try {
        const [trashedDocs] = await db.query(
            `SELECT d.*,
                    di.bexsign_doc_id,
                    di.signer_name,
                    di.signer_email,
                    di.signature_status,
                    di.signature_image,
                    di.signature_style,
                    di.signed_at,
                    ${OWNER_COLUMNS}
             FROM documents d
             LEFT JOIN document_identifiers di ON d.id = di.document_id
             ${OWNER_JOIN}
             WHERE LOWER(d.status) = 'trashed'
             ORDER BY d.updated_at DESC`
        );
        res.json({ success: true, documents: trashedDocs });
    } catch (err) {
        console.error('Fetch Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
});

const moveDocuments = async (req, res, ids) => {
    if (!ids.length) return res.status(400).json({ error: 'ids array is required' });
    try {
        const access = await accessFor(req);
        if (!access.can('documents.delete')) {
            return res.status(403).json({ success: false, error: 'You do not have permission for this action (Delete documents). Ask a manager to grant it.' });
        }
        const allowed = [];
        for (const id of ids) if (await canSeeDocument(access, id)) allowed.push(id);
        if (!allowed.length) return res.status(403).json({ success: false, error: 'You do not have access to these documents.' });
        const moved = await trash.trashDocuments(allowed, req.user);
        await logActivity({ req, category: 'trash', action: `Moved ${plural(moved.length, 'document')} to the trash`, entityType: 'document', entityId: moved.length === 1 ? moved[0] : null });
        res.json({ success: true, moved, message: `${plural(moved.length, 'document')} moved to trash.` });
    } catch (err) {
        console.error('Move To Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
};

const restoreDocuments = async (req, res, ids) => {
    if (!ids.length) return res.status(400).json({ error: 'ids array is required' });
    try {
        // Only trash rows the caller owns or deleted (everyone's with Organization trash)
        const items = await accessibleItems(req, (await trash.documentItems(ids, req.user)).map((i) => i.id));
        const { done } = await runEach(items, trash.restoreItem);
        res.json({ success: true, message: `${plural(done.length, 'document')} restored.` });
    } catch (err) {
        console.error('Restore From Trash Error:', err);
        res.status(500).json({ error: err.message });
    }
};

const deleteDocuments = async (req, res, ids) => {
    if (!ids.length) return res.status(400).json({ error: 'ids array is required' });
    try {
        // Only trash rows the caller owns or deleted (everyone's with Organization trash)
        const items = await accessibleItems(req, (await trash.documentItems(ids, req.user)).map((i) => i.id));
        const { done } = await runEach(items, trash.deleteItemForGood);
        res.json({ success: true, message: `${plural(done.length, 'document')} permanently deleted.` });
    } catch (err) {
        console.error('Permanent Delete Error:', err);
        res.status(500).json({ error: err.message });
    }
};

router.post('/move/:id', (req, res) => moveDocuments(req, res, idList([req.params.id])));
router.post('/bulk-move', (req, res) => moveDocuments(req, res, idList(req.body?.ids)));
router.post('/restore/:id', (req, res) => restoreDocuments(req, res, idList([req.params.id])));
router.post('/bulk-restore', (req, res) => restoreDocuments(req, res, idList(req.body?.ids)));
router.delete('/delete/:id', (req, res) => deleteDocuments(req, res, idList([req.params.id])));
router.post('/bulk-delete', (req, res) => deleteDocuments(req, res, idList(req.body?.ids)));
router.delete('/:id', (req, res) => deleteDocuments(req, res, idList([req.params.id])));

module.exports = router;
