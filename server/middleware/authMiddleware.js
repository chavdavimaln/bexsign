const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'bexsign_secure_secret_key';

/**
 * Authentication Middleware:
 * Verifies JWT token and attaches authenticated user data to req.user; req.authenticated is true only then.
 * Requests without a sign-in (public signing links, the verify page) get the default account as req.user with
 * req.authenticated = false: routes that need a real user use requireSignedIn, and requirePermission refuses them.
 */
const ANONYMOUS_USER = Object.freeze({
    id: 1,
    email: 'vimal@bexcodeservices.com',
    first_name: 'Vimal',
    last_name: 'Chavda',
    role: 'manager'
});

async function authenticateUser(req, res, next) {
    req.authenticated = false;
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
        req.user = { ...ANONYMOUS_USER };
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
            req.authenticated = true;
        } else {
            // A valid token of an account that no longer exists never becomes the default account
            return res.status(401).json({ success: false, error: 'Your account no longer exists. Please sign in again.', sessionExpired: true });
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
        // Anything else (an old demo session value) is treated like no sign-in
        req.user = { ...ANONYMOUS_USER };
        next();
    }
}

/**
 * Like authenticateUser, but a token that is expired or not valid counts as "no sign-in" instead of an error.
 * For routes that also serve public signing links, which must keep working in a browser with an old session.
 */
function authenticateOptional(req, res, next) {
    const fakeRes = {
        status() { return this; },
        json() {
            req.user = { ...ANONYMOUS_USER };
            req.authenticated = false;
            next();
        }
    };
    return authenticateUser(req, fakeRes, next);
}

/** Only for signed-in users (a valid BexSign sign-in token); the app then sends the user to the login page. */
function requireSignedIn(req, res, next) {
    if (req.authenticated) return next();
    return res.status(401).json({ success: false, error: 'Please sign in to continue.', sessionExpired: true });
}

/**
 * Role-Based Access Control (RBAC) Guard:
 * Manager role has full administrative bypass ('all').
 * Other roles must match the allowed list.
 */
function requireRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user || req.authenticated === false) {
            return res.status(401).json({ success: false, error: 'Please sign in to continue.', sessionExpired: true });
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
    authenticateOptional,
    requireSignedIn,
    requireRole
};
