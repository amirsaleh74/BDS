const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Import modules
const LogixxScraper = require('./scraper/logixx-scraper');
const Database = require('./database/db');
const csvExporter = require('./utils/csv-exporter');
const TwilioService = require('./utils/twilio-service');
const dbCache = require('./utils/cache');

// Import middleware
const {
    generateTokens,
    verifyToken,
    requireRole,
    requirePermission,
    optionalAuth
} = require('./middleware/auth');

const {
    securityHeaders,
    loginLimiter,
    apiLimiter,
    strictLimiter,
    compressionMiddleware,
    sanitizeInput,
    sanitizeBody,
    sessionConfig,
    requestLogger,
    errorHandler
} = require('./middleware/security');

// Middleware - Security first
app.use(securityHeaders());
app.use(compressionMiddleware());
app.use(requestLogger);
app.use(cookieParser());
app.use(session(sessionConfig));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database
const db = new Database();

// Make database available to all routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Initialize scraper
let scraper = null;
let sharkTankJob = null;
let watchlistJob = null;

// Initialize Twilio service
let twilioService = null;

// Initialize Twilio with saved settings
function initializeTwilio() {
    const settings = db.getSettings();
    if (settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhoneNumber) {
        twilioService = new TwilioService(
            settings.twilioAccountSid,
            settings.twilioAuthToken,
            settings.twilioPhoneNumber
        );
    }
}

// ===========================================
// AUTHENTICATION ROUTES
// ===========================================

// Route: Setup First Admin (only if no users exist)
app.get('/setup', (req, res) => {
    const users = db.getAllUsers();
    if (users.length > 0) {
        return res.redirect('/login');
    }
    res.render('setup');
});

// Route: Login Page
app.get('/login', (req, res) => {
    // Check if setup is needed
    const users = db.getAllUsers();
    if (users.length === 0) {
        return res.redirect('/setup');
    }

    // If already logged in, redirect to dashboard
    const token = req.cookies?.accessToken;
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const { JWT_SECRET } = require('./middleware/auth');
            jwt.verify(token, JWT_SECRET);
            return res.redirect('/');
        } catch (error) {
            // Token invalid, show login page
        }
    }
    res.render('login', { error: req.query.error, expired: req.query.expired });
});

// Route: Register Page (only accessible by admins)
app.get('/register', verifyToken, requireRole('admin'), (req, res) => {
    res.render('register', { user: req.user });
});

// Route: Login API
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Get user from database
        const user = db.getUserByUsername(username);

        if (!user) {
            db.addAuditLog(null, username, 'LOGIN_FAILED', 'auth', { reason: 'User not found' }, req.ip);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            db.addAuditLog(user.id, username, 'LOGIN_FAILED', 'auth', { reason: 'Account deactivated' }, req.ip);
            return res.status(403).json({
                success: false,
                error: 'Account is deactivated. Please contact an administrator.'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            db.addAuditLog(user.id, username, 'LOGIN_FAILED', 'auth', { reason: 'Invalid password' }, req.ip);
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Update last login
        db.updateLastLogin(user.id);

        // Create session
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        db.createSession(user.id, refreshToken, expiresAt);

        // Log successful login
        db.addAuditLog(user.id, username, 'LOGIN_SUCCESS', 'auth', {}, req.ip);
        db.addActivity('User logged in', `${username} logged in`, 'info');

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000, // 15 minutes
            sameSite: 'strict'
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict'
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                theme: user.theme
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
});

// Route: Register API (admin only)
app.post('/api/auth/register', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, email, role, permissions } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = db.createUser({
            username,
            password: hashedPassword,
            email,
            role: role || 'agent',
            permissions: permissions || {},
            createdBy: req.user.username
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Log user creation
        db.addAuditLog(
            req.user.id,
            req.user.username,
            'USER_CREATED',
            'users',
            { newUser: username, role: role || 'agent' },
            req.ip
        );

        db.addActivity('User created', `${req.user.username} created user ${username}`, 'success');

        res.json({
            success: true,
            user: {
                id: result.user.id,
                username: result.user.username,
                role: result.user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during registration'
        });
    }
});

// Route: Logout
app.post('/api/auth/logout', verifyToken, (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        db.deleteSession(refreshToken);
    }

    // Log logout
    db.addAuditLog(req.user.id, req.user.username, 'LOGOUT', 'auth', {}, req.ip);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true });
});

// Route: Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: 'No refresh token provided'
            });
        }

        // Verify refresh token
        const jwt = require('jsonwebtoken');
        const { JWT_REFRESH_SECRET } = require('./middleware/auth');
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

        // Check if session exists
        const session = db.getSessionByToken(refreshToken);
        if (!session) {
            return res.status(401).json({
                success: false,
                error: 'Invalid session'
            });
        }

        // Get user
        const user = db.getUserById(decoded.id);
        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'User not found or inactive'
            });
        }

        // Generate new access token
        const { accessToken } = generateTokens(user);

        // Update session activity
        db.updateSessionActivity(refreshToken);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000,
            sameSite: 'strict'
        });

        res.json({ success: true });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token'
        });
    }
});

