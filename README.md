# 🎯 LOGIXX Pipeline Scraper & Automation Dashboard

Complete automation system for Logixx CRM pipeline management with Playwright scraping, bulk assignment, callback scheduling, and notes.

## ✨ Features

### 📊 Pipeline Scraper
- **Automated scraping** from Logixx pipeline
- **Email extraction** from lead details
- **Pagination support** (1-50 pages, 50 leads per page)
- **Real-time progress** via Server-Sent Events
- **CSV export** of all scraped data

### ⚡ Bulk Lead Assignment
- **Auto-assign leads** to yourself
- **Batch processing** of multiple App IDs
- **Success tracking** with detailed results

### 📅 Callback Scheduling
- **Schedule callbacks** with specific dates/times
- **Shark Tank Follow Up** calendar integration
- **Custom titles & descriptions**
- **Flexible duration** (5 min - 1 hour)

### 📝 Notes System
- **Add notes** to any lead
- **Quick App ID lookup**
- **Automated note submission**

### 🔐 Security
- **Password protection** for dashboard access
- **Session management** (24-hour sessions)
- **Environment variable** credential storage

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Environment
Copy `.env.example` to `.env` and update:
```bash
DASHBOARD_PASSWORD=your-secure-password
SESSION_SECRET=random-32-char-string
LOGIXX_EMAIL=your-email@company.com
LOGIXX_PASSWORD=your-password
```

### 3. Run Locally
```bash
npm start
```
Visit: http://localhost:3000

## 📦 Deploy to Railway

### Method 1: GitHub (Recommended)

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit: Logixx Scraper"
git remote add origin https://github.com/YOUR-USERNAME/logixx-scraper.git
git push -u origin master
```

2. **Connect to Railway:**
- Go to https://railway.app
- Click "New Project" → "Deploy from GitHub"
- Select your repository
- Railway will detect the Dockerfile and deploy automatically

3. **Add Environment Variables in Railway:**
```
DASHBOARD_PASSWORD = your-secure-password
SESSION_SECRET = random-32-character-string
LOGIXX_EMAIL = aasgari@betterdebtsolutions.com
LOGIXX_PASSWORD = Negin1995#
NODE_ENV = production
```

4. **Wait for deployment** (~5 minutes for Playwright install)

### Method 2: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway vars set DASHBOARD_PASSWORD=your-password
railway vars set SESSION_SECRET=random-string
railway vars set LOGIXX_EMAIL=your-email
railway vars set LOGIXX_PASSWORD=your-password
```

## 🎯 Usage Guide

### Scraping Pipeline Data

1. **Login** with your dashboard password
2. **Enter number of pages** to scrape (50 leads per page)
3. **Click "Start Scraping"**
4. **Watch real-time progress** in the status card
5. **Export to CSV** when complete

### Assigning Leads

1. **Enter App IDs** (comma-separated): `998815, 998742, 998740`
2. **Click "Assign Selected Leads to Me"**
3. **Confirm** the assignment
4. **Check results** - shows success count

### Scheduling Callbacks

1. **Enter App ID** of the lead
2. **Fill in:**
   - Title (e.g., "FU")
   - Description (default: "Auto")
   - Date & Time
   - Duration
3. **Click "Schedule Callback"**
4. **Calendar event created** in Logixx

### Adding Notes

1. **Enter App ID**
2. **Write your note**
3. **Click "Add Note"**
4. **Note saved** to lead

## 🛠️ Technical Stack

- **Backend:** Node.js + Express
- **Automation:** Playwright (headless Chromium)
- **Frontend:** Vanilla JavaScript
- **Deployment:** Railway (Docker)
- **Real-time:** Server-Sent Events (SSE)

## 📝 API Endpoints

### Authentication
- `POST /api/login` - Login with password
- `POST /api/logout` - Logout

### Scraper
- `POST /api/scraper/scrape` - Start scraping (params: pages)
- `POST /api/scraper/assign-leads` - Assign leads (params: appIds[])
- `POST /api/scraper/schedule-callback` - Schedule callback
- `POST /api/scraper/add-note` - Add note to lead
- `GET /api/scraper/data` - Get scraped data
- `POST /api/export-csv` - Export data to CSV

### Live Updates
- `GET /api/live-updates` - SSE stream for real-time stats

## 🐛 Troubleshooting

### Playwright Errors on Railway

If you see "browser not found" errors:
```bash
# Railway automatically installs with Dockerfile
# If using Nixpacks instead, add this to railway.json:
{
  "build": {
    "builder": "DOCKERFILE"
  }
}
```

### Login Fails

The error "Scan failed: Unauthorized" means:
- Logixx credentials in environment variables are wrong
- Login page structure changed
- Check Railway logs for details

### Scraper Timeout

If scraping times out:
- Logixx may be slow - increase timeout in scraper code
- Check if you're logged out (session expired)
- Verify Logixx website is accessible

### CSV Export Shows "No Data"

- Run the scraper first before exporting
- Data is stored in memory (lost on redeploy)
- Consider adding database for persistent storage

## 🔒 Security Notes

- **Never commit** `.env` file to Git
- **Use strong passwords** for dashboard
- **Rotate credentials** regularly
- **Keep Logixx credentials** in environment variables only

## 📊 Performance

- **Scraping speed:** ~2-3 seconds per page (50 leads)
- **Assignment speed:** ~2 seconds per lead
- **Memory usage:** ~200MB (with Playwright)
- **Concurrent users:** Supports multiple sessions

## 🚧 Roadmap

- [ ] Database integration (Supabase/PostgreSQL)
- [ ] Scheduled scraping (cron jobs)
- [ ] Watchlist monitoring
- [ ] Email notifications
- [ ] Advanced filters
- [ ] Bulk callback scheduling
- [ ] Lead analytics dashboard

## 📄 License

MIT

## 🤝 Support

For issues or questions, check Railway logs or contact support.

---

**Built with ❤️ for Better Debt Solutions**
