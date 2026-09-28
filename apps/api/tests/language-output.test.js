/**
 * Language Output Consistency Tests
 *
 * Validates that:
 * 1. The user's SELECTED output language is always the authoritative output language.
 * 2. Input language (Tanglish, Tamil, English, mixed) never overrides the selected output language.
 * 3. Wrong-language AI responses trigger validation failure.
 * 4. Bounded language correction retry happens on failure.
 * 5. Quota is not double-deducted on correction retries.
 * 6. OpenRouter fallback preserves the selected output language.
 * 7. Image and video requests still work correctly.
 */

const request = require('supertest');
const app = require('../src/app');
const geminiService = require('../src/services/gemini');
const openRouterService = require('../src/services/openrouter');
const { validateOutputLanguage, stripLanguageNeutralContent } = require('../src/services/guards');
const { buildSystemPrompt } = require('../src/config/prompts');

// ---------------------------------------------------------------------------
// Unit tests: validateOutputLanguage (Task 1D)
// ---------------------------------------------------------------------------

describe('validateOutputLanguage — Proportion-based language validation', () => {
  // Authentic Tamil poem (should pass)
  test('Valid Tamil output passes', () => {
    const tamilText = `காற்றினில் தவழும் கானகம் போலே
தோற்றுவித்தாய் ஓர் புதுநிலா ஒளியை!
காதலின் ஆழம் கடலிலும் பெரிதாய்
நெஞ்சினில் நின்றே நிலைபெறு மானே!`;
    const result = validateOutputLanguage(tamilText, 'ta');
    expect(result.valid).toBe(true);
  });

  // English output in Tamil mode (should fail)
  test('English-only text fails Tamil validation', () => {
    const englishText = `The whispering breeze dances through the ancient forest canopy,
carrying the echoes of forgotten melodies into the golden afternoon light.`;
    const result = validateOutputLanguage(englishText, 'ta');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Tamil script proportion too low');
  });

  // Valid English output (should pass)
  test('Valid English output passes', () => {
    const englishText = `Sabari and Kani walked along the shore as the waves whispered ancient stories.
Their love was like the ocean — boundless, endless, and deeply calm.`;
    const result = validateOutputLanguage(englishText, 'en');
    expect(result.valid).toBe(true);
  });

  // Tamil text returned when English was requested (should fail)
  test('Tamil-dominant text fails English validation', () => {
    const tamilText = `சபரியும் கனியும் கடற்கரையில் நடந்தனர். அவர்களின் காதல் கடல் போல் பரந்திருந்தது.`;
    const result = validateOutputLanguage(tamilText, 'en');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Tamil script proportion too high');
  });

  // Mixed Tamil+English poem with mostly Tamil (should pass for 'ta')
  test('Mostly-Tamil output with some English proper nouns passes Tamil validation', () => {
    const mixedText = `சபரி மற்றும் Kani இருவரும் காதலர்கள்.
அவர்களின் அன்பு கடலினும் ஆழமானது.
நிலவொளியில் இரவு மலர்கிறது.`;
    const result = validateOutputLanguage(mixedText, 'ta');
    expect(result.valid).toBe(true); // proper nouns don't invalidate
  });

  // Hashtags and emojis don't affect language detection
  test('Hashtags and emojis do not affect language proportion', () => {
    const tamilWithHashtags = `கடலோரம் நடந்தோம். அலைகள் பாடின. 🌅
#அந்திவானம் #கடற்கரை #SunsetVibes`;
    const result = validateOutputLanguage(tamilWithHashtags, 'ta');
    expect(result.valid).toBe(true);
  });

  // Tanglish always passes (no strict script requirement)
  test('Tanglish output always passes language validation', () => {
    const tanglish = 'Sabari matrum Kani iruvarum beach-la nadandha, waves oda sound heart-la touch aagudhu.';
    const result = validateOutputLanguage(tanglish, 'tanglish');
    expect(result.valid).toBe(true);
  });

  // Empty text fails
  test('Empty output fails validation', () => {
    const result = validateOutputLanguage('', 'ta');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('empty_output');
  });
});

// ---------------------------------------------------------------------------
// Unit tests: stripLanguageNeutralContent
// ---------------------------------------------------------------------------

