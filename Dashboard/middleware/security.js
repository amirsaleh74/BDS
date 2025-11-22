const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

/**
 * Security headers using Helmet
 * Protects against common web vulnerabilities
 */
function securityHeaders() {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Needed for inline styles in EJS
                scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for inline scripts
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
}

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
});

/**
 * General API rate limiter
 * Prevents API abuse
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        error: 'Too many requests from this IP. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Strict limiter for sensitive operations
 * Used for admin actions, exports, etc.
 */
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        success: false,
        error: 'Too many requests to sensitive endpoint. Please wait.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Compression middleware
 * Reduces response size for faster loading
 */
function compressionMiddleware() {
    return compression({
        filter: (req, res) => {
            // Don't compress if client sends x-no-compression header
            if (req.headers['x-no-compression']) {
                return false;
            }
            // Use compression for everything else
            return compression.filter(req, res);
        },
        level: 6, // Balance between speed and compression ratio
        threshold: 1024 // Only compress responses > 1KB
    });
}

/**
 * Input sanitization
 * Prevents XSS and injection attacks
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
}

/**
 * Sanitize request body recursively
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
}

function sanitizeObject(obj) {
    const sanitized = {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                sanitized[key] = sanitizeInput(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitized[key] = sanitizeObject(obj[key]);
            } else {
                sanitized[key] = obj[key];
            }
        }
    }

    return sanitized;
}

/**
 * Idle timeout constant (30 minutes)
 * For client-side auto-logout
 */
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Session configuration
 */
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'CHANGE-THIS-SESSION-SECRET-IN-PRODUCTION',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
};

/**
 * CORS configuration (if needed)
 */
const corsConfig = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};

/**
 * Request logger middleware (lightweight)
 */
function requestLogger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const log = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            user: req.user?.username || 'anonymous'
        };

        // Only log in development or errors
        if (process.env.NODE_ENV === 'development' || res.statusCode >= 400) {
            console.log(JSON.stringify(log));
        }
    });

    next();
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Increment error counter if monitor exists
    if (req.monitor) {
        req.monitor.incrementError();
    }

    // Don't leak error details in production
    const message = process.env.NODE_ENV === 'production'
        ? 'An error occurred'
        : err.message;

    res.status(err.status || 500).json({
        success: false,
        error: message
    });
}

module.exports = {
    securityHeaders,
    loginLimiter,
    apiLimiter,
    strictLimiter,
    compressionMiddleware,
    sanitizeInput,
    sanitizeBody,
    IDLE_TIMEOUT,
    sessionConfig,
    corsConfig,
    requestLogger,
    errorHandler
};
