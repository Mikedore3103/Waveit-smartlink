# GitHub Pages Deployment Guide

## Problem
When deploying to GitHub Pages, you received the error: "The site configured at this address does not contain the requested file."

## Solution
GitHub Pages requires an `index.html` file in the root directory of your repository (or in a `/docs` folder if configured that way).

## What Was Done
All frontend files have been copied to the root directory of your repository:
- `index.html` - Main landing page
- `style.css` - Stylesheet
- `app.js` - Main JavaScript file
- `api.js` - API helper functions
- `login.html` - Login page
- `register.html` - Registration page
- `dashboard.html` - User dashboard
- `create-link.html` - Create smartlink page
- `analytics.html` - Analytics page
- `link.html` - Link display page
- `artist.html` - Artist profile page

## How to Deploy to GitHub Pages

### Step 1: Commit and Push Your Changes
```bash
git add .
git commit -m "Add GitHub Pages support - copy frontend files to root"
git push origin main
```

### Step 2: Enable GitHub Pages
1. Go to your GitHub repository
2. Click on **Settings**
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: `main` (or `master`)
   - Folder: `/ (root)`
5. Click **Save**

### Step 3: Wait for Deployment
- GitHub will automatically build and deploy your site
- This usually takes 1-3 minutes
- You'll see a green checkmark when it's ready
- Your site will be available at: `https://[your-username].github.io/[repository-name]/`

## Important Notes

### Backend Functionality
⚠️ **The backend will NOT work on GitHub Pages** because:
- GitHub Pages only serves static files (HTML, CSS, JavaScript)
- It cannot run Node.js servers or connect to databases
- API calls in the frontend will fail unless you deploy the backend separately

### To Make the Full App Work:
You need to deploy the backend separately to a service like:
- **Heroku** (free tier available)
- **Railway** (free tier available)
- **Render** (free tier available)
- **Vercel** (for serverless functions)
- **Netlify** (for serverless functions)

Then update the API endpoint in your frontend files to point to your deployed backend URL.

### Current Setup
- **Frontend**: GitHub Pages (static hosting)
- **Backend**: Needs separate deployment (Node.js + PostgreSQL)

## File Structure
```
Repository Root/
├── index.html              (GitHub Pages entry point)
├── style.css
├── app.js
├── api.js
├── login.html
├── register.html
├── dashboard.html
├── create-link.html
├── analytics.html
├── link.html
├── artist.html
├── smartlink-app/
│   ├── frontend/          (original frontend files)
│   ├── backend/           (Node.js backend - needs separate hosting)
│   └── database/          (PostgreSQL schema)
└── GITHUB_PAGES_SETUP.md  (this file)
```

## Next Steps
1. ✅ Commit and push the changes
2. ✅ Enable GitHub Pages in repository settings
3. ⏳ Deploy backend to a Node.js hosting service
4. ⏳ Update API endpoints in frontend to point to deployed backend
5. ⏳ Test the full application

## Troubleshooting

### "404 - File not found"
- Make sure you've pushed all files to GitHub
- Check that GitHub Pages is enabled in Settings > Pages
- Verify the branch and folder settings are correct

### "Site not updating"
- Clear your browser cache
- Wait a few minutes for GitHub to rebuild
- Check the Actions tab for build status

### "API calls failing"
- This is expected on GitHub Pages
- You need to deploy the backend separately
- Update the API base URL in your frontend code