describe('stripLanguageNeutralContent — Neutral content stripping', () => {
  test('strips URLs correctly', () => {
    const text = 'Visit https://example.com for more info.';
    const stripped = stripLanguageNeutralContent(text);
    expect(stripped).not.toContain('https://');
  });

  test('strips hashtags correctly', () => {
    const text = 'Great day! #SunsetVibes #தமிழ் #Trending';
    const stripped = stripLanguageNeutralContent(text);
    expect(stripped).not.toContain('#SunsetVibes');
  });

  test('strips numbers but preserves letters', () => {
    const text = 'Page 42 of the story continues here.';
    const stripped = stripLanguageNeutralContent(text);
    expect(stripped).not.toContain('42');
    expect(stripped).toContain('Page');
  });
});

// ---------------------------------------------------------------------------
// Unit tests: buildSystemPrompt language directives (Task 1B)
// ---------------------------------------------------------------------------

describe('buildSystemPrompt — Language directive content', () => {
  test('Tamil directive includes INPUT UNDERSTANDING and OUTPUT LANGUAGE RULE', () => {
    const prompt = buildSystemPrompt({ mode: 'poem', language: 'ta' });
    expect(prompt).toContain('INPUT UNDERSTANDING');
    expect(prompt).toContain('OUTPUT LANGUAGE RULE');
    expect(prompt).toContain('NEVER infer the output language from the input language');
    expect(prompt).toContain('Romanized Tamil / Tanglish');
  });

  test('English directive includes INPUT UNDERSTANDING and OUTPUT LANGUAGE RULE', () => {
    const prompt = buildSystemPrompt({ mode: 'poem', language: 'en' });
    expect(prompt).toContain('INPUT UNDERSTANDING');
    expect(prompt).toContain('OUTPUT LANGUAGE RULE: The selected output language is ENGLISH');
    expect(prompt).toContain('NEVER infer the output language from the input language');
  });

  test('Tamil directive explicitly forbids Tanglish output when Tamil is selected', () => {
    const prompt = buildSystemPrompt({ mode: 'poem', language: 'ta' });
    expect(prompt).toContain('Do NOT generate Romanized Tamil/Tanglish output unless Tanglish is explicitly selected');
  });

  test('English directive explicitly forbids Tamil script in prose', () => {
    const prompt = buildSystemPrompt({ mode: 'story', language: 'en' });
    expect(prompt).toContain('Do NOT switch to Tamil, Tanglish, Hindi, or any other language mid-response');
  });
});

// ---------------------------------------------------------------------------
// Integration tests: Language consistency in generate endpoint (Tasks 1A-1C)
// ---------------------------------------------------------------------------

describe('Language Output Consistency — Integration Tests', () => {
  // Test 1: Tanglish input + Tamil selected -> mock should generate Tamil
  test('1. Tanglish input + Tamil selected → Tamil output from mock', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t1_${Date.now()}`)
      .send({
        prompt: 'sabari matrum kani iruvarum kadhalargal',
        mode: 'poem',
        language: 'ta',
        length: 'short'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
    // In mock mode, Tamil is selected → mockStreamGeneration generates Tamil output
    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    if (doneMatch) {
      const doneData = JSON.parse(doneMatch[1]);
      // The mock generates Tamil poem for ta mode
      expect(doneData.metadata.language).toBe('ta');
    }
  });

  // Test 2: Tanglish input + English selected -> English output
  test('2. Tanglish input + English selected → English output', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t2_${Date.now()}`)
      .send({
        prompt: 'sabari matrum kani iruvarum kadhalargal',
        mode: 'poem',
        language: 'en',
        length: 'short'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    if (doneMatch) {
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('en');
    }
  });

  // Test 3: Tamil script input + English selected → English output
  test('3. Tamil script input + English selected → resolvedLanguage is en', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t3_${Date.now()}`)
      .send({
        prompt: 'சபரியும் கனியும் காதலர்கள்',
        mode: 'poem',
        language: 'en',
        length: 'short'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    if (doneMatch) {
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('en');
    }
  });

  // Test 4: English input + Tamil selected → Tamil output
  test('4. English input + Tamil selected → resolvedLanguage is ta', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t4_${Date.now()}`)
      .send({
        prompt: 'Sabari and Kani are lovers walking by the ocean',
        mode: 'poem',
        language: 'ta',
        length: 'short'
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    if (doneMatch) {
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('ta');
    }
  });
});

