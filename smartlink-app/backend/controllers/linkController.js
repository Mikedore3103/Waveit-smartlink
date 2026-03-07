const path = require('path');
const geoip = require('geoip-lite');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const { createUniqueSlug } = require('../services/slugService');
const { sanitizeLinkTheme, defaultLinkTheme } = require('../services/themeService');
const { maybeNotifyMilestones } = require('../services/notificationService');
const { generateQrDataUrl } = require('../services/qrService');

const supportedPlatforms = new Set([
  'Spotify',
  'Apple Music',
  'YouTube',
  'Audiomack',
  'SoundCloud',
  'Boomplay',
]);

const analyticsCache = new Map();
const ANALYTICS_CACHE_TTL_MS = 60 * 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
const MAX_COVER_IMAGE_DATA_URL_LENGTH = 3 * 1024 * 1024;
const SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;

const sanitizeText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);
const isValidUuid = (value) => UUID_RE.test(String(value || ''));

const isValidUrl = (value) => {
  if (!value) return true;
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const sanitizeCoverImage = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) return trimmed;
  return sanitizeText(trimmed, MAX_URL_LENGTH);
};

const isValidCoverImage = (value) => {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:image/')) {
    if (value.length > MAX_COVER_IMAGE_DATA_URL_LENGTH) return false;
    return DATA_IMAGE_RE.test(value);
  }
  return isValidUrl(value);
};

const getCachedAnalytics = (linkId) => {
  const entry = analyticsCache.get(linkId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    analyticsCache.delete(linkId);
    return null;
  }
  return entry.value;
};

const setCachedAnalytics = (linkId, value) => {
  analyticsCache.set(linkId, {
    value,
    expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS,
  });
};

const invalidateAnalyticsCache = (linkId) => {
  analyticsCache.delete(linkId);
};

const sanitizePlatforms = (platforms) => {
  if (!Array.isArray(platforms)) return [];

  return platforms
    .map((item) => ({
      platform_name: sanitizeText(item.platform_name, 50),
      platform_url: sanitizeText(item.platform_url, MAX_URL_LENGTH),
    }))
    .filter((item) => item.platform_name && item.platform_url);
};

const validatePlatforms = (platforms) => {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return 'At least one platform entry is required';
  }

  for (const platform of platforms) {
    if (!supportedPlatforms.has(platform.platform_name)) {
      return `Unsupported platform: ${platform.platform_name}`;
    }
    if (!isValidUrl(platform.platform_url)) {
      return `Invalid platform URL for ${platform.platform_name}`;
    }
  }

  return null;
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const source = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = source ? source.split(',')[0].trim() : req.ip;
  return ip ? ip.replace(/^::ffff:/, '') : null;
};

const getDeviceType = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getBaseUrl = (req) => {
  const envBase = process.env.PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
};

const buildPublicLinkUrl = (req, slug) => {
  const baseUrl = getBaseUrl(req);
  return `${baseUrl}/link.html?slug=${encodeURIComponent(slug)}`;
};

