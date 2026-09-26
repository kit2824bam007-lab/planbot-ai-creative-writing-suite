const request = require('supertest');
const app = require('../src/app');

describe('Authentication & Session Persistence Tests', () => {
  const testEmail = `testuser_${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  let authToken = null;

  test('POST /api/auth/register returns token and user profile', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Persistent User'
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    authToken = res.body.token;
  });

  test('POST /api/auth/login returns token and user profile', async () => {
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
});
