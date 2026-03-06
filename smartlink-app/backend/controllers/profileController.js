const pool = require('../config/db');
const { createUniqueSlug } = require('../services/slugService');
const { sanitizeProfileTheme } = require('../services/themeService');

const sanitizeText = (value, maxLen) => String(value || '').trim().slice(0, maxLen);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
const isValidUrl = (value) => {
  if (!value) return true;
  try {
    const u = new URL(String(value));
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch (e) {
    return false;
  }
};

const getMyProfile = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT id, email, artist_name, artist_slug, bio, avatar_image, profile_theme, notification_email
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Profile not found' });
    return res.status(200).json({ profile: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

const updateMyProfile = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const artistName = sanitizeText(req.body.artist_name, 120);
  const bio = sanitizeText(req.body.bio, 500);
  const avatarImage = sanitizeText(req.body.avatar_image, 2048);
  const notificationEmail = sanitizeText(req.body.notification_email, 320).toLowerCase();
  const profileTheme = sanitizeProfileTheme(req.body.profile_theme);

  if (notificationEmail && !isValidEmail(notificationEmail)) {
    return res.status(400).json({ message: 'Invalid notification_email format' });
  }
  if (avatarImage && !isValidUrl(avatarImage)) {
    return res.status(400).json({ message: 'Invalid avatar_image URL' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT artist_name, artist_slug, bio, avatar_image, notification_email, profile_theme
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Profile not found' });
    }

    const current = existing.rows[0];
    let nextArtistSlug = current.artist_slug;
    const nextArtistName = artistName || current.artist_name;
    if (artistName && artistName !== current.artist_name) {
      nextArtistSlug = await createUniqueSlug({
        client,
        table: 'users',
        column: 'artist_slug',
        input: artistName,
        maxLen: 64,
        fallback: 'artist',
      });
    }

    const result = await client.query(
      `UPDATE users
       SET artist_name = $1,
           artist_slug = $2,
           bio = $3,
           avatar_image = $4,
           notification_email = $5,
           profile_theme = $6::jsonb
       WHERE id = $7
       RETURNING id, email, artist_name, artist_slug, bio, avatar_image, notification_email, profile_theme`,
      [
        nextArtistName,
        nextArtistSlug,
        Object.prototype.hasOwnProperty.call(req.body, 'bio') ? bio : current.bio,
        Object.prototype.hasOwnProperty.call(req.body, 'avatar_image') ? (avatarImage || null) : current.avatar_image,
        Object.prototype.hasOwnProperty.call(req.body, 'notification_email') ? (notificationEmail || null) : current.notification_email,
        JSON.stringify(Object.prototype.hasOwnProperty.call(req.body, 'profile_theme') ? profileTheme : current.profile_theme),
        userId,
      ]
    );

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};
