# ⚡ Quick Command Reference

## 📦 Copy These Commands (In Order)

### 1. Navigate to Your Project
```powershell
cd "C:\Users\amirs\OneDrive\Desktop\AMIR BDS"
```

### 2. Add New Files
```powershell
git add .
```

### 3. Commit
```powershell
git commit -m "feat: Complete Playwright scraper with all features"
```

### 4. Push to GitHub
```powershell
git push origin master
```

## 🔧 Railway Environment Variables

Add these in Railway Dashboard → Variables:

```
DASHBOARD_PASSWORD = admin123
SESSION_SECRET = k8h2n9s4d7f6g3j5l1m0p9o8i7u6y5t4r3e2w1q0
LOGIXX_EMAIL = aasgari@betterdebtsolutions.com
LOGIXX_PASSWORD = Negin1995#
NODE_ENV = production
```

## 🔐 Generate Secure Session Secret

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Your URLs

- **Railway Project:** https://railway.app/project/gracious-magic
- **Dashboard:** https://bds-production-a66d.up.railway.app
- **GitHub Repo:** https://github.com/amirsaleh74/BDS

## ✅ Quick Test After Deploy

1. Visit dashboard URL
2. Login with: `admin123`
3. Scrape 1 page
4. Export CSV
5. Done! 🎉

## 🆘 Quick Fixes

### Permission Error
```powershell
git config --global user.email "your@email.com"
git config --global user.name "Your Name"
```

### Force Push (if needed)
```powershell
git push origin master --force
```

### Check Railway Logs
Railway Dashboard → Deployments → View logs

---

That's it! 🚀
