# 📧 Email Tracking & 📵 DNC Management Features

Complete implementation guide for email tracking (like Mailtrack) and Do Not Call (DNC) list management with call dispositions.

## 🎯 Overview

### Email Tracking Features
- Send tracked emails with pixel tracking
- Monitor email opens (when and how many times)
- Track link clicks
- Measure scroll depth (how far recipients read)
- Track time spent reading emails
- Comprehensive analytics dashboard

### DNC & Call Disposition Features
- Internal DNC (Do Not Call) list management
- Auto-scrub phone numbers before calling
- Call disposition tracking (outcome of each call)
- Bulk import/export DNC lists
- Compliance reporting

## 📦 What's Been Implemented

### ✅ Completed Components

1. **Email Service** (`utils/email-service.js`)
   - Nodemailer integration for SMTP
   - Tracking pixel injection
   - Link tracking with click monitoring
   - Scroll depth tracking with JavaScript
   - Time spent tracking
   - HTML template generation
   - Bulk email sending

2. **DNC Scrubber** (`utils/dnc-scrubber.js`)
   - Phone number cleaning/formatting
   - DNC list checking
   - Bulk scrubbing
   - CSV import/export
   - Statistics and reporting

3. **Database Extensions** (`database/db.js`)
   - Email history storage
   - Email tracking data (opens, clicks, scrolls, time)
   - Call dispositions storage
   - DNC list storage
   - Complete CRUD operations for all features

4. **Dependencies** (`package.json`)
   - Nodemailer for email sending

## 🚧 Implementation Steps Needed

### Step 1: Update server.js with API Endpoints

Add the following endpoints to `Dashboard/server.js`:

