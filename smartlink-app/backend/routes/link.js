const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  renderPublicLinkPage,
  renderArtistProfilePage,
  getPublicLinkBySlug,
  getPublicArtistBySlug,
  trackClick,
  trackPublicClick,
} = require('../controllers/linkController');

const router = express.Router();
const publicClickLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many click events. Please try again later.' },
});

router.get('/l/:slug', renderPublicLinkPage);
router.get('/artist/:artist_slug', renderArtistProfilePage);
router.post('/api/track-click', trackClick);
router.get('/api/public/links/:slug', getPublicLinkBySlug);
router.get('/api/public/artists/:artist_slug', getPublicArtistBySlug);
router.post('/api/public/links/:slug/click', publicClickLimiter, trackPublicClick);

module.exports = router;
