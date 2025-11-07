# 🚂 Railway Deployment Guide

This guide will help you deploy your LOGIXX Dashboard to Railway.app for 24/7 cloud hosting.

## Why Railway?

- ✅ **Free Tier**: $5 credit per month (enough for 1 month of hosting)
- ✅ **Automatic SSL**: HTTPS enabled by default
- ✅ **Custom Domains**: Add your own domain
- ✅ **GitHub Integration**: Auto-deploy on push
- ✅ **Easy Setup**: No complex configuration
- ✅ **Persistent Storage**: Data survives restarts
- ✅ **24/7 Uptime**: Accessible from anywhere

## Step-by-Step Deployment

### 1. Create Railway Account

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access GitHub
4. Complete account setup

### 2. Prepare Your Code

#### Option A: Push to GitHub (Recommended)

```bash
# Initialize git (if not already done)
git init

# Add files
git add .
git commit -m "Initial commit: LOGIXX Dashboard"

# Create new repository on GitHub
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/logixx-dashboard.git
git branch -M main
git push -u origin main
```

#### Option B: Use Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Login
railway login

# Link project
railway init
```

### 3. Deploy to Railway

#### Using GitHub (Recommended):

1. **In Railway Dashboard:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Click "Deploy"

2. **Wait for Build:**
   - Railway will detect Node.js
   - Install dependencies automatically
   - First build takes 2-3 minutes

3. **Configure Playwright:**
   - Go to project → "Settings"
   - Find "Deploy" section
   - Set **Custom Start Command**:
   ```bash
   npx playwright install chromium --with-deps && npm start
   ```
   - Click "Save"

4. **Redeploy:**
   - Click "Deploy" → "Redeploy"
   - Wait for completion

#### Using Railway CLI:

```bash
# Deploy current directory
railway up

# Install Playwright after deployment
railway run npx playwright install chromium --with-deps

# Restart service
railway restart
```

### 4. Access Your Dashboard

1. **Get Public URL:**
   - In Railway dashboard, click "Generate Domain"
   - You'll get: `https://your-project.railway.app`

2. **First Time Setup:**
   - Visit your URL
   - Go to Settings page
   - Your credentials are pre-configured:
     - Username: `aasgari@betterdebtsolutions.com`
     - Password: `Negin1995#`
   - Enable monitors and set intervals
   - Click "Save Settings"

3. **Test Everything:**
   - Run a manual scrape
   - Try bulk assignment
   - Check activity log
   - Export CSV

### 5. Configure Monitoring

#### Shark Tank Monitor:
- **Recommended Interval**: 5-10 minutes
- **Purpose**: Catches unprotected files quickly
- **With 200 agents**: Set to 5 minutes for best results

#### Watchlist Monitor:
- **Recommended Interval**: 60 minutes (1 hour)
- **Purpose**: Checks specific protected files
- **Battery-friendly**: Less frequent checks

### 6. Optional: Custom Domain

1. **Buy Domain:** (e.g., from Namecheap, Google Domains)

2. **In Railway:**
   - Go to Settings → "Domains"
   - Click "Custom Domain"
   - Enter your domain: `logixx.yourdomain.com`

3. **Update DNS:**
   - Add CNAME record:
     - Name: `logixx` (or your subdomain)
     - Value: `your-project.railway.app`
     - TTL: 3600

4. **Wait for SSL:**
   - Railway auto-generates SSL certificate
   - Usually ready in 5-10 minutes

## Monitoring & Maintenance

### Check Deployment Status

**Via Dashboard:**
- Go to Railway project
- Check "Deployments" tab
- Green = running, Red = error

**Via CLI:**
```bash
# Check status
railway status

# View logs
railway logs

# Restart if needed
railway restart
```

### View Logs

```bash
# Stream live logs
railway logs --follow

# View specific number of lines
railway logs -n 100
```

### Update Your Code

#### With GitHub:
```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Railway auto-deploys!
```

#### With CLI:
```bash
# Deploy new version
railway up
```

## Troubleshooting

### Problem: Build Fails

