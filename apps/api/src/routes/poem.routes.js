const express = require('express');
const { z } = require('zod');
const prisma = require('../services/db');
const redis = require('../services/redis');
const { authenticate } = require('../middleware/auth');
const { generateSlug } = require('../utils/crypto');
const { ApiError } = require('../utils/errors');

const router = express.Router();

// List public poems
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 30);
    const mode = req.query.mode;

    if (prisma && prisma.poem) {
      const poems = await prisma.poem.findMany({
        where: {
          isPublic: true,
          mode: mode || undefined
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          prompt: true,
          content: true,
          mode: true,
          poemType: true,
          language: true,
          slug: true,
          viewCount: true,
          createdAt: true
        }
      });
      return res.json({ poems });
    }

    res.json({ poems: [] });
  } catch (err) {
    next(err);
  }
});

// Share / publish a poem and get unique public slug
router.post('/share', authenticate, async (req, res, next) => {
  try {
    const { prompt, content, mode = 'poem', poemType, genre, tone, language = 'ta' } = req.body;

    if (!content || !content.trim()) {
      throw ApiError.badRequest('Poem content cannot be empty.');
    }

    const slug = generateSlug(mode === 'poem' ? 'poem' : 'story');

    if (prisma && prisma.poem) {
      const poem = await prisma.poem.create({
        data: {
          userId: req.user?.id || null,
          prompt: prompt || 'Creative Composition',
          content,
          mode,
          poemType,
          genre,
          tone,
          language,
          slug,
          isPublic: true
        }
      });
      return res.status(201).json(poem);
    }

    res.status(201).json({
      id: `poem_${Date.now()}`,
      slug,
      prompt,
      content,
      mode,
      language,
      isPublic: true,
      viewCount: 0
    });
  } catch (err) {
    next(err);
  }
});

// GET /p/:slug (Public poem view + atomic viewCount via Redis INCR, flushed to DB every 10 views)
router.get('/p/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!prisma || !prisma.poem) {
      throw ApiError.notFound('Poem not found');
    }

    const poem = await prisma.poem.findUnique({
      where: { slug }
    });

    if (!poem || !poem.isPublic) {
      throw ApiError.notFound('Poem not found or is private.');
    }

    // Atomic view counter via Redis
    const viewKey = `views:${slug}`;
    const newViews = await redis.incr(viewKey);

    // Flush every 10 views to Postgres
    if (newViews % 10 === 0) {
      await prisma.poem.update({
        where: { slug },
        data: { viewCount: { increment: 10 } }
      });
    }

    res.json({
      ...poem,
      viewCount: poem.viewCount + (newViews % 10)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
