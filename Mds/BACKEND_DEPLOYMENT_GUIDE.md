# Backend Deployment Guide - Complete Setup

This guide will walk you through deploying your Waveit Smartlink backend so your GitHub Pages frontend can connect to it.

## Overview

Your app has two parts:
- **Frontend** (HTML/CSS/JS) → Already deployed on GitHub Pages ✅
- **Backend** (Node.js + PostgreSQL) → Needs deployment (this guide)

We'll use **Render.com** (free tier) for both the backend server and PostgreSQL database.

---

## Option 1: Deploy to Render.com (Recommended - Free Tier)

### Step 1: Prepare Your Backend for Deployment

#### 1.1 Add a start script to package.json
Your [`smartlink-app/backend/package.json`](smartlink-app/backend/package.json:1) already has this, so you're good! ✅

#### 1.2 Create a build script (optional but recommended)
Add this to your package.json scripts section if you want to run database migrations on deploy.

### Step 2: Sign Up for Render.com

1. Go to [https://render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with your GitHub account (easiest option)
4. Authorize Render to access your repositories

### Step 3: Create a PostgreSQL Database

1. From your Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure your database:
   - **Name**: `waveit-smartlink-db`
   - **Database**: `waveit_smartlink`
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users (e.g., Frankfurt for Europe, Oregon for US)
   - **PostgreSQL Version**: 16 (latest)
   - **Plan**: **Free** (0.1 GB storage, expires after 90 days but can be renewed)
3. Click **"Create Database"**
4. Wait 2-3 minutes for the database to be created

#### 3.1 Save Your Database Connection Details
Once created, you'll see:
- **Internal Database URL** (use this for your backend)
- **External Database URL** (use this to connect from your local machine)

Copy the **Internal Database URL** - it looks like:
```
postgresql://user:password@hostname/database
```

#### 3.2 Set Up Database Schema
You need to run your database schema. You have two options:

**Option A: Using Render's Web Shell**
1. In your database dashboard, click **"Connect"** → **"External Connection"**
2. Use a PostgreSQL client like pgAdmin or DBeaver
3. Connect using the External Database URL
4. Run the SQL from [`smartlink-app/database/schema.sql`](smartlink-app/database/schema.sql:1)

**Option B: Using psql command line**
```bash
# Install PostgreSQL client if you don't have it
# Then connect using the External Database URL
psql "postgresql://user:password@hostname/database"

# Copy and paste the contents of schema.sql
```

### Step 4: Deploy Your Backend Web Service

1. From Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `waveit-smartlink-api`
   - **Region**: Same as your database
   - **Branch**: `main` (or `master`)
   - **Root Directory**: `smartlink-app/backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (512 MB RAM, spins down after 15 min of inactivity)

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   DB_HOST=<from your database Internal URL>
   DB_PORT=5432
   DB_USER=<from your database Internal URL>
   DB_PASSWORD=<from your database Internal URL>
   DB_NAME=waveit_smartlink
   JWT_SECRET=<generate a random 32+ character string>
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=production
   ```

   **To extract DB details from Internal Database URL:**
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   ```
   - DB_HOST = HOST part
   - DB_USER = USER part
   - DB_PASSWORD = PASSWORD part
   - DB_NAME = DATABASE part

   **Generate JWT_SECRET:**
   ```bash
   # On Windows PowerShell:
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
   
   # On Mac/Linux:
   openssl rand -base64 32
   ```

5. Click **"Create Web Service"**
6. Wait 3-5 minutes for deployment
7. Your backend will be live at: `https://waveit-smartlink-api.onrender.com`

### Step 5: Update Frontend to Use Your Backend

Now you need to tell your GitHub Pages frontend where your backend is.

#### 5.1 Update the API Base URL

Edit [`api.js`](api.js:1) and change line 1:

```javascript
// OLD:
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'http://localhost:5000';

// NEW (replace with your actual Render URL):
const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'https://waveit-smartlink-api.onrender.com';
```

#### 5.2 Update CORS in Backend

Edit [`smartlink-app/backend/server.js`](smartlink-app/backend/server.js:34) to allow your GitHub Pages domain:

```javascript
// OLD:
app.use(cors());

// NEW (replace with your actual GitHub Pages URL):
app.use(cors({
  origin: [
    'https://YOUR-USERNAME.github.io',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  credentials: true
}));
```

### Step 6: Deploy Your Changes

```bash
# Commit and push your changes
git add .
git commit -m "Configure backend URL for production"
git push origin main
```

- GitHub Pages will auto-update in 1-2 minutes
- Render will auto-redeploy your backend in 2-3 minutes

### Step 7: Test Your Application

1. Visit your GitHub Pages site: `https://YOUR-USERNAME.github.io/REPO-NAME/`
2. Try to register a new account
3. Try to login
4. Try to create a smartlink

If everything works, congratulations! 🎉

---

## Option 2: Deploy to Railway.app (Alternative - Free Tier)

Railway is another excellent option with a generous free tier.

### Quick Steps:

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select your repository
5. Railway will auto-detect Node.js
6. Add PostgreSQL: Click **"New"** → **"Database"** → **"PostgreSQL"**
7. Add environment variables (same as Render)
8. Set root directory to `smartlink-app/backend`
9. Deploy!

Your backend will be at: `https://your-app.up.railway.app`

---

## Option 3: Deploy to Heroku (Paid - No Free Tier)

Heroku removed their free tier, but if you want to use it:

1. Sign up at [https://heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run:
   ```bash
   cd smartlink-app/backend
   heroku login
   heroku create waveit-smartlink-api
   heroku addons:create heroku-postgresql:mini
   git push heroku main
   heroku config:set JWT_SECRET=your_secret_here
   ```

---

## Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Your Service → Logs
- Verify all environment variables are set correctly
- Make sure database is running

### CORS errors in browser console
- Update the CORS configuration in [`server.js`](smartlink-app/backend/server.js:34)
- Make sure your GitHub Pages URL is in the allowed origins

### Database connection errors
- Verify DB credentials in environment variables
- Check if database is running in Render dashboard
- Make sure you're using the **Internal Database URL** for the backend

### "Cannot POST /api/register" or similar
- Check that your backend is actually running
- Visit `https://your-backend-url.onrender.com/api/health`
- Should return "API working"

### Free tier limitations
**Render Free Tier:**
- Backend spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- Database expires after 90 days (but you can create a new one)

**Solutions:**
- Use a service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 14 minutes
- Upgrade to paid tier ($7/month) for always-on service

---

## Environment Variables Reference

Here's a complete list of environment variables you need to set:

```env
# Database (from Render PostgreSQL Internal URL)
DB_HOST=dpg-xxxxx.oregon-postgres.render.com
DB_PORT=5432
DB_USER=waveit_smartlink_user
DB_PASSWORD=xxxxxxxxxxxxx
DB_NAME=waveit_smartlink

# JWT Authentication
JWT_SECRET=your_random_32_character_secret_here
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Optional - Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
```

---

## Final Checklist

- [ ] PostgreSQL database created on Render
- [ ] Database schema loaded from [`schema.sql`](smartlink-app/database/schema.sql:1)
- [ ] Backend web service deployed on Render
- [ ] All environment variables configured
- [ ] Backend health check working (`/api/health`)
- [ ] [`api.js`](api.js:1) updated with production backend URL
- [ ] CORS configured in [`server.js`](smartlink-app/backend/server.js:34)
- [ ] Changes committed and pushed to GitHub
- [ ] Frontend tested on GitHub Pages
- [ ] Registration and login working
- [ ] Smartlink creation working

---

## Cost Summary

**Free Option (Render):**
- Frontend: GitHub Pages (Free forever)
- Backend: Render Web Service (Free, with cold starts)
- Database: Render PostgreSQL (Free for 90 days, renewable)
- **Total: $0/month**

**Paid Option (Render):**
- Frontend: GitHub Pages (Free)
- Backend: Render Web Service ($7/month, always-on)
- Database: Render PostgreSQL ($7/month, 1GB storage)
- **Total: $14/month**

---

## Next Steps After Deployment

1. **Set up a custom domain** (optional)
   - Add CNAME record pointing to your GitHub Pages
   - Update CORS to include your custom domain

2. **Monitor your app**
   - Check Render logs regularly
   - Set up error tracking (e.g., Sentry)

3. **Backup your database**
   - Export database regularly
   - Render free tier doesn't include automatic backups

4. **Optimize performance**
   - Add caching
   - Optimize database queries
   - Consider CDN for static assets

---

## Support

If you run into issues:
1. Check Render logs for error messages
2. Test backend directly: `https://your-backend.onrender.com/api/health`
3. Check browser console for frontend errors
4. Verify environment variables are set correctly

Good luck with your deployment! 🚀
