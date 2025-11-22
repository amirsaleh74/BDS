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
}

module.exports = Database;