const logAnalyticsEvent = async ({ linkId, platformClicked, req, utm }) => {
  const ipAddress = getClientIp(req);
  const geo = ipAddress ? geoip.lookup(ipAddress) : null;
  const country = geo ? geo.country : null;
  const device = getDeviceType(req.get('user-agent') || '');
  const referrer = req.get('referer') || null;

  await pool.query(
    `INSERT INTO analytics (
      link_id, platform_clicked, country, device, referrer, ip_address,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      linkId,
      platformClicked,
      country,
      device,
      referrer,
      ipAddress,
      utm?.utm_source || null,
      utm?.utm_medium || null,
      utm?.utm_campaign || null,
      utm?.utm_term || null,
      utm?.utm_content || null,
    ]
  );

  invalidateAnalyticsCache(linkId);
  await maybeNotifyMilestones(linkId);
};

const createLink = async (req, res) => {
  const userId = req.user && req.user.userId;
  const title = sanitizeText(req.body.title, MAX_TITLE_LENGTH);
  const coverImage = sanitizeCoverImage(req.body.cover_image);
  const sanitizedPlatforms = sanitizePlatforms(req.body.platforms);
  const linkTheme = sanitizeLinkTheme(req.body.theme);
  const shareTitle = sanitizeText(req.body.share_title || title, 120);
  const shareDescription = sanitizeText(req.body.share_description || '', 220);

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!title) return res.status(400).json({ message: 'title is required' });
  if (coverImage && !isValidCoverImage(coverImage)) {
    return res.status(400).json({ message: 'Invalid cover_image. Use an https URL or data:image base64 payload.' });
  }

  const platformValidationError = validatePlatforms(sanitizedPlatforms);
  if (platformValidationError) return res.status(400).json({ message: platformValidationError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const linkId = uuidv4();
    const slug = await createUniqueSlug({
      client,
      table: 'links',
      column: 'slug',
      input: title,
      maxLen: 64,
      fallback: 'smartlink',
    });

    const linkResult = await client.query(
      `INSERT INTO links (id, user_id, title, cover_image, slug, theme, share_title, share_description)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       RETURNING id, user_id, title, cover_image, slug, theme, share_title, share_description, created_at`,
      [linkId, userId, title, coverImage || null, slug, JSON.stringify(linkTheme), shareTitle || null, shareDescription || null]
    );

    for (const platform of sanitizedPlatforms) {
      await client.query(
        `INSERT INTO platform_links (link_id, platform_name, platform_url)
         VALUES ($1, $2, $3)`,
        [linkId, platform.platform_name, platform.platform_url]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      message: 'Smartlink created successfully',
      link: linkResult.rows[0],
      platforms: sanitizedPlatforms,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to create smartlink', error: error.message });
  } finally {
    client.release();
  }
};

const getLinks = async (req, res) => {
  const userId = req.user && req.user.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await pool.query(
      `SELECT
         l.id,
         l.title,
         l.slug,
         l.cover_image,
         l.theme,
         l.share_title,
         l.share_description,
         l.created_at,
         COALESCE(ac.total_clicks, 0)::INT AS total_clicks,
         COALESCE(pl.platforms, '[]'::json) AS platforms
       FROM links l
       LEFT JOIN (
         SELECT link_id, COUNT(*)::INT AS total_clicks
         FROM analytics
         GROUP BY link_id
       ) ac ON ac.link_id = l.id
       LEFT JOIN (
         SELECT
           link_id,
           json_agg(
             json_build_object(
               'platform_name', platform_name,
               'platform_url', platform_url
             )
             ORDER BY id ASC
           ) AS platforms
         FROM platform_links
         GROUP BY link_id
       ) pl ON pl.link_id = l.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [userId]
    );
    return res.status(200).json({ links: result.rows });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch links', error: error.message });
  }
};

