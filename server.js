const express = require('express');
const session = require('express-session');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Supabase setup
let supabase = null;
let dbEnabled = false;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  dbEnabled = true;
  console.log('✅ Supabase database connected');
} else {
  console.log('⚠️ No database configured - set SUPABASE_URL and SUPABASE_KEY');
  console.log('   Data will be stored in memory only');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Config
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

// Global state
global.dashboardStats = {
  totalFiles: 0,
  filesAssigned: 0,
  totalActivity: 0,
  currentStatus: 'Idle',
  lastScrapedData: [],
  logixxCookies: null,
  sessionValid: false
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

// Save cookies from manual login
app.post('/api/logixx/save-cookies', requireAuth, (req, res) => {
  const { cookies } = req.body;
  
  if (!cookies || !Array.isArray(cookies)) {
    return res.status(400).json({ error: 'Invalid cookies' });
  }
  
  global.dashboardStats.logixxCookies = cookies;
  global.dashboardStats.sessionValid = true;
  console.log('✅ Saved', cookies.length, 'cookies');
  
  broadcastUpdate();
  res.json({ success: true, count: cookies.length });
});

// Check session status
app.get('/api/logixx/status', requireAuth, (req, res) => {
  res.json({
    hasSession: !!global.dashboardStats.logixxCookies,
    cookieCount: global.dashboardStats.logixxCookies?.length || 0,
    sessionValid: global.dashboardStats.sessionValid
  });
});

// Scrape with cookies
app.post('/api/scraper/scrape', requireAuth, async (req, res) => {
  const { pages = 1 } = req.body;
  
  if (!global.dashboardStats.logixxCookies) {
    return res.status(400).json({ 
      error: 'Please login to Logixx first!' 
    });
  }
  
  try {
    global.dashboardStats.currentStatus = `Starting scraper...`;
    broadcastUpdate();
    
    const { chromium } = require('playwright');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext();
    await context.addCookies(global.dashboardStats.logixxCookies);
    
    const page = await context.newPage();
    await page.goto('https://bds.logixx.io/pipeline', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if logged in
    if (page.url().includes('/auth/sign-in')) {
      await browser.close();
      global.dashboardStats.logixxCookies = null;
      global.dashboardStats.sessionValid = false;
      broadcastUpdate();
      return res.status(401).json({ 
        error: 'Session expired - please login again' 
      });
    }
    
    const allData = [];
    
    for (let pageNum = 1; pageNum <= pages; pageNum++) {
      global.dashboardStats.currentStatus = `Scraping page ${pageNum}/${pages}...`;
      broadcastUpdate();
      
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
      const rows = await page.$$('table tbody tr');
      
      console.log(`Page ${pageNum}: ${rows.length} rows`);
      
      for (const row of rows) {
        const cells = await row.$$('td');
        if (cells.length < 6) continue;
        
        const data = {
          appId: await cells[2]?.$eval('a', el => el.textContent.trim()).catch(() => ''),
          appDate: await cells[3]?.textContent().then(t => t.trim()).catch(() => ''),
          firstName: await cells[4]?.textContent().then(t => t.trim()).catch(() => ''),
          lastName: await cells[5]?.textContent().then(t => t.trim()).catch(() => ''),
          phone: await cells[6]?.textContent().then(t => t.trim()).catch(() => '')
        };
        
        if (data.appId) allData.push(data);
      }
      
      if (pageNum < pages) {
        const nextBtn = await page.$('button.btn-next:not([disabled])');
        if (nextBtn) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
        } else break;
      }
    }
    
    await browser.close();
    
    // Save to database if available
    if (dbEnabled && supabase) {
      console.log('💾 Saving to database...');
      try {
        const { data: insertedData, error } = await supabase
          .from('scraped_leads')
          .insert(allData.map(lead => ({
            app_id: lead.appId,
            app_date: lead.appDate,
            first_name: lead.firstName,
            last_name: lead.lastName,
            phone: lead.phone,
            scraped_at: new Date().toISOString()
          })));
        
        if (error) {
          console.error('❌ Database save error:', error.message);
        } else {
          console.log('✅ Saved', allData.length, 'leads to database');
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
      }
    }
    
    global.dashboardStats.lastScrapedData = allData;
    global.dashboardStats.totalFiles = allData.length;
    global.dashboardStats.currentStatus = `✅ Scraped ${allData.length} leads`;
    global.dashboardStats.totalActivity++;
    broadcastUpdate();
    
    res.json({ success: true, data: allData, count: allData.length });
  } catch (error) {
    console.error('Error:', error);
    global.dashboardStats.currentStatus = `❌ ${error.message}`;
    broadcastUpdate();
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scraper/data', requireAuth, async (req, res) => {
  // Try database first
  if (dbEnabled && supabase) {
    try {
      const { data, error } = await supabase
        .from('scraped_leads')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(1000);
      
      if (!error && data && data.length > 0) {
        return res.json({ 
          success: true,
          data: data.map(row => ({
            appId: row.app_id,
            appDate: row.app_date,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            scrapedAt: row.scraped_at
          })),
          source: 'database',
          count: data.length
        });
      }
    } catch (error) {
      console.error('Database query error:', error);
    }
  }
  
  // Fallback to memory
  res.json({ 
    success: true,
    data: global.dashboardStats.lastScrapedData,
    source: 'memory',
    count: global.dashboardStats.lastScrapedData.length
  });
});

app.post('/api/export-csv', requireAuth, async (req, res) => {
  let data = [];
  let source = 'memory';
  
  // Try database first
  if (dbEnabled && supabase) {
    try {
      const { data: dbData, error } = await supabase
        .from('scraped_leads')
        .select('*')
        .order('scraped_at', { ascending: false });
      
      if (!error && dbData && dbData.length > 0) {
        data = dbData.map(row => ({
          appId: row.app_id,
          appDate: row.app_date,
          firstName: row.first_name,
          lastName: row.last_name,
          phone: row.phone,
          scrapedAt: row.scraped_at
        }));
        source = 'database';
      }
    } catch (error) {
      console.error('Database export error:', error);
    }
  }
  
  // Fallback to memory
  if (data.length === 0) {
    data = global.dashboardStats.lastScrapedData;
  }
  
  if (!data || data.length === 0) {
    return res.status(400).json({ error: 'No data' });
  }
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=logixx-${source}-${Date.now()}.csv`);
  res.send(`${headers}\n${rows}`);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: dbEnabled ? 'connected' : 'not configured',
    hasCookies: !!global.dashboardStats.logixxCookies
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
  console.log(`🔐 Password: ${DASHBOARD_PASSWORD}`);
  console.log(`💾 Database: ${dbEnabled ? 'Supabase ✅' : 'Memory Only ⚠️'}`);
});
