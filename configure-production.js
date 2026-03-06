#!/usr/bin/env node

/**
 * Configuration Helper for Production Deployment
 * 
 * This script helps you configure your frontend to connect to your deployed backend.
 * Run this after deploying your backend to Render/Railway/Heroku.
 * 
 * Usage:
 *   node configure-production.js https://your-backend-url.onrender.com
 */

const fs = require('fs');
const path = require('path');

// Get backend URL from command line argument
const backendUrl = process.argv[2];

if (!backendUrl) {
  console.error('\n❌ Error: Backend URL is required!\n');
  console.log('Usage: node configure-production.js <backend-url>\n');
  console.log('Example:');
  console.log('  node configure-production.js https://waveit-smartlink-api.onrender.com\n');
  process.exit(1);
}

// Validate URL format
try {
  new URL(backendUrl);
} catch (e) {
  console.error('\n❌ Error: Invalid URL format!\n');
  console.log('Please provide a valid URL including https://\n');
  console.log('Example:');
  console.log('  node configure-production.js https://waveit-smartlink-api.onrender.com\n');
  process.exit(1);
}

console.log('\n🔧 Configuring production settings...\n');

// 1. Update api.js
const apiJsPath = path.join(__dirname, 'api.js');
let apiJsContent = fs.readFileSync(apiJsPath, 'utf8');

const oldLine = "const API_BASE_URL = localStorage.getItem('apiBaseUrl') || 'http://localhost:5000';";
const newLine = `const API_BASE_URL = localStorage.getItem('apiBaseUrl') || '${backendUrl}';`;

if (apiJsContent.includes(oldLine)) {
  apiJsContent = apiJsContent.replace(oldLine, newLine);
  fs.writeFileSync(apiJsPath, apiJsContent, 'utf8');
  console.log('✅ Updated api.js with backend URL');
} else if (apiJsContent.includes(backendUrl)) {
  console.log('✅ api.js already configured with this backend URL');
} else {
  console.log('⚠️  Warning: Could not automatically update api.js');
  console.log('   Please manually update the API_BASE_URL in api.js');
}

// 2. Update backend server.js CORS configuration
const serverJsPath = path.join(__dirname, 'smartlink-app', 'backend', 'server.js');
let serverJsContent = fs.readFileSync(serverJsPath, 'utf8');

// Try to get GitHub Pages URL from git config
let githubPagesUrl = '';
try {
  const { execSync } = require('child_process');
  const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  
  // Parse GitHub URL
  const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
  if (match) {
    const username = match[1];
    const repo = match[2].replace('.git', '');
    githubPagesUrl = `https://${username}.github.io/${repo}`;
    console.log(`\n📍 Detected GitHub Pages URL: ${githubPagesUrl}`);
  }
} catch (e) {
  console.log('\n⚠️  Could not auto-detect GitHub Pages URL');
}

// Update CORS configuration
if (serverJsContent.includes('app.use(cors());')) {
  const corsConfig = `app.use(cors({
  origin: [
    ${githubPagesUrl ? `'${githubPagesUrl}',` : '// Add your GitHub Pages URL here'}
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5500' // For Live Server
  ],
  credentials: true
}));`;

  serverJsContent = serverJsContent.replace('app.use(cors());', corsConfig);
  fs.writeFileSync(serverJsPath, serverJsContent, 'utf8');
  console.log('✅ Updated server.js CORS configuration');
} else if (serverJsContent.includes('app.use(cors({')) {
  console.log('✅ server.js CORS already configured');
} else {
  console.log('⚠️  Warning: Could not automatically update CORS in server.js');
}

// 3. Create a summary
console.log('\n' + '='.repeat(60));
console.log('📋 Configuration Summary');
console.log('='.repeat(60));
console.log(`\nBackend URL: ${backendUrl}`);
if (githubPagesUrl) {
  console.log(`Frontend URL: ${githubPagesUrl}`);
}
console.log('\n✅ Configuration complete!\n');

console.log('Next steps:');
console.log('1. Review the changes in api.js and server.js');
console.log('2. Commit and push your changes:');
console.log('   git add .');
console.log('   git commit -m "Configure production URLs"');
console.log('   git push origin main');
console.log('\n3. Wait for deployments to complete:');
console.log('   - GitHub Pages: 1-2 minutes');
console.log('   - Render backend: 2-3 minutes');
console.log('\n4. Test your app at:');
if (githubPagesUrl) {
  console.log(`   ${githubPagesUrl}`);
} else {
  console.log('   https://YOUR-USERNAME.github.io/YOUR-REPO/');
}
console.log('\n5. Check backend health:');
console.log(`   ${backendUrl}/api/health`);
console.log('   (Should return "API working")\n');
