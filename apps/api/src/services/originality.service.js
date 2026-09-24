const db = require('./db');
const { env } = require('../config/env');
const geminiService = require('./gemini');

// Common non-distinctive stop words (English & transliterated Tamil)
const STOP_WORDS = new Set([
  'the', 'and', 'a', 'of', 'to', 'in', 'is', 'it', 'you', 'that', 'he', 'was',
  'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this',
  'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what',
  'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an',
  'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other',
  'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
  'go', 'see', 'no', 'way', 'could', 'my', 'than', 'first', 'been', 'who',
  'its', 'now', 'find', 'love', 'life', 'heart', 'world', 'oru', 'endru', 'than'
]);

/**
 * Normalizes text for phrase matching
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts distinctive n-gram phrases (default 4-6 words)
 */
function extractDistinctivePhrases(text, minWords = 4, maxWords = 6) {
  const norm = normalizeText(text);
  const words = norm.split(' ').filter(Boolean);
  if (words.length < minWords) return [];

  const phrases = [];
  for (let len = minWords; len <= Math.min(maxWords, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const slice = words.slice(i, i + len);
      // Ensure phrase contains at least 2 non-stop words
      const nonStopCount = slice.filter((w) => !STOP_WORDS.has(w)).length;
      if (nonStopCount >= 2) {
        phrases.push(slice.join(' '));
      }
    }
  }

  // Deduplicate and select most distinctive phrases (up to 15)
  return Array.from(new Set(phrases)).slice(0, 15);
}

/**
 * Computes Jaccard/Dice token similarity coefficient
 */
function calculateTextSimilarity(textA, textB) {
  const wordsA = new Set(normalizeText(textA).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w)));
  const wordsB = new Set(normalizeText(textB).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w)));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  return (2 * intersection) / (wordsA.size + wordsB.size);
}

class OriginalityService {
  /**
   * Performs originality & similarity screening on generated content
   * @param {Object} params
   * @param {string} params.content - The text content to screen
   * @param {string} [params.contentType='poem'] - 'poem', 'story', 'creator', 'social', 'caption'
   * @param {string|null} [params.contentId]
   * @param {string|null} [params.userId]
   * @returns {Promise<Object>} Screening result
   */
  async checkOriginality({ content, contentType = 'poem', contentId = null, userId = null }) {
    // 1. Feature flag check
    if (!env.ORIGINALITY_CHECK_ENABLED) {
      return {
        enabled: false,
        status: 'disabled',
        message: 'Originality screening is currently disabled in configuration.'
      };
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return {
        riskLevel: 'LOW',
        exactMatchFound: false,
        semanticSimilarity: 'LOW',
        similarityScore: 0,
        matchedPhrases: [],
        reason: 'Empty or trivial content provided for screening.',
        recommendation: 'Generate complete content to screen originality.',
        sourcesChecked: 'PlanBot generated-content database'
      };
    }

    try {
      const normalizedContent = normalizeText(content);
      const distinctivePhrases = extractDistinctivePhrases(content);
      const matchedPhrases = [];
      let highestSimilarity = 0;
      let matchedCandidate = null;

      // 2. Query stored corpus in PostgreSQL database
      let candidates = [];
      if (db.isAvailable() && db.client) {
        try {
          // Fetch recent poems and assistant messages (excluding the current content)
          const recentPoems = await db.client.poem.findMany({
            take: 40,
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true, prompt: true }
          });

          const recentMessages = await db.client.message.findMany({
            where: { role: 'assistant' },
            take: 40,
            orderBy: { createdAt: 'desc' },
            select: { id: true, content: true }
          });

          candidates = [...recentPoems, ...recentMessages].filter((c) => {
            // Exclude self if contentId matches
            if (contentId && c.id === contentId) return false;
            // Exclude exact identical pointer
            return c.content !== content;
          });
        } catch (dbErr) {
          console.warn('[OriginalityService] Database candidate query fallback:', dbErr.message);
        }
      }

      // 3. Deterministic Phrase Overlap Check & Similarity Calculation
      for (const candidate of candidates) {
        const normCand = normalizeText(candidate.content);
        if (!normCand) continue;

        // Check distinctive multi-word phrase overlap
        for (const phrase of distinctivePhrases) {
          if (normCand.includes(phrase) && !matchedPhrases.includes(phrase)) {
            matchedPhrases.push(phrase);
            matchedCandidate = candidate.content;
          }
        }

        // Calculate token similarity
        const sim = calculateTextSimilarity(content, candidate.content);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          if (!matchedCandidate) matchedCandidate = candidate.content;
        }
      }

      // Check for exact full match
      const exactMatchFound = candidates.some((c) => normalizeText(c.content) === normalizedContent);
      if (exactMatchFound) {
        highestSimilarity = 1.0;
      }

