const request = require('supertest');
const app = require('../src/app');
const {
  buildSystemPrompt,
  buildStructuredUserPrompt,
  buildActionPrompt,
  getClassicalTamilRules,
  getWesternPoemRules,
  getStoryGenreRules,
  getToneGuideline,
  isClassicalTamilForm
} = require('../src/config/prompts');
const { validateOutputLanguage } = require('../src/services/guards');

describe('Master Creative Writing Quality & Intent Engine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Form & Meter Mastery (Western & Classical Tamil)', () => {
    test('Classical Tamil forms detection recognises Tamil script and transliterations', () => {
      expect(isClassicalTamilForm('வெண்பா')).toBe(true);
      expect(isClassicalTamilForm('venpa')).toBe(true);
      expect(isClassicalTamilForm('குறிஞ்சி')).toBe(true);
      expect(isClassicalTamilForm('kurinji')).toBe(true);
      expect(isClassicalTamilForm('நேய்தல்')).toBe(true);
      expect(isClassicalTamilForm('neythal')).toBe(true);
      expect(isClassicalTamilForm('அந்தாதி')).toBe(true);
      expect(isClassicalTamilForm('free-verse')).toBe(false);
    });

    test('Western forms provide modern verse, haiku, and sonnet guidance', () => {
      const modernVerse = getWesternPoemRules('modern verse');
      expect(modernVerse).toContain('STRUCTURAL FORM: Modern Verse');
      expect(modernVerse).toContain('visceral metaphors');

      const sonnet = getWesternPoemRules('sonnet');
      expect(sonnet).toContain('14 lines');
      expect(sonnet).toContain('ABAB CDCD EFEF GG');
      expect(sonnet).toContain('volta');
    });

    test('Classical Tamil rules provide Sangam landscape imagery and meter', () => {
      const kurinji = getClassicalTamilRules('குறிஞ்சி');
      expect(kurinji).toContain('மலையும் மலை சார்ந்த');
      expect(kurinji).toContain('புணர்தலும் புணர்தல் நிமித்தமும்');
      expect(kurinji).toContain('வேங்கை');

      const venpa = getClassicalTamilRules('வெண்பா');
      expect(venpa).toContain('4 அடிகள்');
      expect(venpa).toContain('வெண்டளை நெறி');
    });
  });

  describe('2. Story Genre Atmospheric Rules', () => {
    test('Story genres provide tailored atmospheric directives', () => {
      const romance = getStoryGenreRules('romance', 'ta');
      expect(romance).toContain('GENRE DIRECTIVE: Romance');
      expect(romance).toContain('intimate emotional connection');

      const mystery = getStoryGenreRules('mystery', 'en');
      expect(mystery).toContain('GENRE DIRECTIVE: Mystery');
      expect(mystery).toContain('suspense and curiosity');

      const villageLife = getStoryGenreRules('village-life', 'ta');
      expect(villageLife).toContain('மண்வாசம்');
    });
  });

  describe('3. Master System Prompt Quality Directives', () => {
    test('Embeds 21-point silent quality control and strict language purity', () => {
      const promptTa = buildSystemPrompt({
        mode: 'poem',
        language: 'ta',
        poemType: 'Modern Verse',
        tone: 'romantic'
      });

      expect(promptTa).toContain('MANDATORY INTERNAL SILENT QUALITY CONTROL:');
      expect(promptTa).toContain('What did the user actually ask for?');
      expect(promptTa).toContain('Did I preserve the user\'s intent?');
      expect(promptTa).toContain('Did I avoid mixing Tamil/Tanglish/English?');
      expect(promptTa).toContain('Did I return ONLY the requested creative work?');
      expect(promptTa).toContain('ZERO PREAMBLE');
    });
  });

  describe('4. End-to-End Creative Output Quality & Grounding', () => {
    test('Simple keyword "first love" + POEM + Romantic + Tamil generates pure Tamil poem without meta-analysis', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_first_love_${Date.now()}`)
        .send({
          prompt: 'first love',
          mode: 'poem',
          poemType: 'Modern Verse',
          language: 'ta',
          tone: 'romantic'
        });

      expect(res.status).toBe(200);
      const doneMatch = res.text.match(/event: done\ndata: (.*)\n/);
      expect(doneMatch).not.toBeNull();
      const doneData = JSON.parse(doneMatch[1]);
      expect(doneData.metadata.language).toBe('ta');

      // 100% Tamil validation
      const langCheck = validateOutputLanguage(doneData.content, 'ta');
      expect(langCheck.valid).toBe(true);

      // Verify no meta analysis leaks
      expect(doneData.content).not.toMatch(/image analysis|video analysis|mood:|reason:|detected:/i);
      expect(doneData.content).not.toMatch(/^#/);
    });

    test('Multi-keyword "rain + first love + railway station" + STORY + Tamil produces coherent narrative', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_multi_kw_${Date.now()}`)
        .send({
          prompt: 'rain + first love + railway station',
          mode: 'story',
          genre: 'Romance',
          language: 'ta',
          tone: 'romantic'
        });

      expect(res.status).toBe(200);
      const doneMatch = res.text.match(/event: done\ndata: (.*)\n/);
      expect(doneMatch).not.toBeNull();
      const doneData = JSON.parse(doneMatch[1]);

      expect(doneData.metadata.mode).toBe('story');
      expect(doneData.metadata.language).toBe('ta');
      const langCheck = validateOutputLanguage(doneData.content, 'ta');
      expect(langCheck.valid).toBe(true);

      // Verify no meta leakage
      expect(doneData.content).not.toMatch(/mood:|reason:|analysis/i);
    });
  });
});
