const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class LogixxScraper {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.browser = null;
        this.context = null;
        this.page = null;
        this.baseUrl = 'https://bds.logixx.io';
        this.cookiesPath = path.join(__dirname, '../data/cookies.json');
    }

    async initialize() {
        if (this.browser) {
            return; // Already initialized
        }

        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Load saved cookies if they exist
        let cookies = [];
        if (fs.existsSync(this.cookiesPath)) {
            try {
                cookies = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf8'));
            } catch (error) {
                console.error('Error loading cookies:', error);
            }
        }

        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            viewport: { width: 1920, height: 1080 }
        });

        if (cookies.length > 0) {
            await this.context.addCookies(cookies);
        }

        this.page = await this.context.newPage();
    }

    async saveCookies() {
        try {
            const cookies = await this.context.cookies();
            fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
        } catch (error) {
            console.error('Error saving cookies:', error);
        }
    }

    async login() {
        await this.initialize();

        try {
            // Navigate to login page
            await this.page.goto(`${this.baseUrl}/login`, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Check if already logged in
            const currentUrl = this.page.url();
            if (currentUrl.includes('/pipeline') || currentUrl.includes('/dashboard')) {
                console.log('Already logged in');
                return true;
            }

            // Fill login form
            await this.page.fill('input[type="email"], input[name="email"], input[name="username"]', this.username);
            await this.page.fill('input[type="password"], input[name="password"]', this.password);

            // Submit form
            await this.page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
            
            // Wait for navigation
            await this.page.waitForURL(/\/pipeline|\/dashboard/, { timeout: 30000 });

            // Save cookies for future sessions
            await this.saveCookies();

            console.log('Login successful');
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error('Failed to login to LOGIXX');
        }
    }

    async ensureLoggedIn() {
        if (!this.page) {
            await this.login();
            return;
        }

        try {
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/pipeline') && !currentUrl.includes('/dashboard')) {
                await this.login();
            }
        } catch (error) {
            await this.login();
        }
    }

    parseIdentifier(identifier) {
        // Remove common formatting
        const clean = identifier.replace(/[\s\-()]/g, '');
        
        // Check if it's an App ID (starts with # or contains "app")
        if (identifier.startsWith('#') || identifier.toLowerCase().includes('app')) {
            return { type: 'appId', value: clean.replace('#', '').replace(/app/gi, '') };
        }
        
        // Check if it's an ALV number
        if (identifier.toLowerCase().includes('alv') || /^[A-Z]{2,3}\d+$/.test(clean)) {
            return { type: 'alv', value: clean.replace(/alv/gi, '') };
        }
        
        // Assume it's a phone number
        return { type: 'phone', value: clean };
    }

    async scrapePages(numPages = 1) {
        await this.ensureLoggedIn();

        try {
            await this.page.goto(`${this.baseUrl}/pipeline`, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            const allFiles = [];

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                console.log(`Scraping page ${pageNum}...`);

                // Wait for table to load
                await this.page.waitForSelector('table, .file-list, .pipeline-table', { timeout: 10000 });
                
                // Extract file data from current page
                const pageFiles = await this.page.evaluate(() => {
                    const files = [];
                    const rows = document.querySelectorAll('tr[data-file], tbody tr, .file-row');
                    
                    rows.forEach(row => {
                        try {
                            // Extract data from row
                            const appIdEl = row.querySelector('[data-app-id], .app-id, td:nth-child(1)');
                            const alvEl = row.querySelector('[data-alv], .alv-number, td:nth-child(2)');
                            const nameEl = row.querySelector('.client-name, .name, td:nth-child(3)');
                            const phoneEl = row.querySelector('.phone, .phone-number, td:nth-child(4)');
                            const emailEl = row.querySelector('.email, td:nth-child(5)');
                            const statusEl = row.querySelector('.status, .file-status, td:nth-child(6)');
                            const notesEl = row.querySelector('.notes, td:nth-child(7)');
                            const debtEl = row.querySelector('.debt-amount, .amount, td:nth-child(8)');
                            
                            const file = {
                                appId: appIdEl?.textContent?.trim() || '',
                                alv: alvEl?.textContent?.trim() || '',
                                name: nameEl?.textContent?.trim() || '',
                                phone: phoneEl?.textContent?.trim() || '',
                                email: emailEl?.textContent?.trim() || '',
                                status: statusEl?.textContent?.trim() || '',
                                notes: notesEl?.textContent?.trim() || '',
                                debtAmount: debtEl?.textContent?.trim() || ''
                            };
                            
                            if (file.appId) {
                                files.push(file);
                            }
                        } catch (error) {
                            console.error('Error extracting row:', error);
                        }
                    });
                    
                    return files;
                });

                allFiles.push(...pageFiles);

                // Go to next page if needed
                if (pageNum < numPages) {
                    const nextButton = await this.page.$('button:has-text("Next"), .pagination-next, a[rel="next"]');
                    if (nextButton) {
                        await nextButton.click();
                        await this.page.waitForTimeout(2000);
                    } else {
                        console.log('No more pages available');
                        break;
                    }
                }
            }

            console.log(`Scraped ${allFiles.length} files from ${numPages} page(s)`);
            return allFiles;
        } catch (error) {
            console.error('Error scraping pages:', error);
            throw error;
        }
    }

    async findSharkTankFiles() {
        await this.ensureLoggedIn();

        try {
            // Navigate to pipeline/shark tank view
            await this.page.goto(`${this.baseUrl}/pipeline`, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Look for unassigned or unprotected files
            const unprotectedFiles = await this.page.evaluate(() => {
                const files = [];
                const rows = document.querySelectorAll('tr[data-file], tbody tr');
                
                rows.forEach(row => {
                    try {
                        const statusEl = row.querySelector('.status, .file-status');
                        const ownerEl = row.querySelector('.owner, .assigned-to');
                        const notesEl = row.querySelector('.notes, .last-note');
                        
                        const status = statusEl?.textContent?.trim().toLowerCase() || '';
                        const owner = ownerEl?.textContent?.trim().toLowerCase() || '';
                        const notes = notesEl?.textContent?.trim() || '';
                        
                        // Check if file is unprotected (no recent notes/activity)
                        const isUnprotected = 
                            status.includes('unassigned') || 
                            status.includes('available') ||
                            owner === '' || 
                            owner === 'unassigned' ||
                            notes === '';
                        
                        if (isUnprotected) {
                            const appIdEl = row.querySelector('[data-app-id], .app-id, td:nth-child(1)');
                            const nameEl = row.querySelector('.client-name, .name, td:nth-child(3)');
                            const phoneEl = row.querySelector('.phone, td:nth-child(4)');
                            
                            files.push({
                                appId: appIdEl?.textContent?.trim() || '',
                                name: nameEl?.textContent?.trim() || '',
                                phone: phoneEl?.textContent?.trim() || '',
                                status: status
                            });
                        }
                    } catch (error) {
                        console.error('Error checking row:', error);
                    }
                });
                
                return files;
            });

            return unprotectedFiles;
        } catch (error) {
            console.error('Error finding shark tank files:', error);
            return [];
        }
    }

    async assignAndProtect(appId, note) {
        await this.ensureLoggedIn();

        try {
            // Navigate to file detail page
            await this.page.goto(`${this.baseUrl}/file/${appId}`, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Check if file is protected
            const protectedMessage = await this.page.$('text=/protected|assigned|claimed/i');
            if (protectedMessage) {
                return { 
                    success: false, 
                    protected: true,
                    message: 'File is already protected' 
                };
            }

            // Click assign/claim button
            const assignButton = await this.page.$('button:has-text("Assign"), button:has-text("Claim"), button:has-text("Take")');
            if (assignButton) {
                await assignButton.click();
                await this.page.waitForTimeout(1000);
            }

            // Add note
            const noteInput = await this.page.$('textarea[name="note"], textarea.note-input, textarea[placeholder*="note"]');
            if (noteInput) {
                await noteInput.fill(note);
                
                // Click save button
                const saveButton = await this.page.$('button:has-text("Save"), button:has-text("Add Note"), button[type="submit"]');
                if (saveButton) {
                    await saveButton.click();
                    await this.page.waitForTimeout(1000);
                }
            }

            return { 
                success: true, 
                protected: true,
                message: 'File assigned and protected' 
            };
        } catch (error) {
            console.error(`Error assigning file ${appId}:`, error);
            return { 
                success: false, 
                protected: false,
                message: error.message 
            };
        }
    }

    async bulkAssign(identifiers, note) {
        await this.ensureLoggedIn();

        const results = [];

        for (const identifier of identifiers) {
            try {
                const parsed = this.parseIdentifier(identifier);
                console.log(`Processing ${parsed.type}: ${parsed.value}`);

                let appId = null;

                // If it's already an App ID, use it directly
                if (parsed.type === 'appId') {
                    appId = parsed.value;
                } else {
                    // Search for the identifier to get App ID
                    appId = await this.searchForAppId(parsed.value, parsed.type);
                }

                if (!appId) {
                    results.push({
                        identifier,
                        success: false,
                        message: 'Could not find file'
                    });
                    continue;
                }

                // Assign and protect
                const result = await this.assignAndProtect(appId, note);
                results.push({
                    identifier,
                    appId,
                    ...result
                });

                // Small delay between assignments
                await this.page.waitForTimeout(500);
            } catch (error) {
                console.error(`Error processing ${identifier}:`, error);
                results.push({
                    identifier,
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    async searchForAppId(value, type) {
        try {
            // Navigate to search
            await this.page.goto(`${this.baseUrl}/search?q=${encodeURIComponent(value)}`, {
                waitUntil: 'networkidle',
                timeout: 30000
            });

            // Extract App ID from search results
            const appId = await this.page.evaluate(() => {
                const firstResult = document.querySelector('.search-result, tr[data-file], .file-item');
                if (firstResult) {
                    const appIdEl = firstResult.querySelector('[data-app-id], .app-id, a[href*="/file/"]');
                    if (appIdEl) {
                        const href = appIdEl.getAttribute('href');
                        if (href) {
                            const match = href.match(/\/file\/(\d+)/);
                            if (match) return match[1];
                        }
                        return appIdEl.textContent.trim();
                    }
                }
                return null;
            });

            return appId;
        } catch (error) {
            console.error('Error searching for App ID:', error);
            return null;
        }
    }

    async checkAndAssign(identifier, note) {
        try {
            const parsed = this.parseIdentifier(identifier);
            let appId = null;

            if (parsed.type === 'appId') {
                appId = parsed.value;
            } else {
                appId = await this.searchForAppId(parsed.value, parsed.type);
            }

            if (!appId) {
                return {
                    success: false,
                    stillProtected: false,
                    message: 'Could not find file'
                };
            }

            const result = await this.assignAndProtect(appId, note);
            
            return {
                success: result.success,
                assigned: result.success,
                stillProtected: result.protected && !result.success,
                message: result.message
            };
        } catch (error) {
            console.error('Error in checkAndAssign:', error);
            return {
                success: false,
                stillProtected: false,
                message: error.message
            };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.page = null;
        }
    }
}

module.exports = LogixxScraper;
