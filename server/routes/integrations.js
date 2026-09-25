/**
 * Integrations API (/api/integrations). Everyone signed in can see which apps are connected; configuring, testing,
 * turning on/off, adding custom integrations and disconnecting need "settings.integrations".
 */
const express = require('express');
const router = express.Router();
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
const { requirePermission, userCan } = require('../utils/permissions');
const { logActivity } = require('../utils/platformEvents');
const { ensurePlatformSchema } = require('../utils/platformSchema');
const store = require('../utils/integrationStore');
const catalog = require('../utils/integrationCatalog');

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

const manage = requirePermission('settings.integrations');
const fail = (res, status, error) => res.status(status).json({ success: false, error });

// @route   GET /api/integrations
router.get('/', async (req, res) => {
    try {
        const { integrations, recentActivity } = await store.listIntegrations();
        res.json({
            success: true,
            integrations,
            recentActivity,
            categories: catalog.CATEGORIES,
            events: catalog.SIGNING_EVENTS,
            customTemplate: { fields: catalog.CUSTOM_FIELDS, defaultEvents: catalog.CUSTOM_TEMPLATE.defaultEvents, steps: catalog.CUSTOM_TEMPLATE.steps },
            canManage: await userCan(req.user, 'settings.integrations')
        });
    } catch (err) {
        console.error('[Integrations] list failed:', err);
        fail(res, 500, 'Integrations could not be loaded.');
    }
});

// @route   POST /api/integrations/custom { name, description, config, secrets, events }
router.post('/custom', manage, async (req, res) => {
    try {
        const result = await store.createCustomIntegration(req.body || {}, req.user);
        if (result.error) return fail(res, result.status || 400, result.error);
        await logActivity({ req, category: 'integrations', action: `Added the custom integration "${result.connection.name}"`, entityType: 'integration', entityId: result.connection.id });
        res.status(201).json({ success: true, key: result.key, connection: result.connection, message: `"${result.connection.name}" was added.` });
    } catch (err) {
        console.error('[Integrations] custom create failed:', err);
        fail(res, 500, 'The integration could not be added.');
    }
});

// @route   GET /api/integrations/:key
router.get('/:key', async (req, res) => {
    try {
        const detail = await store.getIntegration(req.params.key);
        if (!detail) return fail(res, 404, 'That integration does not exist.');
        res.json({ success: true, ...detail, canManage: await userCan(req.user, 'settings.integrations') });
    } catch (err) {
        console.error('[Integrations] detail failed:', err);
        fail(res, 500, 'The integration could not be loaded.');
    }
});

// @route   PUT /api/integrations/:key { config, secrets, events, enabled, name?, description? }
router.put('/:key', manage, async (req, res) => {
    try {
        const result = await store.saveIntegration(req.params.key, req.body || {}, req.user);
        if (result.error) return fail(res, result.status || 400, result.error);
        await logActivity({ req, category: 'integrations', action: `Configured the ${result.connection.name} integration`, entityType: 'integration', entityId: result.connection.id });
        res.json({ success: true, connection: result.connection, message: `${result.connection.name} settings saved.` });
    } catch (err) {
        console.error('[Integrations] save failed:', err);
        fail(res, 500, 'The settings could not be saved.');
    }
});

// @route   POST /api/integrations/:key/test { config?, secrets?, events? }  (unsaved values are tested as typed)
router.post('/:key/test', manage, async (req, res) => {
    try {
        const result = await store.testIntegration(req.params.key, req.body || {}, req.user);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Integrations] test failed:', err);
        fail(res, 500, 'The connection could not be tested.');
    }
});

// @route   POST /api/integrations/:key/enable { enabled }
router.post('/:key/enable', manage, async (req, res) => {
    try {
        const connection = await store.setEnabled(req.params.key, Boolean(req.body?.enabled), req.user);
        if (!connection) return fail(res, 404, 'Configure this integration first.');
        await logActivity({ req, category: 'integrations', action: `Turned ${connection.status === 'connected' ? 'on' : 'off'} the ${connection.name} integration`, entityType: 'integration', entityId: connection.id });
        res.json({ success: true, connection, message: `${connection.name} is ${connection.status === 'connected' ? 'on' : 'off'}.` });
    } catch (err) {
        console.error('[Integrations] enable failed:', err);
        fail(res, 500, 'The integration could not be updated.');
    }
});

// @route   POST /api/integrations/:key/reveal-signing-secret  (custom integrations: to verify X-BexSign-Signature)
router.post('/:key/reveal-signing-secret', manage, async (req, res) => {
    try {
        const secret = await store.revealSigningSecret(req.params.key);
        if (!secret) return fail(res, 404, 'This integration has no signing secret.');
        await logActivity({ req, category: 'integrations', action: `Revealed the signing secret of ${req.params.key}`, entityType: 'integration' });
        res.json({ success: true, secret });
    } catch (err) {
        fail(res, 500, 'The secret could not be read.');
    }
});

// @route   DELETE /api/integrations/:key  (disconnect: removes settings and secrets)
router.delete('/:key', manage, async (req, res) => {
    try {
        const detail = await store.getIntegration(req.params.key);
        if (!detail?.connection) return fail(res, 404, 'That integration is not configured.');
        await store.removeIntegration(req.params.key);
        await logActivity({ req, category: 'integrations', action: `Disconnected the ${detail.connection.name} integration`, entityType: 'integration', entityId: detail.connection.id });
        res.json({ success: true, message: `${detail.connection.name} was disconnected and its saved credentials were removed.` });
    } catch (err) {
        console.error('[Integrations] delete failed:', err);
        fail(res, 500, 'The integration could not be disconnected.');
    }
});

module.exports = router;
