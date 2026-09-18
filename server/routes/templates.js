const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { notify, logActivity } = require('../utils/platformEvents');
const { dispatchWebhookEvent } = require('../utils/webhooks');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = /\.(pdf|docx?|txt|rtf|png|jpe?g)$/i;

// Configure upload storage for templates
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-template-' + file.originalname.replace(/[^\w.-]+/g, '_'));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.test(file.originalname)) return cb(null, true);
        cb(new Error('Upload a PDF, Word, text or image file.'));
    }
});

const uploadTemplateFile = (req, res, next) => {
    upload.single('templateFile')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE' ? 'The file must be 25 MB or smaller.' : err.message;
            return res.status(400).json({ success: false, error: message });
        }
        next();
    });
};

// The templates table was created with (title, description, file_path); saved templates also need their text,
// category, sharing and usage
let schemaPromise = null;
function ensureTemplateSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            const [existing] = await db.query(
                "SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates'"
            );
            const has = new Map(existing.map((c) => [c.COLUMN_NAME, c]));
            const columns = [
                ['category', 'VARCHAR(60) NULL'],
                ['content', 'LONGTEXT NULL'],
                ['is_shared', 'TINYINT(1) NOT NULL DEFAULT 1'],
                ['usage_count', 'INT NOT NULL DEFAULT 0'],
                ['source_template', 'VARCHAR(120) NULL'],
                ['updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
            ];
            for (const [column, definition] of columns) {
                if (!has.has(column)) await db.query(`ALTER TABLE templates ADD COLUMN \`${column}\` ${definition}`);
            }
            // A template written in BexSign has no file
            if (has.get('file_path')?.IS_NULLABLE === 'NO') {
                await db.query('ALTER TABLE templates MODIFY file_path VARCHAR(255) NULL');
            }
        })().catch((err) => {
            schemaPromise = null;
            throw err;
        });
    }
    return schemaPromise;
}

const SELECT_TEMPLATES = `
    SELECT t.*, NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), '') AS owner_name,
           u.email AS owner_email
    FROM templates t
    LEFT JOIN users u ON u.id = t.user_id`;

function toTemplate(row) {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        // Older screens read template_name
        template_name: row.title,
        description: row.description || '',
        category: row.category || 'custom',
        content: row.content || '',
        file_path: row.file_path || null,
        isShared: Boolean(row.is_shared),
        usageCount: row.usage_count || 0,
        sourceTemplate: row.source_template || null,
        ownerName: row.owner_name || '',
        ownerEmail: row.owner_email || '',
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        last_modified: row.updated_at || row.created_at
    };
}

