const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const LogixxScraper = require('./scraper/logixx-scraper');

const app = express();

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logging functions
let currentLogFile = null;
let logBuffer = [];

function startNewLog() {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  currentLogFile = path.join(logsDir, `scraper-${timestamp}.log`);
  logBuffer = [];
  log('=== NEW SCRAPING SESSION STARTED ===');
  log(`Time: ${new Date().toISOString()}`);
}

function log(message) {
  const timestamped = `[${new Date().toISOString()}] ${message}`;
  console.log(message); // Still log to console
  logBuffer.push(timestamped);
  
  if (currentLogFile) {
    fs.appendFileSync(currentLogFile, timestamped + '\n');
  }
}

// Override console.log for scraper
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const message = args.join(' ');
  log(message);
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const message = 'ERROR: ' + args.join(' ');
  log(message);
  originalConsoleError.apply(console, args);
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-to-random-string-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Config
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';
const LOGIXX_EMAIL = process.env.LOGIXX_EMAIL || 'aasgari@betterdebtsolutions.com';
const LOGIXX_PASSWORD = process.env.LOGIXX_PASSWORD || 'Negin1995#';

// Global state
global.dashboardStats = {
  totalFiles: 0,
  filesAssigned: 0,
  watchlistCount: 0,
  totalActivity: 0,
  currentStatus: 'Idle',
  lastScrapedData: []
};

let sseClients = [];