```javascript
// At the top, add imports
const EmailService = require('./utils/email-service');
const DNCScr

ubber = require('./utils/dnc-scrubber');

// Initialize services
let emailService = null;
let dncScrubber = new DNCScr

ubber(db);

// Initialize email service
function initializeEmail() {
    const settings = db.getSettings();
    if (settings.emailHost && settings.emailUser && settings.emailPass) {
        emailService = new EmailService({
            host: settings.emailHost,
            port: settings.emailPort,
            secure: settings.emailSecure,
            user: settings.emailUser,
            pass: settings.emailPass,
            fromEmail: settings.emailFromEmail,
            trackingBaseUrl: settings.trackingBaseUrl
        });
    }
}

// ========== EMAIL ROUTES ==========

// Route: Email Management Page
app.get('/email', (req, res) => {
    const stats = db.getStats();
    const settings = db.getSettings();
    const emailHistory = db.getEmailHistory(50);
    const tracking = db.getAllEmailTracking();

    res.render('email', {
        stats,
        settings,
        emailHistory,
        tracking,
        emailConfigured: emailService && emailService.isConfigured()
    });
});

// Route: Send Tracked Email
app.post('/api/email/send', async (req, res) => {
    try {
        const { to, subject, htmlContent } = req.body;

        if (!emailService || !emailService.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: 'Email service not configured'
            });
        }

        const trackingId = emailService.generateTrackingId();
        const result = await emailService.sendTrackedEmail(to, subject, htmlContent, trackingId);

        // Save to history
        db.addEmailHistory({
            to: to,
            subject: subject,
            success: result.success,
            trackingId: trackingId,
            messageId: result.messageId,
            error: result.error
        });

        // Initialize tracking
        if (result.success) {
            db.initEmailTracking(trackingId, {
                to: to,
                subject: subject,
                sentAt: result.timestamp
            });

            db.addActivity('Email sent', `To: ${to}`, 'success');
        } else {
            db.addActivity('Email failed', result.error, 'error');
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Send Bulk Tracked Emails
app.post('/api/email/send-bulk', async (req, res) => {
    try {
        const { recipients, subject, htmlContent } = req.body;

        if (!emailService || !emailService.isConfigured()) {
            return res.status(400).json({
                success: false,
                error: 'Email service not configured'
            });
        }

        const phoneNumbers = recipients
            .split(/[\n,]+/)
            .map(num => num.trim())
            .filter(num => num.length > 0);

        db.addActivity('Sending bulk emails', `To ${phoneNumbers.length} recipients`);

        const result = await emailService.sendBulkTrackedEmails(phoneNumbers, subject, htmlContent);

        // Save each to history
        result.results.forEach(r => {
            db.addEmailHistory({
                to: r.to,
                subject: subject,
                success: r.success,
                trackingId: r.trackingId,
                messageId: r.messageId,
                error: r.error
            });

            if (r.success) {
                db.initEmailTracking(r.trackingId, {
                    to: r.to,
                    subject: subject,
                    sentAt: r.timestamp
                });
            }
        });

        db.addActivity(
            'Bulk emails completed',
            `Success: ${result.successful}, Failed: ${result.failed}`,
            result.failed === 0 ? 'success' : 'info'
        );

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route: Track Email Open (pixel)
app.get('/api/email/track/open/:trackingId', (req, res) => {
    const { trackingId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;

    db.trackEmailOpen(trackingId, userAgent, ip);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );

    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length
    });
    res.end(pixel);
});

// Route: Track Email Click
app.get('/api/email/track/click/:trackingId/:linkIndex', (req, res) => {
    const { trackingId, linkIndex } = req.params;
    const { url } = req.query;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;

    db.trackEmailClick(trackingId, parseInt(linkIndex), url, userAgent, ip);

    // Redirect to original URL
    res.redirect(url);
});

// Route: Track Scroll Depth
app.post('/api/email/track/scroll/:trackingId', (req, res) => {
    const { trackingId } = req.params;
    const { depth } = req.body;

    db.trackEmailScroll(trackingId, depth);

    res.json({ success: true });
});

// Route: Track Time Spent
app.post('/api/email/track/time/:trackingId', (req, res) => {
    const { trackingId } = req.params;
    const { timeSpent } = req.body;

    db.trackEmailTimeSpent(trackingId, timeSpent);

    res.json({ success: true });
});

// Route: Get Email Tracking Details
app.get('/api/email/tracking/:trackingId', (req, res) => {
    const { trackingId } = req.params;
    const tracking = db.getEmailTracking(trackingId);

    if (!tracking) {
        return res.status(404).json({ success: false, error: 'Tracking not found' });
    }

    res.json({ success: true, tracking });
});

// Route: Get All Email Tracking
app.get('/api/email/tracking', (req, res) => {
    const tracking = db.getAllEmailTracking();
    res.json({ success: true, tracking });
});

// ========== DNC MANAGEMENT ROUTES ==========

// Route: Check if number is on DNC
app.post('/api/dnc/check', (req, res) => {
    const { phoneNumber } = req.body;
    const isOnList = dncScrubber.isOnDNCList(phoneNumber);

    res.json({
        success: true,
        phoneNumber: phoneNumber,
        isOnDNCList: isOnList,
        cleanedNumber: dncScrubber.cleanPhoneNumber(phoneNumber)
    });
});

// Route: Scrub phone numbers
app.post('/api/dnc/scrub', (req, res) => {
    const { phoneNumbers } = req.body;

    const numberList = phoneNumbers
        .split(/[\n,]+/)
        .map(num => num.trim())
        .filter(num => num.length > 0);

    const result = dncScrubber.scrubPhoneNumbers(numberList);

    res.json({ success: true, ...result });
});

// Route: Add to DNC list
app.post('/api/dnc/add', (req, res) => {
    const { phoneNumber, reason, source } = req.body;

    const added = dncScrubber.addToDNCList(phoneNumber, reason, source);

    if (added) {
        db.addActivity('Added to DNC list', phoneNumber, 'info');
        res.json({ success: true, message: 'Number added to DNC list' });
    } else {
        res.json({ success: false, message: 'Number already on DNC list' });
    }
});

// Route: Remove from DNC list
app.post('/api/dnc/remove', (req, res) => {
    const { phoneNumber } = req.body;

    dncScrubber.removeFromDNCList(phoneNumber);
    db.addActivity('Removed from DNC list', phoneNumber, 'info');

    res.json({ success: true, message: 'Number removed from DNC list' });
});

// Route: Get DNC list
app.get('/api/dnc/list', (req, res) => {
    const dncList = dncScrubber.getDNCList();
    res.json({ success: true, count: dncList.length, list: dncList });
});

// Route: Import DNC CSV
app.post('/api/dnc/import', (req, res) => {
    const { csvContent } = req.body;

    const result = dncScrubber.importFromCSV(csvContent);

    db.addActivity(
        'DNC list imported',
        `${result.imported} numbers added`,
        'success'
    );

    res.json({ success: true, ...result });
});

// Route: Export DNC CSV
app.get('/api/dnc/export', (req, res) => {
    const csv = dncScrubber.exportToCSV();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=dnc-list.csv');
    res.send(csv);
});

// Route: DNC Statistics
app.get('/api/dnc/stats', (req, res) => {
    const stats = dncScrubber.getStatistics();
    res.json({ success: true, ...stats });
});

// ========== CALL DISPOSITION ROUTES ==========

// Route: Add Call Disposition
app.post('/api/call/disposition', (req, res) => {
    const { callId, disposition, notes } = req.body;

    db.addCallDisposition(callId, disposition, notes);
    db.addActivity('Call disposition added', `${disposition} - ${callId}`, 'info');

    // If disposition is DNC-related, add to DNC list
    if (disposition === 'Do Not Call Requested' || disposition === 'DNC') {
        const call = db.getCallHistory().find(c => c.callId === callId);
        if (call) {
            dncScrubber.addToDNCList(call.to, disposition, 'Call Disposition');
            db.addActivity('Auto-added to DNC', call.to, 'info');
        }
    }

    res.json({ success: true });
});

// Route: Get Call Dispositions
app.get('/api/call/dispositions', (req, res) => {
    const limit = req.query.limit || 100;
    const dispositions = db.getCallDispositions(parseInt(limit));
    res.json({ success: true, count: dispositions.length, dispositions });
});

// Route: Get Disposition for Specific Call
app.get('/api/call/disposition/:callId', (req, res) => {
    const { callId } = req.params;
    const disposition = db.getCallDispositionByCallId(callId);

    if (!disposition) {
        return res.status(404).json({ success: false, error: 'Disposition not found' });
    }

    res.json({ success: true, disposition });
});

// Don't forget to call initializeEmail() in the initialize() function:
// Add after initializeTwilio();
initializeEmail();

// Update settings endpoint to handle email config
// Add email fields to the settings update
```

