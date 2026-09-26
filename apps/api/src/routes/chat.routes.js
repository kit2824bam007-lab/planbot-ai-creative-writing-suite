const express = require('express');
const { z } = require('zod');
const prisma = require('../services/db');
const redis = require('../services/redis');
const geminiService = require('../services/gemini');
const { detectLanguage } = require('../services/language');
const { validateGuards } = require('../services/guards');
const { buildSystemPrompt, buildActionPrompt, buildStructuredUserPrompt, CLASSICAL_TAMIL_FORMS } = require('../config/prompts');
const { authenticate } = require('../middleware/auth');
const { checkDailyLimit, getQuotaStatus, refundDailyLimit } = require('../middleware/rateLimit');
const { sanitizeInput } = require('../middleware/sanitize');
const { hashString } = require('../utils/crypto');
const { ApiError } = require('../utils/errors');

const mediaAnalysisService = require('../services/mediaAnalysis.service');

const router = express.Router();

const generateSchema = z.object({
  prompt: z.string().max(2000).optional().default(''),
  conversationId: z.string().optional(),
  mode: z.enum(['poem', 'story', 'creator']).default('poem'),
  poemType: z.string().optional(),
  genre: z.string().optional(),
  tone: z.string().optional(),
  length: z.enum(['short', 'medium', 'long', 'standard']).default('medium'),
  language: z.enum(['en', 'ta']).default('ta'),
  platform: z.string().optional(),
  style: z.string().optional(),
  format: z.string().optional(),
  action: z.enum([
    'regenerate', 'continue', 'more-creative', 'more-emotional',
    'more-humorous', 'simpler', 'shorter', 'longer', 'rewrite-originally'
  ]).optional(),
  previousMessageId: z.string().optional(),
  previousContent: z.string().optional(),
  originalPrompt: z.string().optional(),
  media: z.object({
    type: z.enum(['image', 'video']),
    mimeType: z.string(),
    data: z.string(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
    duration: z.number().optional()
  }).optional().nullable(),
  mediaContext: z.any().optional().nullable()
}).refine((data) => {
  if (data.media || data.mediaContext) {
    return true;
  }
  if (!data.action && (!data.prompt || data.prompt.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'prompt: String must contain at least 1 character(s) when no media is provided',
  path: ['prompt']
});

// GET /api/chat/quota/status
router.get('/quota/status', authenticate, async (req, res, next) => {
  try {
    const quota = await getQuotaStatus(req);
    res.json(quota);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/generate (SSE streaming endpoint)
router.post('/generate', authenticate, sanitizeInput, checkDailyLimit, async (req, res, next) => {
  let params;
  try {
    params = generateSchema.parse(req.body);
  } catch (valErr) {
    return next(valErr);
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    res.flush?.();
  };

  try {
    const { prompt = '', mode, length, action, previousMessageId } = params;
    let conversationId = params.conversationId;

    // 1. Language Determination & Tanglish Detection:
    const contentCreatorService = require('../services/contentCreator.service');
    const preferredLang = contentCreatorService.detectLanguagePreference(prompt, params.language);
    const isTanglish = preferredLang === 'tanglish';
    let resolvedLanguage = isTanglish ? 'tanglish' : (params.language === 'en' ? 'en' : 'ta');

    // 2. Classical Form -> Force language to 'ta' (only in poem mode)
    let resolvedPoemType = mode === 'poem'
      ? (params.poemType || (resolvedLanguage === 'ta' ? 'வெண்பா' : 'Free Verse'))
      : null;
    if (mode === 'poem' && resolvedPoemType && CLASSICAL_TAMIL_FORMS.includes(resolvedPoemType)) {
      resolvedLanguage = 'ta';
    }

    // Detect script and translanguaging of input prompt
    const detection = detectLanguage(prompt, resolvedLanguage === 'tanglish' ? 'ta' : resolvedLanguage);
    const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(prompt);
    const hasLatinWords = /[a-zA-Z]/.test(prompt);
    const isRomanized = detection.romanizedInput || (resolvedLanguage === 'ta' && !hasTamilUnicode && hasLatinWords);

    sendEvent('status', {
      detectedLanguage: resolvedLanguage,
      romanizedInput: isRomanized,
      script: hasTamilUnicode ? 'Tamil' : detection.script,
      action: action || null
    });

    // 3. Media Understanding & Context Extraction
    let mediaContext = params.mediaContext || null;
    if (!mediaContext && params.media) {
      sendEvent('status', {
        step: 'media_analysis',
        message: `Analyzing uploaded ${params.media.type}...`
      });
      try {
        mediaContext = await mediaAnalysisService.analyzeMedia(params.media);
      } catch (mErr) {
        console.warn('[ChatRoutes] Media analysis warning:', mErr.message);
        await refundDailyLimit(req);
        const friendlyMessage = (mErr.message && !mErr.message.includes('at ') && !mErr.message.includes('node:'))
          ? mErr.message
          : 'Unable to analyze this media. Please try another file.';
        sendEvent('error', {
          code: 'MEDIA_ANALYSIS_FAILED',
          message: friendlyMessage
        });
        return res.end();
      }
    }

    // 3b. Active Conversation Media Memory:
    // If user does not re-upload media on follow-up prompts, retrieve active mediaContext from the conversation history
    if (!mediaContext && !params.media && conversationId && prisma?.message) {
      try {
        const lastMediaMsg = await prisma.message.findFirst({
          where: {
            conversationId,
            role: 'assistant'
          },
          orderBy: { createdAt: 'desc' }
        });
        if (lastMediaMsg?.metadata && typeof lastMediaMsg.metadata === 'object' && lastMediaMsg.metadata.mediaContext) {
          mediaContext = lastMediaMsg.metadata.mediaContext;
        }
      } catch (dbErr) {
        console.warn('[ChatRoutes] Conversation mediaContext lookup warning:', dbErr.message);
      }
    }

    // Detect explicit platform, tone, style, and content type in Creator mode
    let resolvedPlatform = params.platform;
    let resolvedTone = params.tone;
    let resolvedStyle = params.style;
    let resolvedFormat = params.format;

    if (mode === 'creator' && prompt) {
      if (!resolvedPlatform) resolvedPlatform = contentCreatorService.detectPlatformPreference(prompt, params.platform);
      if (!resolvedTone) resolvedTone = contentCreatorService.detectTonePreference(prompt, params.tone);
      if (!resolvedStyle) resolvedStyle = contentCreatorService.detectStylePreference(prompt, params.style);
      const detected = contentCreatorService.detectContentType(prompt);
      if (detected && detected !== 'caption' && !resolvedFormat) {
        resolvedFormat = detected;
      }
    }

    // 4. Action Context Rebuilding (if action is requested)
    let systemPrompt = '';
    let userPrompt = prompt;
    let originalUserPrompt = prompt;

    if (action) {
      let prevMessage = null;
      if (previousMessageId && prisma && prisma.message) {
        try {
          prevMessage = await prisma.message.findUnique({
            where: { id: previousMessageId },
            include: { conversation: true }
          });
        } catch (err) {
          console.warn('DB read error for previous message:', err.message);
        }
      }

      if (!conversationId && prevMessage?.conversationId) {
        conversationId = prevMessage.conversationId;
      }

      const prevContent = prevMessage?.content || req.body.previousContent || prompt;
      const prevMeta = prevMessage?.metadata || {
        mode,
        language: resolvedLanguage,
        poemType: resolvedPoemType,
        genre: params.genre,
        tone: params.tone,
        length,
        platform: params.platform,
        style: params.style,
        format: resolvedFormat
      };

      if (!mediaContext && prevMeta.mediaContext) {
        mediaContext = prevMeta.mediaContext;
      }

      originalUserPrompt = req.body.originalPrompt || prompt || prevContent;

      systemPrompt = buildSystemPrompt({
        mode: prevMeta.mode || mode,
        language: prevMeta.language || resolvedLanguage,
        poemType: prevMeta.poemType || resolvedPoemType,
        genre: prevMeta.genre || params.genre,
        tone: prevMeta.tone || params.tone,
        length: prevMeta.length || length,
        platform: prevMeta.platform || params.platform,
        style: prevMeta.style || params.style,
        format: prevMeta.format || resolvedFormat,
        romanizedInput: isRomanized,
        isTanglish,
        mediaContext
      });

      userPrompt = buildActionPrompt(action, {
        originalPrompt: originalUserPrompt,
        previousContent: prevContent,
        metadata: prevMeta,
        mediaContext
      });
    } else {
      // Standard Generation
      systemPrompt = buildSystemPrompt({
        mode,
        language: resolvedLanguage,
        poemType: resolvedPoemType,
        genre: params.genre,
        tone: resolvedTone,
        length,
        platform: resolvedPlatform,
        style: resolvedStyle,
        format: resolvedFormat,
        romanizedInput: isRomanized,
        isTanglish,
        mediaContext
      });

      if (mediaContext) {
        const userInstruction = prompt.trim();
        const mediaVisualSummary = [
          mediaContext.category ? `Category: ${mediaContext.category}` : '',
          mediaContext.scene ? `Setting: ${mediaContext.scene}` : '',
          (mediaContext.subjects || mediaContext.objects)?.length ? `Subjects: ${(mediaContext.subjects || mediaContext.objects).join(', ')}` : '',
          mediaContext.peopleContext ? `People: ${mediaContext.peopleContext}` : '',
          mediaContext.foodDetails ? `Food: ${mediaContext.foodDetails}` : '',
          mediaContext.productDetails ? `Product: ${mediaContext.productDetails}` : '',
          mediaContext.lighting ? `Lighting: ${mediaContext.lighting}` : '',
          mediaContext.mood ? `Mood: ${mediaContext.mood}` : '',
          mediaContext.colors?.length ? `Colors: ${mediaContext.colors.join(', ')}` : '',
          mediaContext.visualTheme ? `Theme: ${mediaContext.visualTheme}` : '',
          mediaContext.activity ? `Activity: ${mediaContext.activity}` : '',
          mediaContext.distinctiveDetails ? `Details: ${mediaContext.distinctiveDetails}` : '',
          mediaContext.openingHook ? `Opening Frame: ${mediaContext.openingHook}` : '',
          mediaContext.keyActions?.length ? `Video Actions: ${mediaContext.keyActions.join(' -> ')}` : '',
          mediaContext.endingMoment ? `Ending: ${mediaContext.endingMoment}` : '',
          mediaContext.summary ? `Summary: ${mediaContext.summary}` : ''
        ].filter(Boolean).join(' | ');

        if (userInstruction) {
          userPrompt = `[MEDIA-AWARE GENERATION REQUEST]
Uploaded ${mediaContext.mediaType || 'visual media'}: ${mediaVisualSummary}
User Instruction: "${userInstruction}"

CRITICAL INSTRUCTIONS:
1. Genuinely ground every line in what is visually depicted in this uploaded ${mediaContext.mediaType || 'media'} (${mediaVisualSummary}). Do NOT invent unrelated scenes or generic filler.
2. Execute the user's instruction: "${userInstruction}" applying the requested mood, tone, format, and language.
3. If movie dialogue or mass style is asked, compose 100% original, creative wording without copying copyrighted movie lines.
4. Include 2 to 8 relevant emojis directly reflecting the visual content, and 5 to 10 targeted hashtags.`;
        } else {
          userPrompt = `[MEDIA-AWARE GENERATION REQUEST]
Uploaded ${mediaContext.mediaType || 'visual media'}: ${mediaVisualSummary}

CRITICAL INSTRUCTIONS:
1. Compose social media content tailored to what is shown in this ${mediaContext.mediaType || 'media'} for ${params.platform || 'Instagram'} in ${params.style || 'aesthetic'} style and ${resolvedFormat || 'caption'} format.
2. Produce 3 distinct creative options (Cinematic, Aesthetic, Casual) plus an original line and targeted hashtags.
3. Ground the copy in the visible atmosphere, subjects, and setting.`;
        }
      } else {
        userPrompt = buildStructuredUserPrompt({
          prompt,
          mode,
          poemType: resolvedPoemType,
          genre: params.genre,
          tone: resolvedTone,
          length,
          language: resolvedLanguage,
          platform: resolvedPlatform,
          style: resolvedStyle,
          format: resolvedFormat,
          mediaContext: null
        });
      }
    }

    // 4. Cache Check (24h TTL)
    const cacheKey = `cache:${hashString(systemPrompt + ':::' + userPrompt)}`;
    const cachedResponse = await redis.get(cacheKey);

    if (cachedResponse) {
      // Stream cached content in chunks
      const chunks = cachedResponse.split(' ');
      for (const piece of chunks) {
        sendEvent('token', { text: piece + ' ' });
        await new Promise((r) => setTimeout(r, 10));
      }

      sendEvent('done', {
        content: cachedResponse,
        cached: true,
        metadata: {
          mode,
          language: resolvedLanguage,
          poemType: resolvedPoemType,
          genre: params.genre,
          tone: params.tone,
          length,
          platform: params.platform,
          style: params.style,
          format: params.format
        }
      });
      return res.end();
    }

    // 5. Streaming Execution with Abort Controller
    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    // Only pass lightweight image to generateStream; video context is already embedded into prompt
    let streamMedia = null;
    if (params.media && params.media.type === 'image' && (!params.media.fileSize || params.media.fileSize < 4 * 1024 * 1024)) {
      streamMedia = params.media;
    }

    let generatedText = '';
    const generationResult = await geminiService.generateStream({
      systemPrompt,
      userPrompt,
      media: streamMedia,
      signal: abortController.signal,
      onChunk: (chunk) => {
        generatedText += chunk;
        sendEvent('token', { text: chunk });
      }
    });

    let finalOutput = generationResult.fullText || generatedText;

    if (!finalOutput || !finalOutput.trim()) {
      await refundDailyLimit(req);
      sendEvent('error', {
        code: 'EMPTY_GENERATION',
        message: 'Could not generate a response. Please try again.'
      });
      return res.end();
    }

    // 6. Guards Check & Auto-Retry
    let guardResult = validateGuards(finalOutput, {
      mode,
      language: resolvedLanguage,
      romanizedInput: isRomanized,
      originalPrompt: originalUserPrompt,
      poemType: resolvedPoemType,
      mediaContext
    });

    let retryCount = 0;
    const maxRetries = 2;

    while (!guardResult.valid && retryCount < maxRetries) {
      retryCount++;
      console.warn(`[Guards] Triggered: ${guardResult.code} (${guardResult.message}). Executing retry ${retryCount}...`);
      sendEvent('retry', {
        reason: guardResult.code,
        message: guardResult.code === 'TOPIC_RELEVANCE_FAILED'
          ? 'Refining composition to strictly ground in your requested topic...'
          : 'Refining composition to meet strict structural standards...'
      });

      try {
        const retryResult = await geminiService.generateComplete({
          systemPrompt: systemPrompt + '\n\n' + guardResult.retryPrompt,
          userPrompt,
          media: params.media
        });

        if (retryResult && retryResult.fullText && retryResult.fullText.trim()) {
          finalOutput = retryResult.fullText;
          guardResult = validateGuards(finalOutput, {
            mode,
            language: resolvedLanguage,
            romanizedInput: isRomanized,
            originalPrompt: originalUserPrompt,
            poemType: resolvedPoemType,
            mediaContext
          });
          sendEvent('replace', { text: finalOutput });
        }
      } catch (retryErr) {
        console.warn('Auto-retry failed:', retryErr.message);
        break;
      }
    }

    if (!guardResult.valid && guardResult.code === 'TOPIC_RELEVANCE_FAILED') {
      await refundDailyLimit(req);
      sendEvent('error', {
        code: 'TOPIC_RELEVANCE_FAILED',
        message: 'Could not generate content strictly matching your specific keywords. Please refine your prompt.'
      });
      return res.end();
    }

    // 7. Cache Output (24 hours)
    if (finalOutput.length > 20) {
      await redis.set(cacheKey, finalOutput, 'EX', 86400);
    }

    // 8. Persist Conversation & Messages if DB is available
    conversationId = conversationId || params.conversationId;
    const metadata = {
      mode,
      language: resolvedLanguage,
      poemType: resolvedPoemType,
      genre: params.genre,
      tone: resolvedTone,
      length,
      platform: resolvedPlatform,
      style: resolvedStyle,
      format: resolvedFormat,
      action: action || null,
      mediaType: mediaContext?.mediaType || params.media?.type || null,
      mediaContext: mediaContext || null
    };

    if (prisma && prisma.conversation) {
      try {
        const effectiveUserId = req.user ? req.user.id : (req.anonId || 'anon_guest');

        // Ensure user row exists so foreign key constraint is satisfied
        if (prisma.user) {
          await prisma.user.upsert({
            where: { id: effectiveUserId },
            update: {},
            create: {
              id: effectiveUserId,
              name: req.user ? req.user.name : 'Guest User',
              plan: 'FREE'
            }
          }).catch((uErr) => console.warn('User upsert fallback:', uErr.message));
        }

        // Find or create conversation
        if (!conversationId) {
          const effectiveTitle = (originalUserPrompt || prompt || 'Creative Composition').trim();
          const title = effectiveTitle.length > 40 ? effectiveTitle.substring(0, 40) + '...' : effectiveTitle;
          const conv = await prisma.conversation.create({
            data: {
              title,
              mode,
              userId: effectiveUserId
            }
          });
          conversationId = conv.id;
        }

        // Save User Message (only for brand new user prompts, not for sub-actions)
        if (!action && prompt && prompt.trim()) {
          await prisma.message.create({
            data: {
              conversationId,
              role: 'user',
              content: prompt,
              model: generationResult.model || 'gemini-3.8-flash',
              tokensUsed: Math.ceil(prompt.length / 4)
            }
          });
        }

        // Save Assistant Message
        const assistantMsg = await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: finalOutput,
            metadata,
            model: generationResult.model || 'gemini-3.8-flash',
            tokensUsed: Math.ceil(finalOutput.length / 4)
          }
        });

        // Log generation
        if (prisma.generationLog) {
          await prisma.generationLog.create({
            data: {
              userId: req.user?.id || null,
              ip: req.clientIp || '127.0.0.1',
              model: generationResult.model || 'gemini-3.8-flash',
              tokensUsed: Math.ceil((prompt.length + finalOutput.length) / 4),
              success: true
            }
          });
        }

        sendEvent('done', {
          conversationId,
          messageId: assistantMsg.id,
          content: finalOutput,
          metadata
        });
        return res.end();
      } catch (dbErr) {
        console.warn('DB persistence fallback in chat generate:', dbErr.message);
      }
    }

    sendEvent('done', {
      conversationId: conversationId || `conv_${Date.now()}`,
      messageId: `msg_${Date.now()}`,
      content: finalOutput,
      metadata
    });
    res.end();
  } catch (err) {
    console.error('Generation Stream Error:', err);
    await refundDailyLimit(req);
    sendEvent('error', {
      code: err.code || 'AI_UNAVAILABLE',
      message: 'AI generation is temporarily unavailable. Please try again shortly.'
    });
    res.end();
  }
});

module.exports = router;
