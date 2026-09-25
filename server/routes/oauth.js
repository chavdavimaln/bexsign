const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requestHelpers = require('../utils/requestHelpers');
const { notify, logActivity, logFailedAccess } = require('../utils/platformEvents');
const { buildSession, JWT_SECRET } = require('../utils/authSession');
const integrationStore = require('../utils/integrationStore');

/**
 * "Continue with Google / Microsoft" (mounted at /api/auth/oauth).
 *
 *   GET  /:provider?mode=login|register  sends the browser to the provider's consent screen
 *   GET  /:provider/callback             provider returns here; finds or creates the BexSign account and sends the
 *                                        browser to <CLIENT_URL>/oauth/callback?ticket=... (a 2-minute sign-in ticket)
 *   POST /exchange { ticket }            the client swaps the ticket for the usual { token, user } session
 *
 * server/.env
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT (default "common": work, school and personal accounts)
 *   OAUTH_CALLBACK_BASE_URL  public origin of this API, e.g. https://sign.example.com (default: the request's own origin)
 * Register the redirect URI <OAUTH_CALLBACK_BASE_URL>/api/auth/oauth/<google|microsoft>/callback with each provider.
 */

const tenant = () => process.env.MICROSOFT_TENANT || 'common';

const PROVIDERS = {
    google: {
        label: 'Google',
        clientId: () => process.env.GOOGLE_CLIENT_ID,
        clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
        envHint: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
        authorizeUrl: () => 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: () => 'https://oauth2.googleapis.com/token',
        scope: 'openid email profile',
        extraParams: { prompt: 'select_account' },
        async profile(accessToken) {
            const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error('Could not read your Google profile.');
            const p = await res.json();
            if (p.email_verified === false) throw new Error('This Google account email is not verified.');
            return { email: p.email, firstName: p.given_name, lastName: p.family_name };
        }
    },
    microsoft: {
        label: 'Microsoft',
        clientId: () => process.env.MICROSOFT_CLIENT_ID,
        clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
        envHint: 'MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET',
        authorizeUrl: () => `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize`,
        tokenUrl: () => `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`,
        scope: 'openid email profile User.Read',
        extraParams: { prompt: 'select_account' },
        async profile(accessToken) {
            const res = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error('Could not read your Microsoft profile.');
            const p = await res.json();
            return { email: p.mail || p.userPrincipalName, firstName: p.givenName, lastName: p.surname };
        }
    }
};

// Settings > Integrations (Google Workspace, Microsoft 365) can supply the credentials instead of server/.env
const INTEGRATION_KEYS = { google: 'google-workspace', microsoft: 'microsoft-365' };

/** The provider with the credentials in use: a configured integration wins over server/.env. */
async function resolveProvider(name) {
    const provider = PROVIDERS[name];
    if (!provider) return null;
    const sso = await integrationStore.getSsoSettings(INTEGRATION_KEYS[name]);
    if (!sso || !sso.configured) return { ...provider, sso: null, disabled: false };
    const resolved = { ...provider, sso, disabled: !sso.enabled, clientId: () => sso.clientId, clientSecret: () => sso.clientSecret };
    if (name === 'microsoft' && sso.tenant) {
        const t = encodeURIComponent(sso.tenant);
        resolved.authorizeUrl = () => `https://login.microsoftonline.com/${t}/oauth2/v2.0/authorize`;
        resolved.tokenUrl = () => `https://login.microsoftonline.com/${t}/oauth2/v2.0/token`;
    }
    // Google shows only accounts of the company domain when sign-in is limited to it
    if (name === 'google' && sso.restrictDomain && sso.domain) resolved.extraParams = { ...provider.extraParams, hd: sso.domain };
    return resolved;
}

