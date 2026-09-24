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
      if (k.cooldownUntil && k.cooldownUntil > now) {
        return false;
      }
      k.isCooldown = false;
      return true;
    });

    if (available.length === 0) {
      // Calculate minimum retryAfter in seconds
      const nextAvailableTime = Math.min(...this.keys.map((k) => k.cooldownUntil || (now + 60000)));
      const retryAfterSec = Math.max(1, Math.ceil((nextAvailableTime - now) / 1000));
      const error = new Error('ALL_KEYS_EXHAUSTED');
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
      target.cooldownUntil = 0;
      target.successfulCalls++;
      target.lastError = null;
    }
  }

  reportFailure(keyEntry, isQuota = false, errMessage = '') {
    if (!keyEntry || keyEntry.isBYOK) return;
    const target = this.keys.find((k) => k.id === keyEntry.id);
    if (!target) return;

    target.failedCalls++;
    target.consecutiveFailures++;
    target.lastError = errMessage || (isQuota ? '429 Rate Limit' : 'Unknown Error');

    const now = Date.now();
    if (isQuota) {
      // 429 quota: 1-minute cooldown
      target.isCooldown = true;
      target.cooldownUntil = now + 60 * 1000;
    } else {
      // Exponential backoff: 1m -> 2m -> 4m -> 8m
      const backoffMinutes = Math.min(Math.pow(2, target.consecutiveFailures - 1), 8);
      target.isCooldown = true;
      target.cooldownUntil = now + backoffMinutes * 60 * 1000;
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
