const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Import modules
const LogixxScraper = require('./scraper/logixx-scraper');
const Database = require('./database/db');
const csvExporter = require('./utils/csv-exporter');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database
const db = new Database();

// Initialize scraper
let scraper = null;
let sharkTankJob = null;
let watchlistJob = null;

// Route: Dashboard Home
app.get('/', (req, res) => {
    const stats = db.getStats();
    const settings = db.getSettings();
    const recentActivity = db.getRecentActivity(20);
    
    res.render('dashboard', {
        stats,
        settings,
        recentActivity,
        sharkTankActive: sharkTankJob !== null,
        watchlistActive: watchlistJob !== null
    });
});

// Route: Settings Page
app.get('/settings', (req, res) => {
    const settings = db.getSettings();
    res.render('settings', { settings });
});

// Route: Update Settings
app.post('/api/settings', async (req, res) => {
    try {
        const {
            logixxUsername,
            logixxPassword,
            sharkTankInterval,
            watchlistInterval,
            protectionNote,
            sharkTankEnabled,
            watchlistEnabled
        } = req.body;

        // Update settings
        db.updateSettings({
            logixxUsername,
            logixxPassword,
            sharkTankInterval: parseInt(sharkTankInterval),
            watchlistInterval: parseInt(watchlistInterval),
            protectionNote,
            sharkTankEnabled: sharkTankEnabled === 'true',
            watchlistEnabled: watchlistEnabled === 'true'
        });

        // Restart monitors with new intervals
        await restartMonitors();

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Manual Scrape
app.post('/api/scrape', async (req, res) => {
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
app.post('/api/export-csv', async (req, res) => {
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
app.post('/api/bulk-assign', async (req, res) => {
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
app.post('/api/watchlist/add', (req, res) => {
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
app.post('/api/watchlist/remove/:id', (req, res) => {
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
app.get('/api/watchlist', (req, res) => {
    try {
        const watchlist = db.getWatchlist();
        res.json({ success: true, watchlist });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Get Activity Log
app.get('/api/activity', (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const activity = db.getRecentActivity(parseInt(limit));
        res.json({ success: true, activity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Toggle Monitors
app.post('/api/monitor/toggle/:type', async (req, res) => {
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

        // Start monitors
        await restartMonitors();
        
        console.log('System initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 LOGIXX Dashboard running on http://localhost:${PORT}`);
    initialize();
});
