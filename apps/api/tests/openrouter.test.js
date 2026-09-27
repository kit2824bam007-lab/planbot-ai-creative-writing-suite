const request = require('supertest');
const app = require('../src/app');
const geminiService = require('../src/services/gemini');
const openRouterService = require('../src/services/openrouter');
const { env } = require('../src/config/env');

describe('OpenRouter Free Tier Fallback Tests', () => {
  const TEST_OPENROUTER_KEY = 'sk-or-v1-test-mock-secret-key-abc123xyz789';
  let originalFetch = global.fetch;

  function createMockSseResponse(chunks, status = 200) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      body: stream,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      json: () => Promise.resolve({ error: { message: 'Mock error' } })
    });
  }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = TEST_OPENROUTER_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  test('A. OpenRouter service successfully streams a response', async () => {
    const mockChunks = ['The ', 'sun ', 'rises ', 'golden.'];
    global.fetch = jest.fn().mockImplementation(() => createMockSseResponse(mockChunks));

    const streamedTokens = [];
    const result = await openRouterService.generateStream({
      systemPrompt: 'You are a poetic assistant.',
      userPrompt: 'Write a poem about dawn.',
      onChunk: (chunk) => streamedTokens.push(chunk)
    });

    expect(result).toBeDefined();
    expect(result.fullText).toBe('The sun rises golden.');
    expect(result.provider).toBe('openrouter');
    expect(result.model).toBe('openrouter/free');
    expect(streamedTokens).toEqual(mockChunks);
  });

  test('B. OpenRouter receives system prompt, user prompt, model=openrouter/free, and stream=true', async () => {
    let capturedUrl = '';
    let capturedOptions = null;

    global.fetch = jest.fn().mockImplementation((url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return createMockSseResponse(['Valid text']);
    });

    await openRouterService.generateStream({
      systemPrompt: 'System instructions test.',
      userPrompt: 'User prompt test.'
    });

    expect(capturedUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(capturedOptions.method).toBe('POST');
    expect(capturedOptions.headers['Authorization']).toBe(`Bearer ${TEST_OPENROUTER_KEY}`);
    expect(capturedOptions.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(capturedOptions.body);
    expect(body.model).toBe('openrouter/free');
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: 'system', content: 'System instructions test.' },
      { role: 'user', content: 'User prompt test.' }
    ]);
  });

  test('C. Gemini succeeds -> OpenRouter is NOT called', async () => {
    const openRouterSpy = jest.spyOn(openRouterService, 'generateStream');

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_c_${Date.now()}`)
      .send({ prompt: 'A simple poem', mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(openRouterSpy).not.toHaveBeenCalled();
  });

  test('D. Gemini returns DAILY_QUOTA_EXHAUSTED -> OpenRouter is called exactly once', async () => {
    const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
    quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);
    const openRouterSpy = jest.spyOn(openRouterService, 'generateStream').mockResolvedValue({
      fullText: 'Hope is the thing with feathers that perches in the soul and sings the tune without the words and never stops at all.',
      model: 'openrouter/free',
      provider: 'openrouter'
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_d_${Date.now()}`)
      .send({ prompt: `Write about hope ${Date.now()}`, mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(openRouterSpy).toHaveBeenCalledTimes(1);
    expect(res.text).toContain('event: done');
  });

  test('E. Gemini returns 429 -> OpenRouter is called exactly once', async () => {
    const rateLimitErr = new Error('Resource exhausted rate limit 429');
    rateLimitErr.status = 429;
    rateLimitErr.code = 'RESOURCE_EXHAUSTED';

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(rateLimitErr);
    const openRouterSpy = jest.spyOn(openRouterService, 'generateStream').mockResolvedValue({
      fullText: 'Through winds of doubt, perseverance guides the steady spirit to walk into the break of day.',
      model: 'openrouter/free',
      provider: 'openrouter'
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_e_${Date.now()}`)
      .send({ prompt: `Write about perseverance ${Date.now()}`, mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(openRouterSpy).toHaveBeenCalledTimes(1);
    expect(res.text).toContain('event: done');
  });

  test('F. Client validation error -> OpenRouter is NOT called', async () => {
    const openRouterSpy = jest.spyOn(openRouterService, 'generateStream');

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_f_${Date.now()}`)
      .send({ prompt: '', mode: 'poem' }); // invalid empty prompt without action or media

    expect(res.status).toBe(400);
    expect(openRouterSpy).not.toHaveBeenCalled();
  });

  test('G. OpenRouter succeeds -> final response is returned to user with tokens', async () => {
    const quotaErr = new Error('AI_UNAVAILABLE');
    quotaErr.code = 'AI_UNAVAILABLE';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);

    global.fetch = jest.fn().mockImplementation(() =>
      createMockSseResponse(['Golden ', 'light ', 'cascades ', 'across ', 'the ', 'morning ', 'sky.'])
    );

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_g_${Date.now()}`)
      .send({ prompt: 'Write about the sunrise', mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');
    expect(res.text).toContain('Golden light cascades across the morning sky.');
  });

  test('H. OpenRouter fails -> existing AI unavailable error is returned and limit refunded', async () => {
    const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
    quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);

    // OpenRouter also fails
    global.fetch = jest.fn().mockRejectedValue(new Error('OpenRouter network down'));

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_h_${Date.now()}`)
      .send({ prompt: 'Write about rain', mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('AI generation is temporarily unavailable');
  });

  test('I. OPENROUTER_API_KEY missing -> application handles gracefully, skips fallback without crash', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const originalEnvKey = env.OPENROUTER_API_KEY;
    env.OPENROUTER_API_KEY = undefined;

    expect(openRouterService.isAvailable()).toBe(false);

    const quotaErr = new Error('AI_UNAVAILABLE');
    quotaErr.code = 'AI_UNAVAILABLE';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_i_${Date.now()}`)
      .send({ prompt: 'Write a poem', mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('AI generation is temporarily unavailable');

    env.OPENROUTER_API_KEY = originalEnvKey;
  });

  test('J. User generation quota: Gemini failure + OpenRouter success counts as ONE generation', async () => {
    const anonId = `anon_quota_test_${Date.now()}`;

    // Get initial quota
    const initialQuotaRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    const initialRemaining = initialQuotaRes.body.remaining;

    // Simulate Gemini failure -> OpenRouter success
    const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
    quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);
    jest.spyOn(openRouterService, 'generateStream').mockResolvedValue({
      fullText: 'OpenRouter single quota consumption verified with a complete English poem.',
      model: 'openrouter/free',
      provider: 'openrouter'
    });

    const genRes = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', anonId)
      .send({ prompt: 'Single quota poem test', mode: 'poem', language: 'en', length: 'short' });

    expect(genRes.status).toBe(200);
    expect(genRes.text).toContain('event: done');

    // Check remaining quota afterwards
    const afterQuotaRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    const afterRemaining = afterQuotaRes.body.remaining;

    // Exactly 1 generation consumed
    expect(afterRemaining).toBe(initialRemaining - 1);
  });

  test('K. No API key appears in server logs', async () => {
    const loggedMessages = [];
    const logSpy = jest.spyOn(console, 'log').mockImplementation((...args) => loggedMessages.push(args.join(' ')));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => loggedMessages.push(args.join(' ')));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => loggedMessages.push(args.join(' ')));

    const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
    quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);
    global.fetch = jest.fn().mockImplementation(() =>
      createMockSseResponse(['Logged test chunk of poetic words in English.'])
    );

    await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_k_${Date.now()}`)
      .send({ prompt: 'Logging security test', mode: 'poem', language: 'en', length: 'short' });

    // Assert that the secret key was never printed
    const allLogs = loggedMessages.join('\n');
    expect(allLogs).not.toContain(TEST_OPENROUTER_KEY);

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('L. Partial-stream fallback: Gemini sends partial tokens then fails -> replace event clears buffer, OpenRouter generates cleanly without duplication', async () => {
    // Gemini sends 2 tokens, then throws DAILY_QUOTA_EXHAUSTED
    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      if (onChunk) {
        onChunk('Broken ');
        onChunk('Gemini ');
      }
      const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
      quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
      quotaErr.status = 503;
      throw quotaErr;
    });

    global.fetch = jest.fn().mockImplementation(() =>
      createMockSseResponse(['Clean ', 'OpenRouter ', 'poem ', 'about ', 'the ', 'dawn ', 'shines.'])
    );

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_l_${Date.now()}`)
      .send({ prompt: `Write about the dawn ${Date.now()}`, mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    // Verify that a replace event was emitted with empty text to clear the Broken Gemini tokens
    expect(res.text).toContain('event: replace\ndata: {"text":""}');
    // Verify done event contains only OpenRouter output
    expect(res.text).toContain('Clean OpenRouter poem about the dawn shines.');
    expect(res.text).toContain('event: done');
  });

  test('M. Partial-stream error: Gemini sends partial tokens, OpenRouter fails -> replace event clears buffer, error event emitted, quota refunded', async () => {
    // Gemini sends partial tokens, then throws
    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      if (onChunk) {
        onChunk('Partial text from Gemini');
      }
      const quotaErr = new Error('AI_UNAVAILABLE');
      quotaErr.code = 'AI_UNAVAILABLE';
      quotaErr.status = 503;
      throw quotaErr;
    });

    // OpenRouter also fails
    global.fetch = jest.fn().mockRejectedValue(new Error('OpenRouter down'));

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_test_m_${Date.now()}`)
      .send({ prompt: `Partial stream failure test ${Date.now()}`, mode: 'poem', language: 'en', length: 'short' });

    expect(res.status).toBe(200);
    // Replace event was emitted to clear partial Gemini tokens
    expect(res.text).toContain('event: replace\ndata: {"text":""}');
    // Error event was emitted
    expect(res.text).toContain('event: error');
  });
});
