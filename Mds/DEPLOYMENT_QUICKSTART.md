# 🚀 Deployment Quick Start Guide

This is a simplified guide to get your Waveit Smartlink app live in under 30 minutes.

## What You're Deploying

- **Frontend** (HTML/CSS/JS) → GitHub Pages (Free)
- **Backend** (Node.js) → Render.com (Free)
- **Database** (PostgreSQL) → Render.com (Free)

---

## Step 1: Deploy Frontend to GitHub Pages (5 minutes)

Your frontend files are already in the root directory! ✅

1. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your GitHub repository
   - Click **Settings** → **Pages**
   - Source: Branch `main`, Folder `/ (root)`
   - Click **Save**

3. **Get your URL:**
   - Wait 1-2 minutes
   - Your site will be at: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

---

## Step 2: Deploy Backend to Render.com (15 minutes)

### 2.1 Create Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (easiest)

### 2.2 Create PostgreSQL Database
1. Click **New +** → **PostgreSQL**
2. Settings:
   - Name: `waveit-smartlink-db`
   - Database: `waveit_smartlink`
   - Region: Choose closest to you
   - Plan: **Free**
3. Click **Create Database**
4. **Save the Internal Database URL** (you'll need it next)

### 2.3 Set Up Database Schema
1. In your database dashboard, click **Connect** → **External Connection**
2. Copy the **External Database URL**
3. On your computer, run:
   ```bash
   cd smartlink-app/backend
   npm install
   ```
4. Create a `.env` file in `smartlink-app/backend/`:
   ```env
   DB_HOST=<from External URL>
   DB_PORT=5432
   DB_USER=<from External URL>
   DB_PASSWORD=<from External URL>
   DB_NAME=waveit_smartlink
   JWT_SECRET=your_random_32_character_secret
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=production
   ```
5. Run the database setup:
   ```bash
   npm run setup-db
   ```

### 2.4 Deploy Backend Web Service
1. In Render dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository
3. Settings:
   - Name: `waveit-smartlink-api`
   - Region: Same as database
   - Branch: `main`
   - Root Directory: `smartlink-app/backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free**

4. **Add Environment Variables** (click Advanced):
   
   Use the **Internal Database URL** from Step 2.2:
   ```
   DB_HOST=<from Internal URL>
   DB_PORT=5432
   DB_USER=<from Internal URL>
   DB_PASSWORD=<from Internal URL>
   DB_NAME=waveit_smartlink
   JWT_SECRET=<same as your local .env>
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=production
   ```

5. Click **Create Web Service**
6. Wait 3-5 minutes for deployment
7. **Save your backend URL**: `https://waveit-smartlink-api.onrender.com`

---

## Step 3: Connect Frontend to Backend (5 minutes)

### 3.1 Use the Configuration Script (Easiest)

Run this command in your project root:
```bash
node configure-production.js https://YOUR-BACKEND-URL.onrender.com
```

This will automatically update your files!

### 3.2 Manual Configuration (Alternative)

If the script doesn't work, manually edit these files:

**File 1: [`api.js`](api.js:1)** (line 1)
```javascript
// Change this:
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'http://localhost:5000';

// To this (use your actual Render URL):
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'https://waveit-smartlink-api.onrender.com';
```

**File 2: [`smartlink-app/backend/server.js`](smartlink-app/backend/server.js:34)** (line 34)
```javascript
// Change this:
app.use(cors());

// To this (use your actual GitHub Pages URL):
app.use(cors({
  origin: [
    'https://YOUR-USERNAME.github.io',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));
```

### 3.3 Deploy Changes
```bash
git add .
git commit -m "Configure production URLs"
git push origin main
```

Wait 2-3 minutes for both services to redeploy.

---

## Step 4: Test Your App (5 minutes)

1. **Visit your frontend:**
   - `https://YOUR-USERNAME.github.io/YOUR-REPO/`

2. **Check backend health:**
   - `https://YOUR-BACKEND.onrender.com/api/health`
   - Should show: "API working"

3. **Test the app:**
   - Click "Register" and create an account
   - Login with your credentials
   - Create a smartlink
   - View analytics

If everything works: **Congratulations! 🎉**

---

## Troubleshooting

### Frontend shows but can't register/login
- Check browser console (F12) for errors
- Verify backend URL in [`api.js`](api.js:1) is correct
- Check backend is running: visit `/api/health`

### Backend shows "API working" but registration fails
- Check Render logs for errors
- Verify database is running
- Make sure you ran `npm run setup-db`

### CORS errors in browser
- Update CORS configuration in [`server.js`](smartlink-app/backend/server.js:34)
- Make sure GitHub Pages URL is in allowed origins
- Redeploy backend after changes

### Backend is slow (30-60 seconds)
- This is normal for Render free tier (cold starts)
- Backend spins down after 15 minutes of inactivity
- Consider using [UptimeRobot](https://uptimerobot.com) to keep it awake

---

## Important Notes

### Free Tier Limitations
- **Render Backend**: Spins down after 15 min inactivity (30-60s cold start)
- **Render Database**: Expires after 90 days (can create new one)
- **GitHub Pages**: No limitations for static sites

### Keeping Backend Awake (Optional)
Use [UptimeRobot](https://uptimerobot.com) to ping your backend every 14 minutes:
1. Sign up for free
2. Add monitor: `https://YOUR-BACKEND.onrender.com/api/health`
3. Set interval: 14 minutes

### Cost to Upgrade
If you want always-on service:
- Render Web Service: $7/month
- Render PostgreSQL: $7/month
- **Total: $14/month**

---

## Next Steps

- [ ] Set up custom domain (optional)
- [ ] Add email notifications (configure SMTP in .env)
- [ ] Monitor app performance
- [ ] Set up regular database backups
- [ ] Add error tracking (e.g., Sentry)

---

## Support Files

- **Detailed Backend Guide**: [`BACKEND_DEPLOYMENT_GUIDE.md`](BACKEND_DEPLOYMENT_GUIDE.md:1)
- **GitHub Pages Setup**: [`GITHUB_PAGES_SETUP.md`](GITHUB_PAGES_SETUP.md:1)
- **Configuration Script**: [`configure-production.js`](configure-production.js:1)
- **Database Setup Script**: [`smartlink-app/backend/setup-database.js`](smartlink-app/backend/setup-database.js:1)

---

## Quick Commands Reference

```bash
# Frontend deployment
git add .
git commit -m "Deploy to production"
git push origin main

# Backend local setup
cd smartlink-app/backend
npm install
npm run setup-db
npm start

# Configure production
node configure-production.js https://your-backend-url.onrender.com

# Test backend locally
curl http://localhost:5000/api/health

# Test backend production
curl https://your-backend-url.onrender.com/api/health
```

---

**Need help?** Check the detailed guides or review Render logs for error messages.

Good luck! 🚀