// ---------------------------------------------------------------------------
// Test: Wrong-language response triggers validation failure (Task 1D)
// ---------------------------------------------------------------------------

describe('Language Output Validation — Wrong language detection', () => {
  // Test 7: Wrong-language AI response → validation fails
  test('7. Wrong-language AI response → validateOutputLanguage returns invalid', () => {
    // Tamil was requested but AI generated English
    const wrongLangOutput = `The moon rises gently above the silent ocean.
Stars shimmer like forgotten promises in the midnight sky.
Love is a lighthouse guiding lost hearts home.`;

    const result = validateOutputLanguage(wrongLangOutput, 'ta');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Tamil script proportion too low');
  });

  // Test 8: Wrong-language response → bounded regeneration happens
  test('8. Wrong-language response → correction retry is triggered with correction prompt', async () => {
    let generationCallCount = 0;
    // First call returns English when Tamil was requested
    // Second call (correction retry) returns Tamil
    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      generationCallCount++;
      if (generationCallCount === 1) {
        const wrongText = 'The sun rises over the ancient mountains of wisdom and glory.';
        if (onChunk) onChunk(wrongText);
        return { fullText: wrongText, model: 'gemini-mock', keyUsed: 'mock' };
      }
      // This path won't be reached since correction uses generateComplete
      return { fullText: 'வானத்தில் நிலவு ஒளிர்கிறது காதல் கவிதையாய்.', model: 'gemini-mock', keyUsed: 'mock' };
    });

    jest.spyOn(geminiService, 'generateComplete').mockImplementation(async () => {
      // Correction retry returns valid Tamil
      return {
        fullText: 'வானத்தில் நிலவு ஒளிர்கிறது. காதல் கவிதையாய் மலர்கிறது. நெஞ்சில் நிறைகிறது மகிழ்வு.',
        model: 'gemini-mock',
        keyUsed: 'mock'
      };
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t8_${Date.now()}`)
      .send({ prompt: 'ocean moon love poem', mode: 'poem', language: 'ta', length: 'short' });

    expect(res.status).toBe(200);
    // Should have received a retry event
    expect(res.text).toContain('event: retry');

    jest.restoreAllMocks();
  });

  // Test 9: Valid-language response → no unnecessary retry
  test('9. Valid Tamil response → no language correction retry', async () => {
    const validTamilText = 'வானத்தில் நிலவு ஒளிர்கிறது. காதல் கவிதையாய் மலர்கிறது. நெஞ்சில் நிறைகிறது மகிழ்வு. மலர்கள் மலர்கின்றன.';

    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      if (onChunk) onChunk(validTamilText);
      return { fullText: validTamilText, model: 'gemini-mock', keyUsed: 'mock' };
    });

    const correctSpy = jest.spyOn(geminiService, 'generateComplete');

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t9_${Date.now()}`)
      .send({ prompt: 'moon poem', mode: 'poem', language: 'ta', length: 'short' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');
    // generateComplete should NOT have been called for language correction
    // (it may be called for guard retries but not language retries in this case)
    const langRetryCalls = correctSpy.mock.calls.length;
    // We just need to verify no language retry event was emitted
    // A cleaner way: verify 'retry' event reason is NOT 'LANGUAGE_MISMATCH' if present
    if (res.text.includes('event: retry')) {
      expect(res.text).not.toContain('"reason":"LANGUAGE_MISMATCH"');
    }

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Test: OpenRouter fallback preserves selected output language (Task 1C)
// ---------------------------------------------------------------------------

describe('OpenRouter Fallback — Language Preservation', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-lang-preservation-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
  });

  // Test 10: Gemini failure + OpenRouter fallback → selected language preserved
  test('10. Gemini failure + OpenRouter fallback → Tamil language preserved in metadata', async () => {
    const quotaErr = new Error('DAILY_QUOTA_EXHAUSTED');
    quotaErr.code = 'DAILY_QUOTA_EXHAUSTED';
    quotaErr.status = 503;

    jest.spyOn(geminiService, 'generateStream').mockRejectedValue(quotaErr);
    jest.spyOn(openRouterService, 'generateStream').mockResolvedValue({
      // OpenRouter returns Tamil (correct)
      fullText: 'வானத்தில் நிலவு ஒளிர்கிறது. காதல் கவிதை மலர்கிறது. நெஞ்சில் நிறைகிறது அன்பு.',
      model: 'openrouter/free',
      provider: 'openrouter'
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_lang_t10_${Date.now()}`)
      .send({ prompt: 'கடல் அலை காதல் கவிதை', mode: 'poem', language: 'ta', length: 'short' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    // Verify the done event has Tamil language metadata
    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    if (doneMatch) {
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('ta');
    }
  });

  // Test 11: Language correction retry does NOT double-deduct quota
  test('11. Language correction retry does not deduct quota twice', async () => {
    const anonId = `anon_lang_quota_${Date.now()}`;

    const initialQuotaRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    const initialRemaining = initialQuotaRes.body.remaining;

    // First generation returns wrong language (English when Tamil requested)
    // generateComplete (correction) returns valid Tamil
    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      const wrongText = 'The moon shines bright above the sleepy ocean shore tonight.';
      if (onChunk) onChunk(wrongText);
      return { fullText: wrongText, model: 'gemini-mock', keyUsed: 'mock' };
    });

    jest.spyOn(geminiService, 'generateComplete').mockImplementation(async () => ({
      fullText: 'நிலவு ஒளிர்கிறது கடலின் அலைகள் மீது. காதல் கவிதை மலர்கிறது நெஞ்சில். இரவு அமைதியாக விரிகிறது.',
      model: 'gemini-mock',
      keyUsed: 'mock'
    }));

    const genRes = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', anonId)
      .send({ prompt: 'moon ocean poem', mode: 'poem', language: 'ta', length: 'short' });

    expect(genRes.status).toBe(200);

    const afterQuotaRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    const afterRemaining = afterQuotaRes.body.remaining;

    // Must be exactly 1 deduction, not 2
    expect(afterRemaining).toBe(initialRemaining - 1);

    jest.restoreAllMocks();
  });

  // Test 12: Failed language retries → no invalid assistant response saved
  test('12. All language retries fail → error event emitted, quota refunded', async () => {
    // Both initial generation AND correction return wrong language
    jest.spyOn(geminiService, 'generateStream').mockImplementation(async ({ onChunk }) => {
      const wrongText = 'Completely wrong language output that is all in English despite Tamil being requested.';
      if (onChunk) onChunk(wrongText);
      return { fullText: wrongText, model: 'gemini-mock', keyUsed: 'mock' };
    });

    jest.spyOn(geminiService, 'generateComplete').mockImplementation(async () => ({
      // Correction also returns English (still wrong)
      fullText: 'Still in wrong English language despite correction attempt for Tamil.',
      model: 'gemini-mock',
      keyUsed: 'mock'
    }));

    const anonId = `anon_lang_fail_${Date.now()}`;
    const initialRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    const initialRemaining = initialRes.body.remaining;

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', anonId)
      .send({ prompt: 'love poem', mode: 'poem', language: 'ta', length: 'short' });

    expect(res.status).toBe(200);
    // Should emit error event
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('LANGUAGE_GENERATION_FAILED');

    // Quota should be refunded (same as initial)
    const afterRes = await request(app)
      .get('/api/chat/quota/status')
      .set('x-anon-id', anonId);
    expect(afterRes.body.remaining).toBe(initialRemaining);

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Test: Image and Video requests still work (Tasks 2, 3, regression)
// ---------------------------------------------------------------------------

describe('Image & Video Request Regression Tests', () => {
  const mediaAnalysisService = require('../src/services/mediaAnalysis.service');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 13: Image request still works
  test('13. Image request with valid JPEG still processes correctly', async () => {
    // Mock media analysis to return structured context without live Gemini call
    jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValue({
      mediaType: 'image',
      category: 'sunset',
      scene: 'sunset at the beach',
      subjects: ['sun', 'ocean'],
      mood: 'peaceful',
      colors: ['golden orange', 'deep blue'],
      summary: 'A peaceful sunset over the ocean.'
    });

    const fakeBase64 = Buffer.alloc(100).toString('base64'); // small fake image

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_img_t13_${Date.now()}`)
      .send({
        prompt: 'write a caption',
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        media: {
          type: 'image',
          mimeType: 'image/jpeg',
          data: fakeBase64,
          fileName: 'sunset.jpg',
          fileSize: 100
        }
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    jest.restoreAllMocks();
  });

  // Test 14: Image request does NOT create duplicate AI requests
  test('14. Image request does not call generateStream twice', async () => {
    jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValue({
      mediaType: 'image',
      scene: 'mountain landscape',
      mood: 'adventurous'
    });

    const streamSpy = jest.spyOn(geminiService, 'generateStream');
    const fakeBase64 = Buffer.alloc(100).toString('base64');

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_img_t14_${Date.now()}`)
      .send({
        prompt: 'motivational caption',
        mode: 'creator',
        language: 'en',
        media: {
          type: 'image',
          mimeType: 'image/jpeg',
          data: fakeBase64,
          fileName: 'mountain.jpg',
          fileSize: 100
        }
      });

    expect(res.status).toBe(200);
    // generateStream should be called exactly once for the main generation
    expect(streamSpy).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });

  // Test 15: Image preprocessing does not destroy valid image understanding
  test('15. preprocessImageForAnalysis preserves small images unchanged', () => {
    const contentCreatorService = require('../src/services/contentCreator.service');
    const smallBase64 = 'AAAA'.repeat(100); // ~300 chars = ~225 decoded bytes, well under 800KB
    const result = contentCreatorService.preprocessImageForAnalysis(smallBase64);
    expect(result).toBe(smallBase64); // unchanged
  });

  // Test 16: Video request still works
  test('16. Video request processes correctly', async () => {
    jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValue({
      mediaType: 'video',
      scene: 'mountain travel',
      topic: 'adventure',
      mood: 'energetic',
      summary: 'Travel video through mountain scenery.'
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_vid_t16_${Date.now()}`)
      .send({
        prompt: 'travel caption',
        mode: 'creator',
        language: 'en',
        platform: 'youtube-shorts',
        media: {
          type: 'video',
          mimeType: 'video/mp4',
          data: Buffer.alloc(100).toString('base64'),
          fileName: 'travel.mp4',
          fileSize: 1024 * 1024,
          duration: 30
        }
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    jest.restoreAllMocks();
  });

  // Test 17: Video processing does not create duplicate requests
  test('17. Video request does not call generateStream twice', async () => {
    jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValue({
      mediaType: 'video',
      scene: 'beach sunset',
      mood: 'peaceful'
    });

    const streamSpy = jest.spyOn(geminiService, 'generateStream');

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_vid_t17_${Date.now()}`)
      .send({
        prompt: 'sunset caption',
        mode: 'creator',
        language: 'ta',
        media: {
          type: 'video',
          mimeType: 'video/mp4',
          data: Buffer.alloc(100).toString('base64'),
          fileName: 'sunset.mp4',
          fileSize: 2 * 1024 * 1024,
          duration: 15
        }
      });

    expect(res.status).toBe(200);
    expect(streamSpy).toHaveBeenCalledTimes(1);

    jest.restoreAllMocks();
  });

  // Test 18: Video size limits are enforced
  test('18. Video exceeding 50MB returns error', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_vid_t18_${Date.now()}`)
      .send({
        prompt: 'video caption',
        mode: 'creator',
        language: 'en',
        media: {
          type: 'video',
          mimeType: 'video/mp4',
          data: Buffer.alloc(100).toString('base64'),
          fileName: 'big.mp4',
          fileSize: 55 * 1024 * 1024 // 55MB — over limit
        }
      });

    expect(res.status).toBe(200);
    // Should get an error SSE event about media analysis failure
    expect(res.text).toContain('event: error');
  });

  // Test 19: Streaming still works for image generation
  test('19. Streaming still works for image generation (event: token appears)', async () => {
    jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValue({
      mediaType: 'image',
      scene: 'food plate',
      mood: 'appetizing'
    });

    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_img_t19_${Date.now()}`)
      .send({
        prompt: 'food caption',
        mode: 'creator',
        language: 'en',
        media: {
          type: 'image',
          mimeType: 'image/jpeg',
          data: Buffer.alloc(100).toString('base64'),
          fileName: 'food.jpg',
          fileSize: 100
        }
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: token');
    expect(res.text).toContain('event: done');

    jest.restoreAllMocks();
  });
});