function broadcastUpdate() {
  const data = JSON.stringify(global.dashboardStats);
  sseClients.forEach(client => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch (e) {}
  });
}

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/login', (req, res) => {
  if (req.body.password === DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/live-updates', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  res.write(`data: ${JSON.stringify(global.dashboardStats)}\n\n`);
  sseClients.push(res);
  
  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// SCRAPER ENDPOINTS

app.get('/api/logs/latest', requireAuth, (req, res) => {
  if (!currentLogFile || !fs.existsSync(currentLogFile)) {
    return res.status(404).json({ error: 'No logs available yet' });
  }
  
  const logContent = fs.readFileSync(currentLogFile, 'utf8');
  res.json({ 
    success: true, 
    logs: logContent,
    buffer: logBuffer.join('\n')
  });
});

app.get('/api/logs/download', requireAuth, (req, res) => {
  if (!currentLogFile || !fs.existsSync(currentLogFile)) {
    return res.status(404).json({ error: 'No logs available yet' });
  }
  
  res.download(currentLogFile, `logixx-scraper-${Date.now()}.log`);
});

app.get('/api/settings/credentials', requireAuth, (req, res) => {
  res.json({
    email: LOGIXX_EMAIL,
    password: '***hidden***' // Never send actual password
  });
});

app.post('/api/settings/credentials', requireAuth, (req, res) => {
  const { email, password } = req.body;
  
  if (email) {
    process.env.LOGIXX_EMAIL = email;
    log(`Credentials updated - Email: ${email}`);
  }
  
  if (password) {
    process.env.LOGIXX_PASSWORD = password;
    log('Credentials updated - Password changed');
  }
  
  res.json({ 
    success: true, 
    message: 'Credentials updated. Next scrape will use new credentials.' 
  });
});

app.post('/api/scraper/scrape', requireAuth, async (req, res) => {
  const { pages = 1 } = req.body;
  
  startNewLog(); // Start new log file for this session
  
  try {
    log(`Starting scraper for ${pages} page(s)...`);
    log(`Using email: ${process.env.LOGIXX_EMAIL || LOGIXX_EMAIL}`);
    
    global.dashboardStats.currentStatus = `Starting scraper (${pages} pages)...`;
    broadcastUpdate();
    
    const scraper = new LogixxScraper(
      process.env.LOGIXX_EMAIL || LOGIXX_EMAIL, 
      process.env.LOGIXX_PASSWORD || LOGIXX_PASSWORD
    );
    
    const results = await scraper.scrapePipeline(pages, (status, data) => {
      global.dashboardStats.currentStatus = status;
      if (data) global.dashboardStats.totalFiles = data.length;
      broadcastUpdate();
    });
    
    global.dashboardStats.lastScrapedData = results;
    global.dashboardStats.totalFiles = results.length;
    global.dashboardStats.currentStatus = `✅ Scraped ${results.length} leads`;
    global.dashboardStats.totalActivity++;
    broadcastUpdate();
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    console.error('Scrape error:', error);
    global.dashboardStats.currentStatus = `❌ ${error.message}`;
    broadcastUpdate();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scraper/assign-leads', requireAuth, async (req, res) => {
  const { appIds } = req.body;
  
  if (!appIds || !Array.isArray(appIds)) {
    return res.status(400).json({ error: 'appIds array required' });
  }
  
  try {
    global.dashboardStats.currentStatus = `Assigning ${appIds.length} leads...`;
    broadcastUpdate();
    
    const scraper = new LogixxScraper(LOGIXX_EMAIL, LOGIXX_PASSWORD);
    const results = await scraper.assignLeads(appIds, (status) => {
      global.dashboardStats.currentStatus = status;
      broadcastUpdate();
    });
    
    global.dashboardStats.filesAssigned += results.successCount;
    global.dashboardStats.currentStatus = `✅ Assigned ${results.successCount}/${appIds.length}`;
    global.dashboardStats.totalActivity++;
    broadcastUpdate();
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Assign error:', error);
    global.dashboardStats.currentStatus = `❌ ${error.message}`;
    broadcastUpdate();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scraper/schedule-callback', requireAuth, async (req, res) => {
  const { appId, title, description, eventTime, duration } = req.body;
  
  if (!appId || !title || !eventTime) {
    return res.status(400).json({ error: 'appId, title, eventTime required' });
  }
  
  try {
    global.dashboardStats.currentStatus = `Scheduling callback ${appId}...`;
    broadcastUpdate();
    
    const scraper = new LogixxScraper(LOGIXX_EMAIL, LOGIXX_PASSWORD);
    await scraper.scheduleCallback({
      appId,
      calendar: 'Shark Tank Follow Up',
      title,
      description: description || 'Auto',
      eventTime: new Date(eventTime),
      duration: duration || '5 Minutes'
    });
    
    global.dashboardStats.currentStatus = `✅ Callback scheduled ${appId}`;
    global.dashboardStats.totalActivity++;
    broadcastUpdate();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    global.dashboardStats.currentStatus = `❌ ${error.message}`;
    broadcastUpdate();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scraper/add-note', requireAuth, async (req, res) => {
  const { appId, note } = req.body;
  
  if (!appId || !note) {
    return res.status(400).json({ error: 'appId and note required' });
  }
  
  try {
    global.dashboardStats.currentStatus = `Adding note to ${appId}...`;
    broadcastUpdate();
    
    const scraper = new LogixxScraper(LOGIXX_EMAIL, LOGIXX_PASSWORD);
    await scraper.addNote(appId, note);
    
    global.dashboardStats.currentStatus = `✅ Note added to ${appId}`;
    global.dashboardStats.totalActivity++;
    broadcastUpdate();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Note error:', error);
    global.dashboardStats.currentStatus = `❌ ${error.message}`;
    broadcastUpdate();
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/export-csv', requireAuth, (req, res) => {
  try {
    const data = global.dashboardStats.lastScrapedData;
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data. Run scraper first!' });
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=logixx-${Date.now()}.csv`);
    res.send(`${headers}\n${rows}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scraper/data', requireAuth, (req, res) => {
  res.json({ 
    success: true,
    data: global.dashboardStats.lastScrapedData
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LOGIXX Dashboard on port ${PORT}`);
  console.log(`🔐 Password: ${DASHBOARD_PASSWORD}`);
});
