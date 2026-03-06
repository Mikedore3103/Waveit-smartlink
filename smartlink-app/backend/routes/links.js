const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createLink,
  getLinks,
  updateLink,
  deleteLink,
  getAnalyticsByLinkId,
  getLinkQrCode,
} = require('../controllers/linkController');

const router = express.Router();

router.get('/links', authMiddleware, getLinks);
router.get('/links/user', authMiddleware, getLinks);
router.get('/analytics/:link_id', authMiddleware, getAnalyticsByLinkId);
router.get('/links/:id/qr', authMiddleware, getLinkQrCode);
router.post('/links', authMiddleware, createLink);
router.put('/links/:id', authMiddleware, updateLink);
router.delete('/links/:id', authMiddleware, deleteLink);

module.exports = router;