async function getUser(userId) {
    const id = parseInt(userId, 10);
    if (!id) return null;
    const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

const isManager = (user) => String(user?.role || '').toLowerCase() === 'manager';

// Templates a user can see: their own and shared ones (managers see all)
async function listTemplates(userId) {
    await ensureTemplateSchema();
    const user = await getUser(userId);
    if (!user || isManager(user)) {
        const [rows] = await db.query(`${SELECT_TEMPLATES} ORDER BY t.updated_at DESC, t.id DESC`);
        return rows.map(toTemplate);
    }
    const [rows] = await db.query(
        `${SELECT_TEMPLATES} WHERE t.user_id = ? OR t.is_shared = 1 ORDER BY t.updated_at DESC, t.id DESC`,
        [user.id]
    );
    return rows.map(toTemplate);
}

// Only the owner or a manager changes or deletes a template
async function canManage(template, userId) {
    if (!userId) return true;
    const user = await getUser(userId);
    return Boolean(user) && (isManager(user) || Number(template.user_id) === Number(user.id));
}

function readTemplateInput(body = {}) {
    const title = String(body.title || body.templateName || body.template_name || '').trim();
    const description = String(body.description || '').trim();
    const category = String(body.category || 'custom').trim().slice(0, 60) || 'custom';
    const content = typeof body.content === 'string' ? body.content : '';
    const sharedValue = body.isShared ?? body.is_shared;
    const isShared = sharedValue === undefined ? true : ['1', 'true', 1, true].includes(sharedValue);
    const sourceTemplate = body.sourceTemplate ? String(body.sourceTemplate).slice(0, 120) : null;
    return { title, description, category, content, isShared, sourceTemplate };
}

function validateTemplate({ title, content }, hasFile) {
    if (!title) return 'Enter a template name.';
    if (title.length > 150) return 'The template name must be 150 characters or fewer.';
    if (!content.trim() && !hasFile) return 'Write the template text or upload a file.';
    return null;
}

// @route   GET /api/templates?userId=
// @desc    Saved templates the user can see
router.get('/', async (req, res) => {
    try {
        const templates = await listTemplates(req.query.userId);
        res.json({ success: true, templates, total: templates.length });
    } catch (err) {
        console.error('Fetch All Templates Error:', err);
        res.status(500).json({ success: false, error: 'Database error while fetching templates' });
    }
});

// @route   GET /api/templates/:userId
// @desc    Saved templates for a user (array)
router.get('/:userId', async (req, res) => {
    try {
        res.json(await listTemplates(req.params.userId));
    } catch (err) {
        console.error('Fetch Templates Error:', err);
        res.status(500).json({ error: 'Database error while fetching templates' });
    }
});

// @route   POST /api/templates/create (multipart: title, description, category, content, isShared, templateFile)
// @desc    Save a new template (written text and/or an uploaded file)
router.post('/create', uploadTemplateFile, async (req, res) => {
    try {
        await ensureTemplateSchema();
        const input = readTemplateInput(req.body);
        // A plain-text upload becomes the template text
        if (req.file && /\.txt$/i.test(req.file.originalname) && !input.content.trim()) {
            input.content = fs.readFileSync(req.file.path, 'utf8');
        }
        const error = validateTemplate(input, Boolean(req.file));
        if (error) return res.status(400).json({ success: false, error });

        const userId = parseInt(req.body.userId, 10) || 1;
        const filePath = req.file ? `/uploads/${req.file.filename}` : null;
        const [result] = await db.query(
            `INSERT INTO templates (user_id, title, description, file_path, category, content, is_shared, source_template)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, input.title, input.description || null, filePath, input.category, input.content || null, input.isShared ? 1 : 0, input.sourceTemplate]
        );
        const [rows] = await db.query(`${SELECT_TEMPLATES} WHERE t.id = ?`, [result.insertId]);
        const saved = toTemplate(rows[0]);
        await logActivity({ req, userId, userEmail: saved.ownerEmail, category: 'template', action: `Created template "${input.title}"`, entityType: 'template', entityId: result.insertId });
        try {
            Promise.resolve(dispatchWebhookEvent('template.created', {
                template: { id: saved.id, title: saved.title, category: saved.category, shared: saved.isShared, ownerId: saved.userId }
            })).catch(() => {});
        } catch (e) {}
        if (input.isShared) {
            await notify({
                permission: 'templates.view',
                excludeUserId: userId,
                category: 'template',
                title: `New shared template: ${input.title}`,
                message: `${saved.ownerName || 'A colleague'} shared "${input.title}"${input.description ? `: ${input.description}` : ''}.`,
                link: '/templates',
                entityType: 'template',
                entityId: result.insertId,
                actorName: saved.ownerName || null
            });
        }
        res.status(201).json({
            success: true,
            message: `Template "${input.title}" was saved.`,
            templateId: result.insertId,
            template: toTemplate(rows[0]),
            filePath
        });
    } catch (err) {
        console.error('Create Template Error:', err);
        res.status(500).json({ success: false, error: 'Database error while saving template' });
    }
});

// @route   PUT /api/templates/:id { title, description, category, content, isShared, userId }
// @desc    Edit a saved template
router.put('/:id', async (req, res) => {
    try {
        await ensureTemplateSchema();
        const [found] = await db.query('SELECT * FROM templates WHERE id = ?', [req.params.id]);
        const template = found[0];
        if (!template) return res.status(404).json({ success: false, error: 'Template not found.' });
        if (!(await canManage(template, req.body.userId))) {
            return res.status(403).json({ success: false, error: 'Only the owner of this template or a manager can edit it.' });
        }
        const input = readTemplateInput(req.body);
        const error = validateTemplate(input, Boolean(template.file_path));
        if (error) return res.status(400).json({ success: false, error });

        await db.query(
            'UPDATE templates SET title = ?, description = ?, category = ?, content = ?, is_shared = ? WHERE id = ?',
            [input.title, input.description || null, input.category, input.content || null, input.isShared ? 1 : 0, template.id]
        );
        const [rows] = await db.query(`${SELECT_TEMPLATES} WHERE t.id = ?`, [template.id]);
        await logActivity({ req, userId: parseInt(req.body.userId, 10) || null, category: 'template', action: `Updated template "${input.title}"`, entityType: 'template', entityId: template.id });
        res.json({ success: true, message: `Template "${input.title}" was updated.`, template: toTemplate(rows[0]) });
    } catch (err) {
        console.error('Update Template Error:', err);
        res.status(500).json({ success: false, error: 'Database error while updating template' });
    }
});

// @route   POST /api/templates/:id/use
// @desc    Count a template being added to a request (shown as "Used N times")
router.post('/:id/use', async (req, res) => {
    try {
        await ensureTemplateSchema();
        await db.query('UPDATE templates SET usage_count = usage_count + 1, updated_at = updated_at WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// @route   POST /api/templates/bulk-delete { ids, userId }
// @desc    Delete several saved templates (only those the user may manage)
router.post('/bulk-delete', async (req, res) => {
    try {
        await ensureTemplateSchema();
        const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map((v) => parseInt(v, 10)).filter(Boolean);
        if (ids.length === 0) return res.status(400).json({ success: false, error: 'Select the templates to delete.' });
        const [rows] = await db.query('SELECT * FROM templates WHERE id IN (?)', [ids]);
        const allowed = [];
        for (const row of rows) {
            if (await canManage(row, req.body.userId)) allowed.push(row.id);
        }
        if (allowed.length) {
            await db.query('DELETE FROM templates WHERE id IN (?)', [allowed]);
            await logActivity({ req, userId: parseInt(req.body.userId, 10) || null, category: 'template', action: `Deleted ${allowed.length} template${allowed.length === 1 ? '' : 's'}`, entityType: 'template', details: rows.filter((r) => allowed.includes(r.id)).map((r) => r.title) });
        }
        res.json({
            success: true,
            deleted: allowed,
            skipped: ids.filter((id) => !allowed.includes(id)),
            message: `${allowed.length} template${allowed.length === 1 ? '' : 's'} deleted.`
        });
    } catch (err) {
        console.error('Bulk Delete Templates Error:', err);
        res.status(500).json({ success: false, error: 'The templates could not be deleted.' });
    }
});

// @route   DELETE /api/templates/:id?userId=
// @desc    Delete a template
router.delete('/:id', async (req, res) => {
    try {
        const [found] = await db.query('SELECT * FROM templates WHERE id = ?', [req.params.id]);
        const template = found[0];
        if (!template) return res.status(404).json({ success: false, error: 'Template not found.' });
        if (!(await canManage(template, req.query.userId))) {
            return res.status(403).json({ success: false, error: 'Only the owner of this template or a manager can delete it.' });
        }
        await db.query('DELETE FROM templates WHERE id = ?', [template.id]);
        await logActivity({ req, userId: parseInt(req.query.userId, 10) || null, category: 'template', action: `Deleted template "${template.title}"`, entityType: 'template', entityId: template.id });
        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (err) {
        console.error('Delete Template Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
