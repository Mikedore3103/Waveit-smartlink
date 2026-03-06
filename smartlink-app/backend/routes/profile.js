const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getMyProfile, updateMyProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/profile', authMiddleware, getMyProfile);
router.put('/profile', authMiddleware, updateMyProfile);

module.exports = router;
