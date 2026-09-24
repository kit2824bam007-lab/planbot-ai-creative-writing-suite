const express = require('express');
const keyPool = require('../services/keyPool');
const prisma = require('../services/db');
const { env } = require('../config/env');
const { ApiError } = require('../utils/errors');

const router = express.Router();

// Admin verification middleware
function requireAdminKey(req, res, next) {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  if (!adminKey || adminKey !== env.ADMIN_API_KEY) {
    return next(ApiError.forbidden('Invalid admin access credentials.'));
  }
  next();
}

router.use(requireAdminKey);

// GET /api/admin/keys - Masked health & cooldown status of Gemini API keys
router.get('/keys', (req, res) => {
  const status = keyPool.getStatus();
  res.json({ keys: status });
});

// GET /api/admin/stats - Overview metrics
router.get('/stats', async (req, res, next) => {
  try {
    let totalUsers = 0;
    let totalGenerations = 0;
    let recentLogs = [];

    if (prisma && prisma.user && prisma.generationLog) {
      totalUsers = await prisma.user.count();
      totalGenerations = await prisma.generationLog.count();
      recentLogs = await prisma.generationLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json({
      totalUsers,
      totalGenerations,
      keyPoolStatus: keyPool.getStatus(),
      recentLogs
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/feedback
router.get('/feedback', async (req, res, next) => {
  try {
    if (prisma && prisma.feedback) {
      const feedbacks = await prisma.feedback.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { poem: true, user: true }
      });
      return res.json({ feedbacks });
    }
    res.json({ feedbacks: [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
