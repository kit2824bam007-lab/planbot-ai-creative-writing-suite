const request = require('supertest');
const app = require('../src/app');
const emailService = require('../src/services/email.service');
const keyPool = require('../src/services/keyPool');
const prisma = require('../src/services/db');

describe('Guest Conversation Migration, Auth, and KeyPool Tests', () => {
  const anonId = `anon_test_${Date.now()}`;
  const testEmail = `mig_${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  const expectedOtp = '654321';
  let verifiedToken = null;
  let guestConvId = null;

  beforeAll(async () => {
    jest.spyOn(emailService, 'generateOtp').mockReturnValue(expectedOtp);
    jest.spyOn(emailService, 'sendVerificationOtp').mockResolvedValue({ success: true, simulated: true });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  test('1. Guest conversation creation: anonymous user creates conversation with X-Anon-Id', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .set('x-anon-id', anonId)
      .send({ title: 'My Guest Story', mode: 'story' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    guestConvId = res.body.id;

    // Verify conversation list for guest
    const listRes = await request(app)
      .get('/api/conversations')
      .set('x-anon-id', anonId);

    expect(listRes.status).toBe(200);
    expect(listRes.body.conversations.some((c) => c.id === guestConvId)).toBe(true);
  });

  test('2. OTP verification: user registers, verifies OTP, and receives session token', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .set('x-anon-id', anonId)
      .send({ email: testEmail, password: testPassword, name: 'Migration Tester' });

    expect(regRes.status).toBe(201);
    expect(regRes.body.requiresVerification).toBe(true);

    // Verify OTP with X-Anon-Id header
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .set('x-anon-id', anonId)
      .send({ email: testEmail, otp: expectedOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
    verifiedToken = verifyRes.body.token;
  });

  test('3. Guest conversation migration: verified user accesses conversation list and sees guest conversation', async () => {
    const listRes = await request(app)
      .get('/api/conversations')
      .set('authorization', `Bearer ${verifiedToken}`)
      .set('x-anon-id', anonId);

    expect(listRes.status).toBe(200);
    expect(listRes.body.conversations).toBeDefined();
    expect(listRes.body.conversations.some((c) => c.id === guestConvId)).toBe(true);
  });

  test('4. Refresh after verification: GET /api/conversations without X-Anon-Id still returns migrated conversation', async () => {
    // Simulating a fresh browser tab or refresh where only Bearer token is sent (or new anonId)
    const refreshRes = await request(app)
      .get('/api/conversations')
      .set('authorization', `Bearer ${verifiedToken}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.conversations).toBeDefined();
    expect(refreshRes.body.conversations.some((c) => c.id === guestConvId)).toBe(true);
  });

  test('5. Normal authenticated conversations: verified user can create and fetch new conversation', async () => {
    const createRes = await request(app)
      .post('/api/conversations')
      .set('authorization', `Bearer ${verifiedToken}`)
      .send({ title: 'Authenticated Poem', mode: 'poem' });

    expect(createRes.status).toBe(201);
    const authConvId = createRes.body.id;

    const getRes = await request(app)
      .get(`/api/conversations/${authConvId}`)
      .set('authorization', `Bearer ${verifiedToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(authConvId);
  });

  test('6. KeyPool correctly distinguishes transient 429 vs daily quota exhaustion', () => {
    const dummyKey = keyPool.createKeyEntry('test-key-diagnostics', 'TEST_KEY');
    keyPool.keys.push(dummyKey);

    // Transient rate limit with retryDelay
    keyPool.reportFailure(dummyKey, true, 'Please retry in 30s');
    expect(dummyKey.isCooldown).toBe(true);
    expect(dummyKey.isDailyQuota).toBeFalsy();
    expect(dummyKey.cooldownUntil).toBeGreaterThan(Date.now());
    expect(dummyKey.cooldownUntil).toBeLessThanOrEqual(Date.now() + 35000);

    // Daily quota exhaustion
    keyPool.reportFailure(dummyKey, true, 'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests GenerateRequestsPerDayPerProjectPerModel-FreeTier');
    expect(dummyKey.isDailyQuota).toBe(true);

    // Clean up
    keyPool.keys = keyPool.keys.filter((k) => k.id !== 'TEST_KEY');
  });

  describe('Security & Adversarial Tests for X-Anon-Id Migration', () => {
    let victimToken = null;
    let victimUserId = null;
    let victimConvId = null;
    let attackerToken = null;
    let attackerUserId = null;

    beforeAll(async () => {
      // 1. Create a registered victim user
      const victimEmail = `victim_${Date.now()}@gmail.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ email: victimEmail, password: 'Password123!', name: 'Victim User' });
      const victimVerify = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: victimEmail, otp: expectedOtp });
      victimToken = victimVerify.body.token;
      victimUserId = victimVerify.body.user.id;

      // Victim creates a private conversation
      const victimConvRes = await request(app)
        .post('/api/conversations')
        .set('authorization', `Bearer ${victimToken}`)
        .send({ title: 'Victim Secret Conversation', mode: 'story' });
      victimConvId = victimConvRes.body.id;

      // 2. Create an authenticated attacker
      const attackerEmail = `attacker_${Date.now()}@gmail.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ email: attackerEmail, password: 'Password123!', name: 'Attacker User' });
      const attackerVerify = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: attackerEmail, otp: expectedOtp });
      attackerToken = attackerVerify.body.token;
      attackerUserId = attackerVerify.body.user.id;
    });

    test('A. Authenticated attacker sends victim registered UUID in X-Anon-Id -> No migration, victim retains ownership, attacker gets 404', async () => {
      // Attacker attempts bulk migration via GET /api/conversations sending victim's UUID as X-Anon-Id
      const listRes = await request(app)
        .get('/api/conversations')
        .set('authorization', `Bearer ${attackerToken}`)
        .set('x-anon-id', victimUserId);

      expect(listRes.status).toBe(200);
      // Victim's conversation must not be returned to attacker
      expect(listRes.body.conversations.some((c) => c.id === victimConvId)).toBe(false);

      // Attacker attempts direct access via GET /api/conversations/:id sending victim's UUID as X-Anon-Id
      const directRes = await request(app)
        .get(`/api/conversations/${victimConvId}`)
        .set('authorization', `Bearer ${attackerToken}`)
        .set('x-anon-id', victimUserId);

      // Must return 404
      expect(directRes.status).toBe(404);

      // Verify in DB that conversation is still owned by victim, NOT attacker
      if (prisma && prisma.conversation) {
        const checkConv = await prisma.conversation.findUnique({ where: { id: victimConvId } });
        expect(checkConv.userId).toBe(victimUserId);
        expect(checkConv.userId).not.toBe(attackerUserId);
      }
    });

    test('B. Invalid X-Anon-Id values (UUID, random string, empty string, malformed) are rejected and cannot trigger migration', async () => {
      const invalidAnonIds = [
        '123e4567-e89b-12d3-a456-426614174000', // standard UUID
        'random_string_without_prefix',
        '', // empty string
        'anon_', // malformed: too short (< 4 suffix chars)
        'anon_bad!@#$chars', // malformed: special chars
        `anon_${'a'.repeat(65)}` // malformed: > 64 chars
      ];

      for (const invalidId of invalidAnonIds) {
        const res = await request(app)
          .get('/api/conversations')
          .set('authorization', `Bearer ${attackerToken}`)
          .set('x-anon-id', invalidId);

        expect(res.status).toBe(200);
        // Victim's conversation is not migrated or returned
        expect(res.body.conversations.some((c) => c.id === victimConvId)).toBe(false);
      }
    });

    test('C. Valid anonymous ID (anon_test123) correctly migrates guest conversation to authenticated user', async () => {
      const validAnonId = 'anon_test123';

      // Guest creates conversation with valid anonId
      const guestRes = await request(app)
        .post('/api/conversations')
        .set('x-anon-id', validAnonId)
        .send({ title: 'Valid Guest Story', mode: 'story' });
      expect(guestRes.status).toBe(201);
      const guestId = guestRes.body.id;

      // Register and verify a new user with this valid anonId
      const newUserEmail = `newuser_${Date.now()}@gmail.com`;
      await request(app)
        .post('/api/auth/register')
        .set('x-anon-id', validAnonId)
        .send({ email: newUserEmail, password: 'Password123!', name: 'New Valid User' });

      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .set('x-anon-id', validAnonId)
        .send({ email: newUserEmail, otp: expectedOtp });
      expect(verifyRes.status).toBe(200);
      const userToken = verifyRes.body.token;
      const newUserId = verifyRes.body.user.id;

      // GET /api/conversations returns the migrated conversation
      const listRes = await request(app)
        .get('/api/conversations')
        .set('authorization', `Bearer ${userToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.conversations.some((c) => c.id === guestId)).toBe(true);

      // Verify in DB that ownership changed to new user
      if (prisma && prisma.conversation) {
        const checkConv = await prisma.conversation.findUnique({ where: { id: guestId } });
        expect(checkConv.userId).toBe(newUserId);
      }
    });

    test('D. GET /api/conversations/:id: valid anon ownership migration succeeds, registered-user conversation cannot be migrated', async () => {
      const singleAnonId = `anon_single_${Date.now()}`;

      // Guest creates conversation
      const guestRes = await request(app)
        .post('/api/conversations')
        .set('x-anon-id', singleAnonId)
        .send({ title: 'Single Migration Test', mode: 'story' });
      expect(guestRes.status).toBe(201);
      const guestConv = guestRes.body.id;

      // Register another authenticated user
      const userEmail = `direct_mig_${Date.now()}@gmail.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ email: userEmail, password: 'Password123!', name: 'Direct Mig User' });
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: userEmail, otp: expectedOtp });
      const directToken = verifyRes.body.token;
      const directUserId = verifyRes.body.user.id;

      // Valid anon ownership migration succeeds via GET /api/conversations/:id
      const directGetRes = await request(app)
        .get(`/api/conversations/${guestConv}`)
        .set('authorization', `Bearer ${directToken}`)
        .set('x-anon-id', singleAnonId);

      expect(directGetRes.status).toBe(200);
      expect(directGetRes.body.id).toBe(guestConv);
      expect(directGetRes.body.userId).toBe(directUserId);

      // Registered-user conversation CANNOT be migrated through X-Anon-Id
      const hijackRes = await request(app)
        .get(`/api/conversations/${victimConvId}`)
        .set('authorization', `Bearer ${directToken}`)
        .set('x-anon-id', singleAnonId);

      expect(hijackRes.status).toBe(404);

      if (prisma && prisma.conversation) {
        const checkVictimConv = await prisma.conversation.findUnique({ where: { id: victimConvId } });
        expect(checkVictimConv.userId).toBe(victimUserId);
      }
    });
  });
});
