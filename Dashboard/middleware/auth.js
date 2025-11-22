const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE-THIS-SECRET-KEY-IN-PRODUCTION-USE-ENV-FILE';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'CHANGE-THIS-REFRESH-SECRET-IN-PRODUCTION';

/**
 * Generate JWT access and refresh tokens
 */
function generateTokens(user) {
    const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '15m' } // Short-lived for security
    );

    const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' } // Long-lived
    );

    return { accessToken, refreshToken };
}

/**
 * Verify JWT token middleware
 */
function verifyToken(req, res, next) {
    // Try to get token from cookie first, then Authorization header
    const token = req.cookies?.accessToken ||
                  req.headers.authorization?.split(' ')[1];

    if (!token) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired',
                    expired: true
                });
            }
            return res.redirect('/login?expired=true');
        }

        if (req.path.startsWith('/api/')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
        return res.redirect('/login?error=invalid_token');
    }
}

/**
 * Require specific role(s)
 * Usage: requireRole('admin') or requireRole('admin', 'manager')
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions. Required role: ' + roles.join(' or ')
            });
        }

        next();
    };
}

/**
 * Require specific permission
 * Checks user's granular permissions
 */
function requirePermission(permission) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Admin has all permissions
        if (req.user.role === 'admin') {
            return next();
        }

        // Get full user data including permissions
        try {
            const user = req.db.getUserById(req.user.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'Account is deactivated'
                });
            }

            // Check specific permission
            if (user.permissions && user.permissions[permission]) {
                return next();
            }

            return res.status(403).json({
                success: false,
                error: `Permission denied: ${permission}`
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Error checking permissions'
            });
        }
    };
}

/**
 * Optional auth - doesn't fail if no token
 * Sets req.user if token exists and is valid
 */
function optionalAuth(req, res, next) {
    const token = req.cookies?.accessToken ||
                  req.headers.authorization?.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        // Invalid or expired token - continue without user
    }

    next();
}

module.exports = {
    generateTokens,
    verifyToken,
    requireRole,
    requirePermission,
    optionalAuth,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
