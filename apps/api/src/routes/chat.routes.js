const express = require('express');
const { z } = require('zod');
const prisma = require('../services/db');
const redis = require('../services/redis');
const geminiService = require('../services/gemini');
const openRouterService = require('../services/openrouter');
const { detectLanguage } = require('../services/language');
const { validateGuards, validateOutputLanguage, sanitizeCreativeOutput } = require('../services/guards');
const { buildSystemPrompt, buildActionPrompt, buildStructuredUserPrompt, CLASSICAL_TAMIL_FORMS } = require('../config/prompts');
const { authenticate } = require('../middleware/auth');
const { checkDailyLimit, getQuotaStatus, refundDailyLimit } = require('../middleware/rateLimit');
const { sanitizeInput } = require('../middleware/sanitize');
const { hashString } = require('../utils/crypto');
const { ApiError } = require('../utils/errors');

/**
 * Builds a language-correction retry prompt for when the AI generated
 * content in the wrong language despite instructions.
 * @param {string} language - 'ta' | 'en'
 * @returns {string}
 */
function buildLanguageCorrectionPrompt(language) {
  const targetName = language === 'ta' ? 'Tamil (தமிழ்)' : 'English';
  const script = language === 'ta'
    ? 'native Tamil script (Unicode \u0B80-\u0BFF). Do NOT use Romanized Tamil (Tanglish) or English letters.'
    : 'English (Latin script). Do NOT use Tamil, Hindi, or any other script.';
  return `\n\n[LANGUAGE CORRECTION — MANDATORY OVERRIDE]\nThe previous generation did NOT follow the required output language.\n\nRequired output language: ${targetName}\n\nRewrite the COMPLETE response from scratch.\nIMPORTANT:\n- Output ONLY in ${targetName}.\n- Write every word in ${script}\n- Do not switch to another language mid-response.\n- Proper nouns, names, URLs, and unavoidable technical terms may remain unchanged.\n- No Tanglish, no Hindi, no Malayalam. Only ${targetName}.`;
}

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

  let generatedText = '';
  try {
    const { prompt = '', mode, length, action, previousMessageId } = params;
    let conversationId = params.conversationId;

    // 1. Language Determination:
    // IMPORTANT: params.language ('en' | 'ta') is the AUTHORITATIVE OUTPUT language selected by the user.
    // isTanglish is an INPUT-detection flag only — it tells the AI how to READ the input,
    // NOT what language to write the output in.
    const contentCreatorService = require('../services/contentCreator.service');
    const preferredLang = contentCreatorService.detectLanguagePreference(prompt, params.language);
    // isTanglish = true means the user typed in Romanized Tamil (Tanglish) input style.
    // This must NEVER override the selected output language.
    const isTanglish = preferredLang === 'tanglish';
    // resolvedLanguage is always the user-selected output language ('ta' or 'en').
    // Tanglish is only used as output when explicitly selected as a format (legacy path).
    let resolvedLanguage = params.language === 'en' ? 'en' : 'ta';

    // 2. Classical Form -> Force language to 'ta' (only in poem mode)
    let resolvedPoemType = mode === 'poem'
      ? (params.poemType || (resolvedLanguage === 'ta' ? 'வெண்பா' : 'Free Verse'))
      : null;
    if (mode === 'poem' && resolvedPoemType && CLASSICAL_TAMIL_FORMS.includes(resolvedPoemType)) {
      resolvedLanguage = 'ta';
    }

    // Detect script and translanguaging of input prompt
    // detectLanguage is used to understand the INPUT format, not determine the output language.
    const detection = detectLanguage(prompt, resolvedLanguage);
    const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(prompt);
    const hasLatinWords = /[a-zA-Z]/.test(prompt);
    // isRomanized = true means the user typed their prompt in Romanized Tamil (Tanglish).
    // The output language is still governed by resolvedLanguage.
    const isRomanized = detection.romanizedInput || (resolvedLanguage === 'ta' && !hasTamilUnicode && hasLatinWords && isTanglish);

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
        message: params.media.type === 'video' ? 'Analyzing video frames...' : 'Analyzing uploaded image...'
      });
      try {
        mediaContext = await mediaAnalysisService.analyzeMedia(params.media);
        if (params.media.type === 'video') {
          sendEvent('status', {
            step: 'media_analyzed',
            message: 'Video frames analyzed successfully.'
          });
        }
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
        mediaContext
      });
    }

    // 4. Cache Check (24h TTL)
    const isTestEnv = process.env.NODE_ENV === 'test';
    const cacheKey = `cache:${hashString(systemPrompt + ':::' + userPrompt)}`;
    const cachedResponse = isTestEnv ? null : await redis.get(cacheKey);

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

    // Pass lightweight image or representative sampled video frames to generateStream for multimodal generation
    let streamMedia = null;
    if (params.media && params.media.type === 'image') {
      const commaIdx = params.media.data ? params.media.data.indexOf(',') : -1;
      const rawPayload = commaIdx !== -1 ? params.media.data.slice(commaIdx + 1) : (params.media.data || '');
      const actualBytes = rawPayload ? Math.round(rawPayload.length * 0.75) : (params.media.fileSize || 0);
      if (!actualBytes || actualBytes < 4 * 1024 * 1024) {
        streamMedia = params.media;
      }
    } else if (params.media && params.media.type === 'video' && Array.isArray(params.media.frames) && params.media.frames.length > 0) {
      streamMedia = {
        type: 'video',
        frames: params.media.frames.slice(0, 6)
      };
    }

    generatedText = '';
    let generationResult = null;
    let geminiErr = null;

    try {
      generationResult = await geminiService.generateStream({
        systemPrompt,
        userPrompt,
        media: streamMedia,
        signal: abortController.signal,
        onReset: () => {
          if (generatedText) {
            sendEvent('replace', { text: '' });
            generatedText = '';
          }
        },
        onChunk: (chunk) => {
          if (chunk) {
            generatedText += chunk;
            sendEvent('token', { text: chunk });
          }
        }
      });
    } catch (gErr) {
      geminiErr = gErr;
    }

    // Fallback to OpenRouter if Gemini failed with eligible quota/unavailability error
    if (!generationResult && geminiErr) {
      if (openRouterService.isFallbackEligible(geminiErr)) {
        console.warn(`[AI] Gemini generation failed, attempting OpenRouter fallback`);
        if (openRouterService.isAvailable()) {
          try {
            console.log('[OpenRouter] Fallback generation started');
            if (generatedText) {
              sendEvent('replace', { text: '' });
              generatedText = '';
            }
            generationResult = await openRouterService.generateStream({
              systemPrompt,
              userPrompt,
              media: streamMedia,
              signal: abortController.signal,
              onChunk: (chunk) => {
                generatedText += chunk;
                sendEvent('token', { text: chunk });
              }
            });
            console.log('[OpenRouter] Fallback generation succeeded');
          } catch (orErr) {
            console.error(`[OpenRouter] Fallback generation failed`);
            if (generatedText) {
              sendEvent('replace', { text: '' });
              generatedText = '';
            }
            throw geminiErr;
          }
        } else {
          console.warn('[OpenRouter] Fallback unavailable: OPENROUTER_API_KEY is not configured');
          if (generatedText) {
            sendEvent('replace', { text: '' });
            generatedText = '';
          }
          throw geminiErr;
        }
      } else {
        if (generatedText) {
          sendEvent('replace', { text: '' });
          generatedText = '';
        }
        throw geminiErr;
      }
    }

    let finalOutput = sanitizeCreativeOutput(generationResult.fullText || generatedText, { language: resolvedLanguage, mode });

    if (!finalOutput || !finalOutput.trim()) {
      await refundDailyLimit(req);
      sendEvent('error', {
        code: 'EMPTY_GENERATION',
        message: 'Could not generate a response. Please try again.'
      });
      return res.end();
    }

    const activeProvider = generationResult?.provider === 'openrouter' ? openRouterService : geminiService;

    // 5b. Output Language Validation & Bounded Correction Retry
    // This runs BEFORE guard checks. A wrong-language response must not reach the user.
    // The quota is NOT re-deducted on correction retries — checkDailyLimit already ran once.
    const langValidation = validateOutputLanguage(finalOutput, resolvedLanguage);
    let langRetryCount = 0;
    const maxLangRetries = 1; // bounded: max 1 language correction attempt

    while (!langValidation.valid && langRetryCount < maxLangRetries) {
      langRetryCount++;
      const langCorrectionPrompt = buildLanguageCorrectionPrompt(resolvedLanguage);
      console.warn(`[LangGuard] Output language validation failed (attempt ${langRetryCount}): ${langValidation.reason}. Retrying with correction prompt.`);

      sendEvent('retry', {
        reason: 'LANGUAGE_MISMATCH',
        message: resolvedLanguage === 'ta'
          ? 'தேர்ந்தெடுத்த மொழியில் மீண்டும் உருவாக்குகிறோம்...'
          : 'Regenerating in the selected language...'
      });

      // Clear the wrong-language partial/full stream from the client
      if (generatedText) {
        sendEvent('replace', { text: '' });
        generatedText = '';
      }

      try {
        const correctionResult = await activeProvider.generateComplete({
          systemPrompt: systemPrompt + langCorrectionPrompt,
          userPrompt,
          media: streamMedia
        });

        if (correctionResult && correctionResult.fullText && correctionResult.fullText.trim()) {
          finalOutput = sanitizeCreativeOutput(correctionResult.fullText, { language: resolvedLanguage, mode });
          generatedText = finalOutput;
          // Re-validate
          const revalidation = validateOutputLanguage(finalOutput, resolvedLanguage);
          if (revalidation.valid) {
            // Stream the corrected output to the client
            sendEvent('replace', { text: finalOutput });
            langValidation.valid = true;
          } else {
            langValidation.valid = false;
            langValidation.reason = revalidation.reason;
          }
        }
      } catch (langRetryErr) {
        console.warn('[LangGuard] Language correction retry failed:', langRetryErr.message);
        break;
      }
    }

    // If language validation still fails after all retries, return a clear error
    if (!langValidation.valid && langRetryCount > 0) {
      await refundDailyLimit(req);
      sendEvent('replace', { text: '' });
      const langErrorMsg = resolvedLanguage === 'ta'
        ? 'தேர்ந்தெடுத்த மொழியில் பதிலை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
        : 'Could not generate a response in the selected language. Please try again.';
      sendEvent('error', { code: 'LANGUAGE_GENERATION_FAILED', message: langErrorMsg });
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
    // For TOPIC_RELEVANCE_FAILED, META_ANALYSIS_LEAK, and ROMANIZED_LEAK, limit to at most 1 retry
    const maxRetries = (guardResult.code === 'TOPIC_RELEVANCE_FAILED' || guardResult.code === 'META_ANALYSIS_LEAK' || guardResult.code === 'ROMANIZED_LEAK') ? 1 : 2;

    while (!guardResult.valid && retryCount < maxRetries) {
      retryCount++;
      console.warn(`[Guards] Triggered: ${guardResult.code} (${guardResult.message}). Executing retry ${retryCount}...`);
      if (guardResult.code !== 'META_ANALYSIS_LEAK' && guardResult.code !== 'ROMANIZED_LEAK') {
        sendEvent('retry', {
          reason: guardResult.code,
          message: guardResult.code === 'TOPIC_RELEVANCE_FAILED'
            ? 'Refining composition to strictly ground in your requested topic...'
            : 'Refining composition to meet strict structural standards...'
        });
      }

      try {
        const retryResult = await activeProvider.generateComplete({
          systemPrompt: systemPrompt + '\n\n' + guardResult.retryPrompt,
          userPrompt,
          media: streamMedia
        });

        if (retryResult && retryResult.fullText && retryResult.fullText.trim()) {
          finalOutput = sanitizeCreativeOutput(retryResult.fullText, { language: resolvedLanguage, mode });
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
        // Do not swallow real 429 quota exhaustion or API failure
        const isQuotaErr = retryErr.status === 429 || (retryErr.message && retryErr.message.includes('429'));
        if (isQuotaErr) {
          throw retryErr;
        }
        break;
      }
    }

    if (!guardResult.valid && guardResult.code === 'TOPIC_RELEVANCE_FAILED') {
      const postLangCheck = validateOutputLanguage(finalOutput, resolvedLanguage);
      const hasSubstantialCreativeContent = finalOutput && finalOutput.trim().length >= 40 && (
        (resolvedLanguage === 'ta' && /[\u0B80-\u0BFF]/.test(finalOutput)) ||
        (resolvedLanguage === 'en' && /[a-zA-Z]/.test(finalOutput)) ||
        resolvedLanguage === 'tanglish'
      );

      if (hasSubstantialCreativeContent && postLangCheck.valid) {
        console.warn('[Guards] Delivering valid creative composition despite strict keyword boundary.');
        guardResult = { valid: true };
      } else {
        await refundDailyLimit(req);
        sendEvent('replace', { text: '' });
        sendEvent('error', {
          code: 'TOPIC_RELEVANCE_FAILED',
          message: 'Could not generate content strictly matching your specific keywords. Please refine your prompt.'
        });
        return res.end();
      }
    }

    // 7. Cache Output (24 hours) - only in production/non-test environment
    if (!isTestEnv && finalOutput.length > 20) {
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
    console.error('Generation Stream Error:', err.code || err.message);
    if (generatedText) {
      sendEvent('replace', { text: '' });
      generatedText = '';
    }
    await refundDailyLimit(req);
    // Use a descriptive but safe error message — never expose API keys or stack traces
    let userMessage = 'AI generation is temporarily unavailable. Please try again shortly.';
    if (err.code === 'LANGUAGE_GENERATION_FAILED') {
      userMessage = resolvedLanguage === 'ta'
        ? 'தேர்ந்தெடுத்த மொழியில் பதிலை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
        : 'Could not generate a response in the selected language. Please try again.';
    }
    sendEvent('error', {
      code: err.code || 'AI_UNAVAILABLE',
      message: userMessage
    });
    res.end();
  }
});

module.exports = router;
