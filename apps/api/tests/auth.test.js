const request = require('supertest');
const app = require('../src/app');
const emailService = require('../src/services/email.service');

describe('Authentication & Email Verification Tests', () => {
  const testEmail = `testuser_${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  const expectedOtp = '789123';
  let authToken = null;
  let otpSpy = null;

  beforeAll(() => {
    otpSpy = jest.spyOn(emailService, 'generateOtp').mockReturnValue(expectedOtp);
  });

  afterAll(() => {
    if (otpSpy) otpSpy.mockRestore();
  });

  test('POST /api/auth/register creates unverified account without session token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Persistent User'
      });

    expect(res.status).toBe(201);
    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.email).toBe(testEmail);
    expect(res.body.token).toBeUndefined();
  });

  test('POST /api/auth/register with unverified email during cooldown triggers 429', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Persistent User'
      });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RESEND_COOLDOWN');
  });

  test('POST /api/auth/login is blocked for unverified account with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('POST /api/auth/verify-otp rejects invalid 6-digit OTP with 400', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testEmail,
        otp: '000000'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_FAILED');
  });

  test('POST /api/auth/resend-otp triggers cooldown rate-limiting with 429', async () => {
    const res = await request(app)
      .post('/api/auth/resend-otp')
      .send({
        email: testEmail
      });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RESEND_COOLDOWN');
  });

  test('POST /api/auth/verify-otp with correct OTP verifies account and returns session token', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        email: testEmail,
        otp: expectedOtp
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    authToken = res.body.token;
  });

  test('POST /api/auth/login succeeds for verified account and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  test('GET /api/auth/me with Authorization: Bearer <token> successfully restores user session', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  test('GET /api/auth/me without token returns unauthenticated guest state', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.user).toBeNull();
  });

  test('POST /api/auth/google rejects missing or empty credential with 400', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_GOOGLE_CREDENTIAL');
  });

  test('POST /api/auth/google rejects invalid credential token with 401', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'invalid-fake-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  test('sendVerificationOtp rejects in production if BREVO_API_KEY is missing', async () => {
    const { env } = require('../src/config/env');
    const originalNodeEnv = env.NODE_ENV;
    const originalBrevoKey = env.BREVO_API_KEY;
    const originalEmailFrom = env.EMAIL_FROM;
    env.NODE_ENV = 'production';
    env.BREVO_API_KEY = '';
    env.EMAIL_FROM = 'verified-sender@planbot.ai';

    await expect(emailService.sendVerificationOtp('prodtest@example.com', '123456'))
      .rejects
      .toThrow('Email delivery service is currently not configured');

    env.NODE_ENV = originalNodeEnv;
    env.BREVO_API_KEY = originalBrevoKey;
    env.EMAIL_FROM = originalEmailFrom;
  });

  test('sendVerificationOtp rejects in production if EMAIL_FROM is missing', async () => {
    const { env } = require('../src/config/env');
    const originalNodeEnv = env.NODE_ENV;
    const originalBrevoKey = env.BREVO_API_KEY;
    const originalEmailFrom = env.EMAIL_FROM;
    env.NODE_ENV = 'production';
    env.BREVO_API_KEY = 'test-brevo-api-key-12345';
    env.EMAIL_FROM = '';

    await expect(emailService.sendVerificationOtp('prodtest@example.com', '123456'))
      .rejects
      .toThrow('Email delivery service is currently not configured');

    env.NODE_ENV = originalNodeEnv;
    env.BREVO_API_KEY = originalBrevoKey;
    env.EMAIL_FROM = originalEmailFrom;
  });

  test('sendVerificationOtp delivers email via Brevo HTTPS API in production when configured', async () => {
    const { env } = require('../src/config/env');
    const originalNodeEnv = env.NODE_ENV;
    const originalBrevoKey = env.BREVO_API_KEY;
    const originalEmailFrom = env.EMAIL_FROM;
    env.NODE_ENV = 'production';
    env.BREVO_API_KEY = 'test-brevo-api-key-12345';
    env.EMAIL_FROM = 'verified-sender@planbot.ai';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ messageId: '<brevo-msg-id-789>' }),
      text: async () => ''
    });

    const result = await emailService.sendVerificationOtp('user@example.com', '654321', 'Test User');

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(false);
    expect(result.messageId).toBe('<brevo-msg-id-789>');
    expect(fetchSpy).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'api-key': 'test-brevo-api-key-12345',
        'Content-Type': 'application/json'
      }),
      body: expect.stringContaining('"PlanBot AI"')
    }));

    fetchSpy.mockRestore();
    env.NODE_ENV = originalNodeEnv;
    env.BREVO_API_KEY = originalBrevoKey;
    env.EMAIL_FROM = originalEmailFrom;
  });

  test('sendVerificationOtp rejects safely in production if Brevo returns error status', async () => {
    const { env } = require('../src/config/env');
    const originalNodeEnv = env.NODE_ENV;
    const originalBrevoKey = env.BREVO_API_KEY;
    const originalEmailFrom = env.EMAIL_FROM;
    env.NODE_ENV = 'production';
    env.BREVO_API_KEY = 'test-brevo-api-key-12345';
    env.EMAIL_FROM = 'verified-sender@planbot.ai';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ code: 'invalid_parameter', message: 'unauthorized sender' })
    });

    await expect(emailService.sendVerificationOtp('failuser@example.com', '654321'))
      .rejects
      .toThrow('Unable to deliver verification email. Please try again later.');

    fetchSpy.mockRestore();
    env.NODE_ENV = originalNodeEnv;
    env.BREVO_API_KEY = originalBrevoKey;
    env.EMAIL_FROM = originalEmailFrom;
  });

  test('sendVerificationOtp rejects safely in production if Brevo network request fails', async () => {
    const { env } = require('../src/config/env');
    const originalNodeEnv = env.NODE_ENV;
    const originalBrevoKey = env.BREVO_API_KEY;
    const originalEmailFrom = env.EMAIL_FROM;
    env.NODE_ENV = 'production';
    env.BREVO_API_KEY = 'test-brevo-api-key-12345';
    env.EMAIL_FROM = 'verified-sender@planbot.ai';

    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection timeout'));

    await expect(emailService.sendVerificationOtp('timeout@example.com', '654321'))
      .rejects
      .toThrow('Unable to deliver verification email. Please try again later.');

    fetchSpy.mockRestore();
    env.NODE_ENV = originalNodeEnv;
    env.BREVO_API_KEY = originalBrevoKey;
    env.EMAIL_FROM = originalEmailFrom;
  });
});
