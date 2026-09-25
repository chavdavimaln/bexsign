const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_secure_secret_key';

/** The { token, user } a successful sign-in returns (password or Google / Microsoft). */
async function buildSession(user) {
    const userRole = (user.role || 'manager').toLowerCase();
    const token = jwt.sign({ id: user.id, email: user.email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

    const [prof] = await db.query('SELECT department, designation, status FROM user_profiles WHERE user_id = ?', [user.id]);
    const [r] = await db.query('SELECT role_name, permissions FROM roles WHERE role_key = ?', [userRole]);

    return {
        token,
        user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            company: user.company,
            job_title: user.job_title,
            role: userRole,
            role_name: r[0]?.role_name || (userRole === 'manager' ? 'Manager (Admin)' : (userRole === 'leader' ? 'Leader' : 'Team Member')),
            department: prof[0]?.department || 'Executive',
            designation: prof[0]?.designation || (userRole === 'manager' ? 'Manager' : 'Team Member'),
            status: prof[0]?.status || 'active',
            permissions: r[0]?.permissions || { all: userRole === 'manager' }
        }
    };
}

module.exports = { buildSession, JWT_SECRET };
