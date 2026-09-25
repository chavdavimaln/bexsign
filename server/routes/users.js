const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateUser, requireSignedIn } = require('../middleware/authMiddleware');
// Each action follows the permissions set in Settings > Roles & permissions (role grants and personal overrides)
const { requirePermission, userCan } = require('../utils/permissions');
const { notify, logActivity } = require('../utils/platformEvents');

// Apply authentication middleware to all user management routes
// Signed-in users only (a request without a sign-in is refused)
router.use(authenticateUser, requireSignedIn);

// @route   GET /api/users
// @desc    Get all enterprise users with profile, role metadata, and summary metrics
router.get('/', requirePermission('users.view'), async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.first_name, 
                u.last_name, 
                u.email, 
                u.username,
                COALESCE(u.role, 'team_member') AS role, 
                u.company, 
                u.phone,
                u.created_at, 
                u.updated_at,
                p.department, 
                p.designation, 
                COALESCE(p.status, 'active') AS status, 
                p.avatar_url, 
                p.timezone,
                r.role_name,
                (SELECT MAX(login_at) FROM user_login_logs WHERE user_id = u.id) AS last_login
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN roles r ON u.role = r.role_key
            ORDER BY u.id ASC
        `;
        const [users] = await db.query(query);

        // Calculate summary metrics
        const total = users.length;
        const managers = users.filter(u => u.role === 'manager' || u.role === 'admin').length;
        const leaders = users.filter(u => u.role === 'leader').length;
        const teamMembers = users.filter(u => u.role === 'team_member' || u.role === 'member').length;
        const active = users.filter(u => u.status === 'active').length;
        const inactive = users.filter(u => u.status === 'inactive').length;

        res.json({
            success: true,
            stats: {
                total,
                managers,
                leaders,
                teamMembers,
                active,
                inactive
            },
            users
        });
    } catch (err) {
        console.error('Fetch Users Error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch users' });
    }
});

// @route   GET /api/users/roles
// @desc    Get all system roles and their permission matrix
router.get('/roles', async (req, res) => {
    try {
        const [roles] = await db.query('SELECT * FROM roles ORDER BY id ASC');
        res.json({ success: true, roles });
    } catch (err) {
        console.error('Fetch Roles Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   GET /api/users/login-logs
// @desc    Get enterprise login audit records
router.get('/login-logs', requirePermission('users.view'), async (req, res) => {
    try {
        const [logs] = await db.query(
            `SELECT l.*, u.first_name, u.last_name 
             FROM user_login_logs l 
             LEFT JOIN users u ON l.user_id = u.id 
             ORDER BY l.login_at DESC 
             LIMIT 50`
        );
        res.json({ success: true, logs });
    } catch (err) {
        console.error('Fetch Login Logs Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/users
// @desc    Create / invite a new enterprise user
router.post('/', requirePermission('users.invite'), async (req, res) => {
    const { firstName, lastName, email, role, department, designation, password, phone } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'User email is required.' });
    }

    const assignedRole = (role || 'team_member').toLowerCase();
    const rawPassword = password || 'BexSign@2026';

    try {
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'A user with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);

        const [insertUser] = await db.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role, company, phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                firstName || 'New',
                lastName || 'Member',
                email,
                hashedPassword,
                assignedRole,
                'BexSign Workspace',
                phone || null
            ]
        );

        const newUserId = insertUser.insertId;

        await db.query(
            `INSERT INTO user_profiles (user_id, department, designation, status, phone) 
             VALUES (?, ?, ?, 'active', ?) 
             ON DUPLICATE KEY UPDATE 
                department = VALUES(department), 
                designation = VALUES(designation), 
                status = 'active',
                phone = VALUES(phone)`,
            [
                newUserId,
                department || 'Operations',
                designation || (assignedRole === 'manager' ? 'Manager' : (assignedRole === 'leader' ? 'Team Leader' : 'Team Member')),
                phone || null
            ]
        );

        // Fetch newly created user
        const [newUser] = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.company, p.department, p.designation, p.status 
             FROM users u 
             LEFT JOIN user_profiles p ON u.id = p.user_id 
             WHERE u.id = ?`,
            [newUserId]
        );

        await logActivity({ req, category: 'user', action: `Added user ${email} as ${assignedRole}`, entityType: 'user', entityId: newUserId });
        await notify({
            userIds: [newUserId],
            category: 'user',
            severity: 'success',
            title: 'Welcome to BexSign',
            message: `${req.user.first_name || 'An administrator'} added you to BexSign as ${assignedRole.replace('_', ' ')}.`,
            link: '/dashboard'
        });

        res.status(201).json({
            success: true,
            message: `User ${email} created successfully with role ${assignedRole}.`,
            user: newUser[0]
        });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: err.message || 'Failed to create user' });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user details, role assignment, and department