**Solution:**
1. Check Railway logs for errors
2. Verify `package.json` is correct
3. Ensure all dependencies are listed
4. Try manual install:
```bash
railway run npm install
```

### Problem: Playwright Not Working

**Solution:**
1. Verify custom start command includes Playwright install
2. Check that `--with-deps` flag is present
3. Redeploy with proper command:
```bash
npx playwright install chromium --with-deps && npm start
```

### Problem: Login Fails

**Solution:**
1. Check LOGIXX credentials in settings
2. Delete cookies: Remove `data/cookies.json`
3. Try manual LOGIXX login to verify account
4. Check Railway logs for authentication errors

### Problem: Monitors Not Running

**Solution:**
1. Verify monitors are enabled in settings
2. Check interval settings are valid
3. Review activity log for errors
4. Restart Railway service

### Problem: Out of Memory

**Solution:**
1. Upgrade Railway plan (if needed)
2. Reduce scraping page count
3. Clear old activity logs
4. Optimize database queries

### Problem: Connection Timeouts

**Solution:**
1. Check LOGIXX site is accessible
2. Verify network connectivity
3. Try shorter timeout values
4. Check Railway service health

## Resource Usage

### Free Tier Limits:
- **$5 credit/month** (approximately)
- **~500 hours** of uptime
- **1 GB RAM** per service
- **10 GB storage**

### Typical Usage:
- **RAM**: 300-500 MB
- **CPU**: Low (spikes during scraping)
- **Network**: Moderate
- **Storage**: < 100 MB

### Expected Cost:
- **Month 1**: FREE ($5 credit)
- **Month 2+**: ~$5-10/month depending on usage

## Optimization Tips

1. **Reduce Scraping Frequency:**
   - Adjust intervals based on needs
   - Longer intervals = lower costs

2. **Limit Page Count:**
   - Scrape only necessary pages
   - Use targeted searches

3. **Clean Up Data:**
   - Periodically clear old activity
   - Remove completed watchlist items

4. **Monitor Usage:**
   - Check Railway dashboard regularly
   - Set up usage alerts

## Security Best Practices

1. **Change Default Credentials:**
   - Update LOGIXX password regularly
   - Don't share dashboard URL publicly

2. **Use Environment Variables:**
   - In Railway settings, add:
     - `LOGIXX_USERNAME`
     - `LOGIXX_PASSWORD`
   - Update code to use env vars

3. **Enable HTTPS:**
   - Always use provided Railway URL (has SSL)
   - Or use custom domain with SSL

4. **Regular Updates:**
   - Keep dependencies updated
   - Monitor for security patches

## Backup Strategy

Railway doesn't provide automatic backups, so:

1. **Export Data Regularly:**
   - Use CSV export feature
   - Download activity logs
   - Save watchlist items

2. **Git Backups:**
   - Commit code changes
   - Push to GitHub regularly

3. **Database Exports:**
   - Manually download `data/` folder contents
   - Store in secure location

## Getting Help

### Railway Resources:
- **Documentation**: https://docs.railway.app
- **Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/railwayapp/railway

### Dashboard Issues:
- Check activity log in dashboard
- Review Railway deployment logs
- Verify settings configuration

## Success Checklist

- [ ] Railway account created
- [ ] Project deployed successfully
- [ ] Playwright browsers installed
- [ ] Public URL accessible
- [ ] LOGIXX credentials configured
- [ ] Monitors enabled and running
- [ ] Manual scrape successful
- [ ] CSV export working
- [ ] Bulk assignment tested
- [ ] Activity log showing events

## Next Steps

1. **Bookmark Your Dashboard**: Save the Railway URL
2. **Test All Features**: Scrape, assign, export
3. **Configure Intervals**: Set optimal monitoring frequencies
4. **Monitor Activity**: Check daily for first week
5. **Optimize Settings**: Adjust based on results

---

**You're all set!** 🎉

Your LOGIXX Dashboard is now running 24/7 in the cloud, automatically monitoring and assigning files while you work!

**Access from anywhere:**
- 💻 Your work computer
- 📱 Your phone
- 🏠 Your home computer

**Questions?** Review this guide or check the main README.md
