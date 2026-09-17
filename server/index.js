const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const { verifySmtpConnection } = require('./utils/emailService');
const { refreshOutdatedCompletedPdfs } = require('./utils/requestCompletion');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const signingRoutes = require('./routes/signing');
const templateRoutes = require('./routes/templates');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const contactRoutes = require('./contacts');
const trashRoutes = require('./routes/trash');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Bexsign Backend Server listening on http://localhost:${PORT}`);
    console.log(`Connected to MySQL Database: ${process.env.DB_NAME || 'db_bex_sign'}`);
    // Signed documents issued with an older layout get the current signature stamp and lock (no emails are sent)
    setTimeout(() => {
        refreshOutdatedCompletedPdfs().catch((err) => console.warn('[Signed PDFs] refresh skipped:', err.message));
    }, 3000);
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