      // 4. Determine initial risk level from thresholds
      const thresholdLow = env.ORIGINALITY_SIMILARITY_THRESHOLD_LOW || 0.70;
      const thresholdHigh = env.ORIGINALITY_SIMILARITY_THRESHOLD_HIGH || 0.85;

      let riskLevel = 'LOW';
      let semanticLevel = 'LOW';

      if (exactMatchFound || highestSimilarity >= thresholdHigh || matchedPhrases.length >= 3) {
        riskLevel = 'HIGH';
        semanticLevel = 'HIGH';
      } else if (highestSimilarity >= thresholdLow || matchedPhrases.length >= 1) {
        riskLevel = 'MEDIUM';
        semanticLevel = 'MEDIUM';
      }

      let reason = 'No strong matching passage was detected in the sources checked.';
      let recommendation = 'Content appears suitable for further review.';

      if (riskLevel === 'HIGH') {
        reason = exactMatchFound
          ? 'Exact identical passage found in database records.'
          : 'High similarity and distinctive phrase overlap detected with previous compositions.';
        recommendation = 'Consider revising or using "Rewrite More Originally" to create a more distinctive variation.';
      } else if (riskLevel === 'MEDIUM') {
        reason = 'Some recurring phrase patterns or thematic overlap detected in the sources checked.';
        recommendation = 'Review distinctive phrases or select "Rewrite More Originally" for a fresher variation.';
      }

      // 5. LLM Structured Explanation (runs only if potential overlap is detected)
      if ((riskLevel === 'MEDIUM' || riskLevel === 'HIGH') && matchedCandidate) {
        try {
          const explanationPrompt = `You are an originality screening assistant.
Analyze the generated content and candidate matching passage.
Do not determine legal copyright ownership.

Identify:
1. Exact or near-exact phrase overlap
2. Unusually similar wording
3. Similar structure
4. Similar distinctive imagery or expressions

Generated Content:
"""
${content.substring(0, 1000)}
"""

Candidate Matching Passage:
"""
${matchedCandidate.substring(0, 1000)}
"""

Return ONLY a valid JSON object matching this schema:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "matched_phrases": ["string"],
  "reason": "short explanation",
  "recommendation": "short recommendation"
}
Never claim that content is legally copyright-free.`;

          const llmResult = await geminiService.generateComplete({
            systemPrompt: 'You are an objective AI originality screening analyzer. Return pure JSON only.',
            userPrompt: explanationPrompt
          });

          if (llmResult && llmResult.fullText) {
            const cleanJson = llmResult.fullText
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && parsed.risk_level) {
              const parsedRisk = String(parsed.risk_level).toUpperCase();
              if (['LOW', 'MEDIUM', 'HIGH'].includes(parsedRisk)) {
                riskLevel = parsedRisk;
              }
              if (parsed.reason) reason = parsed.reason;
              if (parsed.recommendation) recommendation = parsed.recommendation;
              if (Array.isArray(parsed.matched_phrases) && parsed.matched_phrases.length > 0) {
                for (const p of parsed.matched_phrases) {
                  if (typeof p === 'string' && !matchedPhrases.includes(p)) {
                    matchedPhrases.push(p);
                  }
                }
              }
            }
          }
        } catch (llmErr) {
          // Gracefully fallback to deterministic similarity result if LLM fails
          console.warn('[OriginalityService] LLM explanation fallback:', llmErr.message);
        }
      }

      const result = {
        riskLevel,
        exactMatchFound,
        semanticSimilarity: semanticLevel,
        similarityScore: Math.round(highestSimilarity * 100) / 100,
        matchedPhrases: matchedPhrases.slice(0, 5),
        reason,
        recommendation,
        sourcesChecked: 'PlanBot generated-content database'
      };

      // 6. Record to database if available
      if (db.isAvailable() && db.client) {
        try {
          await db.client.$executeRaw`
            INSERT INTO "originality_checks" (
              "id", "user_id", "content_id", "content_type", "risk_level",
              "exact_match_found", "semantic_similarity", "similarity_score",
              "matched_phrases", "reason", "recommendation", "sources_checked", "created_at"
            ) VALUES (
              gen_random_uuid(),
              ${userId},
              ${contentId},
              ${contentType},
              ${riskLevel},
              ${exactMatchFound},
              ${semanticLevel},
              ${result.similarityScore},
              ${JSON.stringify(result.matchedPhrases)}::jsonb,
              ${reason},
              ${recommendation},
              ${result.sourcesChecked},
              NOW()
            )
          `;
        } catch (persistErr) {
          console.warn('[OriginalityService] Could not persist check record:', persistErr.message);
        }
      }

      return result;
    } catch (err) {
      console.error('[OriginalityService] Screening failed:', err);
      return {
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
      };
    }
  }
}

module.exports = new OriginalityService();
