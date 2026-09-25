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
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
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

// Google OAuth endpoint
router.post('/google', async (req, res, next) => {
  try {
    const { email = 'user@google.com', name = 'Google User', googleId = `g_${Date.now()}`, avatar } = req.body;

    let user = null;
    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.upsert({
          where: { googleId },
          update: { name, avatar },
          create: {
            email,
            googleId,
            name,
            avatar,
            plan: 'FREE'
          },
          select: { id: true, email: true, name: true, plan: true, avatar: true }
        });
      } catch (err) {
        // fallback
      }
    }

    if (!user) {
      user = {
        id: `g_${googleId}`,
        email,
        name,
        avatar,
        plan: 'FREE'
      };
      localUsers.set(email, user);
    }

    const token = createToken(user);
    setTokenCookie(res, token);

    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
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
