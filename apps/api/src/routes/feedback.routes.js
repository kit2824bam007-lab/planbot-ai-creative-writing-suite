const express = require('express');
const { z } = require('zod');
const prisma = require('../services/db');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../utils/errors');

const router = express.Router();

const feedbackSchema = z.object({
  poemId: z.string().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  flagged: z.boolean().default(false)
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = feedbackSchema.parse(req.body);

    if (prisma && prisma.feedback) {
      const feedback = await prisma.feedback.create({
        data: {
          poemId: data.poemId || null,
          userId: req.user?.id || null,
          rating: data.rating,
          comment: data.comment,
          flagged: data.flagged
        }
      });
      return res.status(201).json(feedback);
    }

    res.status(201).json({ success: true, message: 'Feedback recorded.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
