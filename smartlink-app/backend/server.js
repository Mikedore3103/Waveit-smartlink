require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const linksRoutes = require('./routes/links');
const profileRoutes = require('./routes/profile');
const publicLinkRoutes = require('./routes/link');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

const clickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many click events. Please try again later.' },
});

app.use(cors());
app.use(helmet());
app.use('/api', apiLimiter);
app.use('/api/track-click', clickLimiter);
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/api', authRoutes);
app.use('/api', linksRoutes);
app.use('/api', profileRoutes);
app.use(publicLinkRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      database: 'unreachable',
      error: error.message,
    });
  }
});

// Catch-all: return JSON 404 for unmatched /api/* routes
// (prevents Express from returning the HTML frontend for missing API endpoints)
app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({ message: `API route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (req.path && req.path.startsWith('/api/')) {
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
  return next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
