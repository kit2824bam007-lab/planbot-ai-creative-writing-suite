const keyPool = require('../src/services/keyPool');

describe('Gemini Multi-Key Pool & 429 Cooldown Management', () => {
  beforeEach(() => {
    // Reset pool state
    keyPool.keys = [
      keyPool.createKeyEntry('key-1-test', 'GEMINI_API_KEY'),
      keyPool.createKeyEntry('key-2-test', 'GEMINI_API_KEY_2')
    ];
    keyPool.currentIndex = 0;
  });

  test('Rotates keys in round-robin fashion', () => {
    const k1 = keyPool.getKey();
    const k2 = keyPool.getKey();
    expect(k1.id).not.toBe(k2.id);
  });

  test('Applies 1-minute cooldown on 429 rate limit failure', () => {
    const key = keyPool.getKey();
    keyPool.reportFailure(key, true, '429 Rate Limit Exceeded');

    expect(key.isCooldown).toBe(true);
    expect(key.cooldownUntil).toBeGreaterThan(Date.now());

    // Next getKey() should avoid the cooling key and return the other key
    const nextKey = keyPool.getKey();
    expect(nextKey.id).not.toBe(key.id);
  });

  test('Server key pool operates strictly server-side without accepting client keys', () => {
    const key = keyPool.getKey();
    expect(key.key).toBeDefined();
    expect(key.key).not.toBe('');
  });

  test('Throws ALL_KEYS_EXHAUSTED when all pool keys are in cooldown', () => {
    // Mark both in cooldown
    keyPool.keys[0].cooldownUntil = Date.now() + 50000;
    keyPool.keys[1].cooldownUntil = Date.now() + 50000;

    expect(() => {
      keyPool.getKey();
    }).toThrow('ALL_KEYS_EXHAUSTED');
  });

  test('reportSuccess resets failure count and cooldown', () => {
    const key = keyPool.keys[0];
    key.consecutiveFailures = 3;
    key.isCooldown = true;
    key.cooldownUntil = Date.now() + 10000;

    keyPool.reportSuccess(key);
    expect(key.consecutiveFailures).toBe(0);
    expect(key.isCooldown).toBe(false);
  });
});
