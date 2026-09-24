const express = require('express');
const prisma = require('../services/db');
const redis = require('../services/redis');
const keyPool = require('../services/keyPool');

const router = express.Router();

router.get('/', async (req, res) => {
  let dbStatus = 'healthy';
  let redisStatus = redis.isAvailable() ? 'connected' : 'memory_fallback';

  if (prisma && prisma.client && prisma.isAvailable()) {
    try {
      await prisma.client.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'offline_or_connecting';
    }
  } else {
    dbStatus = 'uninitialized';
  }

  const keyStatus = keyPool.getStatus();
  const availableKeys = keyStatus.filter((k) => !k.isCooldown).length;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      geminiKeyPool: {
        total: keyStatus.length,
        available: availableKeys
      }
    }
  });
});

module.exports = router;
