const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.settingsFile = path.join(this.dataDir, 'settings.json');
        this.filesFile = path.join(this.dataDir, 'files.json');
        this.activityFile = path.join(this.dataDir, 'activity.json');
        this.watchlistFile = path.join(this.dataDir, 'watchlist.json');
        
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

    // Statistics Methods
    getStats() {
        const files = this.getAllFiles();
        const activity = this.getRecentActivity(1000);
        const watchlist = this.getWatchlist();

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

        return {
            totalFiles: files.length,
            filesAssignedToday: successToday,
            watchlistCount: watchlist.length,
            totalActivity: activity.length,
            lastActivity: activity.length > 0 ? activity[0] : null
        };
    }
}

module.exports = Database;
