const express = require('express');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../services/db');
const { env } = require('../config/env');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { ApiError } = require('../utils/errors');
const { authenticate } = require('../middleware/auth');
const { validateEmail } = require('../services/emailValidator');
const emailService = require('../services/email.service');

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

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'Verification code must be a 6-digit number')
});

const resendOtpSchema = z.object({
  email: z.string().email()
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

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();

    // Verify email format and reject fake / disposable domains
    const emailCheck = await validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      throw ApiError.badRequest(
        emailCheck.message || 'Invalid email address. Fake or disposable email addresses are not allowed.',
        emailCheck.code || 'INVALID_EMAIL'
      );
    }

    const passwordHash = await hashPassword(password);
    const otp = emailService.generateOtp();
    const hashedOtp = emailService.hashOtp(otp);
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiration

    let user = null;

    if (db.isAvailable() && db.client) {
      try {
        const existing = await db.client.user.findUnique({ where: { email: cleanEmail } });
        if (existing) {
          if (existing.isEmailVerified) {
            throw ApiError.badRequest('Email is already registered.', 'EMAIL_EXISTS');
          }
          // Enforce 60-second cooldown if OTP was recently issued
          if (existing.verificationExpires) {
            const remainingMs = new Date(existing.verificationExpires).getTime() - Date.now();
            const elapsedMs = 15 * 60 * 1000 - remainingMs;
            if (elapsedMs < 60 * 1000) {
              const waitSec = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000));
              throw ApiError.tooManyRequests(`Please wait ${waitSec}s before requesting another code.`, 'RESEND_COOLDOWN');
            }
          }
          // If unverified account already exists, update credentials and issue fresh OTP
          user = await db.client.user.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              name: name || existing.name || cleanEmail.split('@')[0],
              verificationOtp: hashedOtp,
              verificationExpires: expires
            },
            select: { id: true, email: true, name: true, isEmailVerified: true }
          });
        } else {
          user = await db.client.user.create({
            data: {
              email: cleanEmail,
              passwordHash,
              name: name || cleanEmail.split('@')[0],
              plan: 'FREE',
              isEmailVerified: false,
              verificationOtp: hashedOtp,
              verificationExpires: expires
            },
            select: { id: true, email: true, name: true, isEmailVerified: true }
          });
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    if (!user) {
      const existing = localUsers.get(cleanEmail);
      if (existing) {
        if (existing.isEmailVerified) {
          throw ApiError.badRequest('Email is already registered.', 'EMAIL_EXISTS');
        }
        if (existing.verificationExpires) {
          const remainingMs = new Date(existing.verificationExpires).getTime() - Date.now();
          const elapsedMs = 15 * 60 * 1000 - remainingMs;
          if (elapsedMs < 60 * 1000) {
            const waitSec = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000));
            throw ApiError.tooManyRequests(`Please wait ${waitSec}s before requesting another code.`, 'RESEND_COOLDOWN');
          }
        }
      }
      user = {
        id: existing?.id || `usr_${Date.now()}`,
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        plan: 'FREE',
        passwordHash,
        isEmailVerified: false,
        verificationOtp: hashedOtp,
        verificationExpires: expires,
        createdAt: new Date()
      };
      localUsers.set(cleanEmail, user);
    }

    // Send verification email with 6-digit OTP
    await emailService.sendVerificationOtp(cleanEmail, otp, user.name);

    // Unverified account: do NOT issue session token or cookie
    res.status(201).json({
      requiresVerification: true,
      email: cleanEmail,
      message: 'A 6-digit verification code has been sent to your email.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();

    let user = null;
    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.findUnique({ where: { email: cleanEmail } });
      } catch (err) {
        // fallback
      }
    }
    if (!user && localUsers.has(cleanEmail)) {
      user = localUsers.get(cleanEmail);
    }

    if (!user) {
      throw ApiError.notFound('Account not found. Please sign up first.', 'USER_NOT_FOUND');
    }

    if (user.isEmailVerified) {
      const token = createToken(user);
      setTokenCookie(res, token);
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan
        },
        token,
        message: 'Account is already verified.'
      });
    }

    // Check expiration
    if (!user.verificationExpires || new Date() > new Date(user.verificationExpires)) {
      throw ApiError.badRequest('Verification code has expired. Please request a new code.', 'VERIFICATION_EXPIRED');
    }

    // Verify OTP hash
    const isValid = emailService.verifyOtpHash(otp, user.verificationOtp);
    if (!isValid) {
      throw ApiError.badRequest('Invalid verification code. Please check the code and try again.', 'VERIFICATION_FAILED');
    }

    // Mark user as verified
    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: true,
            verificationOtp: null,
            verificationExpires: null
          },
          select: { id: true, email: true, name: true, plan: true, isEmailVerified: true }
        });

        // Safely reassign guest conversations created with X-Anon-Id to this newly verified user
        const rawAnonId = req.headers['x-anon-id'];
        const isValidAnonFormat =
          typeof rawAnonId === 'string' &&
          /^anon_[a-zA-Z0-9_-]{4,64}$/.test(rawAnonId);
        if (isValidAnonFormat && rawAnonId !== user.id) {
          await db.client.conversation.updateMany({
            where: {
              userId: rawAnonId,
              user: {
                email: null,
                isEmailVerified: false
              }
            },
            data: { userId: user.id }
          }).catch((migErr) => console.warn('[OTP Migration] Fallback:', migErr.message));
        }
      } catch (err) {
        // fallback
      }
    }

    user.isEmailVerified = true;
    user.verificationOtp = null;
    user.verificationExpires = null;
    localUsers.set(cleanEmail, user);

    const token = createToken(user);
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
      },
      token,
      message: 'Email verified successfully!'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = resendOtpSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();

    let user = null;
    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.findUnique({ where: { email: cleanEmail } });
      } catch (err) {
        // fallback
      }
    }
    if (!user && localUsers.has(cleanEmail)) {
      user = localUsers.get(cleanEmail);
    }

    if (!user) {
      throw ApiError.notFound('Account not found. Please sign up first.', 'USER_NOT_FOUND');
    }

    if (user.isEmailVerified) {
      return res.json({ success: true, message: 'Account is already verified.' });
    }

    // Enforce 60-second cooldown between resends
    if (user.verificationExpires) {
      const remainingMs = new Date(user.verificationExpires).getTime() - Date.now();
      const elapsedMs = 15 * 60 * 1000 - remainingMs;
      if (elapsedMs < 60 * 1000) {
        const waitSec = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000));
        throw ApiError.tooManyRequests(`Please wait ${waitSec}s before requesting another code.`, 'RESEND_COOLDOWN');
      }
    }

    const newOtp = emailService.generateOtp();
    const newExpires = new Date(Date.now() + 15 * 60 * 1000);
    const hashedOtp = emailService.hashOtp(newOtp);

    if (db.isAvailable() && db.client) {
      try {
        await db.client.user.update({
          where: { id: user.id },
          data: {
            verificationOtp: hashedOtp,
            verificationExpires: newExpires
          }
        });
      } catch (err) {
        // fallback
      }
    }

    user.verificationOtp = hashedOtp;
    user.verificationExpires = newExpires;
    localUsers.set(cleanEmail, user);

    await emailService.sendVerificationOtp(cleanEmail, newOtp, user.name);

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (db.isAvailable() && db.client) {
      try {
        user = await db.client.user.findUnique({ where: { email: cleanEmail } });
      } catch (err) {
        // fallback
      }
    }

    if (!user && localUsers.has(cleanEmail)) {
      user = localUsers.get(cleanEmail);
    }

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Block login for unverified email accounts
    if (user.isEmailVerified === false) {
      throw ApiError.forbidden('Please verify your email address before signing in.', 'EMAIL_NOT_VERIFIED', {
        email: cleanEmail
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Safely reassign guest conversations created with X-Anon-Id to this user
    if (db.isAvailable() && db.client) {
      const rawAnonId = req.headers['x-anon-id'];
      const isValidAnonFormat =
        typeof rawAnonId === 'string' &&
        /^anon_[a-zA-Z0-9_-]{4,64}$/.test(rawAnonId);
      if (isValidAnonFormat && rawAnonId !== user.id) {
        await db.client.conversation.updateMany({
          where: {
            userId: rawAnonId,
            user: {
              email: null,
              isEmailVerified: false
            }
          },
          data: { userId: user.id }
        }).catch((migErr) => console.warn('[Login Migration] Fallback:', migErr.message));
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
            // Link verified Google ID to existing account & ensure email is marked verified
            user = await db.client.user.update({
              where: { id: existingByEmail.id },
              data: {
                googleId: verifiedSub,
                isEmailVerified: true,
                verificationOtp: null,
                verificationExpires: null,
                avatar: verifiedAvatar || existingByEmail.avatar
              },
              select: { id: true, email: true, name: true, plan: true, avatar: true }
            });
          }
        }

        // 3. If no user exists, create a new user profile linked to Google ID (already verified by Google)
        if (!user) {
          user = await db.client.user.create({
            data: {
              googleId: verifiedSub,
              email: cleanEmail || null,
              name: verifiedName,
              avatar: verifiedAvatar,
              isEmailVerified: true,
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
        existing.isEmailVerified = true;
        if (verifiedAvatar) existing.avatar = verifiedAvatar;
        user = existing;
      } else {
        user = {
          id: `usr_${Date.now()}`,
          googleId: verifiedSub,
          email: cleanEmail,
          name: verifiedName,
          avatar: verifiedAvatar,
          isEmailVerified: true,
          plan: 'FREE',
          createdAt: new Date()
        };
        localUsers.set(cleanEmail || verifiedSub, user);
      }
    }

    // Safely reassign guest conversations created with X-Anon-Id to this Google user
    if (db.isAvailable() && db.client) {
      const rawAnonId = req.headers['x-anon-id'];
      const isValidAnonFormat =
        typeof rawAnonId === 'string' &&
        /^anon_[a-zA-Z0-9_-]{4,64}$/.test(rawAnonId);
      if (isValidAnonFormat && rawAnonId !== user.id) {
        await db.client.conversation.updateMany({
          where: {
            userId: rawAnonId,
            user: {
              email: null,
              isEmailVerified: false
            }
          },
          data: { userId: user.id }
        }).catch((migErr) => console.warn('[Google Migration] Fallback:', migErr.message));
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