// ===========================================
// USER MANAGEMENT ROUTES (Admin Only)
// ===========================================

// Route: Get all users
app.get('/api/users', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const users = db.getAllUsers().map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        }));

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get current user info
app.get('/api/users/me', verifyToken, (req, res) => {
    try {
        const user = db.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                theme: user.theme,
                permissions: user.permissions,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Update user
app.put('/api/users/:userId', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { email, role, isActive, permissions } = req.body;

        const result = db.updateUser(parseInt(userId), {
            email,
            role,
            isActive,
            permissions
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'USER_UPDATED',
            'users',
            { userId, changes: { email, role, isActive } },
            req.ip
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Delete user
app.delete('/api/users/:userId', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting yourself
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }

        const user = db.getUserById(parseInt(userId));
        const result = db.deleteUser(parseInt(userId));

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Delete user sessions
        db.deleteUserSessions(parseInt(userId));

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'USER_DELETED',
            'users',
            { deletedUser: user.username },
            req.ip
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Update user theme
app.put('/api/users/me/theme', verifyToken, (req, res) => {
    try {
        const { theme } = req.body;

        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({
                success: false,
                error: 'Theme must be "light" or "dark"'
            });
        }

        const result = db.updateUserTheme(req.user.id, theme);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get audit log (admin only)
app.get('/api/audit-log', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const auditLog = db.getAuditLog(limit);

        res.json({ success: true, auditLog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===========================================
// CREDIT REPORT API ROUTES
// ===========================================

// Route: Upload and analyze credit report
app.post('/api/credit-reports/upload', verifyToken, strictLimiter, async (req, res) => {
    try {
        const { clientId, reportData } = req.body;

        if (!clientId || !reportData) {
            return res.status(400).json({
                success: false,
                error: 'Client ID and report data are required'
            });
        }

        // Analyze the credit report
        const CreditAnalyzer = require('./utils/credit-analyzer');
        const analyzer = new CreditAnalyzer(reportData);
        const analysis = analyzer.analyze();

        // Save to database
        const result = db.saveCreditReport(clientId, {
            ...reportData,
            generatedBy: req.user.username
        }, analysis);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Log activity
        db.addActivity(
            'Credit report analyzed',
            `Report generated for client ${clientId} by ${req.user.username}`,
            'success'
        );

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'CREDIT_REPORT_CREATED',
            'credit-reports',
            { clientId, reportId: result.report.id },
            req.ip
        );

        res.json({
            success: true,
            reportId: result.report.id,
            analysis: analysis
        });
    } catch (error) {
        console.error('Error analyzing credit report:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get all credit reports
app.get('/api/credit-reports', verifyToken, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const reports = db.getAllCreditReports(limit);

        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get credit report by ID
app.get('/api/credit-reports/:reportId', verifyToken, (req, res) => {
    try {
        const { reportId } = req.params;
        const report = db.getCreditReport(parseInt(reportId));

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }

        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get credit reports for a specific client
app.get('/api/credit-reports/client/:clientId', verifyToken, (req, res) => {
    try {
        const { clientId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const reports = db.getClientCreditReports(clientId, limit);

        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Generate HTML report
app.get('/api/credit-reports/:reportId/html', verifyToken, (req, res) => {
    try {
        const { reportId } = req.params;
        const result = db.generateReportHTML(parseInt(reportId));

        if (!result.success) {
            return res.status(404).json(result);
        }

        // Log access
        db.addAuditLog(
            req.user.id,
            req.user.username,
            'REPORT_VIEWED',
            'credit-reports',
            { reportId },
            req.ip
        );

        // Send HTML response
        res.setHeader('Content-Type', 'text/html');
        res.send(result.html);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Regenerate report analysis
app.post('/api/credit-reports/:reportId/regenerate', verifyToken, strictLimiter, (req, res) => {
    try {
        const { reportId } = req.params;
        const report = db.getCreditReport(parseInt(reportId));

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }

        // Re-analyze the credit report
        const CreditAnalyzer = require('./utils/credit-analyzer');
        const analyzer = new CreditAnalyzer(report.reportData);
        const analysis = analyzer.analyze();

        // Update the report
        const result = db.updateCreditReport(parseInt(reportId), {
            analysis: analysis,
            regeneratedBy: req.user.username
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'CREDIT_REPORT_REGENERATED',
            'credit-reports',
            { reportId },
            req.ip
        );

        res.json({
            success: true,
            analysis: analysis
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Delete credit report (admin only)
app.delete('/api/credit-reports/:reportId', verifyToken, requireRole('admin'), (req, res) => {
    try {
        const { reportId } = req.params;
        const report = db.getCreditReport(parseInt(reportId));

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Report not found'
            });
        }

        const result = db.deleteCreditReport(parseInt(reportId));

        if (!result.success) {
            return res.status(400).json(result);
        }

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'CREDIT_REPORT_DELETED',
            'credit-reports',
            { reportId, clientId: report.clientId },
            req.ip
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Search credit reports
app.get('/api/credit-reports/search/:query', verifyToken, (req, res) => {
    try {
        const { query } = req.params;
        const reports = db.searchCreditReports(query);

        res.json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get credit report statistics
app.get('/api/credit-reports-stats', verifyToken, (req, res) => {
    try {
        const stats = db.getCreditReportStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===========================================
// PROTECTED ROUTES - DASHBOARD
// ===========================================

// Route: Dashboard Home
app.get('/', verifyToken, (req, res) => {
    const stats = db.getStats();
    const settings = db.getSettings();
    const recentActivity = db.getRecentActivity(20);

    res.render('dashboard', {
        stats,
        settings,
        recentActivity,
        sharkTankActive: sharkTankJob !== null,
        watchlistActive: watchlistJob !== null,
        user: req.user
    });
});

// Route: Settings Page
app.get('/settings', verifyToken, requireRole('admin', 'manager'), (req, res) => {
    const settings = db.getSettings();
    res.render('settings', { settings, user: req.user });
});

// Route: Credit Reports Page
app.get('/credit-reports', verifyToken, (req, res) => {
    res.render('credit-reports', { user: req.user });
});

// Route: Settlement Calculator (PUBLIC - no auth required)
app.get('/calculator', (req, res) => {
    res.render('calculator');
});

// Route: Settlement Calculator API
app.post('/api/calculator/settlement', async (req, res) => {
    try {
        const { totalDebt, monthlyIncome, creditScore, numberOfCreditors } = req.body;

        if (!totalDebt || totalDebt < 1000) {
            return res.status(400).json({
                success: false,
                error: 'Total debt must be at least $1,000'
            });
        }

        const SettlementCalculator = require('./utils/settlement-calculator');
        const calculator = new SettlementCalculator({
            totalDebt,
            monthlyIncome: monthlyIncome || 0,
            creditScore: creditScore || 650,
            numberOfCreditors: numberOfCreditors || 1
        });

        const calculation = calculator.calculate();

        // Optionally create an anonymous lead for tracking
        // (only if they request consultation)

        res.json({
            success: true,
            calculation: calculation
        });
    } catch (error) {
        console.error('Calculator error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===========================================
// AI EMAIL WRITER ROUTES
// ===========================================

// Route: Generate AI email for a lead
app.post('/api/leads/:leadId/generate-email', verifyToken, (req, res) => {
    try {
        const { leadId } = req.params;
        const { emailType, options } = req.body;

        const lead = db.getLead(leadId);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        const AIEmailWriter = require('./utils/ai-email-writer');
        const EmailTracker = require('./utils/email-tracker');

        const writer = new AIEmailWriter(db);
        const tracker = new EmailTracker(db);

        // Generate tracking pixel
        const tracking = tracker.generateTrackingPixel(leadId, emailType || 'general');

        // Prepare options with tracking links
        const emailOptions = {
            ...options,
            agentName: options?.agentName || req.user.username,
            calculatorUrl: tracker.generateTrackedLink(tracking.trackingId, 'http://localhost:3000/calculator', 'calculator'),
            scheduleUrl: tracker.generateTrackedLink(tracking.trackingId, 'http://localhost:3000/schedule-call', 'schedule_consultation')
        };

        // Generate email
        const email = writer.generateEmail(lead, emailType || 'welcome', emailOptions);

        // Add tracking pixel to body
        const completeEmail = {
            ...email,
            body: email.body + '\n\n' + tracking.pixelHtml,
            trackingId: tracking.trackingId
        };

        res.json({
            success: true,
            email: completeEmail
        });
    } catch (error) {
        console.error('Email generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get available email types
app.get('/api/email-templates/types', verifyToken, (req, res) => {
    try {
        const AIEmailWriter = require('./utils/ai-email-writer');
        const writer = new AIEmailWriter(db);

        const types = writer.getAvailableEmailTypes();

        res.json({
            success: true,
            types: types
        });
    } catch (error) {
        console.error('Email types error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===========================================
// EMAIL TRACKING ROUTES
// ===========================================

// Route: Email tracking pixel (public - no auth)
app.get('/api/track/pixel/:trackingId', (req, res) => {
    try {
        const { trackingId } = req.params;
        const EmailTracker = require('./utils/email-tracker');
        const tracker = new EmailTracker(db);

        // Record the open
        tracker.recordOpen(trackingId, {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        });

        // Return 1x1 transparent GIF
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.end(pixel);
    } catch (error) {
        console.error('Tracking pixel error:', error);
        res.status(500).send('Error');
    }
});

// Route: Email link click tracking (public - no auth)
app.get('/api/track/click/:trackingId', (req, res) => {
    try {
        const { trackingId } = req.params;
        const { url, name } = req.query;

        if (!url) {
            return res.status(400).send('Missing URL parameter');
        }

        const EmailTracker = require('./utils/email-tracker');
        const tracker = new EmailTracker(db);

        // Record the click
        const result = tracker.recordClick(trackingId, name || 'link', decodeURIComponent(url), {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
        });

        if (result.success) {
            // Redirect to the original URL
            res.redirect(result.redirectUrl);
        } else {
            res.status(404).send('Invalid tracking link');
        }
    } catch (error) {
        console.error('Link tracking error:', error);
        res.status(500).send('Error');
    }
});

// Route: Get email analytics for a lead
app.get('/api/leads/:leadId/email-analytics', verifyToken, (req, res) => {
    try {
        const { leadId } = req.params;
        const EmailTracker = require('./utils/email-tracker');
        const tracker = new EmailTracker(db);

        const analytics = tracker.getLeadEmailAnalytics(leadId);

        res.json({
            success: true,
            analytics: analytics
        });
    } catch (error) {
        console.error('Email analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get overall campaign analytics
app.get('/api/analytics/email-campaigns', verifyToken, requireRole('admin', 'manager'), (req, res) => {
    try {
        const EmailTracker = require('./utils/email-tracker');
        const tracker = new EmailTracker(db);

        const analytics = tracker.getCampaignAnalytics();

        res.json({
            success: true,
            analytics: analytics
        });
    } catch (error) {
        console.error('Campaign analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===========================================
// LEAD MANAGEMENT ROUTES
// ===========================================

// Route: Leads Management Page
app.get('/leads', verifyToken, (req, res) => {
    res.render('leads', { user: req.user });
});

// Route: Get all leads with scoring
app.get('/api/leads', verifyToken, (req, res) => {
    try {
        const leads = db.getAllLeads();
        const users = db.getAllUsers();

        // Enrich leads with assigned user names
        const enrichedLeads = leads.map(lead => {
            const assignedUser = lead.assignedTo ? users.find(u => u.id === lead.assignedTo) : null;
            return {
                ...lead,
                assignedToName: assignedUser ? assignedUser.username : null,
                qualificationGrade: getQualificationGrade(lead.qualificationScore || 0)
            };
        });

        res.json({ success: true, leads: enrichedLeads });
    } catch (error) {
        console.error('Error loading leads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get single lead
app.get('/api/leads/:leadId', verifyToken, (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = db.getLead(leadId);

        if (!lead) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }

        const users = db.getAllUsers();
        const assignedUser = lead.assignedTo ? users.find(u => u.id === lead.assignedTo) : null;

        const enrichedLead = {
            ...lead,
            assignedToName: assignedUser ? assignedUser.username : null,
            qualificationGrade: getQualificationGrade(lead.qualificationScore || 0)
        };

        res.json({ success: true, lead: enrichedLead });
    } catch (error) {
        console.error('Error loading lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Update lead status (for drag and drop)
app.put('/api/leads/:leadId/status', verifyToken, (req, res) => {
    try {
        const { leadId } = req.params;
        const { status } = req.body;

        const validStatuses = ['new', 'contacted', 'qualified', 'quoted', 'enrolled', 'dead', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const result = db.updateLead(leadId, { status });

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Log activity
        db.addLeadActivity(leadId, {
            type: 'status_changed',
            description: `Status changed to ${status}`,
            metadata: { newStatus: status },
            userId: req.user.id,
            username: req.user.username
        });

        db.addAuditLog(
            req.user.id,
            req.user.username,
            'LEAD_STATUS_UPDATED',
            'leads',
            { leadId, status },
            req.ip
        );

        res.json(result);
    } catch (error) {
        console.error('Error updating lead status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get current user info
app.get('/api/users/me', verifyToken, (req, res) => {
    try {
        const user = db.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Remove sensitive data
        const { password, ...safeUser } = user;

        res.json({ success: true, user: safeUser });
    } catch (error) {
        console.error('Error loading user:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper function to get qualification grade
function getQualificationGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    if (score >= 65) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

// Route: Update Settings
app.post('/api/settings', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        const {
            logixxUsername,
            logixxPassword,
            sharkTankInterval,
            watchlistInterval,
            protectionNote,
            sharkTankEnabled,
            watchlistEnabled,
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumber
        } = req.body;

        // Update settings
        db.updateSettings({
            logixxUsername,
            logixxPassword,
            sharkTankInterval: parseInt(sharkTankInterval),
            watchlistInterval: parseInt(watchlistInterval),
            protectionNote,
            sharkTankEnabled: sharkTankEnabled === 'true',
            watchlistEnabled: watchlistEnabled === 'true',
            twilioAccountSid,
            twilioAuthToken,
            twilioPhoneNumber
        });

        // Reinitialize Twilio with new credentials
        initializeTwilio();

        // Restart monitors with new intervals
        await restartMonitors();

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Manual Scrape
app.post('/api/scrape', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const { pages = 1 } = req.body;
        const settings = db.getSettings();
        
        if (!scraper) {
            scraper = new LogixxScraper(settings.logixxUsername, settings.logixxPassword);
        }

        db.addActivity('Manual scrape started', `Scraping ${pages} page(s)`);
        
        const results = await scraper.scrapePages(pages);
        
        // Store results in database
        results.forEach(file => {
            db.addFile(file);
        });

        db.addActivity('Manual scrape completed', `Found ${results.length} files`);
        
        res.json({ 
            success: true, 
            count: results.length,
            files: results 
        });
    } catch (error) {
        console.error('Error during scrape:', error);
        db.addActivity('Scrape failed', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Export CSV
app.post('/api/export-csv', verifyToken, async (req, res) => {
    try {
        const files = db.getAllFiles();
        const csvPath = await csvExporter.generateCSV(files);
        
        res.download(csvPath, 'logixx-export.csv', (err) => {
            if (err) {
                console.error('Error downloading CSV:', err);
            }
            // Clean up file after download
            fs.unlinkSync(csvPath);
        });
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Bulk Assignment
app.post('/api/bulk-assign', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const { identifiers } = req.body;
        const settings = db.getSettings();
        
        if (!identifiers || identifiers.trim() === '') {
            return res.status(400).json({ success: false, error: 'No identifiers provided' });
        }

        if (!scraper) {
            scraper = new LogixxScraper(settings.logixxUsername, settings.logixxPassword);
        }

        // Parse identifiers (can be App IDs, ALV numbers, or phone numbers)
        const idList = identifiers
            .split(/[\n,]+/)
            .map(id => id.trim())
            .filter(id => id.length > 0);

        db.addActivity('Bulk assignment started', `Processing ${idList.length} identifiers`);

        const results = await scraper.bulkAssign(idList, settings.protectionNote);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        db.addActivity(
            'Bulk assignment completed', 
            `Success: ${successCount}, Failed: ${failCount}`
        );

        res.json({ 
            success: true, 
            results,
            successCount,
            failCount
        });
    } catch (error) {
        console.error('Error during bulk assignment:', error);
        db.addActivity('Bulk assignment failed', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Add to Watchlist
app.post('/api/watchlist/add', verifyToken, (req, res) => {
    try {
        const { identifier, type } = req.body;
        db.addToWatchlist(identifier, type);
        db.addActivity('Added to watchlist', `${type}: ${identifier}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Remove from Watchlist
app.post('/api/watchlist/remove/:id', verifyToken, (req, res) => {
    try {
        const { id } = req.params;
        db.removeFromWatchlist(parseInt(id));
        db.addActivity('Removed from watchlist', `ID: ${id}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get Watchlist
app.get('/api/watchlist', verifyToken, (req, res) => {
    try {
        const watchlist = db.getWatchlist();
        res.json({ success: true, watchlist });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get Activity Log
app.get('/api/activity', verifyToken, (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const activity = db.getRecentActivity(parseInt(limit));
        res.json({ success: true, activity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== TWILIO ROUTES ==========

// Route: Twilio Page
app.get('/twilio', verifyToken, (req, res) => {
    const stats = db.getStats();
    const settings = db.getSettings();
    const smsHistory = db.getSMSHistory(50);
    const callHistory = db.getCallHistory(50);
    const recentActivity = db.getRecentActivity(20);

    res.render('twilio', {
        stats,
        settings,
        smsHistory,
        callHistory,
        recentActivity,
        twilioConfigured: twilioService && twilioService.isConfigured(),
        user: req.user
    });
});

// Route: Send SMS
app.post('/api/twilio/sms/send', verifyToken, async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ success: false, error: 'Phone number and message are required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured. Please add credentials in settings.' });
        }

        // Format phone number
        const formattedNumber = twilioService.formatPhoneNumber(to);

        db.addActivity('Sending SMS', `To: ${formattedNumber}`);

        const result = await twilioService.sendSMS(formattedNumber, message);

        // Save to history
        db.addSMSHistory({
            to: formattedNumber,
            message: message,
            success: result.success,
            messageId: result.messageId,
            error: result.error
        });

        if (result.success) {
            db.addActivity('SMS sent successfully', `To: ${formattedNumber}`, 'success');
        } else {
            db.addActivity('SMS failed', result.error, 'error');
        }

        res.json(result);
    } catch (error) {
        console.error('Error sending SMS:', error);
        db.addActivity('SMS error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Send Bulk SMS
app.post('/api/twilio/sms/bulk', verifyToken, async (req, res) => {
    try {
        const { recipients, message } = req.body;

        if (!recipients || !message) {
            return res.status(400).json({ success: false, error: 'Recipients and message are required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured. Please add credentials in settings.' });
        }

        // Parse recipients (can be comma or newline separated)
        const phoneNumbers = recipients
            .split(/[\n,]+/)
            .map(num => num.trim())
            .filter(num => num.length > 0)
            .map(num => twilioService.formatPhoneNumber(num));

        db.addActivity('Sending bulk SMS', `To ${phoneNumbers.length} recipients`);

        const result = await twilioService.sendBulkSMS(phoneNumbers, message);

        // Save each result to history
        result.results.forEach(r => {
            db.addSMSHistory({
                to: r.to,
                message: message,
                success: r.success,
                messageId: r.messageId,
                error: r.error
            });
        });

        db.addActivity(
            'Bulk SMS completed',
            `Success: ${result.successful}, Failed: ${result.failed}`,
            result.failed === 0 ? 'success' : 'info'
        );

        res.json(result);
    } catch (error) {
        console.error('Error sending bulk SMS:', error);
        db.addActivity('Bulk SMS error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Make Call
app.post('/api/twilio/call/make', verifyToken, async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ success: false, error: 'Phone number and message are required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured. Please add credentials in settings.' });
        }

        // Format phone number
        const formattedNumber = twilioService.formatPhoneNumber(to);

        db.addActivity('Making call', `To: ${formattedNumber}`);

        const result = await twilioService.makeCall(formattedNumber, message);

        // Save to history
        db.addCallHistory({
            to: formattedNumber,
            message: message,
            success: result.success,
            callId: result.callId,
            error: result.error
        });

        if (result.success) {
            db.addActivity('Call initiated successfully', `To: ${formattedNumber}`, 'success');
        } else {
            db.addActivity('Call failed', result.error, 'error');
        }

        res.json(result);
    } catch (error) {
        console.error('Error making call:', error);
        db.addActivity('Call error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Make Bulk Calls
app.post('/api/twilio/call/bulk', verifyToken, async (req, res) => {
    try {
        const { recipients, message } = req.body;

        if (!recipients || !message) {
            return res.status(400).json({ success: false, error: 'Recipients and message are required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured. Please add credentials in settings.' });
        }

        // Parse recipients (can be comma or newline separated)
        const phoneNumbers = recipients
            .split(/[\n,]+/)
            .map(num => num.trim())
            .filter(num => num.length > 0)
            .map(num => twilioService.formatPhoneNumber(num));

        db.addActivity('Making bulk calls', `To ${phoneNumbers.length} recipients`);

        const result = await twilioService.makeBulkCalls(phoneNumbers, message);

        // Save each result to history
        result.results.forEach(r => {
            db.addCallHistory({
                to: r.to,
                message: message,
                success: r.success,
                callId: r.callId,
                error: r.error
            });
        });

        db.addActivity(
            'Bulk calls completed',
            `Success: ${result.successful}, Failed: ${result.failed}`,
            result.failed === 0 ? 'success' : 'info'
        );

        res.json(result);
    } catch (error) {
        console.error('Error making bulk calls:', error);
        db.addActivity('Bulk call error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get SMS History
app.get('/api/twilio/sms/history', verifyToken, (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const history = db.getSMSHistory(parseInt(limit));
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get Call History
app.get('/api/twilio/call/history', verifyToken, (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const history = db.getCallHistory(parseInt(limit));
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Test Twilio Credentials
app.post('/api/twilio/test', verifyToken, requireRole('admin'), async (req, res) => {
    try {
        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured' });
        }

        const result = await twilioService.testCredentials();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Send SMS to LOGIXX Clients
app.post('/api/twilio/sms/send-to-clients', verifyToken, async (req, res) => {
    try {
        const { fileIds, message } = req.body;

        if (!fileIds || !message) {
            return res.status(400).json({ success: false, error: 'File IDs and message are required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured' });
        }

        // Get files from database
        const files = db.getAllFiles();
        const selectedFiles = files.filter(f => fileIds.includes(f.appId));

        // Extract phone numbers
        const phoneNumbers = selectedFiles
            .map(f => f.phone)
            .filter(phone => phone && phone.length > 0)
            .map(phone => twilioService.formatPhoneNumber(phone));

        if (phoneNumbers.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid phone numbers found in selected files' });
        }

        db.addActivity('Sending SMS to LOGIXX clients', `${phoneNumbers.length} recipients`);

        const result = await twilioService.sendBulkSMS(phoneNumbers, message);

        // Save to history
        result.results.forEach(r => {
            db.addSMSHistory({
                to: r.to,
                message: message,
                success: r.success,
                messageId: r.messageId,
                error: r.error
            });
        });

        db.addActivity(
            'SMS to clients completed',
            `Success: ${result.successful}, Failed: ${result.failed}`,
            result.failed === 0 ? 'success' : 'info'
        );

        res.json(result);
    } catch (error) {
        console.error('Error sending SMS to clients:', error);
        db.addActivity('SMS to clients error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== N8N INTEGRATION ROUTES ==========

// Route: Get All Clients for n8n
app.get('/api/n8n/clients', (req, res) => {
    try {
        const files = db.getAllFiles();

        // Format for n8n consumption
        const clients = files.map(file => ({
            appId: file.appId,
            alv: file.alv,
            name: file.name,
            phone: file.phone,
            email: file.email,
            status: file.status,
            debtAmount: file.debtAmount,
            notes: file.notes,
            addedAt: file.addedAt
        }));

        res.json({
            success: true,
            count: clients.length,
            clients: clients
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get Single Client by ID for n8n
app.get('/api/n8n/clients/:appId', (req, res) => {
    try {
        const { appId } = req.params;
        const client = db.getFileByAppId(appId);

        if (!client) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }

        res.json({
            success: true,
            client: {
                appId: client.appId,
                alv: client.alv,
                name: client.name,
                phone: client.phone,
                email: client.email,
                status: client.status,
                debtAmount: client.debtAmount,
                notes: client.notes,
                addedAt: client.addedAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Make Call with Audio URL (for n8n + ElevenLabs)
app.post('/api/n8n/call/with-audio', async (req, res) => {
    try {
        const { to, audioUrl, clientData } = req.body;

        if (!to) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }

        if (!audioUrl) {
            return res.status(400).json({ success: false, error: 'Audio URL is required' });
        }

        if (!twilioService || !twilioService.isConfigured()) {
            return res.status(400).json({ success: false, error: 'Twilio is not configured' });
        }

        // Format phone number
        const formattedNumber = twilioService.formatPhoneNumber(to);

        // Create TwiML that plays the audio
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play>${audioUrl}</Play>
</Response>`;

        db.addActivity('Making AI voicemail call', `To: ${formattedNumber}`);

        // Make call with custom TwiML
        const result = await twilioService.makeCall(formattedNumber, null, twiml);

        // Save to history with client data
        db.addCallHistory({
            to: formattedNumber,
            message: `AI Voicemail - ${clientData?.name || 'Unknown'}`,
            success: result.success,
            callId: result.callId,
            error: result.error,
            audioUrl: audioUrl,
            clientData: clientData
        });

        if (result.success) {
            db.addActivity('AI voicemail call successful', `To: ${formattedNumber}`, 'success');
        } else {
            db.addActivity('AI voicemail call failed', result.error, 'error');
        }

        res.json(result);
    } catch (error) {
        console.error('Error making AI voicemail call:', error);
        db.addActivity('AI voicemail call error', error.message, 'error');
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Webhook callback for call status (n8n can listen to this)
app.post('/api/n8n/webhook/call-status', (req, res) => {
    try {
        const { callId, status, to, clientData } = req.body;

        db.addActivity(
            'Call status update from n8n',
            `Call ${callId} to ${to}: ${status}`,
            status === 'completed' ? 'success' : 'info'
        );

        res.json({ success: true, message: 'Status received' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Log n8n workflow execution
app.post('/api/n8n/log', (req, res) => {
    try {
        const { workflow, action, details, type = 'info' } = req.body;

        db.addActivity(
            `n8n: ${workflow} - ${action}`,
            details || '',
            type
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Toggle Monitors
app.post('/api/monitor/toggle/:type', verifyToken, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const { type } = req.params;
        const { enabled } = req.body;
        
        if (type === 'sharktank') {
            db.updateSettings({ sharkTankEnabled: enabled });
        } else if (type === 'watchlist') {
            db.updateSettings({ watchlistEnabled: enabled });
        }
        
        await restartMonitors();
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Shark Tank Monitor Function
async function runSharkTankMonitor() {
    try {
        const settings = db.getSettings();
        
        if (!settings.sharkTankEnabled) {
            return;
        }

        console.log('[Shark Tank Monitor] Running scan...');
        
        if (!scraper) {
            scraper = new LogixxScraper(settings.logixxUsername, settings.logixxPassword);
        }

        const unprotectedFiles = await scraper.findSharkTankFiles();
        
        if (unprotectedFiles.length > 0) {
            console.log(`[Shark Tank Monitor] Found ${unprotectedFiles.length} unprotected files`);
            
            for (const file of unprotectedFiles) {
                const result = await scraper.assignAndProtect(file.appId, settings.protectionNote);
                
                if (result.success) {
                    db.addFile(file);
                    db.addActivity(
                        'Auto-assigned from shark tank',
                        `App ID: ${file.appId} - ${file.name}`,
                        'success'
                    );
                }
            }
        }
    } catch (error) {
        console.error('[Shark Tank Monitor] Error:', error);
        db.addActivity('Shark Tank Monitor error', error.message, 'error');
    }
}

// Watchlist Monitor Function
async function runWatchlistMonitor() {
    try {
        const settings = db.getSettings();
        
        if (!settings.watchlistEnabled) {
            return;
        }

        console.log('[Watchlist Monitor] Checking watchlist...');
        
        if (!scraper) {
            scraper = new LogixxScraper(settings.logixxUsername, settings.logixxPassword);
        }

        const watchlist = db.getWatchlist();
        
        for (const item of watchlist) {
            const result = await scraper.checkAndAssign(item.identifier, settings.protectionNote);
            
            if (result.success && result.assigned) {
                db.removeFromWatchlist(item.id);
                db.addActivity(
                    'Grabbed from watchlist',
                    `${item.type}: ${item.identifier}`,
                    'success'
                );
            } else if (result.stillProtected) {
                console.log(`[Watchlist] ${item.identifier} still protected`);
            }
        }
    } catch (error) {
        console.error('[Watchlist Monitor] Error:', error);
        db.addActivity('Watchlist Monitor error', error.message, 'error');
    }
}

// Restart Monitors with New Settings
async function restartMonitors() {
    const settings = db.getSettings();
    
    // Stop existing jobs
    if (sharkTankJob) {
        sharkTankJob.stop();
        sharkTankJob = null;
    }
    if (watchlistJob) {
        watchlistJob.stop();
        watchlistJob = null;
    }

    // Start Shark Tank Monitor
    if (settings.sharkTankEnabled) {
        const cronExpression = `*/${settings.sharkTankInterval} * * * *`;
        sharkTankJob = cron.schedule(cronExpression, runSharkTankMonitor);
        console.log(`Shark Tank Monitor started: every ${settings.sharkTankInterval} minutes`);
    }

    // Start Watchlist Monitor
    if (settings.watchlistEnabled) {
        const cronExpression = `*/${settings.watchlistInterval} * * * *`;
        watchlistJob = cron.schedule(cronExpression, runWatchlistMonitor);
        console.log(`Watchlist Monitor started: every ${settings.watchlistInterval} minutes`);
    }
}

// ===========================================
// FIRST ADMIN SETUP ROUTE (Special - No Auth Required)
// ===========================================

// Route: Setup First Admin User (only works if no users exist)
app.post('/api/setup/first-admin', async (req, res) => {
    try {
        const users = db.getAllUsers();

        // Only allow this if no users exist
        if (users.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Setup already completed. Please login.'
            });
        }

        const { username, password, email } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create first admin user
        const result = db.createUser({
            username,
            password: hashedPassword,
            email: email || '',
            role: 'admin',
            permissions: {},
            createdBy: 'system'
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        db.addActivity('First admin created', `Admin user ${username} created`, 'success');
        db.addAuditLog(result.user.id, username, 'FIRST_ADMIN_CREATED', 'setup', {}, req.ip);

        res.json({
            success: true,
            message: 'Admin user created successfully. Please login.',
            user: {
                id: result.user.id,
                username: result.user.username
            }
        });
    } catch (error) {
        console.error('First admin setup error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during setup'
        });
    }
});

// Route: Check if setup is needed
app.get('/api/setup/needed', (req, res) => {
    const users = db.getAllUsers();
    res.json({ setupNeeded: users.length === 0 });
});

// ===========================================
// ERROR HANDLER (Must be last)
// ===========================================
app.use(errorHandler);

// Initialize on startup
async function initialize() {
    try {
        // Set default credentials if not set
        const settings = db.getSettings();
        if (!settings.logixxUsername) {
            db.updateSettings({
                logixxUsername: 'aasgari@betterdebtsolutions.com',
                logixxPassword: 'Negin1995#',
                sharkTankInterval: 10,
                watchlistInterval: 60,
                protectionNote: 'I am working on this file',
                sharkTankEnabled: false,
                watchlistEnabled: false
            });
        }

        // Check if we need to create first admin
        const users = db.getAllUsers();
        if (users.length === 0) {
            console.log('⚠️  No users found. Please navigate to http://localhost:' + PORT + ' to create the first admin user.');
        }

        // Cleanup expired sessions on startup
        const cleanedSessions = db.cleanupExpiredSessions();
        if (cleanedSessions > 0) {
            console.log(`Cleaned up ${cleanedSessions} expired sessions`);
        }

        // Start session cleanup interval (every hour)
        setInterval(() => {
            const cleaned = db.cleanupExpiredSessions();
            if (cleaned > 0) {
                console.log(`Cleaned up ${cleaned} expired sessions`);
            }
        }, 60 * 60 * 1000);

        // Start monitors
        await restartMonitors();

        // Initialize Twilio
        initializeTwilio();

        console.log('✅ System initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 LOGIXX Dashboard running on http://localhost:${PORT}`);
    initialize();
});
