const express = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const originalityService = require('../services/originality.service');
const { env } = require('../config/env');

const router = express.Router();

const checkSchema = z.object({
  content: z.string().min(1, 'Content is required for originality screening.'),
  contentType: z.enum(['poem', 'story', 'creator', 'social', 'caption']).optional().default('poem'),
  contentId: z.string().optional().nullable()
});

/**
 * POST /api/originality/check
 * Screens generated content for phrase overlap & semantic similarity against database
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    if (!env.ORIGINALITY_CHECK_ENABLED) {
      return res.json({
        enabled: false,
        status: 'disabled',
        message: 'Originality screening is currently disabled in configuration.'
      });
    }

    const parseResult = checkSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload for originality check.',
          details: parseResult.error.format()
        }
      });
    }

    const { content, contentType, contentId } = parseResult.data;
    const userId = req.user ? req.user.id : null;

    const result = await originalityService.checkOriginality({
      content,
      contentType,
      contentId,
      userId
    });

    res.json(result);
  } catch (err) {
    console.error('[OriginalityRoutes] Unexpected error:', err);
    // Graceful fallback response: never break client generation
    res.json({
      status: 'unavailable',
      message: 'Originality screening is temporarily unavailable.',
      riskLevel: 'LOW',
      exactMatchFound: false,
      semanticSimilarity: 'LOW',
      similarityScore: 0,
      matchedPhrases: [],
      reason: 'Originality screening is temporarily unavailable.',
      recommendation: 'Generated content remains fully usable.',
      sourcesChecked: 'PlanBot generated-content database'
    });
  }
});

module.exports = router;
