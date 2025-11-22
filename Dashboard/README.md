# 🎯 LOGIXX Dashboard

Automated file management and monitoring system for LOGIXX CRM with shark tank detection, watchlist monitoring, bulk assignment, and CSV export capabilities.

## ✨ Features

### 🦈 Shark Tank Monitor
- **Automatic Detection**: Scans pipeline for unprotected/unassigned files
- **Auto-Assignment**: Automatically assigns and protects files with custom note
- **Configurable Interval**: Set scan frequency (recommended: 5-10 minutes)
- **Real-time Stats**: Track files grabbed today

### 👁️ Watchlist Monitor
- **Targeted Monitoring**: Watch specific protected files
- **Hourly Checks**: Automatically checks and grabs when protection expires
- **Smart Detection**: Identifies when files become available
- **Easy Management**: Add/remove files from watchlist

### 🔍 Quick Scraper
- **Multi-page Scraping**: Scrape 1-50 pages at once
- **Comprehensive Data**: Captures App ID, ALV, name, phone, email, status, notes, debt amount
- **Fast Extraction**: Optimized for speed
- **CSV Export**: Export all scraped data to CSV file

### 📦 Bulk Assignment
- **Flexible Input**: Accept App IDs, ALV numbers, or phone numbers
- **Batch Processing**: Process hundreds of identifiers at once
- **Auto-Protection**: Automatically adds protection note
- **Success Tracking**: Reports success/failure for each identifier

### 📱 Twilio SMS & Calling
- **Single & Bulk SMS**: Send text messages to clients with auto phone formatting
- **Voice Calls**: Make calls with text-to-speech voicemails
- **SMS/Call History**: Track all communications with success/failure status
- **Easy Configuration**: Set up with Twilio credentials in settings
- **Integration**: Works with LOGIXX client database
- [Full Documentation →](TWILIO.md)

### 🤖 n8n + ElevenLabs AI Voicemail Automation
- **AI Voice Generation**: Create natural-sounding voicemails with ElevenLabs
- **Personalized Messages**: Dynamic message generation per client
- **Automated Campaigns**: Schedule and run voicemail campaigns
- **Full Workflow**: n8n orchestrates client data → AI voice → Twilio calls
- **Ready-to-Use Templates**: Import and customize workflows
- [Full Documentation →](N8N_INTEGRATION.md)

## 🚀 Quick Start

### Local Development

1. **Install Dependencies**
```bash
npm install
npm run install-browsers
```

2. **Start Server**
```bash
npm start
```

3. **Access Dashboard**
Open browser to: `http://localhost:3000`

## ☁️ Railway Deployment (Recommended)

Railway provides free hosting with automatic SSL, custom domains, and persistent storage.

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Get $5 free credits (enough for ~1 month)

### Step 2: Deploy Project

#### Option A: Deploy from GitHub (Recommended)
1. Push this project to your GitHub repository
2. In Railway dashboard, click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect the Node.js project

#### Option B: Deploy via Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Step 3: Configure Environment
Railway will automatically detect the `package.json` and install dependencies.

No environment variables needed - settings are configured in the dashboard!

### Step 4: Install Playwright Browsers
In Railway dashboard:
1. Go to your project
2. Click "Settings" → "Build"
3. Add this to "Custom Start Command":
```bash
npx playwright install chromium --with-deps && npm start
```

### Step 5: Access Your Dashboard
1. Railway will provide a public URL (e.g., `https://your-project.railway.app`)
2. Visit the URL
3. Configure settings with your LOGIXX credentials

## ⚙️ Configuration

### Settings Page
Access at: `https://your-domain.com/settings`

