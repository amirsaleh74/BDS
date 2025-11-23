const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.settingsFile = path.join(this.dataDir, 'settings.json');
        this.filesFile = path.join(this.dataDir, 'files.json');
        this.activityFile = path.join(this.dataDir, 'activity.json');
        this.watchlistFile = path.join(this.dataDir, 'watchlist.json');
        this.smsHistoryFile = path.join(this.dataDir, 'sms-history.json');
        this.callHistoryFile = path.join(this.dataDir, 'call-history.json');
        this.emailHistoryFile = path.join(this.dataDir, 'email-history.json');
        this.emailTrackingFile = path.join(this.dataDir, 'email-tracking.json');
        this.callDispositionsFile = path.join(this.dataDir, 'call-dispositions.json');
        this.dncListFile = path.join(this.dataDir, 'dnc-list.json');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.sessionsFile = path.join(this.dataDir, 'sessions.json');
        this.auditLogFile = path.join(this.dataDir, 'audit-log.json');
        this.creditReportsFile = path.join(this.dataDir, 'credit-reports.json');
        this.leadsFile = path.join(this.dataDir, 'leads.json');
        this.leadActivitiesFile = path.join(this.dataDir, 'lead-activities.json');
        this.leadNotesFile = path.join(this.dataDir, 'lead-notes.json');

        this.init();
    }

    init() {
        // Create data directory if it doesn't exist
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        // Initialize files if they don't exist
        if (!fs.existsSync(this.settingsFile)) {
            this.saveData(this.settingsFile, this.getDefaultSettings());
        }
        if (!fs.existsSync(this.filesFile)) {
            this.saveData(this.filesFile, []);
        }
        if (!fs.existsSync(this.activityFile)) {
            this.saveData(this.activityFile, []);
        }
        if (!fs.existsSync(this.watchlistFile)) {
            this.saveData(this.watchlistFile, []);
        }
        if (!fs.existsSync(this.smsHistoryFile)) {
            this.saveData(this.smsHistoryFile, []);
        }
        if (!fs.existsSync(this.callHistoryFile)) {
            this.saveData(this.callHistoryFile, []);
        }
        if (!fs.existsSync(this.emailHistoryFile)) {
            this.saveData(this.emailHistoryFile, []);
        }
        if (!fs.existsSync(this.emailTrackingFile)) {
            this.saveData(this.emailTrackingFile, {});
        }
        if (!fs.existsSync(this.callDispositionsFile)) {
            this.saveData(this.callDispositionsFile, []);
        }
        if (!fs.existsSync(this.dncListFile)) {
            this.saveData(this.dncListFile, []);
        }
        if (!fs.existsSync(this.usersFile)) {
            this.saveData(this.usersFile, []);
        }
        if (!fs.existsSync(this.sessionsFile)) {
            this.saveData(this.sessionsFile, []);
        }
        if (!fs.existsSync(this.auditLogFile)) {
            this.saveData(this.auditLogFile, []);
        }
        if (!fs.existsSync(this.creditReportsFile)) {
            this.saveData(this.creditReportsFile, []);
        }
        if (!fs.existsSync(this.leadsFile)) {
            this.saveData(this.leadsFile, []);
        }
        if (!fs.existsSync(this.leadActivitiesFile)) {
            this.saveData(this.leadActivitiesFile, []);
        }
        if (!fs.existsSync(this.leadNotesFile)) {
            this.saveData(this.leadNotesFile, []);
        }
    }

    getDefaultSettings() {
        return {
            logixxUsername: '',
            logixxPassword: '',
            sharkTankInterval: 10,
            watchlistInterval: 60,
            protectionNote: 'I am working on this file',
            sharkTankEnabled: false,
            watchlistEnabled: false,
            twilioAccountSid: '',
            twilioAuthToken: '',
            twilioPhoneNumber: '',
            emailHost: '',
            emailPort: 587,
            emailSecure: false,
            emailUser: '',
            emailPass: '',
            emailFromEmail: '',
            trackingBaseUrl: 'http://localhost:3000',
            lastUpdated: new Date().toISOString()
        };
    }

    loadData(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading ${filePath}:`, error);
            return null;
        }
    }

    saveData(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error saving ${filePath}:`, error);
            return false;
        }
    }

    // Settings Methods
    getSettings() {
        return this.loadData(this.settingsFile) || this.getDefaultSettings();
    }

    updateSettings(updates) {
        const settings = this.getSettings();
        const newSettings = {
            ...settings,
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        return this.saveData(this.settingsFile, newSettings);
    }

    // Files Methods
    getAllFiles() {
        return this.loadData(this.filesFile) || [];
    }

    addFile(file) {
        const files = this.getAllFiles();
        
        // Check if file already exists (by appId)
        const existingIndex = files.findIndex(f => f.appId === file.appId);
        
        if (existingIndex !== -1) {
            // Update existing file
            files[existingIndex] = {
                ...files[existingIndex],
                ...file,
                lastUpdated: new Date().toISOString()
            };
        } else {
            // Add new file
            files.push({
                ...file,
                addedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }
        
        return this.saveData(this.filesFile, files);
    }

    getFileByAppId(appId) {
        const files = this.getAllFiles();
        return files.find(f => f.appId === appId);
    }

    deleteFile(appId) {
        const files = this.getAllFiles();
        const filtered = files.filter(f => f.appId !== appId);
        return this.saveData(this.filesFile, filtered);
    }

    // Activity Log Methods
    getRecentActivity(limit = 50) {
        const activity = this.loadData(this.activityFile) || [];
        return activity.slice(0, limit);
    }

    addActivity(action, details, type = 'info') {
        const activity = this.loadData(this.activityFile) || [];
        
        activity.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details,
            type
        });

        // Keep only last 1000 activities
        const trimmed = activity.slice(0, 1000);
        
        return this.saveData(this.activityFile, trimmed);
    }

    clearActivity() {
        return this.saveData(this.activityFile, []);
    }

    // Watchlist Methods
    getWatchlist() {
        return this.loadData(this.watchlistFile) || [];
    }

    addToWatchlist(identifier, type) {
        const watchlist = this.getWatchlist();
        
        // Check if already in watchlist
        const exists = watchlist.find(w => w.identifier === identifier);
        if (exists) {
            return false;
        }

        watchlist.push({
            id: Date.now(),
            identifier,
            type,
            addedAt: new Date().toISOString()
        });

        return this.saveData(this.watchlistFile, watchlist);
    }

    removeFromWatchlist(id) {
        const watchlist = this.getWatchlist();
        const filtered = watchlist.filter(w => w.id !== id);
        return this.saveData(this.watchlistFile, filtered);
    }

    clearWatchlist() {
        return this.saveData(this.watchlistFile, []);
    }

    // SMS History Methods
    getSMSHistory(limit = 100) {
        const history = this.loadData(this.smsHistoryFile) || [];
        return history.slice(0, limit);
    }

    addSMSHistory(smsData) {
        const history = this.loadData(this.smsHistoryFile) || [];

        history.unshift({
            ...smsData,
            timestamp: new Date().toISOString()
        });

        // Keep only last 500 messages
        const trimmed = history.slice(0, 500);

        return this.saveData(this.smsHistoryFile, trimmed);
    }

    clearSMSHistory() {
        return this.saveData(this.smsHistoryFile, []);
    }

    // Call History Methods
    getCallHistory(limit = 100) {
        const history = this.loadData(this.callHistoryFile) || [];
        return history.slice(0, limit);
    }

    addCallHistory(callData) {
        const history = this.loadData(this.callHistoryFile) || [];

        history.unshift({
            ...callData,
            timestamp: new Date().toISOString()
        });

        // Keep only last 500 calls
        const trimmed = history.slice(0, 500);

        return this.saveData(this.callHistoryFile, trimmed);
    }

    clearCallHistory() {
        return this.saveData(this.callHistoryFile, []);
    }

    // Statistics Methods
    getStats() {
        const files = this.getAllFiles();
        const activity = this.getRecentActivity(1000);
        const watchlist = this.getWatchlist();
        const smsHistory = this.getSMSHistory(1000);
        const callHistory = this.getCallHistory(1000);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const todayActivity = activity.filter(a => {
            const activityDate = new Date(a.timestamp);
            return activityDate >= today;
        });

        const successToday = todayActivity.filter(a =>
            a.type === 'success' &&
            (a.action.includes('Auto-assigned') || a.action.includes('Grabbed'))
        ).length;

        const smsSentToday = smsHistory.filter(s => {
            const smsDate = new Date(s.timestamp);
            return smsDate >= today;
        }).length;

        const callsMadeToday = callHistory.filter(c => {
            const callDate = new Date(c.timestamp);
            return callDate >= today;
        }).length;

        const emailHistory = this.getEmailHistory(1000);

        const emailsSentToday = emailHistory.filter(e => {
            const emailDate = new Date(e.timestamp);
            return emailDate >= today;
        }).length;

        return {
            totalFiles: files.length,
            filesAssignedToday: successToday,
            watchlistCount: watchlist.length,
            totalActivity: activity.length,
            lastActivity: activity.length > 0 ? activity[0] : null,
            smsSentToday: smsSentToday,
            callsMadeToday: callsMadeToday,
            totalSMSSent: smsHistory.length,
            totalCallsMade: callHistory.length,
            emailsSentToday: emailsSentToday,
            totalEmailsSent: emailHistory.length
        };
    }

    // Email History Methods
    getEmailHistory(limit = 100) {
        const history = this.loadData(this.emailHistoryFile) || [];
        return history.slice(0, limit);
    }

    addEmailHistory(emailData) {
        const history = this.loadData(this.emailHistoryFile) || [];

        history.unshift({
            ...emailData,
            timestamp: new Date().toISOString()
        });

        // Keep only last 500 emails
        const trimmed = history.slice(0, 500);

        return this.saveData(this.emailHistoryFile, trimmed);
    }

    clearEmailHistory() {
        return this.saveData(this.emailHistoryFile, []);
    }

    // Email Tracking Methods
    getEmailTracking(trackingId) {
        const tracking = this.loadData(this.emailTrackingFile) || {};
        return tracking[trackingId] || null;
    }

    initEmailTracking(trackingId, emailData) {
        const tracking = this.loadData(this.emailTrackingFile) || {};

        tracking[trackingId] = {
            ...emailData,
            opens: [],
            clicks: [],
            scrollDepths: [],
            timeSpent: 0,
            createdAt: new Date().toISOString()
        };

        return this.saveData(this.emailTrackingFile, tracking);
    }

    trackEmailOpen(trackingId, userAgent, ip) {
        const tracking = this.loadData(this.emailTrackingFile) || {};

        if (!tracking[trackingId]) {
            tracking[trackingId] = { opens: [], clicks: [], scrollDepths: [], timeSpent: 0 };
        }

        tracking[trackingId].opens.push({
            timestamp: new Date().toISOString(),
            userAgent: userAgent,
            ip: ip
        });

        return this.saveData(this.emailTrackingFile, tracking);
    }

    trackEmailClick(trackingId, linkIndex, url, userAgent, ip) {
        const tracking = this.loadData(this.emailTrackingFile) || {};

        if (!tracking[trackingId]) {
            tracking[trackingId] = { opens: [], clicks: [], scrollDepths: [], timeSpent: 0 };
        }

        tracking[trackingId].clicks.push({
            timestamp: new Date().toISOString(),
            linkIndex: linkIndex,
            url: url,
            userAgent: userAgent,
            ip: ip
        });

        return this.saveData(this.emailTrackingFile, tracking);
    }

    trackEmailScroll(trackingId, depth) {
        const tracking = this.loadData(this.emailTrackingFile) || {};

        if (!tracking[trackingId]) {
            tracking[trackingId] = { opens: [], clicks: [], scrollDepths: [], timeSpent: 0 };
        }

        tracking[trackingId].scrollDepths.push({
            timestamp: new Date().toISOString(),
            depth: depth
        });

        return this.saveData(this.emailTrackingFile, tracking);
    }

    trackEmailTimeSpent(trackingId, timeSpent) {
        const tracking = this.loadData(this.emailTrackingFile) || {};

        if (!tracking[trackingId]) {
            tracking[trackingId] = { opens: [], clicks: [], scrollDepths: [], timeSpent: 0 };
        }

        tracking[trackingId].timeSpent = Math.max(tracking[trackingId].timeSpent || 0, timeSpent);
        tracking[trackingId].lastActivity = new Date().toISOString();

        return this.saveData(this.emailTrackingFile, tracking);
    }

    getAllEmailTracking() {
        return this.loadData(this.emailTrackingFile) || {};
    }

    // Call Disposition Methods
    getCallDispositions(limit = 100) {
        const dispositions = this.loadData(this.callDispositionsFile) || [];
        return dispositions.slice(0, limit);
    }

    addCallDisposition(callId, disposition, notes = '') {
        const dispositions = this.loadData(this.callDispositionsFile) || [];

        dispositions.unshift({
            callId: callId,
            disposition: disposition,
            notes: notes,
            timestamp: new Date().toISOString()
        });

        // Keep only last 1000 dispositions
        const trimmed = dispositions.slice(0, 1000);

        return this.saveData(this.callDispositionsFile, trimmed);
    }

    getCallDispositionByCallId(callId) {
        const dispositions = this.loadData(this.callDispositionsFile) || [];
        return dispositions.find(d => d.callId === callId);
    }

    clearCallDispositions() {
        return this.saveData(this.callDispositionsFile, []);
    }

    // DNC List Methods
    getDNCList() {
        return this.loadData(this.dncListFile) || [];
    }

    addToDNCList(phoneNumber, reason = 'Manual', source = 'Internal') {
        const dncList = this.loadData(this.dncListFile) || [];

        // Check if already exists
        const exists = dncList.find(entry => entry.phoneNumber === phoneNumber);
        if (exists) {
            return false;
        }

        dncList.push({
            phoneNumber: phoneNumber,
            reason: reason,
            source: source,
            addedAt: new Date().toISOString()
        });

        return this.saveData(this.dncListFile, dncList);
    }

    removeFromDNCList(phoneNumber) {
        const dncList = this.loadData(this.dncListFile) || [];
        const filtered = dncList.filter(entry => entry.phoneNumber !== phoneNumber);
        return this.saveData(this.dncListFile, filtered);
    }

    isOnDNCList(phoneNumber) {
        const dncList = this.loadData(this.dncListFile) || [];
        return dncList.some(entry => entry.phoneNumber === phoneNumber);
    }

    bulkAddToDNCList(phoneNumbers, reason = 'Bulk Import', source = 'Import') {
        const dncList = this.loadData(this.dncListFile) || [];
        let addedCount = 0;

        phoneNumbers.forEach(phoneNumber => {
            const exists = dncList.find(entry => entry.phoneNumber === phoneNumber);
            if (!exists) {
                dncList.push({
                    phoneNumber: phoneNumber,
                    reason: reason,
                    source: source,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        });

        this.saveData(this.dncListFile, dncList);
        return addedCount;
    }

    clearDNCList() {
        return this.saveData(this.dncListFile, []);
    }

    // User Management Methods
    getAllUsers() {
        return this.loadData(this.usersFile) || [];
    }

    getUserById(userId) {
        const users = this.getAllUsers();
        return users.find(u => u.id === userId);
    }

    getUserByUsername(username) {
        const users = this.getAllUsers();
        return users.find(u => u.username === username);
    }

    createUser(userData) {
        const users = this.getAllUsers();

        // Check if username already exists
        const exists = users.find(u => u.username === userData.username);
        if (exists) {
            return { success: false, error: 'Username already exists' };
        }

        const newUser = {
            id: Date.now(),
            username: userData.username,
            password: userData.password, // Should be hashed before calling this
            role: userData.role || 'agent',
            email: userData.email || '',
            isActive: true,
            permissions: userData.permissions || {},
            theme: 'light',
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            createdBy: userData.createdBy || 'system'
        };

        users.push(newUser);
        this.saveData(this.usersFile, users);

        return { success: true, user: newUser };
    }

    updateUser(userId, updates) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return { success: false, error: 'User not found' };
        }

        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData(this.usersFile, users);
        return { success: true, user: users[userIndex] };
    }

    deleteUser(userId) {
        const users = this.getAllUsers();
        const filtered = users.filter(u => u.id !== userId);

        if (users.length === filtered.length) {
            return { success: false, error: 'User not found' };
        }

        this.saveData(this.usersFile, filtered);
        return { success: true };
    }

    updateUserTheme(userId, theme) {
        return this.updateUser(userId, { theme });
    }

    updateLastLogin(userId) {
        return this.updateUser(userId, { lastLogin: new Date().toISOString() });
    }

    // Session Management Methods
    getAllSessions() {
        return this.loadData(this.sessionsFile) || [];
    }

    createSession(userId, token, expiresAt) {
        const sessions = this.getAllSessions();

        const newSession = {
            id: Date.now(),
            userId: userId,
            token: token,
            expiresAt: expiresAt,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        sessions.push(newSession);
        this.saveData(this.sessionsFile, sessions);

        return newSession;
    }

    getSessionByToken(token) {
        const sessions = this.getAllSessions();
        return sessions.find(s => s.token === token);
    }

    updateSessionActivity(token) {
        const sessions = this.getAllSessions();
        const sessionIndex = sessions.findIndex(s => s.token === token);

        if (sessionIndex !== -1) {
            sessions[sessionIndex].lastActivity = new Date().toISOString();
            this.saveData(this.sessionsFile, sessions);
        }
    }

    deleteSession(token) {
        const sessions = this.getAllSessions();
        const filtered = sessions.filter(s => s.token !== token);
        this.saveData(this.sessionsFile, filtered);
    }

    deleteUserSessions(userId) {
        const sessions = this.getAllSessions();
        const filtered = sessions.filter(s => s.userId !== userId);
        this.saveData(this.sessionsFile, filtered);
    }

    cleanupExpiredSessions() {
        const sessions = this.getAllSessions();
        const now = new Date().toISOString();
        const valid = sessions.filter(s => s.expiresAt > now);

        const removedCount = sessions.length - valid.length;
        if (removedCount > 0) {
            this.saveData(this.sessionsFile, valid);
        }

        return removedCount;
    }

    // Audit Log Methods
    getAuditLog(limit = 100) {
        const log = this.loadData(this.auditLogFile) || [];
        return log.slice(0, limit);
    }

    addAuditLog(userId, username, action, resource, details = {}, ipAddress = null) {
        const log = this.loadData(this.auditLogFile) || [];

        log.unshift({
            id: Date.now(),
            userId: userId,
            username: username,
            action: action,
            resource: resource,
            details: details,
            ipAddress: ipAddress,
            timestamp: new Date().toISOString()
        });

        // Keep only last 5000 audit logs
        const trimmed = log.slice(0, 5000);

        return this.saveData(this.auditLogFile, trimmed);
    }

    getAuditLogByUser(userId, limit = 50) {
        const log = this.loadData(this.auditLogFile) || [];
        const userLog = log.filter(entry => entry.userId === userId);
        return userLog.slice(0, limit);
    }

    getAuditLogByAction(action, limit = 50) {
        const log = this.loadData(this.auditLogFile) || [];
        const actionLog = log.filter(entry => entry.action === action);
        return actionLog.slice(0, limit);
    }

    clearAuditLog() {
        return this.saveData(this.auditLogFile, []);
    }

    // Credit Report Management Methods
    getAllCreditReports(limit = 100) {
        const reports = this.loadData(this.creditReportsFile) || [];
        return reports.slice(0, limit);
    }

    getCreditReport(reportId) {
        const reports = this.loadData(this.creditReportsFile) || [];
        return reports.find(r => r.id === reportId);
    }

    getClientCreditReports(clientId, limit = 10) {
        const reports = this.loadData(this.creditReportsFile) || [];
        const clientReports = reports.filter(r => r.clientId === clientId);
        return clientReports.slice(0, limit);
    }

    saveCreditReport(clientId, reportData, analysis) {
        const reports = this.loadData(this.creditReportsFile) || [];

        const newReport = {
            id: Date.now(),
            clientId: clientId,
            reportData: reportData,
            analysis: analysis,
            generatedBy: reportData.generatedBy || 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        };

        reports.unshift(newReport);

        // Keep only last 1000 reports
        const trimmed = reports.slice(0, 1000);

        this.saveData(this.creditReportsFile, trimmed);
        return { success: true, report: newReport };
    }

    updateCreditReport(reportId, updates) {
        const reports = this.loadData(this.creditReportsFile) || [];
        const reportIndex = reports.findIndex(r => r.id === reportId);

        if (reportIndex === -1) {
            return { success: false, error: 'Report not found' };
        }

        reports[reportIndex] = {
            ...reports[reportIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData(this.creditReportsFile, reports);
        return { success: true, report: reports[reportIndex] };
    }

    deleteCreditReport(reportId) {
        const reports = this.loadData(this.creditReportsFile) || [];
        const filtered = reports.filter(r => r.id !== reportId);

        if (reports.length === filtered.length) {
            return { success: false, error: 'Report not found' };
        }

        this.saveData(this.creditReportsFile, filtered);
        return { success: true };
    }

    generateReportHTML(reportId) {
        const report = this.getCreditReport(reportId);
        if (!report) {
            return { success: false, error: 'Report not found' };
        }

        try {
            const ReportGenerator = require('../utils/report-generator');
            const generator = new ReportGenerator(report.analysis);
            const html = generator.generateHTML();

            return { success: true, html: html };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Search and filter methods for credit reports
    searchCreditReports(query) {
        const reports = this.loadData(this.creditReportsFile) || [];
        const lowercaseQuery = query.toLowerCase();

        return reports.filter(r => {
            const clientName = r.reportData?.client?.name?.toLowerCase() || '';
            const clientId = r.clientId?.toString() || '';

            return clientName.includes(lowercaseQuery) ||
                   clientId.includes(lowercaseQuery);
        });
    }

    getCreditReportStats() {
        const reports = this.loadData(this.creditReportsFile) || [];

        if (reports.length === 0) {
            return {
                totalReports: 0,
                avgTotalDebt: 0,
                avgInterestRate: 0,
                avgSettlementSavings: 0,
                reportsThisMonth: 0
            };
        }

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const reportsThisMonth = reports.filter(r => {
            const reportDate = new Date(r.createdAt);
            return reportDate >= thisMonth;
        }).length;

        const totalDebt = reports.reduce((sum, r) => sum + (r.analysis?.metrics?.totalDebt || 0), 0);
        const avgTotalDebt = totalDebt / reports.length;

        const totalInterestRate = reports.reduce((sum, r) => sum + (r.analysis?.metrics?.avgInterestRate || 0), 0);
        const avgInterestRate = totalInterestRate / reports.length;

        const totalSavings = reports.reduce((sum, r) => sum + (r.analysis?.metrics?.totalSavings || 0), 0);
        const avgSettlementSavings = totalSavings / reports.length;

        return {
            totalReports: reports.length,
            avgTotalDebt: Math.round(avgTotalDebt),
            avgInterestRate: avgInterestRate.toFixed(2),
            avgSettlementSavings: Math.round(avgSettlementSavings),
            reportsThisMonth: reportsThisMonth
        };
    }

    // Lead Management Methods
    getAllLeads(limit = 1000) {
        const leads = this.loadData(this.leadsFile) || [];
        return leads.slice(0, limit);
    }

    getLead(leadId) {
        const leads = this.loadData(this.leadsFile) || [];
        return leads.find(l => l.id === leadId);
    }

    createLead(leadData) {
        const leads = this.loadData(this.leadsFile) || [];

        const newLead = {
            id: Date.now(),
            // Contact Info
            firstName: leadData.firstName || '',
            lastName: leadData.lastName || '',
            email: leadData.email || '',
            phone: leadData.phone || '',
            alternatePhone: leadData.alternatePhone || '',
            address: leadData.address || '',
            city: leadData.city || '',
            state: leadData.state || '',
            zipCode: leadData.zipCode || '',

            // Status & Assignment
            status: leadData.status || 'new',
            assignedTo: leadData.assignedTo || null,
            source: leadData.source || 'manual',

            // Debt Info
            totalDebt: leadData.totalDebt || 0,
            monthlyIncome: leadData.monthlyIncome || 0,
            debtType: leadData.debtType || 'unsecured',
            creditScore: leadData.creditScore || null,

            // Engagement & Scoring
            heatScore: 0,
            qualificationScore: 0,
            closeProbability: 0,
            lastContact: null,
            nextFollowUp: null,

            // Behavioral Tracking
            emailOpens: 0,
            emailClicks: 0,
            smsReplies: 0,
            callDuration: 0,
            lastEmailOpen: null,
            lastLinkClick: null,

            // Tags & Classification
            tags: leadData.tags || [],
            hardshipKeywords: [],
            objections: [],

            // Timestamps
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: leadData.createdBy || 'system'
        };

        leads.unshift(newLead);
        this.saveData(this.leadsFile, leads);

        return { success: true, lead: newLead };
    }

    updateLead(leadId, updates) {
        const leads = this.loadData(this.leadsFile) || [];
        const leadIndex = leads.findIndex(l => l.id === leadId);

        if (leadIndex === -1) {
            return { success: false, error: 'Lead not found' };
        }

        leads[leadIndex] = {
            ...leads[leadIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveData(this.leadsFile, leads);
        return { success: true, lead: leads[leadIndex] };
    }

    deleteLead(leadId) {
        const leads = this.loadData(this.leadsFile) || [];
        const filtered = leads.filter(l => l.id !== leadId);

        if (leads.length === filtered.length) {
            return { success: false, error: 'Lead not found' };
        }

        this.saveData(this.leadsFile, filtered);
        return { success: true };
    }

    // Lead Activity Tracking
    addLeadActivity(leadId, activityData) {
        const activities = this.loadData(this.leadActivitiesFile) || [];

        const newActivity = {
            id: Date.now(),
            leadId: leadId,
            type: activityData.type, // email_sent, sms_sent, call_made, email_opened, link_clicked, etc.
            description: activityData.description || '',
            metadata: activityData.metadata || {},
            userId: activityData.userId || null,
            username: activityData.username || 'system',
            timestamp: new Date().toISOString()
        };

        activities.unshift(newActivity);

        // Keep only last 10,000 activities
        const trimmed = activities.slice(0, 10000);

        this.saveData(this.leadActivitiesFile, trimmed);
        return { success: true, activity: newActivity };
    }

    getLeadActivities(leadId, limit = 100) {
        const activities = this.loadData(this.leadActivitiesFile) || [];
        const leadActivities = activities.filter(a => a.leadId === leadId);
        return leadActivities.slice(0, limit);
    }

    // Lead Notes
    addLeadNote(leadId, noteData) {
        const notes = this.loadData(this.leadNotesFile) || [];

        const newNote = {
            id: Date.now(),
            leadId: leadId,
            note: noteData.note || '',
            userId: noteData.userId || null,
            username: noteData.username || 'system',
            createdAt: new Date().toISOString()
        };

        notes.unshift(newNote);
        this.saveData(this.leadNotesFile, notes);

        return { success: true, note: newNote };
    }

    getLeadNotes(leadId, limit = 100) {
        const notes = this.loadData(this.leadNotesFile) || [];
        const leadNotes = notes.filter(n => n.leadId === leadId);
        return leadNotes.slice(0, limit);
    }

    // Lead Search & Filter
    searchLeads(query) {
        const leads = this.loadData(this.leadsFile) || [];
        const lowercaseQuery = query.toLowerCase();

        return leads.filter(l => {
            const firstName = l.firstName?.toLowerCase() || '';
            const lastName = l.lastName?.toLowerCase() || '';
            const email = l.email?.toLowerCase() || '';
            const phone = l.phone || '';

            return firstName.includes(lowercaseQuery) ||
                   lastName.includes(lowercaseQuery) ||
                   email.includes(lowercaseQuery) ||
                   phone.includes(lowercaseQuery);
        });
    }

    filterLeadsByStatus(status) {
        const leads = this.loadData(this.leadsFile) || [];
        return leads.filter(l => l.status === status);
    }

    filterLeadsByAssignedUser(userId) {
        const leads = this.loadData(this.leadsFile) || [];
        return leads.filter(l => l.assignedTo === userId);
    }

    // Lead Statistics
    getLeadStats() {
        const leads = this.loadData(this.leadsFile) || [];

        if (leads.length === 0) {
            return {
                totalLeads: 0,
                newLeads: 0,
                contacted: 0,
                qualified: 0,
                enrolled: 0,
                avgDebt: 0,
                avgHeatScore: 0
            };
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const newLeadsToday = leads.filter(l => {
            const createdDate = new Date(l.createdAt);
            return createdDate >= today;
        }).length;

        const statusCounts = leads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});

        const totalDebt = leads.reduce((sum, l) => sum + (l.totalDebt || 0), 0);
        const avgDebt = totalDebt / leads.length;

        const totalHeatScore = leads.reduce((sum, l) => sum + (l.heatScore || 0), 0);
        const avgHeatScore = totalHeatScore / leads.length;

        return {
            totalLeads: leads.length,
            newLeadsToday: newLeadsToday,
            newLeads: statusCounts['new'] || 0,
            contacted: statusCounts['contacted'] || 0,
            qualified: statusCounts['qualified'] || 0,
            enrolled: statusCounts['enrolled'] || 0,
            avgDebt: Math.round(avgDebt),
            avgHeatScore: avgHeatScore.toFixed(1)
        };
    }

    // Update heat score based on engagement
    updateLeadHeatScore(leadId) {
        const lead = this.getLead(leadId);
        if (!lead) return { success: false, error: 'Lead not found' };

        // Calculate heat score based on engagement
        let score = 0;

        // Email engagement (max 30 points)
        score += Math.min(lead.emailOpens * 2, 30);

        // Link clicks (max 20 points)
        score += Math.min(lead.emailClicks * 5, 20);

        // SMS replies (max 25 points)
        score += Math.min(lead.smsReplies * 5, 25);

        // Call duration (max 25 points)
        const callMinutes = (lead.callDuration || 0) / 60;
        score += Math.min(callMinutes * 2, 25);

        // Recency bonus (max 20 points)
        if (lead.lastContact) {
            const hoursSinceContact = (Date.now() - new Date(lead.lastContact).getTime()) / (1000 * 60 * 60);
            if (hoursSinceContact < 24) score += 20;
            else if (hoursSinceContact < 72) score += 10;
            else if (hoursSinceContact < 168) score += 5;
        }

        // Cap at 100
        const heatScore = Math.min(Math.round(score), 100);

        return this.updateLead(leadId, { heatScore });
    }

    // Update qualification score and close probability
    updateLeadScoring(leadId) {
        const lead = this.getLead(leadId);
        if (!lead) return { success: false, error: 'Lead not found' };

        const LeadScoring = require('../utils/lead-scoring');
        const scorer = new LeadScoring(lead);
        const analysis = scorer.analyze();

        return this.updateLead(leadId, {
            qualificationScore: analysis.qualification.totalScore,
            closeProbability: analysis.closeProbability.probability,
            pitchAngle: analysis.pitchAngle.primaryAngle,
            estimatedMonthlyPayment: analysis.estimatedMonthlyPayment
        });
    }

    // Get priority leads (sorted by close probability)
    getPriorityLeads(limit = 20) {
        const leads = this.loadData(this.leadsFile) || [];

        // Filter active leads only
        const activeLeads = leads.filter(l =>
            l.status !== 'dead' &&
            l.status !== 'enrolled' &&
            l.status !== 'archived'
        );

        // Sort by close probability (descending)
        const sorted = activeLeads.sort((a, b) => {
            const probA = a.closeProbability || 0;
            const probB = b.closeProbability || 0;

            // If same probability, sort by heat score
            if (probA === probB) {
                return (b.heatScore || 0) - (a.heatScore || 0);
            }

            return probB - probA;
        });

        return sorted.slice(0, limit);
    }
}

module.exports = Database;
