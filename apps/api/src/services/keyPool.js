/**
 * Key Pool Service for Gemini API keys
 * Supports round-robin rotation, 429 rate limit cooldowns, exponential backoff,
 * BYOK bypass, and masked health inspections.
 */

class KeyPool {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.loadKeysFromEnv();
  }

  loadKeysFromEnv() {
    this.keys = [];
    const mainKey = process.env.GEMINI_API_KEY;
    if (mainKey && mainKey.trim()) {
      this.keys.push(this.createKeyEntry(mainKey.trim(), 'GEMINI_API_KEY'));
    }

    for (let i = 2; i <= 10; i++) {
      const extraKey = process.env[`GEMINI_API_KEY_${i}`];
      if (extraKey && extraKey.trim()) {
        this.keys.push(this.createKeyEntry(extraKey.trim(), `GEMINI_API_KEY_${i}`));
      }
    }

    if (this.keys.length === 0) {
      // Mock / fallback placeholder if not yet configured in local test
      this.keys.push(this.createKeyEntry('demo-dev-key', 'GEMINI_API_KEY'));
    }
  }

  createKeyEntry(key, label) {
    return {
      id: label,
      key,
      isCooldown: false,
      isDailyQuota: false,
      isPermanentlyFailed: false,
      cooldownUntil: 0,
      consecutiveFailures: 0,
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      lastUsedAt: null,
      lastError: null
    };
  }

  /**
   * Returns a valid key or throws if all exhausted
   */
  getKey() {
    const now = Date.now();
    const available = this.keys.filter((k) => {
      if (k.isPermanentlyFailed) {
        return false;
      }
      if (k.cooldownUntil && k.cooldownUntil > now) {
        return false;
      }
      k.isCooldown = false;
      return true;
    });

    if (available.length === 0) {
      const allDailyExhausted = this.keys.length > 0 && this.keys.every((k) => k.isDailyQuota || k.isPermanentlyFailed);
      const nextAvailableTime = Math.min(...this.keys.map((k) => k.cooldownUntil || (now + 60000)));
      const retryAfterSec = Math.max(1, Math.ceil((nextAvailableTime - now) / 1000));
      const error = new Error(allDailyExhausted ? 'DAILY_QUOTA_EXHAUSTED' : 'ALL_KEYS_EXHAUSTED');
      error.code = 'KEYS_EXHAUSTED';
      error.retryAfterSec = retryAfterSec;
      throw error;
    }

    // Round-robin selection
    this.currentIndex = (this.currentIndex + 1) % available.length;
    const selected = available[this.currentIndex];
    selected.totalCalls++;
    selected.lastUsedAt = new Date();
    return selected;
  }

  reportSuccess(keyEntry) {
    if (!keyEntry || keyEntry.isBYOK) return;
    const target = this.keys.find((k) => k.id === keyEntry.id);
    if (target) {
      target.consecutiveFailures = 0;
      target.isCooldown = false;
      target.isDailyQuota = false;
      target.cooldownUntil = 0;
      target.successfulCalls++;
      target.lastError = null;
    }
  }

  reportFailure(keyEntry, isQuota = false, errMessage = '', errorObj = null) {
    if (!keyEntry || keyEntry.isBYOK) return;
    const target = this.keys.find((k) => k.id === keyEntry.id);
    if (!target) return;

    const msg = String(errMessage || '');
    const isInvalidKey = msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('invalid api key');
    const isPermissionError = msg.includes('PERMISSION_DENIED') || msg.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT');

    if (isInvalidKey) {
      target.isPermanentlyFailed = true;
      target.cooldownUntil = Infinity;
      target.lastError = 'Invalid API key';
      target.failedCalls++;
      return;
    }

    if (isPermissionError) {
      target.isPermanentlyFailed = true;
      target.cooldownUntil = Infinity;
      target.lastError = 'Permission denied / model access restricted';
      target.failedCalls++;
      return;
    }

    // Do not penalize API keys for client-side argument or format errors
    const isClientError = msg.includes('400') || msg.includes('invalid argument');
    if (isClientError) {
      target.lastError = msg;
      return;
    }

    target.failedCalls++;
    target.consecutiveFailures++;
    target.lastError = msg || (isQuota ? '429 Rate Limit' : 'Unknown Error');

    const now = Date.now();
    if (isQuota) {
      // Distinguish daily quota exhaustion from temporary per-minute burst rate limits
      const isDailyQuota = /GenerateRequestsPerDay|PerDay|per day|free_tier_requests/i.test(msg) ||
        (errorObj && errorObj.errorDetails && JSON.stringify(errorObj.errorDetails).includes('PerDay'));

      if (isDailyQuota) {
        // Daily quota exhausted: must NOT be treated as recovering in 60s
        target.isDailyQuota = true;
        const dailyCooldown = process.env.NODE_ENV === 'test' ? 60 * 1000 : 12 * 60 * 60 * 1000;
        target.isCooldown = true;
        target.cooldownUntil = now + dailyCooldown;
        target.lastError = 'Daily quota exhausted (Free Tier limit)';
      } else {
        // Transient rate limit (RPM burst): check if Google specified retryDelay
        let retrySec = 45; // Default safe transient cooldown
        const retryMatch = msg.match(/(?:Please retry in\s+|retryDelay["':\s]+)([0-9.]+)\s*s/i);
        if (retryMatch && parseFloat(retryMatch[1])) {
          retrySec = Math.ceil(parseFloat(retryMatch[1])) + 2;
        } else if (errorObj && errorObj.errorDetails) {
          const detailsStr = JSON.stringify(errorObj.errorDetails);
          const dMatch = detailsStr.match(/retryDelay["']?\s*:\s*["']?([0-9]+)s/i);
          if (dMatch && parseInt(dMatch[1], 10)) {
            retrySec = parseInt(dMatch[1], 10) + 2;
          }
        }
        target.isCooldown = true;
        target.cooldownUntil = now + (retrySec * 1000);
        target.lastError = `429 Rate Limit (retry in ${retrySec}s)`;
      }
    } else if (msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || (errorObj && errorObj.status === 503)) {
      // Upstream 503 Service Unavailable / high demand: set 15s cooldown to rotate keys cleanly
      target.isCooldown = true;
      target.cooldownUntil = now + 15 * 1000;
      target.lastError = '503 Service Unavailable (high demand)';
    } else {
      // Temporary network spikes: 3s cooldown
      target.isCooldown = true;
      target.cooldownUntil = now + 3 * 1000;
    }
  }

  getStatus() {
    const now = Date.now();
    return this.keys.map((k) => ({
      id: k.id,
      maskedKey: k.key.length > 8 ? `${k.key.substring(0, 4)}...${k.key.substring(k.key.length - 4)}` : '****',
      isCooldown: Boolean(k.cooldownUntil && k.cooldownUntil > now),
      cooldownRemainingSec: k.cooldownUntil && k.cooldownUntil > now ? Math.ceil((k.cooldownUntil - now) / 1000) : 0,
      consecutiveFailures: k.consecutiveFailures,
      totalCalls: k.totalCalls,
      successfulCalls: k.successfulCalls,
      failedCalls: k.failedCalls,
      lastError: k.lastError
    }));
  }
}

const keyPool = new KeyPool();
module.exports = keyPool;
