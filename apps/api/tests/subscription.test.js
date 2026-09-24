const request = require('supertest');
const app = require('../src/app');
const crypto = require('crypto');
const redis = require('../src/services/redis');
const db = require('../src/services/db');
const { env } = require('../src/config/env');

describe('Subscription, Usage & Rate Limiting System', () => {
  let userToken = null;
  let testUserId = null;
  const testEmail = `sub_test_${Date.now()}@example.com`;

  beforeAll(async () => {
    // Register a test user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: 'password123', name: 'Subscription Tester' });
    userToken = res.body.token;
    testUserId = res.body.user.id;
  });

  test('GET /api/subscription/status returns 10 daily limit for anonymous/free users', async () => {
    const res = await request(app)
      .get('/api/subscription/status')
      .set('x-anon-id', `anon_test_${Date.now()}`);

    expect(res.status).toBe(200);
    expect(res.body.plan).toBe('FREE');
    expect(res.body.limit).toBe(10);
    expect(res.body.remaining).toBeLessThanOrEqual(10);
    expect(res.body.isPro).toBe(false);
  });

  test('POST /api/subscription/create-order creates an order for ₹30 (3000 paise)', async () => {
    const res = await request(app)
      .post('/api/subscription/create-order')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(3000);
    expect(res.body.currency).toBe('INR');
    expect(res.body.orderId).toBeDefined();
    expect(res.body.keyId).toBeDefined();
  });

  test('POST /api/subscription/verify-payment verifies payment and activates 30-day Pro', async () => {
    // 1. Create order
    const orderRes = await request(app)
      .post('/api/subscription/create-order')
      .set('Authorization', `Bearer ${userToken}`);

    const orderId = orderRes.body.orderId;
    const paymentId = `pay_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // 2. Verify payment
    const verifyRes = await request(app)
      .post('/api/subscription/verify-payment')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.subscription.plan).toBe('PRO');
    expect(verifyRes.body.subscription.status).toBe('ACTIVE');
    expect(verifyRes.body.subscription.isPro).toBe(true);
    expect(verifyRes.body.subscription.expiryDate).toBeDefined();

    // 3. Status should now report PRO
    const statusRes = await request(app)
      .get('/api/subscription/status')
      .set('Authorization', `Bearer ${userToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.plan).toBe('PRO');
    expect(statusRes.body.isPro).toBe(true);
    expect(statusRes.body.limit).toBeNull();
  });

  test('Backend enforcement: Free user hitting limit receives FREE_LIMIT_REACHED error', async () => {
    const anonId = `anon_limit_tester_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const redisKey = `genlimit:anon:${anonId}:${today}`;

    // Simulate user having consumed all 10 generations
    await redis.set(redisKey, '10', 'EX', 86400);

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', anonId)
      .send({
        prompt: 'Morning blossom in spring',
        mode: 'poem',
        language: 'en'
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('FREE_LIMIT_REACHED');
    expect(res.body.upgradeRequired).toBe(true);
    expect(res.body.message).toContain("reached today's free generation limit");
  });

  test('Pro user is exempt from 10 generation daily limit', async () => {
    const today = new Date().toISOString().split('T')[0];
    const redisKey = `genlimit:user:${testUserId}:${today}`;

    // Set usage high
    await redis.set(redisKey, '50', 'EX', 86400);

    // Generate request for Pro user should not be blocked with 429
    const res = await request(app)
      .post('/api/chat/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        prompt: 'A gentle ocean breeze',
        mode: 'poem',
        language: 'en'
      });

    // Should NOT be 429 rate limit
    expect(res.status).not.toBe(429);
  }, 30000);
});
