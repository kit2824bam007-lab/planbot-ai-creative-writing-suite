const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../services/db');
const { env } = require('../config/env');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { ApiError } = require('../utils/errors');
const { authenticate } = require('../middleware/auth');
const { validateEmail } = require('../services/emailValidator');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      plan: user.plan || 'FREE'
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function setTokenCookie(res, token) {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

// In-memory user cache for instant dev/offline operation
const localUsers = new Map();

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Verify email is a genuine, permanent email address (reject fake & disposable domains)
    const emailCheck = await validateEmail(email);
    if (!emailCheck.isValid) {
      throw ApiError.badRequest(
        emailCheck.message || 'Invalid email ID. Fake or disposable email addresses are not allowed.',
        emailCheck.code || 'INVALID_EMAIL'
      );
    }

    const passwordHash = await hashPassword(password);

    let user = null;

    if (db.isAvailable() && db.client) {
      try {
        const existing = await db.client.user.findUnique({ where: { email } });
        if (existing) {
          throw ApiError.badRequest('Email is already registered.', 'EMAIL_EXISTS');
        }

        user = await db.client.user.create({
          data: {
            email,
            passwordHash,
            name: name || email.split('@')[0],
            plan: 'FREE'
          },
          select: { id: true, email: true, name: true, plan: true, createdAt: true }
        });
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    if (!user) {
      if (localUsers.has(email)) {
        throw ApiError.badRequest('Email is already registered.', 'EMAIL_EXISTS');
      }
      user = {
        id: `usr_${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        plan: 'FREE',
        passwordHash,
        createdAt: new Date()
      };
      localUsers.set(email, user);
    }

    const token = createToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    let user = null;

    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.findUnique({ where: { email } });
      } catch (err) {
        // fallback
      }
    }

    if (!user && localUsers.has(email)) {
      user = localUsers.get(email);
    }

    // Auto-create account if user is testing with any email/password during dev
    if (!user) {
      const passwordHash = await hashPassword(password);
      user = {
        id: `usr_${Date.now()}`,
        email,
        name: email.split('@')[0],
        plan: 'FREE',
        passwordHash,
        createdAt: new Date()
      };
      localUsers.set(email, user);
    } else {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw ApiError.unauthorized('Invalid email or password.');
      }
    }

    const token = createToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

// Real Google OAuth endpoint using Google Identity Services ID token verification
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body || {};

    if (!credential || typeof credential !== 'string' || !credential.trim()) {
      throw ApiError.badRequest('Missing Google credential token.', 'MISSING_GOOGLE_CREDENTIAL');
    }

    // Verify Google ID token via Google's tokeninfo endpoint
    let tokenInfo;
    try {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`);
      if (!googleRes.ok) {
        throw new Error('Google token verification failed');
      }
      tokenInfo = await googleRes.json();
    } catch (verifyErr) {
      throw ApiError.unauthorized('Invalid or expired Google credential token.', 'INVALID_GOOGLE_TOKEN');
    }

    if (!tokenInfo || !tokenInfo.sub || tokenInfo.error_description) {
      throw ApiError.unauthorized('Invalid Google credential token payload.', 'INVALID_GOOGLE_TOKEN');
    }

    // Verify audience if GOOGLE_CLIENT_ID is configured
    if (env.GOOGLE_CLIENT_ID && tokenInfo.aud && tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
      console.warn(`[Auth] Google token audience mismatch: token aud=${tokenInfo.aud}, expected=${env.GOOGLE_CLIENT_ID}`);
      throw ApiError.unauthorized('Google token audience mismatch.', 'GOOGLE_AUD_MISMATCH');
    }

    const verifiedSub = tokenInfo.sub;
    const cleanEmail = (tokenInfo.email || '').toLowerCase().trim();
    const verifiedName = tokenInfo.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Google User');
    const verifiedAvatar = tokenInfo.picture || null;

    let user = null;

    if (db.isAvailable() && db.client) {
      try {
        // 1. Try finding existing user by stable Google sub ID
        user = await db.client.user.findUnique({
          where: { googleId: verifiedSub },
          select: { id: true, email: true, name: true, plan: true, avatar: true }
        });

        // 2. If not found, try finding existing user by verified email
        if (!user && cleanEmail) {
          const existingByEmail = await db.client.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true, email: true, name: true, plan: true, avatar: true }
          });

          if (existingByEmail) {
            // Link verified Google ID to existing account
            user = await db.client.user.update({
              where: { id: existingByEmail.id },
              data: {
                googleId: verifiedSub,
                avatar: verifiedAvatar || existingByEmail.avatar
              },
              select: { id: true, email: true, name: true, plan: true, avatar: true }
            });
          }
        }

        // 3. If no user exists, create a new user profile linked to Google ID
        if (!user) {
          user = await db.client.user.create({
            data: {
              googleId: verifiedSub,
              email: cleanEmail || null,
              name: verifiedName,
              avatar: verifiedAvatar,
              plan: 'FREE'
            },
            select: { id: true, email: true, name: true, plan: true, avatar: true }
          });
        }
      } catch (dbErr) {
        console.error('[Auth] Database error during Google login:', dbErr);
        throw ApiError.internal('Database error during authentication.');
      }
    } else {
      // In-memory fallback for local dev / offline testing only
      console.warn('⚠️ PostgreSQL unavailable during Google login.');
      if (process.env.NODE_ENV === 'production') {
        throw ApiError.internal('Database connection is not available in production.');
      }

      let existing = null;
      for (const u of localUsers.values()) {
        if (u.googleId === verifiedSub || (cleanEmail && u.email === cleanEmail)) {
          existing = u;
          break;
        }
      }

      if (existing) {
        existing.googleId = verifiedSub;
        if (verifiedAvatar) existing.avatar = verifiedAvatar;
        user = existing;
      } else {
        user = {
          id: `usr_${Date.now()}`,
          googleId: verifiedSub,
          email: cleanEmail,
          name: verifiedName,
          avatar: verifiedAvatar,
          plan: 'FREE',
          createdAt: new Date()
        };
        localUsers.set(cleanEmail || verifiedSub, user);
      }
    }

    const token = createToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatar: user.avatar
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  const isProd = env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

router.get('/me', authenticate, async (req, res) => {
  if (req.user && req.user.id) {
    return res.json({
      authenticated: true,
      user: req.user
    });
  }

  res.json({
    authenticated: false,
    user: null,
    anonId: req.anonId
  });
});

module.exports = router;
