const { chromium } = require('playwright');

class LogixxScraper {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Initializing Playwright browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    console.log('✅ Browser launched');
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    console.log('✅ Browser context created');
    
    this.page = await context.newPage();
    console.log('✅ New page created');
    
    // Add stealth scripts
    await this.page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Override chrome property
      window.chrome = {
        runtime: {}
      };
      
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });
    console.log('✅ Stealth scripts added');
  }

  async login() {
    console.log('🔐 Attempting login to Logixx...');
    console.log('📧 Email:', this.email);
    console.log('🔗 URL: https://bds.logixx.io/pipeline');
    
    await this.page.goto('https://bds.logixx.io/pipeline', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Check if already logged in
    const currentUrl = this.page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/pipeline') && !currentUrl.includes('/login')) {
      console.log('✅ Already logged in!');
      const hasTable = await this.page.$('table tbody tr');
      if (hasTable) {
        console.log('✅ Pipeline table found - login successful!');
        return;
      }
    }
    
    console.log('🔍 Looking for login form...');
    // Wait for login form
    try {
      await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
      console.log('✅ Login form found');
    } catch (error) {
      console.error('❌ Login form not found! Current page:');
      console.error('URL:', this.page.url());
      const bodyText = await this.page.$eval('body', el => el.innerText).catch(() => 'Could not get body text');
      console.error('Page content:', bodyText.substring(0, 500));
      throw new Error('Login form not found - check if Logixx website structure changed');
    }
    
    console.log('📝 Filling email...');
    await this.page.fill('input[type="email"], input[name="email"]', this.email);
    console.log('📝 Filling password...');
    await this.page.fill('input[type="password"], input[name="password"]', this.password);
    
    console.log('🖱️ Clicking login button...');
    await this.page.click('button[type="submit"]');
    
    console.log('⏳ Waiting for navigation...');
    // Wait for pipeline to load
    try {
      await this.page.waitForURL('**/pipeline', { timeout: 30000 });
      console.log('✅ Navigated to pipeline');
    } catch (error) {
      console.error('❌ Failed to navigate to pipeline');
      console.error('Current URL:', this.page.url());
      throw new Error('Login failed - did not reach pipeline page');
    }
    
    console.log('⏳ Waiting for table...');
    try {
      await this.page.waitForSelector('table tbody tr', { timeout: 30000 });
      console.log('✅ Logged in successfully - table found!');
    } catch (error) {
      console.error('❌ Table not found after login');
      const errorMsg = await this.page.$eval('.error, .alert', el => el.innerText).catch(() => 'No error message found');
      console.error('Error on page:', errorMsg);
      throw new Error('Login failed - credentials may be incorrect');
    }
  }

  async scrapePipeline(numPages = 1, onProgress) {
    try {
      console.log(`📊 Starting scrape for ${numPages} page(s)...`);
      
      if (!this.browser) {
        await this.init();
      }
      
      await this.login();
      
      const allData = [];
      
      // Set pagination to 50 items per page
      onProgress?.('Setting pagination to 50 items...');
      console.log('⚙️ Setting pagination to 50 items per page...');
      
      try {
        await this.page.click('.el-pagination__sizes .el-select__wrapper');
        await this.page.waitForTimeout(500);
        await this.page.click('text=50/page');
        await this.page.waitForTimeout(1000);
        console.log('✅ Pagination set to 50');
      } catch (error) {
        console.warn('⚠️ Could not set pagination, continuing anyway:', error.message);
      }
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(`Scraping page ${pageNum}/${numPages}...`, allData);
      
      // Wait for table to load
      await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
      
      // Get all rows
      const rows = await this.page.$$('table tbody tr');
      console.log(`Found ${rows.length} rows on page ${pageNum}`);
      
      for (let i = 0; i < rows.length; i++) {
        try {
          const rowData = await this.extractRowData(rows[i], i);
          if (rowData) {
            allData.push(rowData);
            onProgress?.(`Scraped ${allData.length} leads...`, allData);
          }
        } catch (error) {
          console.error(`Error scraping row ${i}:`, error.message);
        }
      }
      
      // Go to next page if not last
      if (pageNum < numPages) {
        try {
          const nextButton = await this.page.$('button.btn-next:not([disabled])');
          if (nextButton) {
            await nextButton.click();
            await this.page.waitForTimeout(2000);
          } else {
            console.log('No more pages available');
            break;
          }
        } catch (error) {
          console.log('Could not navigate to next page:', error.message);
          break;
        }
      }
    }
    
    console.log(`✅ Scraping complete! Collected ${allData.length} leads`);
    await this.close();
    return allData;
  } catch (error) {
    console.error('❌ SCRAPING ERROR:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    await this.close();
    throw error;
  }
}

  async extractRowData(row, index) {
    try {
      // Get all cell data
      const cells = await row.$$('td');
      
      const data = {
        rowIndex: index,
        appId: '',
        appDate: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        status: '',
        amount: '',
        source: ''
      };
      
      // Extract text from each cell
      for (let i = 0; i < Math.min(cells.length, 15); i++) {
        const text = await cells[i].textContent();
        const cleanText = text.trim();
        
        // Map to appropriate field based on column position
        switch(i) {
          case 1: // Actions column - skip
            break;
          case 2: // App ID
            const appLink = await cells[i].$('a');
            if (appLink) {
              data.appId = await appLink.textContent();
            }
            break;
          case 3: // App Date
            data.appDate = cleanText;
            break;
          case 4: // First Name
            data.firstName = cleanText;
            break;
          case 5: // Last Name
            data.lastName = cleanText;
            break;
          default:
            // Capture other columns
            if (cleanText && cleanText.length > 0) {
              data[`column_${i}`] = cleanText;
            }
        }
      }
      
      // Try to get email by clicking the email icon
      try {
        const emailIcon = await row.$('button:has(svg)');
        if (emailIcon) {
          await emailIcon.click();
          await this.page.waitForTimeout(1000);
          
          // Look for email in modal/popup
          const emailText = await this.page.$eval(
            'span:has-text("@"), .email, [type="email"]', 
            el => el.textContent || el.value
          ).catch(() => '');
          
          if (emailText && emailText.includes('@')) {
            data.email = emailText.trim();
          }
          
          // Close modal
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
        }
      } catch (e) {
        console.log('Could not extract email for row', index);
      }
      
      return data;
    } catch (error) {
      console.error('Error extracting row data:', error.message);
      return null;
    }
  }

  async assignLeads(appIds, onProgress) {
    if (!this.browser) await this.init();
    await this.login();
    
    const results = {
      successCount: 0,
      failedCount: 0,
      details: []
    };
    
    for (let i = 0; i < appIds.length; i++) {
      const appId = appIds[i];
      onProgress?.(`Assigning lead ${i + 1}/${appIds.length}: ${appId}...`);
      
      try {
        // Find the row with this App ID
        await this.page.waitForTimeout(1000);
        const row = await this.page.$(`tr:has(a:text("${appId}"))`);
        
        if (!row) {
          results.failedCount++;
          results.details.push({ appId, success: false, error: 'Row not found' });
          continue;
        }
        
        // Click action button (lightning icon)
        const actionButton = await row.$('button:has(svg)');
        await actionButton.click();
        await this.page.waitForTimeout(1000);
        
        // Click "Assign Lead to Me"
        await this.page.click('text=Assign Lead to Me, text=Lead to Me');
        await this.page.waitForTimeout(1500);
        
        results.successCount++;
        results.details.push({ appId, success: true });
        
      } catch (error) {
        console.error(`Failed to assign ${appId}:`, error.message);
        results.failedCount++;
        results.details.push({ appId, success: false, error: error.message });
      }
    }
    
    await this.close();
    return results;
  }

  async scheduleCallback(options) {
    const { appId, calendar, title, description, eventTime, duration } = options;
    
    if (!this.browser) await this.init();
    await this.login();
    
    // Find row
    const row = await this.page.$(`tr:has(a:text("${appId}"))`);
    if (!row) throw new Error(`App ID ${appId} not found`);
    
    // Click action button
    const actionButton = await row.$('button:has(svg)');
    await actionButton.click();
    await this.page.waitForTimeout(1000);
    
    // Click "Scheduled Call Back"
    await this.page.click('text=Scheduled Call Back, text=Schedule Call');
    await this.page.waitForTimeout(1500);
    
    // Fill form
    // Select calendar
    await this.page.click('[placeholder*="Calendar"], text=Select');
    await this.page.waitForTimeout(500);
    await this.page.click(`text=${calendar}`);
    
    // Fill title
    await this.page.fill('input[id*="Title"], [placeholder*="Title"]', title);
    
    // Fill description
    if (description) {
      await this.page.fill('input[id*="Description"], [placeholder*="Description"]', description);
    }
    
    // Select date/time
    await this.page.click('input[data-test="dp-input"]');
    await this.page.waitForTimeout(500);
    
    // Format and select date
    const day = eventTime.getDate();
    await this.page.click(`text=${day}`);
    await this.page.click('[data-test="select-button"]');
    await this.page.waitForTimeout(500);
    
    // Select duration
    await this.page.click('.el-select__wrapper:has-text("Duration")');
    await this.page.waitForTimeout(500);
    await this.page.click(`text=${duration}`);
    
    // Submit
    await this.page.click('button:has-text("Apply Action")');
    await this.page.waitForTimeout(2000);
    
    await this.close();
  }

  async addNote(appId, note) {
    if (!this.browser) await this.init();
    await this.login();
    
    // Find and click on the App ID to open details
    await this.page.click(`a:text("${appId}")`);
    await this.page.waitForTimeout(2000);
    
    // Find notes/comments section and add note
    await this.page.fill('textarea, [placeholder*="note"], [placeholder*="comment"]', note);
    await this.page.click('button:has-text("Add"), button:has-text("Save"), button:has-text("Submit")');
    await this.page.waitForTimeout(1500);
    
    await this.close();
  }

  async close() {
    if (this.browser) {
      console.log('🔒 Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('✅ Browser closed');
    }
  }
}

module.exports = LogixxScraper;