const updateLink = async (req, res) => {
  const userId = req.user && req.user.userId;
  const linkId = req.params.id;
  const title = sanitizeText(req.body.title, MAX_TITLE_LENGTH);
  const coverImage = sanitizeCoverImage(req.body.cover_image);
  const hasCoverImageField = Object.prototype.hasOwnProperty.call(req.body, 'cover_image');
  const hasPlatformsField = Object.prototype.hasOwnProperty.call(req.body, 'platforms');
  const hasThemeField = Object.prototype.hasOwnProperty.call(req.body, 'theme');
  const hasShareTitleField = Object.prototype.hasOwnProperty.call(req.body, 'share_title');
  const hasShareDescriptionField = Object.prototype.hasOwnProperty.call(req.body, 'share_description');
  const sanitizedPlatforms = sanitizePlatforms(req.body.platforms);

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!isValidUuid(linkId)) return res.status(400).json({ message: 'Invalid link id' });
  if (!title && !hasCoverImageField && !hasPlatformsField && !hasThemeField && !hasShareTitleField && !hasShareDescriptionField) {
    return res.status(400).json({ message: 'No update payload provided' });
  }
  if (hasCoverImageField && coverImage && !isValidCoverImage(coverImage)) {
    return res.status(400).json({ message: 'Invalid cover_image. Use an https URL or data:image base64 payload.' });
  }
  if (hasPlatformsField) {
    const platformValidationError = validatePlatforms(sanitizedPlatforms);
    if (platformValidationError) return res.status(400).json({ message: platformValidationError });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const linkResult = await client.query(
      `SELECT id, title, cover_image, theme, share_title, share_description
       FROM links
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [linkId, userId]
    );
    if (linkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Link not found' });
    }

    const current = linkResult.rows[0];
    const nextTheme = hasThemeField ? sanitizeLinkTheme(req.body.theme) : current.theme || defaultLinkTheme;
    const nextShareTitle = hasShareTitleField ? sanitizeText(req.body.share_title, 120) : current.share_title;
    const nextShareDescription = hasShareDescriptionField ? sanitizeText(req.body.share_description, 220) : current.share_description;

    await client.query(
      `UPDATE links
       SET title = $1,
           cover_image = $2,
           theme = $3::jsonb,
           share_title = $4,
           share_description = $5
       WHERE id = $6`,
      [
        title || current.title,
        hasCoverImageField ? (coverImage || null) : current.cover_image,
        JSON.stringify(nextTheme),
        nextShareTitle || null,
        nextShareDescription || null,
        linkId,
      ]
    );

    if (hasPlatformsField) {
      await client.query('DELETE FROM platform_links WHERE link_id = $1', [linkId]);
      for (const platform of sanitizedPlatforms) {
        await client.query(
          `INSERT INTO platform_links (link_id, platform_name, platform_url)
           VALUES ($1, $2, $3)`,
          [linkId, platform.platform_name, platform.platform_url]
        );
      }
    }

    await client.query('COMMIT');
    invalidateAnalyticsCache(linkId);
    return res.status(200).json({ message: 'Link updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to update link', error: error.message });
  } finally {
    client.release();
  }
};

const deleteLink = async (req, res) => {
  const userId = req.user && req.user.userId;
  const linkId = req.params.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!isValidUuid(linkId)) return res.status(400).json({ message: 'Invalid link id' });

  try {
    const result = await pool.query(
      `DELETE FROM links
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [linkId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Link not found' });
    invalidateAnalyticsCache(linkId);
    return res.status(200).json({ message: 'Link deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete link', error: error.message });
  }
};

const getAnalyticsByLinkId = async (req, res) => {
  const userId = req.user && req.user.userId;
  const linkId = req.params.link_id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!isValidUuid(linkId)) return res.status(400).json({ message: 'Invalid link_id' });

  const cached = getCachedAnalytics(linkId);
  if (cached) return res.status(200).json(cached);

  try {
    const linkResult = await pool.query(
      `SELECT id, title, slug
       FROM links
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [linkId, userId]
    );
    if (linkResult.rows.length === 0) return res.status(404).json({ message: 'Link not found' });

    const analyticsResult = await pool.query(
      `WITH filtered AS MATERIALIZED (
         SELECT platform_clicked, country, device, created_at, utm_campaign
         FROM analytics
         WHERE link_id = $1
       ),
       daily_agg AS (
         SELECT created_at::date AS day, COUNT(*)::INT AS clicks
         FROM filtered
         WHERE created_at >= CURRENT_DATE - INTERVAL '29 days'
         GROUP BY created_at::date
       ),
       days AS (
         SELECT generate_series(
           CURRENT_DATE - INTERVAL '29 days',
           CURRENT_DATE,
           INTERVAL '1 day'
         )::date AS day
       )
       SELECT
         (SELECT COUNT(*)::INT FROM filtered) AS total_clicks,
         COALESCE((
           SELECT json_agg(
             json_build_object('platform_clicked', s.platform_clicked, 'clicks', s.clicks)
             ORDER BY s.clicks DESC, s.platform_clicked ASC
           )
           FROM (
             SELECT COALESCE(NULLIF(platform_clicked, ''), 'Unknown') AS platform_clicked, COUNT(*)::INT AS clicks
             FROM filtered GROUP BY 1
           ) s
         ), '[]'::json) AS by_platform,
         COALESCE((
           SELECT json_agg(
             json_build_object('country', s.country, 'clicks', s.clicks)
             ORDER BY s.clicks DESC, s.country ASC
           )
           FROM (
             SELECT COALESCE(NULLIF(country, ''), 'Unknown') AS country, COUNT(*)::INT AS clicks
             FROM filtered GROUP BY 1
             ORDER BY clicks DESC, country ASC
             LIMIT 10
           ) s
         ), '[]'::json) AS top_countries,
         COALESCE((
           SELECT json_agg(
             json_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'clicks', COALESCE(a.clicks, 0))
             ORDER BY d.day ASC
           )
           FROM days d LEFT JOIN daily_agg a ON a.day = d.day
         ), '[]'::json) AS daily_clicks,
         COALESCE((
           SELECT json_agg(
             json_build_object('device', s.device, 'clicks', s.clicks)
             ORDER BY s.clicks DESC, s.device ASC
           )
           FROM (
             SELECT COALESCE(NULLIF(device, ''), 'unknown') AS device, COUNT(*)::INT AS clicks
             FROM filtered GROUP BY 1
           ) s
         ), '[]'::json) AS devices,
         COALESCE((
           SELECT json_agg(
             json_build_object('utm_campaign', s.utm_campaign, 'clicks', s.clicks)
             ORDER BY s.clicks DESC, s.utm_campaign ASC
           )
           FROM (
             SELECT COALESCE(NULLIF(utm_campaign, ''), 'Organic') AS utm_campaign, COUNT(*)::INT AS clicks
             FROM filtered GROUP BY 1
           ) s
         ), '[]'::json) AS by_campaign`,
      [linkId]
    );

    const row = analyticsResult.rows[0] || {};
    const payload = {
      link: linkResult.rows[0],
      totals: { total_clicks: row.total_clicks || 0 },
      by_platform: row.by_platform || [],
      top_countries: row.top_countries || [],
      daily_clicks: row.daily_clicks || [],
      devices: row.devices || [],
      by_campaign: row.by_campaign || [],
    };
    setCachedAnalytics(linkId, payload);
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
  }
};

const getLinkQrCode = async (req, res) => {
  const userId = req.user && req.user.userId;
  const linkId = req.params.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!isValidUuid(linkId)) return res.status(400).json({ message: 'Invalid link id' });

  try {
    const result = await pool.query(
      'SELECT slug FROM links WHERE id = $1 AND user_id = $2 LIMIT 1',
      [linkId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Link not found' });
    const slug = result.rows[0].slug;
    const linkUrl = buildPublicLinkUrl(req, slug);
    const qrDataUrl = await generateQrDataUrl(linkUrl);
    return res.status(200).json({ link_url: linkUrl, qr_data_url: qrDataUrl });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate QR', error: error.message });
  }
};

const getPublicLinkBySlug = async (req, res) => {
  const slug = sanitizeText(req.params.slug, 80);
  if (!slug || !SAFE_SLUG_RE.test(slug)) {
    return res.status(400).json({ message: 'Invalid smartlink slug' });
  }

  try {
    const linkResult = await pool.query(
      `SELECT
         l.id,
         l.title,
         l.cover_image,
         l.slug,
         l.theme,
         l.share_title,
         l.share_description,
         u.artist_name,
         u.artist_slug
       FROM links l
       JOIN users u ON u.id = l.user_id
       WHERE l.slug = $1
       LIMIT 1`,
      [slug]
    );
    if (linkResult.rows.length === 0) return res.status(404).json({ message: 'Smartlink not found' });
    const link = linkResult.rows[0];

    const platformsResult = await pool.query(
      `SELECT platform_name, platform_url
       FROM platform_links
       WHERE link_id = $1
       ORDER BY id ASC`,
      [link.id]
    );

    return res.status(200).json({
      link: {
        id: link.id,
        title: link.title,
        slug: link.slug,
        cover_image: link.cover_image,
        artist_name: link.artist_name,
        artist_slug: link.artist_slug,
        theme: link.theme || defaultLinkTheme,
        share_title: link.share_title,
        share_description: link.share_description,
      },
      platforms: platformsResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch smartlink', error: error.message });
  }
};

const trackPublicClick = async (req, res) => {
  const slug = sanitizeText(req.params.slug, 80);
  const platformClicked = sanitizeText(req.body.platform_clicked, 50);
  if (!slug || !SAFE_SLUG_RE.test(slug)) return res.status(400).json({ message: 'Invalid smartlink slug' });
  if (!platformClicked || !supportedPlatforms.has(platformClicked)) {
    return res.status(400).json({ message: 'platform_clicked is invalid' });
  }

  const utm = {
    utm_source: sanitizeText(req.body.utm_source, 120),
    utm_medium: sanitizeText(req.body.utm_medium, 120),
    utm_campaign: sanitizeText(req.body.utm_campaign, 120),
    utm_term: sanitizeText(req.body.utm_term, 120),
    utm_content: sanitizeText(req.body.utm_content, 120),
  };

  try {
    const linkResult = await pool.query('SELECT id FROM links WHERE slug = $1 LIMIT 1', [slug]);
    if (linkResult.rows.length === 0) return res.status(404).json({ message: 'Smartlink not found' });
    const linkId = linkResult.rows[0].id;
    await logAnalyticsEvent({ linkId, platformClicked, req, utm });
    return res.status(201).json({ message: 'Analytics tracked' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to track analytics', error: error.message });
  }
};

const trackClick = async (req, res) => {
  const linkId = sanitizeText(req.body.link_id, 36);
  const platformClicked = sanitizeText(req.body.platform_clicked, 50);

  if (!isValidUuid(linkId)) return res.status(400).json({ message: 'Invalid link_id' });
  if (!platformClicked || !supportedPlatforms.has(platformClicked)) {
    return res.status(400).json({ message: 'platform_clicked is invalid' });
  }

  const utm = {
    utm_source: sanitizeText(req.body.utm_source, 120),
    utm_medium: sanitizeText(req.body.utm_medium, 120),
    utm_campaign: sanitizeText(req.body.utm_campaign, 120),
    utm_term: sanitizeText(req.body.utm_term, 120),
    utm_content: sanitizeText(req.body.utm_content, 120),
  };

  try {
    const linkResult = await pool.query('SELECT id FROM links WHERE id = $1 LIMIT 1', [linkId]);
    if (linkResult.rows.length === 0) return res.status(404).json({ message: 'Smartlink not found' });
    await logAnalyticsEvent({ linkId, platformClicked, req, utm });
    return res.status(201).json({ message: 'Click tracked' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to track click', error: error.message });
  }
};

const renderPublicLinkPage = async (req, res) => {
  const slug = sanitizeText(req.params.slug, 80);
  if (!slug || !SAFE_SLUG_RE.test(slug)) return res.status(400).send('Invalid smartlink slug');

  try {
    const result = await pool.query(
      `SELECT l.title, l.cover_image, l.share_title, l.share_description, u.artist_name
       FROM links l
       JOIN users u ON u.id = l.user_id
       WHERE l.slug = $1
       LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Smartlink not found');
    }

    const link = result.rows[0];
    const baseUrl = getBaseUrl(req);
    const canonicalUrl = buildPublicLinkUrl(req, slug);
    const shareTitle = link.share_title || `${link.artist_name} - ${link.title}`;
    const shareDescription = link.share_description || `Listen to ${link.title} by ${link.artist_name}`;
    const image = link.cover_image || `${baseUrl}/cover-placeholder.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(shareTitle)}</title>
  <meta name="description" content="${escapeHtml(shareDescription)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${escapeHtml(shareTitle)}" />
  <meta property="og:description" content="${escapeHtml(shareDescription)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(shareTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(shareDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
</head>
<body class="public-link-body">
  <div class="page-bg"></div>
  <main class="public-link-shell" id="publicLinkShell">
    <p class="eyebrow">Smartlink</p>
    <img id="publicCover" class="public-cover" alt="Cover artwork" />
    <h1 id="publicSongTitle">Loading...</h1>
    <p id="publicArtistName" class="public-artist">Please wait</p>
    <section id="publicPlatforms" class="public-platforms"></section>
    <p id="publicState" class="public-state"></p>
  </main>
  <script src="/app.js"></script>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('Failed to render smartlink');
  }
};

const getPublicArtistBySlug = async (req, res) => {
  const artistSlug = sanitizeText(req.params.artist_slug, 80);
  if (!artistSlug || !SAFE_SLUG_RE.test(artistSlug)) {
    return res.status(400).json({ message: 'Invalid artist slug' });
  }

  try {
    const artistResult = await pool.query(
      `SELECT id, artist_name, artist_slug, bio, avatar_image, profile_theme
       FROM users
       WHERE artist_slug = $1
       LIMIT 1`,
      [artistSlug]
    );
    if (artistResult.rows.length === 0) return res.status(404).json({ message: 'Artist not found' });

    const artist = artistResult.rows[0];
    const linksResult = await pool.query(
      `SELECT id, title, slug, cover_image, theme
       FROM links
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [artist.id]
    );

    return res.status(200).json({
      artist: {
        artist_name: artist.artist_name,
        artist_slug: artist.artist_slug,
        bio: artist.bio,
        avatar_image: artist.avatar_image,
        profile_theme: artist.profile_theme,
      },
      links: linksResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch artist profile', error: error.message });
  }
};

const renderArtistProfilePage = (req, res) => {
  const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'artist.html');
  return res.sendFile(frontendPath);
};

module.exports = {
  createLink,
  getLinks,
  updateLink,
  deleteLink,
  getAnalyticsByLinkId,
  getLinkQrCode,
  renderPublicLinkPage,
  getPublicLinkBySlug,
  trackClick,
  trackPublicClick,
  getPublicArtistBySlug,
  renderArtistProfilePage,
};