const callbackUrl = (req, provider) => {
    const base = (process.env.OAUTH_CALLBACK_BASE_URL
        || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`).replace(/\/$/, '');
    return `${base}/api/auth/oauth/${provider}/callback`;
};

/** Back to the login or register page with a message the page shows. */
const backWithError = (res, mode, message) => {
    const page = mode === 'register' ? 'register' : 'login';
    res.redirect(`${requestHelpers.getClientBaseUrl()}/${page}?oauth_error=${encodeURIComponent(message)}`);
};

const logLogin = async (req, user, status) => {
    try {
        await db.query(
            'INSERT INTO user_login_logs (user_id, email, role, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)',
            [user.id, user.email, (user.role || 'manager').toLowerCase(), req.ip || '127.0.0.1', req.headers['user-agent'] || '', status]
        );
    } catch (e) {}
};

router.post('/exchange', async (req, res) => {
    try {
        const payload = jwt.verify(String(req.body.ticket || ''), JWT_SECRET);
        if (payload.purpose !== 'oauth_ticket') throw new Error('bad ticket');
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [payload.id]);
        if (!rows[0]) throw new Error('no user');
        res.json({ message: 'Login successful', ...(await buildSession(rows[0])) });
    } catch (err) {
        res.status(401).json({ error: 'This sign-in link has expired. Please try again.' });
    }
});

// @route   GET /api/auth/oauth/providers
// @desc    Which "Continue with ..." buttons the sign-in page shows: hidden when an administrator turned the
//          provider off in Settings > Integrations
router.get('/providers', async (req, res) => {
    const out = {};
    for (const name of Object.keys(PROVIDERS)) {
        const provider = await resolveProvider(name);
        out[name] = { label: provider.label, configured: Boolean(provider.clientId() && provider.clientSecret()), hidden: provider.disabled };
    }
    res.json({ success: true, providers: out });
});

router.get('/:provider', async (req, res) => {
    const provider = await resolveProvider(req.params.provider);
    const mode = req.query.mode === 'register' ? 'register' : 'login';
    if (!provider) return backWithError(res, mode, 'Unknown sign-in provider.');
    if (provider.disabled) return backWithError(res, mode, `${provider.label} sign-in is turned off by your administrator.`);
    if (!provider.clientId() || !provider.clientSecret()) {
        return backWithError(res, mode, `${provider.label} sign-in is not set up yet. Configure it in Settings > Integrations, or add ${provider.envHint} to server/.env.`);
    }

    const state = jwt.sign({ provider: req.params.provider, mode, nonce: crypto.randomBytes(8).toString('hex') }, JWT_SECRET, { expiresIn: '10m' });
    const params = new URLSearchParams({
        client_id: provider.clientId(),
        redirect_uri: callbackUrl(req, req.params.provider),
        response_type: 'code',
        scope: provider.scope,
        state,
        ...provider.extraParams
    });
    res.redirect(`${provider.authorizeUrl()}?${params}`);
});

router.get('/:provider/callback', async (req, res) => {
    let mode = 'login';
    try {
        const state = jwt.verify(String(req.query.state || ''), JWT_SECRET);
        mode = state.mode;
        if (state.provider !== req.params.provider) throw new Error('state mismatch');
    } catch (e) {
        return backWithError(res, mode, 'The sign-in session expired. Please try again.');
    }

    const provider = await resolveProvider(req.params.provider);
    if (!provider) return backWithError(res, mode, 'Unknown sign-in provider.');
    if (provider.disabled) return backWithError(res, mode, `${provider.label} sign-in is turned off by your administrator.`);
    if (req.query.error) {
        return backWithError(res, mode, req.query.error === 'access_denied'
            ? `${provider.label} sign-in was cancelled.`
            : `${provider.label} sign-in failed: ${req.query.error_description || req.query.error}`);
    }

    try {
        const tokenRes = await fetch(provider.tokenUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: String(req.query.code || ''),
                client_id: provider.clientId(),
                client_secret: provider.clientSecret(),
                redirect_uri: callbackUrl(req, req.params.provider),
                grant_type: 'authorization_code'
            })
        });
        const tokens = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok || !tokens.access_token) {
            throw new Error(tokens.error_description || `${provider.label} did not accept the sign-in.`);
        }

        const profile = await provider.profile(tokens.access_token);
        const email = String(profile.email || '').trim().toLowerCase();
        if (!email) throw new Error(`Your ${provider.label} account did not share an email address.`);
        if (provider.sso?.restrictDomain && provider.sso.domain && !email.endsWith(`@${provider.sso.domain}`)) {
            await logFailedAccess({ req, email, source: 'login', reason: `${provider.label} sign-in from outside the company domain (${provider.sso.domain})` });
            return backWithError(res, mode, `Only ${provider.sso.domain} accounts can sign in with ${provider.label}.`);
        }

        const [existing] = await db.query('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
        let user = existing[0];
        if (user) {
            const [profileRows] = await db.query('SELECT status FROM user_profiles WHERE user_id = ?', [user.id]);
            if (profileRows[0]?.status === 'inactive') {
                await logLogin(req, user, 'failed');
                await logFailedAccess({ req, email, userId: user.id, source: 'login', reason: `${provider.label} sign-in to a deactivated account` });
                return backWithError(res, mode, 'Your account has been deactivated by an administrator. Please contact your Manager.');
            }
        } else {
            if (provider.sso && !provider.sso.allowSignup) {
                return backWithError(res, mode, `There is no BexSign account for ${email}. Ask your administrator to add you.`);
            }
            // No password is ever sent for these accounts; a random one keeps password sign-in closed until "Forgot password?"
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
            const firstName = profile.firstName || email.split('@')[0] || 'User';
            const lastName = profile.lastName || '';
            const [result] = await db.query(
                'INSERT INTO users (first_name, last_name, email, password_hash, company, job_title) VALUES (?, ?, ?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword, null, null]
            );
            const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = rows[0];
            await logActivity({ req, userId: user.id, userEmail: email, category: 'auth', action: `Registered with ${provider.label}`, entityType: 'user', entityId: user.id });
            await notify({
                permission: 'users.view',
                excludeUserId: user.id,
                category: 'user',
                title: `New user: ${`${firstName} ${lastName}`.trim() || email}`,
                message: `${email} registered with ${provider.label}.`,
                link: '/users',
                entityType: 'user',
                entityId: user.id
            });
        }

        await logLogin(req, user, 'success');
        await logActivity({ req, userId: user.id, userEmail: user.email, category: 'auth', action: `Signed in with ${provider.label}` });

        const ticket = jwt.sign({ id: user.id, purpose: 'oauth_ticket' }, JWT_SECRET, { expiresIn: '2m' });
        res.redirect(`${requestHelpers.getClientBaseUrl()}/oauth/callback?ticket=${encodeURIComponent(ticket)}`);
    } catch (err) {
        console.error(`${provider.label} OAuth error:`, err);
        backWithError(res, mode, err.message || `${provider.label} sign-in failed.`);
    }
});

module.exports = router;
