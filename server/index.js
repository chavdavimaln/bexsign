const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const signingRoutes = require('./routes/signing');
const templateRoutes = require('./routes/templates');
const reportRoutes = require('./routes/reports');
const settingRoutes = require('./routes/settings');
const contactRoutes = require('./contacts');
const trashRoutes = require('./routes/trash');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/documents', documentRoutes);
app.use('/api/signatures', signingRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/trash', trashRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Bexsign Backend Server listening on http://localhost:${PORT}`);
    console.log(`Connected to MySQL Database: ${process.env.DB_NAME || 'db_bex_sign'}`);
});

module.exports = app;
