const redis = require('../services/redis');
const { env } = require('../config/env');
const { ApiError } = require('../utils/errors');
const { getLocalizedMessage } = require('../config/i18n-messages');

/**
 * Calculates current date string (YYYY-MM-DD) and seconds until midnight
 * based on provided timezone or UTC.
 */
function getTimezoneDetails(tzString) {
  let now = new Date();
  try {
    if (tzString && typeof tzString === 'string' && tzString !== 'UTC') {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tzString,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = formatter.formatToParts(now);
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      if (year && month && day) {
        const dateStr = `${year}-${month}-${day}`;
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));
        return { dateStr, secondsUntilMidnight, resetsAt: midnight.toISOString() };
      }
    }
  } catch (err) {
    // Fallback to UTC
  }

  const dateStr = now.toISOString().split('T')[0];
  const midnight = new Date();
  midnight.setUTCHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  return { dateStr, secondsUntilMidnight, resetsAt: midnight.toISOString() };
}

const prisma = require('../services/db');

/**
 * Middleware: Checks and increments daily generation limits via Redis and PostgreSQL
 */
async function checkDailyLimit(req, res, next) {
  try {
    const isAuth = Boolean(req.user && req.user.id);
    const now = new Date();

    // Today's date string YYYY-MM-DD
    const tz = req.query.tz || req.headers['x-timezone'] || 'UTC';
    const { dateStr, secondsUntilMidnight, resetsAt } = getTimezoneDetails(tz);

    // If authenticated, check live subscription in DB
    if (isAuth && prisma && prisma.client && prisma.isAvailable()) {
      try {
        const liveUser = await prisma.client.user.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            plan: true,
            subscriptionStatus: true,
            subscriptionExpiryDate: true
          }
        });

        if (liveUser) {
          req.user.plan = liveUser.plan;
          req.user.subscriptionStatus = liveUser.subscriptionStatus;
          req.user.subscriptionExpiryDate = liveUser.subscriptionExpiryDate;
        }
      } catch (_) {}
    }

    const plan = isAuth ? (req.user.plan || 'FREE') : 'FREE';

    // Check PRO status & expiration
    if (plan === 'PRO') {
      const isExpired = req.user.subscriptionExpiryDate && new Date(req.user.subscriptionExpiryDate) < now;

      if (isExpired) {
        // Automatically revert to FREE
        if (prisma && prisma.client && prisma.isAvailable()) {
          await prisma.client.user.update({
            where: { id: req.user.id },
            data: {
              plan: 'FREE',
              subscriptionStatus: 'EXPIRED'
            }
          }).catch(() => {});
        }
        req.user.plan = 'FREE';
        req.user.subscriptionStatus = 'EXPIRED';
      } else {
        // PRO is active: unlimited access!
        res.setHeader('X-Daily-Limit', 'Unlimited');
        res.setHeader('X-Remaining-Today', 'Unlimited');
        res.setHeader('X-User-Plan', 'PRO');
        req.quota = { limit: 999999, used: 0, remaining: 999999, plan: 'PRO', isAnonymous: false };
        return next();
      }
    }

    // FREE plan: 10 generations per day
    const limit = env.DAILY_LIMIT_FREE || 10;
    const identifier = isAuth ? `user:${req.user.id}` : `anon:${req.anonId || req.clientIp}`;

    const redisKey = `genlimit:${identifier}:${dateStr}`;
    const used = await redis.incr(redisKey);

    if (used === 1) {
      await redis.expire(redisKey, secondsUntilMidnight);
    }

    // Persist daily usage in DB for authenticated users
    if (isAuth && prisma && prisma.client && prisma.isAvailable() && prisma.client.dailyUsage) {
      prisma.client.dailyUsage.upsert({
        where: { userId_usageDate: { userId: req.user.id, usageDate: dateStr } },
        create: { userId: req.user.id, usageDate: dateStr, generationCount: used },
        update: { generationCount: used }
      }).catch(() => {});
    }

    const remaining = Math.max(0, limit - used);
    res.setHeader('X-Daily-Limit', limit);
    res.setHeader('X-Used-Today', used);
    res.setHeader('X-Remaining-Today', remaining);
    res.setHeader('X-Resets-At', resetsAt);
    res.setHeader('X-User-Plan', 'FREE');

    if (used > limit) {
      return res.status(429).json({
        error: 'FREE_LIMIT_REACHED',
        message: "You've reached today's free generation limit.",
        upgradeRequired: true,
        limit,
        used,
        remaining: 0,
        resetsAt
      });
    }

    req.quota = { limit, used, remaining, resetsAt, plan: 'FREE', isAnonymous: !isAuth };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Read-only quota inspector (does not increment count)
 */
async function getQuotaStatus(req) {
  const isAuth = Boolean(req.user && req.user.id);
  const now = new Date();
  const tz = req.query.tz || req.headers['x-timezone'] || 'UTC';
  const { dateStr, resetsAt } = getTimezoneDetails(tz);

  if (isAuth && prisma && prisma.client && prisma.isAvailable()) {
    try {
      const liveUser = await prisma.client.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          plan: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionExpiryDate: true
        }
      });
      if (liveUser) {
        req.user.plan = liveUser.plan;
        req.user.subscriptionStatus = liveUser.subscriptionStatus;
        req.user.subscriptionStartDate = liveUser.subscriptionStartDate;
        req.user.subscriptionExpiryDate = liveUser.subscriptionExpiryDate;
      }
    } catch (_) {}
  }

  const plan = isAuth ? (req.user.plan || 'FREE') : 'FREE';

  if (plan === 'PRO') {
    const isExpired = req.user.subscriptionExpiryDate && new Date(req.user.subscriptionExpiryDate) < now;
    if (!isExpired) {
      return {
        limit: 999999,
        used: 0,
        remaining: 999999,
        resetsAt: null,
        plan: 'PRO',
        status: 'ACTIVE',
        isPro: true,
        startDate: req.user.subscriptionStartDate,
        expiryDate: req.user.subscriptionExpiryDate,
        isAnonymous: false
      };
    }
  }

  const limit = env.DAILY_LIMIT_FREE || 10;
  const identifier = isAuth ? `user:${req.user.id}` : `anon:${req.anonId || req.clientIp}`;

  const redisKey = `genlimit:${identifier}:${dateStr}`;
  const current = await redis.get(redisKey);
  const used = parseInt(current || '0', 10);
  const remaining = Math.max(0, limit - used);

  return {
    limit,
    used,
    remaining,
    resetsAt,
    plan: 'FREE',
    status: req.user?.subscriptionStatus || 'ACTIVE',
    isPro: false,
    startDate: req.user?.subscriptionStartDate || null,
    expiryDate: req.user?.subscriptionExpiryDate || null,
    isAnonymous: !isAuth
  };
}

module.exports = {
  checkDailyLimit,
  getQuotaStatus
};