#### LOGIXX Credentials
- **Username**: Your LOGIXX email (pre-configured: aasgari@betterdebtsolutions.com)
- **Password**: Your LOGIXX password (pre-configured: Negin1995#)

#### Shark Tank Monitor
- **Enable/Disable**: Toggle automatic scanning
- **Interval**: 1-60 minutes (recommended: 5-10 minutes)
- **Auto-assigns**: Files without protection

#### Watchlist Monitor
- **Enable/Disable**: Toggle watchlist checking
- **Interval**: 15-1440 minutes (recommended: 60 minutes)
- **Monitors**: Specific protected files you want to grab

#### Protection Note
- **Template**: Customize the note added when assigning files
- **Default**: "I am working on this file"

## 📊 Dashboard Features

### Stats Overview
- **Total Files Tracked**: All files in database
- **Files Assigned Today**: Auto-grabbed files count
- **Watchlist**: Number of files being monitored
- **Total Activity**: Logged events

### Monitor Status
- **Green Pulse**: Active and running
- **Red Indicator**: Inactive
- **Interval Display**: Shows check frequency

### Quick Actions
- **Manual Scan**: Run shark tank scan immediately
- **Export CSV**: Download all file data
- **Bulk Assignment**: Paste identifiers to assign

### Activity Log
- **Real-time Updates**: See all system actions
- **Color Coded**: Success (green), Error (red), Info (gray)
- **Detailed**: Shows timestamp, action, and details

## 🔧 API Endpoints

All endpoints return JSON responses.

### GET /
Dashboard home page

### GET /settings
Settings configuration page

### POST /api/settings
Update settings
```json
{
  "logixxUsername": "email@example.com",
  "logixxPassword": "password",
  "sharkTankInterval": 10,
  "watchlistInterval": 60,
  "protectionNote": "I am working on this file",
  "sharkTankEnabled": true,
  "watchlistEnabled": true
}
```

### POST /api/scrape
Run manual scrape
```json
{
  "pages": 1
}
```

### POST /api/export-csv
Export all files to CSV (returns file download)

### POST /api/bulk-assign
Bulk assign files
```json
{
  "identifiers": "#12345\nALV67890\n555-123-4567"
}
```

### POST /api/watchlist/add
Add file to watchlist
```json
{
  "identifier": "#12345",
  "type": "App ID"
}
```

### POST /api/watchlist/remove/:id
Remove file from watchlist

### GET /api/watchlist
Get all watchlist items

### GET /api/activity?limit=50
Get recent activity log

## 🗂️ Project Structure

```
logixx-dashboard/
├── server.js                 # Main Express server
├── database/
│   └── db.js                 # JSON file-based database
├── scraper/
│   └── logixx-scraper.js     # Playwright automation
├── utils/
│   └── csv-exporter.js       # CSV generation
├── views/
│   ├── dashboard.ejs         # Main dashboard
│   └── settings.ejs          # Settings page
├── data/                     # Auto-created data storage
│   ├── settings.json         # Configuration
│   ├── files.json            # Scraped files
│   ├── activity.json         # Activity log
│   ├── watchlist.json        # Watchlist items
│   └── cookies.json          # Session cookies
├── package.json
└── README.md
```

## 🔐 Security

- **Credentials**: Stored in JSON files (should be moved to environment variables for production)
- **Session Management**: Cookies saved locally for persistent login
- **HTTPS**: Automatic SSL when deployed to Railway
- **No Browser Access**: Runs headless, no GUI needed

## ⚡ Performance

- **Fast Scraping**: Parallel processing of pages
- **Cookie Persistence**: Stays logged in between sessions
- **Efficient Monitoring**: Only checks when intervals trigger
- **Low Memory**: Headless Chrome optimization

## 🐛 Troubleshooting

### Login Issues
- Check credentials in settings
- Delete `data/cookies.json` to force re-login
- Verify LOGIXX site is accessible

### Scraping Errors
- LOGIXX may have changed HTML structure
- Check browser console for errors
- Try manual login to verify account

### Monitor Not Running
- Check if enabled in settings
- Verify interval settings
- Look at activity log for errors

### Railway Deployment Issues
- Ensure Playwright is installed: `npx playwright install chromium --with-deps`
- Check Railway logs for errors
- Verify custom start command is set

## 📈 Future Enhancements

- [ ] EjonTech VoIP Gateway integration
- [ ] SMS campaign management
- [ ] FCC-compliant scheduling
- [ ] Advanced filtering and search
- [ ] File assignment history
- [ ] Email notifications
- [ ] Webhook integrations
- [ ] Multi-user support

## 🤝 Support

For issues or questions:
1. Check the activity log in dashboard
2. Review Railway deployment logs
3. Verify LOGIXX credentials
4. Check network connectivity

## 📝 License

ISC License

---

**Built with:** Node.js, Express, Playwright, EJS, JSON Storage

**Deployment:** Railway.app (recommended)

**Status:** Production Ready ✅