### Step 2: Update Settings Page

Add to `Dashboard/views/settings.ejs` after Twilio section:

```html
<!-- Email Configuration -->
<div class="section">
    <h2>📧 Email Service & Tracking</h2>
    <div class="form-group">
        <label>SMTP Host:</label>
        <input type="text" name="emailHost" value="<%= settings.emailHost || '' %>" placeholder="smtp.gmail.com">
        <div class="help-text">Your email provider's SMTP server</div>
    </div>
    <div class="form-group">
        <label>SMTP Port:</label>
        <input type="number" name="emailPort" value="<%= settings.emailPort || 587 %>">
        <div class="help-text">Usually 587 for TLS or 465 for SSL</div>
    </div>
    <div class="form-group">
        <label>Use SSL/TLS:</label>
        <div class="toggle-group">
            <label class="toggle">
                <input type="checkbox" name="emailSecure"
                       <%= settings.emailSecure ? 'checked' : '' %>>
                <span class="toggle-slider"></span>
            </label>
            <span>Enable SSL/TLS</span>
        </div>
    </div>
    <div class="form-group">
        <label>Email Username:</label>
        <input type="text" name="emailUser" value="<%= settings.emailUser || '' %>" placeholder="your-email@domain.com">
    </div>
    <div class="form-group">
        <label>Email Password:</label>
        <input type="password" name="emailPass" value="<%= settings.emailPass || '' %>">
        <div class="help-text">Use app-specific password for Gmail</div>
    </div>
    <div class="form-group">
        <label>From Email:</label>
        <input type="text" name="emailFromEmail" value="<%= settings.emailFromEmail || '' %>" placeholder="noreply@yourdomain.com">
    </div>
    <div class="form-group">
        <label>Tracking Base URL:</label>
        <input type="text" name="trackingBaseUrl" value="<%= settings.trackingBaseUrl || 'http://localhost:3000' %>">
        <div class="help-text">Your dashboard URL for email tracking</div>
    </div>
</div>
```

### Step 3: Create Email Management UI

Create `Dashboard/views/email.ejs` (similar structure to twilio.ejs but for emails with tracking stats).

### Step 4: Create DNC Management UI

Create `Dashboard/views/dnc.ejs` for managing the Do Not Call list.

### Step 5: Update Dashboard Navigation

Add links to email and DNC pages in the main dashboard.

## 📊 Email Tracking Analytics

### What Gets Tracked

1. **Opens**: Every time the email is opened (unique tracking pixel)
2. **Clicks**: Every link click with URL and timestamp
3. **Scroll Depth**: How far down the email they scrolled (25%, 50%, 75%, 100%)
4. **Time Spent**: Total time with email open and visible

### Tracking Data Structure

