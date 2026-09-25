/**
 * Contact book API (/api/contacts). Each user has their own contacts in signing_contacts: added by hand, imported
 * from CSV, or taken automatically from the recipients of the requests they sent (with how many documents were sent
 * to and signed by each person). Deleting moves contacts to the trash.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const { logActivity } = require('../utils/platformEvents');
const trash = require('../utils/trashStore');

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TAGS = 10;
const fail = (res, status, error, extra = {}) => res.status(status).json({ success: false, error, ...extra });

function parseTags(raw) {
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return String(raw || '').split(',').map((t) => t.trim()).filter(Boolean);
    }
}

const cleanTags = (tags) => [...new Set(parseTags(tags).map((t) => String(t).trim().slice(0, 30)).filter(Boolean))].slice(0, MAX_TAGS);

function present(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company || '',
        job_title: row.job_title || '',
        phone: row.phone || '',
        country_code: row.country_code || '',
        notes: row.notes || '',
        tags: cleanTags(row.tags),
        is_favorite: Boolean(row.is_favorite),
        source: row.source,
        documents_sent: Number(row.documents_sent || 0),
        documents_signed: Number(row.documents_signed || 0),
        last_sent_at: row.last_sent_at,
        last_signed_at: row.last_signed_at,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

/** Validated contact fields from a request body: [values, error] */
function readInput(body = {}, { partial = false } = {}) {
    const out = {};
    const text = (key, max) => {
        if (body[key] === undefined) return;
        out[key] = String(body[key] ?? '').trim().slice(0, max) || null;
    };
    if (!partial || body.email !== undefined) {
        const email = String(body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) return [null, 'Enter a valid email address.'];
        out.email = email.slice(0, 255);
    }
    if (!partial || body.name !== undefined) {
        const name = String(body.name || '').trim().slice(0, 150);
        out.name = name || (out.email ? out.email.split('@')[0] : '');
        if (!out.name) return [null, 'Enter a name.'];
    }
    text('company', 150);
    text('job_title', 120);
    text('phone', 40);
    text('country_code', 8);
    text('notes', 2000);
    if (out.phone && !/^[0-9+()\-.\s]{4,40}$/.test(out.phone)) return [null, 'Enter a valid phone number (digits, spaces, + - ( ) only).'];
    if (body.tags !== undefined) out.tags = JSON.stringify(cleanTags(body.tags));
    if (body.is_favorite !== undefined) out.is_favorite = body.is_favorite ? 1 : 0;
    return [out, null];
}

/* ---------------------------------------------------------------- sync from sent requests */

const lastSync = new Map();

/**
 * Adds every recipient of the user's sent requests to their contacts and refreshes the numbers of each contact.
 * Names the user edited are kept; contacts they deleted stay deleted.
 */
async function syncFromRequests(user, { force = false } = {}) {
    const now = Date.now();
    if (!force && now - (lastSync.get(user.id) || 0) < 30 * 1000) return null;
    lastSync.set(user.id, now);
    const [before] = await db.query('SELECT COUNT(*) AS n FROM signing_contacts WHERE owner_id = ?', [user.id]);
    await db.query(
        `INSERT INTO signing_contacts (owner_id, name, email, source, documents_sent, documents_signed, last_sent_at, last_signed_at)
         SELECT d.user_id, MAX(COALESCE(NULLIF(TRIM(r.name), ''), SUBSTRING_INDEX(r.email, '@', 1))), LOWER(TRIM(r.email)), 'recipient',
                COUNT(DISTINCT d.id), COUNT(DISTINCT CASE WHEN r.status = 'signed' THEN d.id END),
                MAX(COALESCE(r.sent_at, d.sent_at, d.created_at)), MAX(r.signed_at)
         FROM document_recipients r
         JOIN documents d ON d.id = r.document_id
         WHERE d.user_id = ? AND TRIM(COALESCE(r.email, '')) <> '' AND LOWER(TRIM(r.email)) <> LOWER(?)
           AND LOWER(COALESCE(d.status, '')) NOT IN ('draft', 'trashed')
           AND d.id NOT IN (SELECT document_id FROM self_sign_documents)
         GROUP BY d.user_id, LOWER(TRIM(r.email))
         ON DUPLICATE KEY UPDATE documents_sent = VALUES(documents_sent), documents_signed = VALUES(documents_signed),
           last_sent_at = VALUES(last_sent_at), last_signed_at = VALUES(last_signed_at)`,
        [user.id, user.email || '']
    );
    const [after] = await db.query('SELECT COUNT(*) AS n FROM signing_contacts WHERE owner_id = ?', [user.id]);
    return { added: Number(after[0].n) - Number(before[0].n) };
}

