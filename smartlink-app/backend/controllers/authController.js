const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { createUniqueSlug } = require('../services/slugService');
const { defaultProfileTheme } = require('../services/themeService');

const sanitizeText = (value, maxLen) => String(value || '').trim().slice(0, maxLen);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const registerUser = async (req, res) => {
  const email = sanitizeText(req.body.email, 320).toLowerCase();
  const password = String(req.body.password || '');
  const artistName = sanitizeText(req.body.artist_name, 120);
  const notificationEmail = sanitizeText(req.body.notification_email, 320).toLowerCase();

  if (!email || !password || !artistName) {
    return res.status(400).json({ message: 'email, password and artist_name are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (notificationEmail && !isValidEmail(notificationEmail)) {
    return res.status(400).json({ message: 'Invalid notification_email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const artistSlug = await createUniqueSlug({
      client,
      table: 'users',
      column: 'artist_slug',
      input: artistName,
      maxLen: 64,
      fallback: 'artist',
    });

    const insertResult = await client.query(
      `INSERT INTO users (
         id, email, password_hash, artist_name, artist_slug, notification_email, profile_theme
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       RETURNING id, email, artist_name, artist_slug, notification_email, created_at`,
      [userId, email, passwordHash, artistName, artistSlug, notificationEmail || null, JSON.stringify(defaultProfileTheme)]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'User registered successfully',
      user: insertResult.rows[0],
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback failures and return the original error
      }
    }
    return res.status(500).json({ message: 'Failed to register user', error: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const loginUser = async (req, res) => {
  const email = sanitizeText(req.body.email, 320).toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, email, password_hash, artist_name, artist_slug, bio, avatar_image, profile_theme
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: 'Server JWT secret is not configured' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, artist_slug: user.artist_slug },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        artist_name: user.artist_name,
        artist_slug: user.artist_slug,
        bio: user.bio,
        avatar_image: user.avatar_image,
        profile_theme: user.profile_theme || defaultProfileTheme,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, artist_name, artist_slug, bio, avatar_image, profile_theme, notification_email
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};
