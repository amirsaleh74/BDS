const { chromium } = require('playwright');

class LogixxScraper {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.browser = null;
    this.page = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await context.newPage();
  }

  async login() {
    console.log('Logging into Logixx...');
    await this.page.goto('https://bds.logixx.io/pipeline', { waitUntil: 'networkidle' });
    
    // Wait for login form
    await this.page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
    
    // Fill login
    await this.page.fill('input[type="email"], input[name="email"]', this.email);
    await this.page.fill('input[type="password"], input[name="password"]', this.password);
    
    // Click login button
    await this.page.click('button[type="submit"]');
    
    // Wait for pipeline to load
    await this.page.waitForURL('**/pipeline', { timeout: 30000 });
    await this.page.waitForSelector('table tbody tr', { timeout: 30000 });
    
    console.log('✅ Logged in successfully');
  }

  async scrapePipeline(numPages = 1, onProgress) {
    if (!this.browser) await this.init();
    await this.login();
    
    const allData = [];
    
    // Set pagination to 50 items per page
    onProgress?.('Setting pagination to 50 items...');
    await this.page.click('.el-pagination__sizes .el-select__wrapper');
    await this.page.waitForTimeout(500);
    await this.page.click('text=50/page');
    await this.page.waitForTimeout(1000);
    
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
    
    await this.close();
    return allData;
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
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

module.exports = LogixxScraper;
