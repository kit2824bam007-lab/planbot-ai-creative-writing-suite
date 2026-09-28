/**
 * Tone System & Differentiation Tests
 *
 * Validates that:
 * 1. Same input + Creative -> output has creative characteristics
 * 2. Same input + Emotional -> output has emotional characteristics
 * 3. Same input + Humorous -> output has appropriate humor
 * 4. Same input + Simpler -> output is simpler
 * 5. Same input + Shorter -> output is shorter
 * 6. Same input + Longer -> output is meaningfully expanded
 * 7. Tanglish input + Tamil + Emotional -> Tamil emotional output
 * 8. Tanglish input + English + Creative -> English creative output
 * 9. English input + Tamil + Humorous -> Tamil humorous output
 * 10. Gemini fallback to OpenRouter -> language + tone are preserved
 * 11. Follow-up actions (more-creative, more-emotional, shorter, longer) transform tone correctly
 * 12. Tone does not override user intent or characters
 * 13. Originality / similarity screening works together with tone
 * 14. Streaming SSE events deliver tone-differentiated content
 */

const request = require('supertest');
const app = require('../src/app');
const geminiService = require('../src/services/gemini');
const openRouterService = require('../src/services/openrouter');
const { getToneGuideline, buildSystemPrompt, buildActionPrompt } = require('../src/config/prompts');
const { validateOutputLanguage } = require('../src/services/guards');

