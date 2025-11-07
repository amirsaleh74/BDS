# 💾 DATABASE SETUP - Supabase (FREE!)

## 🎯 What You Get

With Supabase database:
- ✅ **Permanent storage** - Never lose data on restart
- ✅ **Unlimited history** - All scrapes saved forever
- ✅ **Fast queries** - Search and filter your leads
- ✅ **CSV exports** - Export all historical data
- ✅ **Free tier** - 500MB storage, 2GB bandwidth/month
- ✅ **Automatic backups** - Daily backups included

---

## 🚀 Setup (10 Minutes)

### Step 1: Create Supabase Account (2 min)

1. Go to: https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email

### Step 2: Create a Project (3 min)

1. Click **"New Project"**
2. Fill in:
   - **Name:** `logixx-scraper` (or whatever you want)
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to you (US West for California)
   - **Pricing Plan:** Free
3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning

### Step 3: Create Database Table (2 min)

1. In your project, click **"SQL Editor"** in left sidebar
2. Click **"New query"**
3. Copy the entire `database-schema.sql` file content
4. Paste it in the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: ✅ Success

### Step 4: Get Your API Credentials (1 min)

1. Click **"Settings"** (gear icon) in left sidebar
2. Click **"API"** under Project Settings
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 5: Add to Railway (2 min)

1. Go to: https://railway.app/project/gracious-magic
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Add these two variables:

```
SUPABASE_URL
https://your-project.supabase.co

SUPABASE_KEY
your-anon-public-key-here
```

5. Railway will auto-redeploy (~2 min)

---

## ✅ Verify It's Working

### Method 1: Check Dashboard

1. Open your dashboard: https://bds-production-a66d.up.railway.app
2. Login
3. Look at the stats - should show:
   - "💾 Database" (green) if connected
   - "⚠️ Memory" (yellow) if not connected

### Method 2: Check Logs

1. Railway → Deployments → Deploy Logs
2. Should see: `✅ Supabase database connected`
3. Should see: `💾 Database: Supabase ✅`

### Method 3: Test Scraping

1. Login to Logixx (get cookies)
2. Scrape some leads
3. Go to Supabase → Table Editor → scraped_leads
4. You should see your leads! 🎉

---

## 📊 Using the Database

### View All Leads

**In Supabase:**
1. Click **"Table Editor"**
2. Click **"scraped_leads"**
3. See all your leads with timestamps

**In Dashboard:**
1. Click **"View Data"**
2. Shows latest 1000 leads from database
3. Alert shows "💾 Database" as source

### Export All Leads

1. Click **"Export CSV"**
2. Downloads ALL leads from database (not just latest scrape)
3. Filename includes source: `logixx-database-1234567890.csv`

### Search/Filter Leads

**In Supabase:**
1. Table Editor → scraped_leads
2. Use filters at top:
   - Filter by date range
   - Search by name
   - Search by App ID
   - Search by phone

### Get Lead Count

**In Supabase SQL Editor:**
```sql
SELECT get_lead_count();
```

### Get Leads by Date Range

**In Supabase SQL Editor:**
```sql
SELECT * FROM get_leads_by_date_range(
  '2025-01-01'::timestamptz,
  '2025-12-31'::timestamptz
);
```

---

## 🔐 Security Notes

### API Keys

**anon public key:**
- ✅ Safe to use in Railway
- ✅ Row Level Security protects data
- ✅ Only allows operations you define

**service_role key:**
- ❌ NEVER use this one
- ❌ It bypasses all security
- ❌ Keep it secret!

### Row Level Security

The schema enables RLS with a permissive policy for simplicity. For production, you might want to:

1. Create more restrictive policies
2. Add authentication
3. Limit by user/role

---

## 💰 Pricing

### Free Tier (Plenty for You!):
- ✅ 500 MB database space
- ✅ 2 GB bandwidth/month
- ✅ 50,000 monthly active users
- ✅ 500 MB file storage
- ✅ Daily backups (7 days retention)

### How Much Can You Store?

**Estimate per lead:** ~500 bytes

**500 MB = 1,000,000 leads** 🤯

You're scraping 50 leads per page. Even if you scrape 100 pages per day:
- 5,000 leads/day
- 150,000 leads/month
- **Only 75 MB/month**

**You'll never run out of space!**

---

## 🛠️ Maintenance

### Backup Your Data

Supabase auto-backs up daily, but you can also:

**Method 1: CSV Export**
1. Dashboard → Export CSV
2. Downloads everything

**Method 2: Supabase Dashboard**
1. Supabase → Database → Backups
2. Download backup

**Method 3: SQL Dump**
```sql
COPY scraped_leads TO '/tmp/backup.csv' WITH CSV HEADER;
```

### Delete Old Data

**If you ever need to:**

```sql
-- Delete leads older than 90 days
DELETE FROM scraped_leads 
WHERE scraped_at < NOW() - INTERVAL '90 days';

-- Or delete everything
TRUNCATE TABLE scraped_leads;
```

---

## 🆘 Troubleshooting

### "No database configured"

**Check:**
1. SUPABASE_URL is set in Railway
2. SUPABASE_KEY is set in Railway
3. No typos in the URLs/keys
4. Railway redeployed after adding variables

### "Database save error"

**Check:**
1. Table exists (run schema.sql again)
2. API key is correct (anon public, not service_role)
3. Project is active in Supabase
4. Check Railway Deploy Logs for exact error

### Data not showing

**Check:**
1. Actually scraped some data
2. No errors in Railway logs
3. Table has data in Supabase Table Editor

---

## 📈 Advanced Features

### Add More Columns

```sql
ALTER TABLE scraped_leads 
ADD COLUMN email TEXT,
ADD COLUMN status TEXT,
ADD COLUMN amount DECIMAL;
```

Then update server.js to save these fields.

### Create Custom Views

```sql
CREATE VIEW recent_leads AS
SELECT * FROM scraped_leads
WHERE scraped_at > NOW() - INTERVAL '7 days'
ORDER BY scraped_at DESC;
```

### Add Indexes for Performance

```sql
CREATE INDEX idx_scraped_leads_name 
ON scraped_leads(first_name, last_name);

CREATE INDEX idx_scraped_leads_phone 
ON scraped_leads(phone);
```

---

## ✅ Success Checklist

After setup, you should have:
- [ ] Supabase account created
- [ ] Project created
- [ ] Table created (schema.sql run)
- [ ] API credentials copied
- [ ] Railway variables added
- [ ] Railway redeployed successfully
- [ ] Dashboard shows "💾 Database"
- [ ] Test scrape saved to database
- [ ] Can see leads in Supabase Table Editor

---

## 🎉 You're Done!

Now every scrape:
1. ✅ Saves to database automatically
2. ✅ Never lost on restart
3. ✅ Available forever
4. ✅ Exportable anytime

**Your data is safe!** 💾
