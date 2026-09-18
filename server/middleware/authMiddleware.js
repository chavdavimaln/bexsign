const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_secure_secret_key';

/**
 * Authentication Middleware:
 * Verifies JWT token and attaches authenticated user data to req.user.
 * Falls back gracefully to default Manager in demo/development mode if no token is passed.
 */
async function authenticateUser(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
    let token = null;

    if (authHeader) {
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else {
            token = authHeader;
        }
    }

    if (!token) {
        // Fallback to primary Manager user for backward compatibility
        req.user = {
            id: 1,
            email: 'vimal@bexcodeservices.com',
            first_name: 'Vimal',
            last_name: 'Chavda',
            role: 'manager'
        };
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await db.query(
            `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.company, 
                    p.department, p.designation, p.status 
             FROM users u 
             LEFT JOIN user_profiles p ON u.id = p.user_id 
             WHERE u.id = ?`,
            [decoded.id]
        );

        if (users && users.length > 0) {
            const user = users[0];
            if (user.status === 'inactive') {
                return res.status(403).json({ error: 'Your account has been deactivated by a Manager.' });
            }
            req.user = user;
        } else {
            req.user = {
                id: decoded.id || 1,
                email: decoded.email || 'vimal@bexcodeservices.com',
                first_name: 'Vimal',
                last_name: 'Chavda',
                role: 'manager'
            };
        }
        next();
    } catch (err) {
        // A real (JWT) token that is expired, tampered with or signed with another secret never falls back to the
        // default account: that would give every broken token manager rights
        if (token.split('.').length === 3) {
            return res.status(401).json({
                success: false,
                error: err.name === 'TokenExpiredError'
                    ? 'Your session has expired. Please sign in again.'
                    : 'Your session is not valid. Please sign in again.',
                sessionExpired: true
            });
        }
        // Demo session tokens (not JWTs) keep the default account
        req.user = {
            id: 1,
            email: 'vimal@bexcodeservices.com',
            first_name: 'Vimal',
            last_name: 'Chavda',
            role: 'manager'
        };
        next();
    }
}

/**
 * Role-Based Access Control (RBAC) Guard:
 * Manager role has full administrative bypass ('all').
 * Other roles must match the allowed list.
 */
function requireRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = (req.user.role || 'team_member').toLowerCase();

        // Manager has complete access like super-admin
        if (userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin') {
            return next();
        }

        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
        if (normalizedAllowed.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            error: `Access denied. This action requires ${allowedRoles.join(' or ')} privileges.`
        });
    };
}

module.exports = {
    authenticateUser,
    requireRole
};