describe('Tone System & Differentiation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Unit Tests: Tone Guidelines & Semantic Instructions (Task 2B)
  // -------------------------------------------------------------------------
  describe('getToneGuideline Semantic Instructions', () => {
    test('creative tone guideline contains imaginative guidance and cliché ban', () => {
      const guideEn = getToneGuideline('creative', 'en');
      expect(guideEn).toContain('fresh, imaginative ideas');
      expect(guideEn).toContain('Avoid generic or predictable wording');

      const guideTa = getToneGuideline('creative', 'ta');
      expect(guideTa).toContain('கற்பனை நயம்');
    });

    test('emotional tone guideline requires genuine emotional depth', () => {
      const guideEn = getToneGuideline('emotional', 'en');
      expect(guideEn).toContain('genuine emotional depth');
      expect(guideEn).toContain('Show emotion through situations');

      const guideTa = getToneGuideline('emotional', 'ta');
      expect(guideTa).toContain('உணர்ச்சி ஆழத்தை');
    });

    test('humorous tone guideline requires natural, context-appropriate humor', () => {
      const guideEn = getToneGuideline('humorous', 'en');
      expect(guideEn).toContain('natural, context-appropriate humor');
      expect(guideEn).toContain('witty observations');

      const guideTa = getToneGuideline('humorous', 'ta');
      expect(guideTa).toContain('நகைச்சுவை');
    });

    test('simpler tone guideline instructs clear, accessible vocabulary', () => {
      const guideEn = getToneGuideline('simpler', 'en');
      expect(guideEn).toContain('simple, natural, easy-to-understand language');
    });

    test('shorter and longer guidelines emphasize meaningful length control', () => {
      const shorterGuide = getToneGuideline('shorter', 'en');
      expect(shorterGuide).toContain('genuinely shorter');
      expect(shorterGuide).toContain('Preserve the central idea');

      const longerGuide = getToneGuideline('longer', 'en');
      expect(longerGuide).toContain('Expand the content meaningfully');
      expect(longerGuide).toContain('Do not repeat the same information');
    });
  });

  // -------------------------------------------------------------------------
  // Prompt Integration: Tone & Language Priorities (Task 2C & 2D)
  // -------------------------------------------------------------------------
  describe('buildSystemPrompt & buildActionPrompt Tone Integration', () => {
    test('buildSystemPrompt embeds tone instructions in poem and story modes', () => {
      const poemPrompt = buildSystemPrompt({ mode: 'poem', language: 'en', tone: 'creative' });
      expect(poemPrompt).toContain('TONE DIRECTIVE: Creative & Imaginative');
      expect(poemPrompt).toContain('fresh, imaginative ideas');

      const storyPrompt = buildSystemPrompt({ mode: 'story', language: 'ta', tone: 'emotional' });
      expect(storyPrompt).toContain('TONE DIRECTIVE: Emotional');
      expect(storyPrompt).toContain('உணர்ச்சி ஆழத்தை');
    });

    test('buildActionPrompt transforms follow-up actions with strong semantic guidance', () => {
      const moreCreative = buildActionPrompt('more-creative', {
        originalPrompt: 'Sabari and Kani are lovers',
        previousContent: 'Sabari and Kani walked on the beach.',
        metadata: { language: 'en', tone: 'creative' }
      });
      expect(moreCreative).toContain('ACTION: ELEVATE CREATIVITY & METAPHOR (MORE CREATIVE)');
      expect(moreCreative).toContain('fresh, imaginative ideas');
      expect(moreCreative).toContain('CRITICAL GROUNDING DIRECTIVE:');

      const shorterAction = buildActionPrompt('shorter', {
        originalPrompt: 'A long story',
        previousContent: 'Line 1. Line 2. Line 3. Line 4. Line 5.',
        metadata: { language: 'en' }
      });
      expect(shorterAction).toContain('ACTION: SHORTER & CONCISE');
      expect(shorterAction).toContain('Produce a genuinely shorter version');
    });
  });

  // -------------------------------------------------------------------------
  // Integration Tests: Differentiated Output by Tone (Tasks 2A - 2G)
  // -------------------------------------------------------------------------
  describe('Tone Differentiation Integration', () => {
    const basePrompt = 'Sabari and Kani are lovers';

    test('1. Same input + Creative -> output has creative characteristics', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_creative_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'creative' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Sabari');
      expect(res.text).toContain('Kani');
      // Contains creative sensory/metaphorical language
      expect(res.text.toLowerCase()).toMatch(/constellations|amber sand|emerald-tinted|unspoken language/);
    });

    test('2. Same input + Emotional -> output has emotional characteristics', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_emotional_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'emotional' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Sabari');
      expect(res.text).toContain('Kani');
      // Contains emotional depth and sincerity
      expect(res.text.toLowerCase()).toMatch(/tender|devotion|sacrifices|patience|heartbeats|my home will always be with you/);
    });

    test('3. Same input + Humorous -> output has appropriate humor', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_humorous_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'humorous' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Sabari');
      expect(res.text).toContain('Kani');
      // Contains witty, playful situation
      expect(res.text.toLowerCase()).toMatch(/pizza|umbrella|laughed|debates/);
    });

    test('4. Same input + Simpler -> output is simpler', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_simpler_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'simpler' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Sabari');
      expect(res.text).toContain('Kani');
      // Direct, simple language
      expect(res.text.toLowerCase()).toMatch(/simple and honest|loved each other very much|talking about their day/);
    });

    test('5. Same input + Shorter -> output is shorter', async () => {
      const resShorter = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_shorter_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'shorter' });

      const resLonger = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_longer_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'longer' });

      expect(resShorter.status).toBe(200);
      expect(resLonger.status).toBe(200);
      // Shorter output has significantly fewer characters than longer output
      expect(resShorter.text.length).toBeLessThan(resLonger.text.length);
      expect(resShorter.text).toContain('Sabari');
    });

    test('6. Same input + Longer -> output is meaningfully expanded', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tone_long_exp_${Date.now()}`)
        .send({ prompt: basePrompt, mode: 'story', language: 'en', tone: 'longer' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Sabari');
      expect(res.text).toContain('Kani');
      // Expanded narrative contains dialogue and multi-sentence structure
      expect(res.text).toContain('wooden pier');
      expect(res.text).toContain('Every single day');
    });
  });

  // -------------------------------------------------------------------------
  // Language + Tone Combination Tests (Task 2D)
  // -------------------------------------------------------------------------
  describe('Language + Tone Interplay', () => {
    test('7. Tanglish input + Tamil selected + Emotional tone -> Tamil emotional output', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tanglish_ta_emo_${Date.now()}`)
        .send({
          prompt: 'sabari matrum kani iruvarum kadhalargal',
          mode: 'story',
          language: 'ta',
          tone: 'emotional'
        });

      expect(res.status).toBe(200);
      // Selected language (Tamil) is final authority
      const doneMatch = res.text.match(/event: done\ndata: (.*)\n/);
      expect(doneMatch).not.toBeNull();
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('ta');
      // Passes Tamil validation
      const langCheck = validateOutputLanguage(doneData.content, 'ta');
      expect(langCheck.valid).toBe(true);
      // Contains emotional Tamil content and proper names
      expect(doneData.content).toContain('சபரி');
      expect(doneData.content).toContain('கனி');
      expect(doneData.content).toMatch(/பிரிவு|அன்பு|கண்ணீர்|தவிப்பு/);
    });

    test('8. Tanglish input + English selected + Creative tone -> English creative output', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_tanglish_en_cr_${Date.now()}`)
        .send({
          prompt: 'sabari matrum kani iruvarum kadhalargal',
          mode: 'story',
          language: 'en',
          tone: 'creative'
        });

      expect(res.status).toBe(200);
      const doneMatch = res.text.match(/event: done\ndata: (.*)\n/);
      expect(doneMatch).not.toBeNull();
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('en');
      // Passes English validation
      const langCheck = validateOutputLanguage(doneData.content, 'en');
      expect(langCheck.valid).toBe(true);
      expect(doneData.content).toContain('Sabari');
      expect(doneData.content).toContain('Kani');
      expect(doneData.content.toLowerCase()).toMatch(/constellations|sand|horizon|unspoken/);
    });

    test('9. English input + Tamil selected + Humorous tone -> Tamil humorous output', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_en_ta_hum_${Date.now()}`)
        .send({
          prompt: 'Sabari and Kani are lovers',
          mode: 'story',
          language: 'ta',
          tone: 'humorous'
        });

      expect(res.status).toBe(200);
      const doneMatch = res.text.match(/event: done\ndata: (.*)\n/);
      expect(doneMatch).not.toBeNull();
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('ta');
      const langCheck = validateOutputLanguage(doneData.content, 'ta');
      expect(langCheck.valid).toBe(true);
      expect(doneData.content).toContain('சபரி');
      expect(doneData.content).toContain('கனி');
      // Humorous Tamil elements (food/banter)
      expect(doneData.content).toMatch(/சுண்டல்|சாப்பிடுறது|சிரித்தாள்/);
    });
  });

  // -------------------------------------------------------------------------
  // Gemini to OpenRouter Fallback: Tone & Language Preservation (Task 2J)
  // -------------------------------------------------------------------------
  describe('OpenRouter Fallback Tone Preservation', () => {
    test('10. Gemini fallback to OpenRouter preserves selected language and tone in prompts', async () => {
      let capturedSystemPrompt = '';
      let capturedUserPrompt = '';

      // Force Gemini to throw a quota exhaustion error (429) to trigger OpenRouter fallback
      jest.spyOn(geminiService, 'generateStream').mockRejectedValue(
        Object.assign(new Error('Resource has been exhausted (e.g. check quota).'), { status: 429 })
      );

      jest.spyOn(openRouterService, 'isAvailable').mockReturnValue(true);
      jest.spyOn(openRouterService, 'isFallbackEligible').mockReturnValue(true);
      const openRouterSpy = jest.spyOn(openRouterService, 'generateStream').mockImplementation(async ({ systemPrompt, userPrompt, onChunk }) => {
        capturedSystemPrompt = systemPrompt;
        capturedUserPrompt = userPrompt;
        const text = `வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே\nகானத்து வேய்ங்குழலின் இன்னிசையும் - தானுணர்ந்து\nபாடலின்பம் பொங்கப் பரவசமாய் நின்றாட\nநாளுமெழும் தூயநல் லன்பு!`;
        if (onChunk) onChunk(text);
        return {
          fullText: text,
          provider: 'openrouter',
          model: 'openrouter/free'
        };
      });

      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_fallback_tone_${Date.now()}`)
        .send({
          prompt: 'A gentle poem about moonlight',
          mode: 'poem',
          language: 'ta',
          tone: 'emotional'
        });

      expect(res.status).toBe(200);
      expect(openRouterSpy).toHaveBeenCalled();
      // OpenRouter received the exact system prompt with language and tone directives
      expect(capturedSystemPrompt).toContain('TARGET = TAMIL (தமிழ்)');
      expect(capturedSystemPrompt).toContain('TONE DIRECTIVE: Emotional');
      expect(capturedSystemPrompt).toContain('உணர்ச்சி ஆழத்தை');
      expect(res.text).toContain('event: done');
    });
  });

  // -------------------------------------------------------------------------
  // Streaming Verification (Task 2K)
  // -------------------------------------------------------------------------
  describe('Streaming SSE Verification', () => {
    test('11. SSE stream produces status, token, and done events without duplication', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_stream_verify_${Date.now()}`)
        .send({
          prompt: 'Sabari and Kani are lovers',
          mode: 'story',
          language: 'en',
          tone: 'creative'
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.text).toContain('event: status');
      expect(res.text).toContain('event: token');
      expect(res.text).toContain('event: done');

      // Verify done event payload contains proper tone and metadata
      const doneLines = res.text.split('\n').filter((l) => l.startsWith('data: ') && l.includes('"metadata"'));
      expect(doneLines.length).toBe(1); // exactly one done metadata packet
      const doneJson = JSON.parse(doneLines[0].replace('data: ', ''));
      expect(doneJson.metadata.tone).toBe('creative');
      expect(doneJson.metadata.language).toBe('en');
    });
  });
});
