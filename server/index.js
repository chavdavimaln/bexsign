const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const { verifySmtpConnection } = require('./utils/emailService');
const { refreshOutdatedCompletedPdfs } = require('./utils/requestCompletion');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const documentRoutes = require('./routes/documents');
const signingRoutes = require('./routes/signing');
const templateRoutes = require('./routes/templates');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const contactRoutes = require('./routes/contacts');
const trashRoutes = require('./routes/trash');
const userRoutes = require('./routes/users');
const permissionRoutes = require('./routes/permissions');
const notificationRoutes = require('./routes/notifications');
const securityRoutes = require('./routes/security');
const platformSettingsRoutes = require('./routes/platformSettings');
const developerRoutes = require('./routes/developer');
const verificationRoutes = require('./routes/verification');
const signatureDirectoryRoutes = require('./routes/signatureDirectory');
const selfSignRoutes = require('./routes/selfSign');
const publicApiRoutes = require('./routes/publicApi');
const integrationRoutes = require('./routes/integrations');
const oauthApps = require('./routes/oauthApps');
const { ensurePlatformSchema } = require('./utils/platformSchema');
const { startReportScheduler } = require('./utils/reportScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
/**
 * Browser origins allowed to call the API.
 *   CORS_ORIGINS   comma-separated list for a live server, e.g. https://sign.example.com,https://www.example.com
 *   not set        every origin is allowed, which is what local development needs.
 * Requests without an Origin header (server to server, curl, the public API) are always allowed.
 */
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean);
app.use(cors({
    origin: allowedOrigins.length === 0
        ? true
        : (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) return callback(null, true);
            callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGINS.`));
        },
    credentials: true
}));
// Behind NGINX or a load balancer the real client IP comes from X-Forwarded-For (audit trail, failed access log)
if (process.env.TRUST_PROXY === 'true' || Number(process.env.TRUST_PROXY) > 0) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
}
// Large limit: signature images and multi-document field payloads are sent as JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Bexsign Express Server is running.',
        database: process.env.DB_NAME || 'db_bex_sign'
    });
});

// Mount REST Routes
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/signatures', signingRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/users', userRoutes);
// Platform modules: permissions, notifications, security logs, settings, developer API
app.use('/api/permissions', permissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);
app.use('/api/developer/oauth-apps', oauthApps.manageRouter);
app.use('/api/developer', developerRoutes);
app.use('/api/oauth', oauthApps.tokenRouter);
app.use('/api/integrations', integrationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/signature-directory', signatureDirectoryRoutes);
app.use('/api/self-sign', selfSignRoutes);
app.use('/api/v1', publicApiRoutes);

/**
 * One-origin deployment (optional): set SERVE_CLIENT=true on the live server and the API also serves the built
 * React app from client/dist, so the site and the API share a domain and no CORS or VITE_API_URL setting is needed.
 * Left off, the client is served by NGINX or any static host and talks to this API through VITE_API_URL.
 */
if (process.env.SERVE_CLIENT === 'true') {
    const clientDist = process.env.CLIENT_DIST_PATH
        ? path.resolve(process.env.CLIENT_DIST_PATH)
        : path.join(__dirname, '..', 'client', 'dist');
    const fsModule = require('fs');
    if (fsModule.existsSync(path.join(clientDist, 'index.html'))) {
        app.use(express.static(clientDist));
        // Every non-API path is a client route (deep links such as /documents/sign/12 must reach React Router)
        app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
        console.log(`[Client] Serving the built app from ${clientDist}`);
    } else {
        console.warn(`[Client] SERVE_CLIENT=true but no build was found at ${clientDist}. Run "npm run build" in client/.`);
    }
}

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Bexsign Backend Server listening on http://localhost:${PORT}`);
    console.log(`Connected to MySQL Database: ${process.env.DB_NAME || 'db_bex_sign'}`);
    // Tables of the platform modules, then the scheduled-report runner
    ensurePlatformSchema()
        .then(() => {
            console.log('[Schema] Platform module tables ready');
            startReportScheduler();
        })
        .catch((err) => console.error('[Schema] Platform tables could not be prepared:', err.message));
    // Signed documents issued with an older layout get the current signature stamp and lock (no emails are sent)
    setTimeout(() => {
        refreshOutdatedCompletedPdfs().catch((err) => console.warn('[Signed PDFs] refresh skipped:', err.message));
    }, 3000);
    // Trash: items whose retention period ended are deleted for good (checked hourly)
    const { purgeExpired } = require('./utils/trashStore');
    setTimeout(() => purgeExpired(true), 10000);
    setInterval(() => purgeExpired(true), 60 * 60 * 1000).unref();
    verifySmtpConnection().then((smtp) => {
        if (smtp.dryRun) console.log('[SMTP] EMAIL_DRY_RUN=true: emails are written to server/email_outbox instead of being sent');
        else if (smtp.success) console.log('[SMTP] Mail server connection verified');
        else console.warn('[SMTP Warning] Mail server connection failed:', smtp.error);
    });
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[BexSign Port Conflict] Port ${PORT} is already occupied by an existing process.`);
        console.error(`Please make sure previous process on port ${PORT} is closed.\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

module.exports = app;
