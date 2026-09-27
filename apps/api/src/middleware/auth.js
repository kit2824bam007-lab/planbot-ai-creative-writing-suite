const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../utils/errors');
const db = require('../services/db');

/**
 * Optional authentication middleware:
 * Attaches req.user if valid JWT token is present in cookie or Authorization header.
 * Otherwise sets req.anonId for rate-limiting and anonymous tracking.
 */
async function authenticate(req, res, next) {
  try {
    // 1. Establish stable anonymous ID and client IP for all requests
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const rawHeaderAnonId = req.headers['x-anon-id'];
    const isValidAnonFormat =
      typeof rawHeaderAnonId === 'string' &&
      /^anon_[a-zA-Z0-9_-]{4,64}$/.test(rawHeaderAnonId);

    const clientAnonId = isValidAnonFormat
      ? rawHeaderAnonId
      : `anon_${clientIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

    req.user = null;
    req.anonId = clientAnonId;
    req.clientIp = clientIp;

    let token = null;

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        if (decoded && decoded.id) {
          // If database is available, fetch user or use decoded payload
          if (db.isAvailable() && db.client) {
            try {
              const user = await db.client.user.findUnique({
                where: { id: decoded.id },
                select: {
                  id: true,
                  email: true,
                  name: true,
                  avatar: true,
                  plan: true,
                  isEmailVerified: true,
                  subscriptionStatus: true,
                  subscriptionStartDate: true,
                  subscriptionExpiryDate: true
                }
              });
              if (user) {
                // Block unverified accounts from authenticated access (preserves anonId)
                if (user.isEmailVerified === false) {
                  req.user = null;
                  return next();
                }

                if (user.plan === 'PRO' && user.subscriptionExpiryDate && new Date(user.subscriptionExpiryDate) < new Date()) {
                  user.plan = 'FREE';
                  user.subscriptionStatus = 'EXPIRED';
                  db.client.user.update({
                    where: { id: user.id },
                    data: { plan: 'FREE', subscriptionStatus: 'EXPIRED' }
                  }).catch(() => {});
                }
                req.user = user;
                return next();
              }
            } catch (dbErr) {
              console.warn('[Auth Middleware] DB lookup error:', dbErr.message);
            }
          }
          req.user = { id: decoded.id, email: decoded.email, plan: decoded.plan || 'FREE' };
          return next();
        }
      } catch (err) {
        // Invalid or expired token; continue as anonymous
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Strict authentication guard
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return next(ApiError.unauthorized('Please sign in to access this feature.'));
  }
  next();
}

module.exports = {
  authenticate,
  requireAuth
};
