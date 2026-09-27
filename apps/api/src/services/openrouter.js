const { env } = require('../config/env');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';

/**
 * OpenRouter Free Tier Fallback Service.
 * Provides OpenAI-compatible chat completion streaming as a fallback
 * when Google Gemini is unavailable or has exhausted its daily quota.
 */
class OpenRouterService {
  /**
   * Checks if OpenRouter is configured with an API key.
   * @returns {boolean}
   */
  isAvailable() {
    const key = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Determines if a Gemini error qualifies for fallback to OpenRouter.
   * @param {Error|Object} err - The error thrown by Gemini or generation pipeline
   * @returns {boolean}
   */
  isFallbackEligible(err) {
    if (!err) return false;

    // Do NOT fallback for client validation, auth, user rate-limit, or guard violations
    if (err.isOperational && err.statusCode && err.statusCode < 500 && err.statusCode !== 429) {
      return false;
    }
    if (err.code === 'VALIDATION_ERROR' || err.code === 'INVALID_PROMPT' || err.code === 'BAD_REQUEST') {
      return false;
    }
    if (err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN' || err.code === 'EMAIL_NOT_VERIFIED') {
      return false;
    }
    if (err.code === 'DAILY_LIMIT_REACHED' || err.code === 'FREE_LIMIT_REACHED') {
      return false;
    }
    if (err.code === 'TOPIC_RELEVANCE_FAILED' || err.code === 'GUARD_VALIDATION_FAILED') {
      return false;
    }

    // Explicit fallback triggers
    if (
      err.code === 'DAILY_QUOTA_EXHAUSTED' ||
      err.code === 'AI_UNAVAILABLE' ||
      err.code === 'ALL_KEYS_EXHAUSTED' ||
      err.code === 'KEYS_EXHAUSTED'
    ) {
      return true;
    }

    if (
      err.status === 429 ||
      err.statusCode === 429 ||
      err.status === 503 ||
      err.statusCode === 503 ||
      err.status === 502 ||
      err.status === 504
    ) {
      return true;
    }

    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('daily_quota_exhausted') ||
      msg.includes('all_keys_exhausted') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota exceeded') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('ai_unavailable') ||
      msg.includes('temporarily unavailable') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('fetch failed') ||
      msg.includes('network')
    ) {
      return true;
    }

    if (err.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Formats prompts and optional media into OpenAI-compatible message structure.
   */
  formatMessages({ systemPrompt, userPrompt, media }) {
    const messages = [];

    if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim()) {
      messages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }

    if (media && media.data && media.type === 'image') {
      try {
        let rawData = media.data;
        let dataUri = '';
        if (rawData.startsWith('data:')) {
          dataUri = rawData;
        } else {
          const mime = (media.mimeType || 'image/jpeg').toLowerCase().trim();
          dataUri = `data:${mime};base64,${rawData}`;
        }

        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: userPrompt || '' },
            {
              type: 'image_url',
              image_url: { url: dataUri }
            }
          ]
        });
      } catch (mediaErr) {
        // Safe fallback to pure text if image formatting encounters unexpected data
        messages.push({
          role: 'user',
          content: userPrompt || ''
        });
      }
    } else {
      messages.push({
        role: 'user',
        content: userPrompt || ''
      });
    }

    return messages;
  }

  /**
   * Streams a chat completion response from OpenRouter.
   * @param {Object} options
   * @param {string} options.systemPrompt
   * @param {string} options.userPrompt
   * @param {Object} [options.media]
   * @param {Function} [options.onChunk]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ fullText: string, model: string, provider: string }>}
   */
  async generateStream({ systemPrompt, userPrompt, media = null, onChunk = null, signal = null }) {
    const apiKey = process.env.OPENROUTER_API_KEY || env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const err = new Error('OpenRouter fallback is not configured');
      err.code = 'OPENROUTER_NOT_CONFIGURED';
      err.status = 503;
      throw err;
    }

    const model = process.env.OPENROUTER_MODEL || env.OPENROUTER_MODEL || DEFAULT_MODEL;
    const messages = this.formatMessages({ systemPrompt, userPrompt, media });

    const headers = {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'PlanBot AI'
    };

    const payload = {
      model,
      messages,
      stream: true,
      temperature: 0.85,
      top_p: 0.95
    };

    let res;
    try {
      res = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal
      });
    } catch (fetchErr) {
      if (signal && signal.aborted) {
        return { fullText: '', model, provider: 'openrouter' };
      }
      const err = new Error(`OpenRouter network request failed: ${fetchErr.message}`);
      err.code = 'OPENROUTER_NETWORK_ERROR';
      err.status = 503;
      throw err;
    }

    if (!res.ok) {
      let errorDetails = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.error && errorJson.error.message) {
          // Sanitize any sensitive tokens from error message
          errorDetails = String(errorJson.error.message).replace(/sk-or-v1-[a-zA-Z0-9_-]+/g, '[REDACTED]');
        }
      } catch (parseErr) {}

      if (res.status === 429) {
        const rateLimitErr = new Error(`OpenRouter rate limit reached: ${errorDetails}`);
        rateLimitErr.code = 'OPENROUTER_RATE_LIMIT';
        rateLimitErr.status = 429;
        throw rateLimitErr;
      }

      const apiErr = new Error(`OpenRouter API error (${res.status}): ${errorDetails}`);
      apiErr.code = 'OPENROUTER_API_ERROR';
      apiErr.status = res.status;
      throw apiErr;
    }

    let fullText = '';
    let buffer = '';

    const processLine = (line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) return;
      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') return;
        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            if (onChunk) {
              onChunk(delta);
            }
          }
        } catch (e) {
          // Ignore partial or unparseable SSE line
        }
      }
    };

    if (res.body && res.body[Symbol.asyncIterator]) {
      for await (const chunk of res.body) {
        if (signal && signal.aborted) break;
        const textChunk = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
        buffer += textChunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          processLine(line);
        }
      }
    } else if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        if (signal && signal.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          processLine(line);
        }
      }
    }

    if (buffer.trim()) {
      processLine(buffer);
    }

    return {
      fullText,
      model,
      provider: 'openrouter'
    };
  }

  /**
   * Generates a complete non-streaming completion (e.g. for retries or guard fixes).
   */
  async generateComplete({ systemPrompt, userPrompt, media = null }) {
    let textResult = '';
    const res = await this.generateStream({
      systemPrompt,
      userPrompt,
      media,
      onChunk: (chunk) => {
        textResult += chunk;
      }
    });
    return res;
  }
}

const openRouterService = new OpenRouterService();
module.exports = openRouterService;
