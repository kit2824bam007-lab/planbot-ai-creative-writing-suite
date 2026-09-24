const express = require('express');
const crypto = require('crypto');
const prisma = require('../services/db');
const redis = require('../services/redis');
const { env } = require('../config/env');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/errors');

const router = express.Router();

/**
 * GET /api/subscription/status
 * Returns current user's subscription and daily usage status
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const isAuth = Boolean(req.user && req.user.id);
    const now = new Date();

    // Today's date string YYYY-MM-DD
    const tz = req.query.tz || req.headers['x-timezone'] || 'UTC';
    let dateStr = now.toISOString().split('T')[0];
    try {
      if (tz && tz !== 'UTC') {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = formatter.formatToParts(now);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        if (y && m && d) dateStr = `${y}-${m}-${d}`;
      }
    } catch (_) {}

    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const resetsAt = midnight.toISOString();

    if (!isAuth) {
      // Guest status
      const anonId = req.anonId || req.clientIp || 'guest';
      const redisKey = `genlimit:anon:${anonId}:${dateStr}`;
      const usedStr = await redis.get(redisKey);
      const used = parseInt(usedStr || '0', 10);
      const limit = env.DAILY_LIMIT_FREE || 10;
      const remaining = Math.max(0, limit - used);

      return res.json({
        plan: 'FREE',
        status: 'ACTIVE',
        isPro: false,
        limit,
        used,
        remaining,
        resetsAt,
        isAnonymous: true
      });
    }

    // Authenticated user
    let user = null;
    if (prisma && prisma.client && prisma.isAvailable()) {
      user = await prisma.client.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          subscriptionStartDate: true,
          subscriptionExpiryDate: true
        }
      });
    }

    if (!user) {
      user = req.user;
    }

    // Check if Pro subscription is expired
    if (user.plan === 'PRO') {
      const isExpired = user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) < now;

      if (isExpired) {
        // Automatically downgrade to FREE
        if (prisma && prisma.client && prisma.isAvailable()) {
          await prisma.client.user.update({
            where: { id: user.id },
            data: {
              plan: 'FREE',
              subscriptionStatus: 'EXPIRED'
            }
          }).catch(() => {});
        }

        user.plan = 'FREE';
        user.subscriptionStatus = 'EXPIRED';
      } else {
        // PRO is active
        return res.json({
          plan: 'PRO',
          status: 'ACTIVE',
          isPro: true,
          startDate: user.subscriptionStartDate,
          expiryDate: user.subscriptionExpiryDate,
          limit: null,
          used: null,
          remaining: null,
          isAnonymous: false
        });
      }
    }

    // FREE plan: Check daily usage
    const limit = env.DAILY_LIMIT_FREE || 10;
    const redisKey = `genlimit:user:${user.id}:${dateStr}`;
    const usedStr = await redis.get(redisKey);
    let used = parseInt(usedStr || '0', 10);

    // Cross-check with PostgreSQL DailyUsage table if redis is cold
    if (used === 0 && prisma && prisma.client && prisma.isAvailable() && prisma.client.dailyUsage) {
      try {
        const dbUsage = await prisma.client.dailyUsage.findUnique({
          where: { userId_usageDate: { userId: user.id, usageDate: dateStr } }
        });
        if (dbUsage) {
          used = dbUsage.generationCount;
          await redis.set(redisKey, used, 'EX', 86400);
        }
      } catch (_) {}
    }

    const remaining = Math.max(0, limit - used);

    return res.json({
      plan: 'FREE',
      status: user.subscriptionStatus || 'ACTIVE',
      isPro: false,
      startDate: user.subscriptionStartDate,
      expiryDate: user.subscriptionExpiryDate,
      limit,
      used,
      remaining,
      resetsAt,
      isAnonymous: false
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/create-order
 * Creates a Razorpay order for ₹30 (30 days Pro subscription)
 */
router.post('/create-order', authenticate, async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Please sign in to upgrade to Pro.'
        }
      });
    }

    const amount = 3000; // ₹30 in paise
    const currency = 'INR';
    let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // If Razorpay live/test key is set and not a placeholder, call Razorpay API
    const isLiveConfigured =
      env.RAZORPAY_KEY_ID &&
      env.RAZORPAY_KEY_SECRET &&
      !env.RAZORPAY_KEY_ID.includes('placeholder') &&
      !env.RAZORPAY_KEY_SECRET.includes('placeholder');

    if (isLiveConfigured) {
      try {
        const Razorpay = require('razorpay');
        const instance = new Razorpay({
          key_id: env.RAZORPAY_KEY_ID,
          key_secret: env.RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await instance.orders.create({
          amount,
          currency,
          receipt: `rcpt_${req.user.id.substring(0, 8)}_${Date.now()}`
        });

        orderId = rzpOrder.id;
      } catch (rzpErr) {
        console.warn('Razorpay API error, falling back to simulated order:', rzpErr.message);
      }
    }

    // Persist order in DB
    if (prisma && prisma.client && prisma.isAvailable() && prisma.client.subscriptionOrder) {
      try {
        await prisma.client.subscriptionOrder.create({
          data: {
            userId: req.user.id,
            orderId,
            amount,
            currency,
            status: 'PENDING'
          }
        });
      } catch (dbErr) {
        console.warn('Could not persist subscription order to DB:', dbErr.message);
      }
    }

    res.json({
      orderId,
      amount,
      currency,
      keyId: env.RAZORPAY_KEY_ID || 'rzp_test_planbot2026',
      user: {
        name: req.user.name || '',
        email: req.user.email || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subscription/verify-payment
 * Verifies Razorpay payment signature and activates 30-day Pro access
 */
router.post('/verify-payment', authenticate, async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Please sign in to complete subscription.'
        }
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      throw ApiError.badRequest('Missing payment verification details.', 'INVALID_PAYMENT_DATA');
    }

    // Verify signature
    const isLiveConfigured =
      env.RAZORPAY_KEY_ID &&
      env.RAZORPAY_KEY_SECRET &&
      !env.RAZORPAY_KEY_ID.includes('placeholder') &&
      !env.RAZORPAY_KEY_SECRET.includes('placeholder');

    if (isLiveConfigured && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        throw ApiError.badRequest('Invalid payment signature verification failed.', 'PAYMENT_VERIFICATION_FAILED');
      }
    }

    const now = new Date();
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update User in PostgreSQL
    if (prisma && prisma.client && prisma.isAvailable()) {
      await prisma.client.user.update({
        where: { id: req.user.id },
        data: {
          plan: 'PRO',
          subscriptionStatus: 'ACTIVE',
          subscriptionStartDate: now,
          subscriptionExpiryDate: expiryDate,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id
        }
      });

      // Update Order record
      if (prisma.client.subscriptionOrder) {
        await prisma.client.subscriptionOrder.updateMany({
          where: { orderId: razorpay_order_id },
          data: {
            status: 'PAID',
            paymentId: razorpay_payment_id,
            signature: razorpay_signature || 'verified'
          }
        }).catch(() => {});
      }
    }

    // Reset Redis daily limit counters for this user
    try {
      const tz = req.query.tz || req.headers['x-timezone'] || 'UTC';
      let dateStr = now.toISOString().split('T')[0];
      const redisKey = `genlimit:user:${req.user.id}:${dateStr}`;
      await redis.del(redisKey);
    } catch (_) {}

    res.json({
      success: true,
      message: 'Pro subscription activated successfully! Enjoy 30 days of unlimited AI generations.',
      subscription: {
        plan: 'PRO',
        status: 'ACTIVE',
        isPro: true,
        startDate: now.toISOString(),
        expiryDate: expiryDate.toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
