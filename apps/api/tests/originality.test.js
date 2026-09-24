const request = require('supertest');
const app = require('../src/app');
const { buildActionPrompt } = require('../src/config/prompts');
const originalityService = require('../src/services/originality.service');

describe('AI-Powered Originality & Similarity Screening Module', () => {
  test('POST /api/originality/check rejects empty content with 400', async () => {
    const res = await request(app)
      .post('/api/originality/check')
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /api/originality/check returns LOW risk for fresh unique creative content', async () => {
    const uniqueText = `Underneath the azure skies of morning nebula ${Date.now()}, celestial whisperings danced through crystalline groves.`;
    const res = await request(app)
      .post('/api/originality/check')
      .send({
        content: uniqueText,
        contentType: 'story'
      });

    expect(res.status).toBe(200);
    expect(res.body.riskLevel).toBe('LOW');
    expect(res.body.exactMatchFound).toBe(false);
    expect(res.body.semanticSimilarity).toBe('LOW');
    expect(res.body.sourcesChecked).toContain('PlanBot');
    expect(res.body.recommendation).toBeDefined();
  });

  test('POST /api/originality/check supports all creative content types (poem, story, creator, caption)', async () => {
    for (const contentType of ['poem', 'story', 'creator', 'caption']) {
      const res = await request(app)
        .post('/api/originality/check')
        .send({
          content: `Vibrant hues of twilight glow warmly across horizons in ${contentType} context ${Date.now()}.`,
          contentType
        });

      expect(res.status).toBe(200);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(res.body.riskLevel);
    }
  });

  test('Deterministic phrase matching extracts distinctive phrases and ignores common stop words', async () => {
    const text = 'The love of life and the heart of the world shines brightly across whispering mountain canyons.';
    const result = await originalityService.checkOriginality({
      content: text,
      contentType: 'poem'
    });

    expect(result).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    // Non-stop phrases should be targeted, not single stop words like 'love' or 'world'
    expect(result.matchedPhrases).not.toContain('love');
    expect(result.matchedPhrases).not.toContain('world');
  });

  test('buildActionPrompt includes rewrite-originally with comprehensive instructions', () => {
    const prompt = buildActionPrompt('rewrite-originally', {
      originalPrompt: 'Morning dawn',
      previousContent: 'The crimson sun rose above the quiet mountain peaks.',
      metadata: { language: 'en', mode: 'poem' }
    });

    expect(prompt).toContain('REWRITE MORE ORIGINALLY');
    expect(prompt).toContain('distinctive phrase overlap');
    expect(prompt).toContain('wording');
    expect(prompt).toContain('metaphors');
  });
});
