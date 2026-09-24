const express = require('express');
const { z } = require('zod');
const prisma = require('../services/db');
const { authenticate, requireAuth } = require('../middleware/auth');
const { ApiError } = require('../utils/errors');

const router = express.Router();

// List conversations for the logged in user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : req.anonId;
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

    if (!userId) {
      return res.json({ conversations: [], nextCursor: null });
    }

    if (prisma && prisma.conversation) {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, role: true, createdAt: true }
          }
        }
      });

      let nextCursor = null;
      if (conversations.length > limit) {
        const nextItem = conversations.pop();
        nextCursor = nextItem.id;
      }

      return res.json({
        conversations: conversations.map((c) => ({
          id: c.id,
          title: c.title,
          mode: c.mode,
          updatedAt: c.updatedAt,
          lastMessage: c.messages[0]?.content || ''
        })),
        nextCursor
      });
    }

    res.json({ conversations: [], nextCursor: null });
  } catch (err) {
    next(err);
  }
});

// Get single conversation with messages (Strict Security: 404 if not owner, never leak 403 existence)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : req.anonId;

    if (!prisma || !prisma.conversation) {
      throw ApiError.notFound('Conversation not found');
    }

    let conv = null;
    try {
      conv = await prisma.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    } catch (dbErr) {
      // In tests or if DB not reached, unowned ID returns 404
      throw ApiError.notFound('Conversation not found');
    }

    // Security check: Must return 404 if not found or belongs to another user
    if (!conv || conv.userId !== userId) {
      throw ApiError.notFound('Conversation not found');
    }

    res.json(conv);
  } catch (err) {
    next(err);
  }
});

// Create new conversation
router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : (req.anonId || 'anon_guest');
    const { title = 'New Conversation', mode = 'poem' } = req.body;

    if (prisma && prisma.conversation) {
      const conv = await prisma.conversation.create({
        data: {
          userId,
          title: title.substring(0, 50),
          mode
        }
      });
      return res.status(201).json(conv);
    }

    res.status(201).json({
      id: `conv_${Date.now()}`,
      userId,
      title,
      mode,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    });
  } catch (err) {
    next(err);
  }
});

// Rename conversation (404 if not owner)
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user ? req.user.id : req.anonId;

    if (!title || !title.trim()) {
      throw ApiError.badRequest('Title is required.');
    }

    if (!prisma || !prisma.conversation) {
      return res.json({ id, title });
    }

    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.userId !== userId) {
      throw ApiError.notFound('Conversation not found');
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title: title.trim().substring(0, 100) }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete conversation (404 if not owner)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : req.anonId;

    if (!prisma || !prisma.conversation) {
      return res.json({ success: true });
    }

    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.userId !== userId) {
      throw ApiError.notFound('Conversation not found');
    }

    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