```javascript
{
  "trackingId": "abc123...",
  "to": "client@example.com",
  "subject": "Payment Reminder",
  "sentAt": "2024-01-01T12:00:00Z",
  "opens": [
    {
      "timestamp": "2024-01-01T12:05:00Z",
      "userAgent": "Mozilla/5.0...",
      "ip": "192.168.1.1"
    }
  ],
  "clicks": [
    {
      "timestamp": "2024-01-01T12:06:00Z",
      "linkIndex": 1,
      "url": "https://example.com/payment",
      "userAgent": "Mozilla/5.0...",
      "ip": "192.168.1.1"
    }
  ],
  "scrollDepths": [
    { "timestamp": "2024-01-01T12:05:30Z", "depth": 25 },
    { "timestamp": "2024-01-01T12:06:00Z", "depth": 50 }
  ],
  "timeSpent": 180,  // seconds
  "lastActivity": "2024-01-01T12:08:00Z"
}
```

## 📞 Call Disposition System

### Available Dispositions

- **Answered** - Spoke with client
- **Voicemail** - Left voicemail
- **No Answer** - No answer, no voicemail
- **Busy** - Line was busy
- **Wrong Number** - Incorrect number
- **Do Not Call Requested** - Client requested DNC
- **Callback Requested** - Client wants callback
- **Not Interested** - Client not interested
- **Appointment Set** - Scheduled appointment

### Auto-DNC Feature

When a call is dispositioned as "Do Not Call Requested" or "DNC", the number is automatically added to the DNC list to prevent future calls.

## 🛡️ DNC Compliance Features

### Pre-Call Scrubbing

Before making any call:
1. Check if number is on internal DNC list
2. Block call if on DNC list
3. Log blocked attempts
4. Show warning to user

### Bulk Scrubbing

Upload a list of phone numbers and scrub against DNC list before campaign.

### CSV Import/Export

- Import DNC lists from CSV
- Export DNC list for compliance reporting
- Track source and reason for each entry

## 🔧 Configuration

### Email Service Setup (Gmail Example)

1. Go to Google Account Settings
2. Enable 2-Factor Authentication
3. Generate App Password
4. Use App Password in dashboard settings

**Settings:**
- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `false` (uses STARTTLS)
- User: `your-email@gmail.com`
- Pass: `your-app-password`

### Other Email Providers

**SendGrid:**
- Host: `smtp.sendgrid.net`
- Port: `587`
- User: `apikey`
- Pass: Your SendGrid API key

**Mailgun:**
- Host: `smtp.mailgun.org`
- Port: `587`
- User: Your Mailgun SMTP username
- Pass: Your Mailgun SMTP password

## 📈 Usage Examples

### Send Tracked Email

```javascript
POST /api/email/send
{
  "to": "client@example.com",
  "subject": "Payment Reminder",
  "htmlContent": "<html><body><h1>Hello!</h1><p>Your payment is due.</p></body></html>"
}
```

### Check DNC Before Calling

```javascript
POST /api/dnc/check
{
  "phoneNumber": "+15551234567"
}

Response:
{
  "success": true,
  "phoneNumber": "+15551234567",
  "isOnDNCList": false,
  "cleanedNumber": "+15551234567"
}
```

### Add Call Disposition

```javascript
POST /api/call/disposition
{
  "callId": "CAxxxx",
  "disposition": "Voicemail",
  "notes": "Left message about payment plan"
}
```

## 🎯 Next Steps

1. Implement remaining API endpoints in server.js
2. Create email.ejs UI page
3. Create dnc.ejs UI page
4. Update settings page with email config
5. Update Twilio UI to show dispositions
6. Add DNC check before calling in Twilio service
7. Test email tracking
8. Test DNC scrubbing

## 📝 Notes

- Email tracking requires JavaScript enabled in recipient's email client
- Some email clients block tracking pixels
- DNC list is stored locally - for federal registry, additional API integration needed
- Call dispositions are separate from call history
- Auto-DNC feature helps maintain compliance automatically

## 🔒 Security & Privacy

- Email passwords stored in JSON (move to environment variables in production)
- Tracking data includes IP addresses (ensure GDPR/privacy compliance)
- DNC list contains PII (protect accordingly)
- Regular backup of DNC list recommended

## 💡 Future Enhancements

- Federal DNC registry API integration
- Email template library
- A/B testing for emails
- Heat map visualization of email engagement
- Automated DNC scrubbing before campaigns
- Call recording integration
- Disposition analytics dashboard