router.put('/:id', requirePermission('users.edit'), async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, role, department, designation, phone, status } = req.body;

    // Changing someone's role needs "Manage roles and permissions"; blocking them needs "Activate or deactivate users"
    const [current] = await db.query('SELECT role FROM users WHERE id = ?', [id]).catch(() => [[]]);
    if (role !== undefined && current[0] && String(role).toLowerCase() !== String(current[0].role || '').toLowerCase() && !(await userCan(req.user, 'roles.manage'))) {
        return res.status(403).json({ success: false, error: 'You do not have permission to change roles (Manage roles and permissions). Ask a manager to grant it.' });
    }
    if (status !== undefined && !(await userCan(req.user, 'users.deactivate'))) {
        return res.status(403).json({ success: false, error: 'You do not have permission to activate or deactivate users. Ask a manager to grant it.' });
    }

    try {
        const [userRows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates = [];
        const params = [];

        if (firstName !== undefined) { updates.push('first_name = ?'); params.push(firstName); }
        if (lastName !== undefined) { updates.push('last_name = ?'); params.push(lastName); }
        if (role !== undefined) { updates.push('role = ?'); params.push(role.toLowerCase()); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }

        if (updates.length > 0) {
            params.push(id);
            await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Update profile
        await db.query(
            `INSERT INTO user_profiles (user_id, department, designation, status, phone) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
                department = COALESCE(?, department), 
                designation = COALESCE(?, designation), 
                status = COALESCE(?, status),
                phone = COALESCE(?, phone)`,
            [
                id,
                department || 'General',
                designation || 'Member',
                status || 'active',
                phone || null,
                department || null,
                designation || null,
                status || null,
                phone || null
            ]
        );

        const previousRole = String(userRows[0].role || 'team_member').toLowerCase();
        await logActivity({ req, category: 'user', action: `Updated user ${userRows[0].email}`, entityType: 'user', entityId: Number(id) });
        if (role !== undefined && role.toLowerCase() !== previousRole) {
            await notify({
                userIds: [Number(id)],
                excludeUserId: req.user.id,
                category: 'user',
                title: `Your role is now ${role.toLowerCase().replace('_', ' ')}`,
                message: `${req.user.first_name || 'An administrator'} changed your role from ${previousRole.replace('_', ' ')} to ${role.toLowerCase().replace('_', ' ')}.`,
                link: '/notifications'
            });
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ error: err.message || 'Failed to update user' });
    }
});

// @route   PATCH /api/users/:id/status
// @desc    Toggle active / inactive status for a user
router.patch('/:id/status', requirePermission('users.deactivate'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be active or inactive.' });
    }

    try {
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'You cannot deactivate your own account.' });
        }

        await db.query(
            `INSERT INTO user_profiles (user_id, status) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE status = ?`,
            [id, status, status]
        );

        const [target] = await db.query('SELECT email FROM users WHERE id = ?', [id]);
        await logActivity({ req, category: 'user', action: `${status === 'active' ? 'Activated' : 'Deactivated'} user ${target[0]?.email || `#${id}`}`, entityType: 'user', entityId: Number(id) });
        if (status === 'active') {
            await notify({ userIds: [Number(id)], category: 'user', severity: 'success', title: 'Your account was reactivated', message: 'You can sign in to BexSign again.', link: '/dashboard' });
        }

        res.json({ success: true, message: `User status changed to ${status}.` });
    } catch (err) {
        console.error('Toggle Status Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   POST /api/users/:id/reset-password
// @desc    Reset password for a user (Manager can reset for any user; user can reset own password)
router.post('/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword, sendEmail } = req.body;

    // Check authorization: Manager or self
    // Your own password, or anyone's with "Edit users"
    const isSelf = req.user && parseInt(req.user.id) === parseInt(id);
    if (!isSelf && !(await userCan(req.user, 'users.edit'))) {
        return res.status(403).json({ success: false, error: 'You do not have permission to reset the passwords of other users (Edit users). Ask a manager to grant it.' });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    try {
        const [targetUser] = await db.query('SELECT id, email, first_name FROM users WHERE id = ?', [id]);
        if (!targetUser || targetUser.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, id]);

        const userEmail = targetUser[0].email;
        let emailNotice = '';
        if (sendEmail) {
            const { sendPasswordChangedEmail } = require('../utils/emailService');
            const mail = await sendPasswordChangedEmail({ to: userEmail, name: targetUser[0].first_name });
            emailNotice = mail.success ? ` A confirmation email was sent to ${userEmail}.` : ` The confirmation email to ${userEmail} could not be sent.`;
        }
        await logActivity({ req, category: 'user', action: isSelf ? 'Changed own password' : `Reset the password of ${userEmail}`, entityType: 'user', entityId: Number(id) });
        await notify({
            userIds: [Number(id)],
            excludeUserId: isSelf ? null : req.user.id,
            category: 'user',
            severity: 'warning',
            title: 'Your password was changed',
            message: isSelf ? 'You changed your password.' : `${req.user.first_name || 'An administrator'} set a new password for your account.`,
            link: '/settings/profile'
        });

        res.json({ 
            success: true, 
            message: `Password updated successfully for ${userEmail}.${emailNotice}`,
            emailSent: Boolean(sendEmail)
        });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user account (Manager only; cannot delete oneself or root admin)
router.delete('/:id', requirePermission('users.delete'), async (req, res) => {
    const { id } = req.params;

    try {
        if (parseInt(id) === 1 || parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Primary system administrator account cannot be deleted.' });
        }

        const [target] = await db.query('SELECT email FROM users WHERE id = ?', [id]);
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        await db.query('DELETE FROM user_permissions WHERE user_id = ?', [id]).catch(() => {});
        await logActivity({ req, category: 'user', action: `Deleted user ${target[0]?.email || `#${id}`}`, entityType: 'user', entityId: Number(id) });
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