async function findOwned(req, id) {
    const [rows] = await db.query('SELECT * FROM signing_contacts WHERE id = ? AND owner_id = ? AND deleted_at IS NULL', [parseInt(id, 10) || 0, req.user.id]);
    return rows[0] || null;
}

/* ---------------------------------------------------------------- list */

// @route   GET /api/contacts?search=&filter=all|favorites|recipient|manual|import&tag=&sort=name|recent|most_sent|newest&page=&pageSize=
router.get('/', async (req, res) => {
    try {
        await syncFromRequests(req.user);
        const where = ['owner_id = ?', 'deleted_at IS NULL'];
        const params = [req.user.id];
        const search = String(req.query.search || '').trim();
        if (search) {
            where.push('(name LIKE ? OR email LIKE ? OR company LIKE ? OR job_title LIKE ? OR phone LIKE ?)');
            params.push(...Array(5).fill(`%${search}%`));
        }
        const filter = String(req.query.filter || 'all');
        if (filter === 'favorites') where.push('is_favorite = 1');
        else if (['recipient', 'manual', 'import'].includes(filter)) {
            where.push('source = ?');
            params.push(filter);
        }
        const tag = String(req.query.tag || '').trim();
        if (tag) {
            where.push('tags LIKE ?');
            // Tags are a JSON array: match the quoted tag so "VIP" does not match "VIP2"
            params.push(`%${JSON.stringify(tag).replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
        }
        const order = {
            recent: 'last_sent_at IS NULL, last_sent_at DESC, name ASC',
            most_sent: 'documents_sent DESC, name ASC',
            newest: 'created_at DESC, id DESC'
        }[req.query.sort] || 'is_favorite DESC, name ASC';
        const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize, 10) || 25));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const sqlWhere = where.join(' AND ');

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM signing_contacts WHERE ${sqlWhere}`, params);
        const [rows] = await db.query(`SELECT * FROM signing_contacts WHERE ${sqlWhere} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
        const [[stats]] = await db.query(
            `SELECT COUNT(*) AS total, SUM(is_favorite = 1) AS favorites, SUM(source = 'recipient') AS recipient,
                    SUM(source = 'manual') AS manual, SUM(source = 'import') AS imported, COALESCE(SUM(documents_sent), 0) AS documents_sent,
                    SUM(last_sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS active_30d
             FROM signing_contacts WHERE owner_id = ? AND deleted_at IS NULL`,
            [req.user.id]
        );
        const [tagRows] = await db.query("SELECT tags FROM signing_contacts WHERE owner_id = ? AND deleted_at IS NULL AND tags IS NOT NULL AND tags <> '[]'", [req.user.id]);
        const tagCounts = {};
        tagRows.forEach((r) => cleanTags(r.tags).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

        res.json({
            success: true,
            contacts: rows.map(present),
            total: Number(total),
            page,
            pageSize,
            stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, Number(v || 0)])),
            tags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
        });
    } catch (err) {
        console.error('[Contacts] list failed:', err);
        fail(res, 500, 'Your contacts could not be loaded.');
    }
});

// @route   GET /api/contacts/suggest?q=&limit=  (recipient autocomplete)
router.get('/suggest', async (req, res) => {
    try {
        await syncFromRequests(req.user);
        const q = String(req.query.q || '').trim();
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 8));
        const params = [req.user.id];
        let extra = '';
        if (q) {
            extra = 'AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        const [rows] = await db.query(
            `SELECT id, name, email, company FROM signing_contacts WHERE owner_id = ? AND deleted_at IS NULL ${extra}
             ORDER BY is_favorite DESC, last_sent_at IS NULL, last_sent_at DESC, name ASC LIMIT ?`,
            [...params, limit]
        );
        res.json({ success: true, contacts: rows });
    } catch (err) {
        console.error('[Contacts] suggest failed:', err);
        fail(res, 500, 'Contacts could not be loaded.');
    }
});

// @route   GET /api/contacts/export  (CSV of all contacts)
router.get('/export', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM signing_contacts WHERE owner_id = ? AND deleted_at IS NULL ORDER BY name ASC', [req.user.id]);
        const cell = (v) => {
            const s = v === null || v === undefined ? '' : String(v);
            // Leading = + - @ would run as a formula in spreadsheet apps
            const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
            return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        };
        const header = ['Name', 'Email', 'Company', 'Job title', 'Phone', 'Tags', 'Favorite', 'Source', 'Documents sent', 'Documents signed', 'Last sent', 'Notes'];
        const lines = rows.map((r) => [
            r.name, r.email, r.company, r.job_title, r.phone, cleanTags(r.tags).join('; '), r.is_favorite ? 'Yes' : 'No', r.source,
            r.documents_sent, r.documents_signed, r.last_sent_at ? new Date(r.last_sent_at).toISOString().slice(0, 10) : '', r.notes
        ].map(cell).join(','));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="bexsign-contacts-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(`﻿${[header.join(','), ...lines].join('\r\n')}`);
    } catch (err) {
        console.error('[Contacts] export failed:', err);
        fail(res, 500, 'The contacts could not be exported.');
    }
});

// @route   POST /api/contacts/sync  (take the recipients of sent requests now)
router.post('/sync', async (req, res) => {
    try {
        const result = await syncFromRequests(req.user, { force: true });
        res.json({ success: true, added: result.added, message: result.added ? `${result.added} new contact${result.added === 1 ? '' : 's'} added from your sent documents.` : 'Your contacts are up to date with your sent documents.' });
    } catch (err) {
        console.error('[Contacts] sync failed:', err);
        fail(res, 500, 'Contacts could not be synced.');
    }
});

// @route   POST /api/contacts/import { contacts: [{ name, email, company, job_title, phone, tags, notes }] }
router.post('/import', async (req, res) => {
    try {
        const list = Array.isArray(req.body?.contacts) ? req.body.contacts.slice(0, 2000) : [];
        if (!list.length) return fail(res, 400, 'The file has no contacts to import.');
        let created = 0;
        let updated = 0;
        const skipped = [];
        for (let i = 0; i < list.length; i += 1) {
            const [input, error] = readInput(list[i] || {});
            if (error) {
                skipped.push({ row: i + 2, email: list[i]?.email || '', reason: error });
                continue;
            }
            const [existing] = await db.query('SELECT id, deleted_at FROM signing_contacts WHERE owner_id = ? AND email = ?', [req.user.id, input.email]);
            if (existing[0]) {
                // Existing contacts get the details the file has; a deleted one comes back
                const sets = Object.entries(input).filter(([k, v]) => k !== 'email' && v !== null && v !== undefined);
                await db.query(
                    `UPDATE signing_contacts SET ${sets.map(([k]) => `\`${k}\` = ?`).join(', ')}${sets.length ? ',' : ''} deleted_at = NULL WHERE id = ?`,
                    [...sets.map(([, v]) => v), existing[0].id]
                );
                if (existing[0].deleted_at) await db.query("DELETE FROM trash_items WHERE item_type = 'contact' AND item_id = ?", [existing[0].id]);
                updated += 1;
            } else {
                const cols = { ...input, owner_id: req.user.id, source: 'import' };
                await db.query(`INSERT INTO signing_contacts (${Object.keys(cols).map((k) => `\`${k}\``).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`, Object.values(cols));
                created += 1;
            }
        }
        await logActivity({ req, category: 'contacts', action: `Imported contacts: ${created} added, ${updated} updated, ${skipped.length} skipped`, entityType: 'contact' });
        res.json({ success: true, created, updated, skipped, message: `${created} added, ${updated} updated${skipped.length ? `, ${skipped.length} skipped` : ''}.` });
    } catch (err) {
        console.error('[Contacts] import failed:', err);
        fail(res, 500, 'The contacts could not be imported.');
    }
});

// @route   POST /api/contacts/bulk-delete { ids }  (moves them to the trash)
router.post('/bulk-delete', async (req, res) => {
    try {
        const moved = await trash.trashContacts(req.body?.ids, req.user);
        if (!moved.length) return fail(res, 400, 'Select the contacts to delete.');
        await logActivity({ req, category: 'contacts', action: `Moved ${moved.length} contact${moved.length === 1 ? '' : 's'} to the trash`, entityType: 'contact' });
        res.json({ success: true, deleted: moved, message: `${moved.length} contact${moved.length === 1 ? '' : 's'} moved to the trash.` });
    } catch (err) {
        console.error('[Contacts] delete failed:', err);
        fail(res, 500, 'The contacts could not be deleted.');
    }
});

// @route   POST /api/contacts/bulk-tag { ids, tag, action: 'add' | 'remove' }
router.post('/bulk-tag', async (req, res) => {
    try {
        const tag = String(req.body?.tag || '').trim().slice(0, 30);
        if (!tag) return fail(res, 400, 'Enter a tag.');
        const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map((v) => parseInt(v, 10)).filter(Boolean);
        if (!ids.length) return fail(res, 400, 'Select the contacts to tag.');
        const [rows] = await db.query('SELECT id, tags FROM signing_contacts WHERE id IN (?) AND owner_id = ? AND deleted_at IS NULL', [ids, req.user.id]);
        const remove = req.body?.action === 'remove';
        for (const r of rows) {
            const tags = cleanTags(r.tags).filter((t) => t.toLowerCase() !== tag.toLowerCase());
            await db.query('UPDATE signing_contacts SET tags = ? WHERE id = ?', [JSON.stringify(remove ? tags : cleanTags([...tags, tag])), r.id]);
        }
        res.json({ success: true, message: `${remove ? 'Removed' : 'Added'} "${tag}" ${remove ? 'from' : 'to'} ${rows.length} contact${rows.length === 1 ? '' : 's'}.` });
    } catch (err) {
        console.error('[Contacts] tag failed:', err);
        fail(res, 500, 'The tag could not be applied.');
    }
});

// @route   POST /api/contacts
router.post('/', async (req, res) => {
    try {
        const [input, error] = readInput(req.body);
        if (error) return fail(res, 400, error);
        const [existing] = await db.query('SELECT * FROM signing_contacts WHERE owner_id = ? AND email = ?', [req.user.id, input.email]);
        if (existing[0] && !existing[0].deleted_at) {
            return fail(res, 409, `${existing[0].name} (${existing[0].email}) is already in your contacts.`, { contactId: existing[0].id });
        }
        let id;
        if (existing[0]) {
            // Adding a contact that is in the trash brings it back with the new details
            const sets = Object.entries(input);
            await db.query(`UPDATE signing_contacts SET ${sets.map(([k]) => `\`${k}\` = ?`).join(', ')}, deleted_at = NULL WHERE id = ?`, [...sets.map(([, v]) => v), existing[0].id]);
            await db.query("DELETE FROM trash_items WHERE item_type = 'contact' AND item_id = ?", [existing[0].id]);
            id = existing[0].id;
        } else {
            const cols = { ...input, owner_id: req.user.id, source: 'manual' };
            const [result] = await db.query(`INSERT INTO signing_contacts (${Object.keys(cols).map((k) => `\`${k}\``).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`, Object.values(cols));
            id = result.insertId;
        }
        const row = await findOwned(req, id);
        await logActivity({ req, category: 'contacts', action: `Added contact ${row.name} (${row.email})`, entityType: 'contact', entityId: id });
        res.status(201).json({ success: true, contact: present(row), message: `${row.name} was added to your contacts.` });
    } catch (err) {
        console.error('[Contacts] create failed:', err);
        fail(res, 500, 'The contact could not be saved.');
    }
});

// @route   GET /api/contacts/:id  (with the documents sent to this person)
router.get('/:id', async (req, res) => {
    try {
        const row = await findOwned(req, req.params.id);
        if (!row) return fail(res, 404, 'That contact was not found.');
        const [documents] = await db.query(
            `SELECT d.id, d.document_name, d.status, d.sent_at, d.created_at, d.completed_at,
                    r.status AS recipient_status, r.role, r.viewed_at, r.signed_at, r.declined_at
             FROM document_recipients r JOIN documents d ON d.id = r.document_id
             WHERE d.user_id = ? AND LOWER(r.email) = LOWER(?) AND LOWER(COALESCE(d.status, '')) <> 'trashed'
               AND d.id NOT IN (SELECT document_id FROM self_sign_documents)
             ORDER BY COALESCE(d.sent_at, d.created_at) DESC LIMIT 50`,
            [req.user.id, row.email]
        );
        res.json({ success: true, contact: present(row), documents });
    } catch (err) {
        console.error('[Contacts] detail failed:', err);
        fail(res, 500, 'The contact could not be loaded.');
    }
});

// @route   PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
    try {
        const row = await findOwned(req, req.params.id);
        if (!row) return fail(res, 404, 'That contact was not found.');
        const [input, error] = readInput(req.body, { partial: true });
        if (error) return fail(res, 400, error);
        if (input.email && input.email !== row.email) {
            const [dupe] = await db.query('SELECT id, name FROM signing_contacts WHERE owner_id = ? AND email = ? AND id <> ?', [req.user.id, input.email, row.id]);
            if (dupe[0]) return fail(res, 409, `Another contact (${dupe[0].name}) already uses ${input.email}.`);
        }
        const sets = Object.entries(input);
        if (sets.length) await db.query(`UPDATE signing_contacts SET ${sets.map(([k]) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`, [...sets.map(([, v]) => v), row.id]);
        const saved = await findOwned(req, row.id);
        res.json({ success: true, contact: present(saved), message: 'Contact saved.' });
    } catch (err) {
        console.error('[Contacts] update failed:', err);
        fail(res, 500, 'The contact could not be saved.');
    }
});

// @route   POST /api/contacts/:id/favorite { favorite }
router.post('/:id/favorite', async (req, res) => {
    try {
        const row = await findOwned(req, req.params.id);
        if (!row) return fail(res, 404, 'That contact was not found.');
        const favorite = req.body?.favorite === undefined ? !row.is_favorite : Boolean(req.body.favorite);
        await db.query('UPDATE signing_contacts SET is_favorite = ? WHERE id = ?', [favorite ? 1 : 0, row.id]);
        res.json({ success: true, is_favorite: favorite });
    } catch (err) {
        fail(res, 500, 'The contact could not be updated.');
    }
});

// @route   DELETE /api/contacts/:id  (moves it to the trash)
router.delete('/:id', async (req, res) => {
    try {
        const moved = await trash.trashContacts([req.params.id], req.user);
        if (!moved.length) return fail(res, 404, 'That contact was not found.');
        res.json({ success: true, message: 'Contact moved to the trash.' });
    } catch (err) {
        console.error('[Contacts] delete failed:', err);
        fail(res, 500, 'The contact could not be deleted.');
    }
});

module.exports = router;
