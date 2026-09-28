const request = require('supertest');
const app = require('../src/app');
const geminiService = require('../src/services/gemini');
const { validateGuards } = require('../src/services/guards');
const { buildSystemPrompt, buildStructuredUserPrompt } = require('../src/config/prompts');

describe('Media-Grounded Creative Generation & Anti-Meta-Analysis Suite', () => {
  // Mock image payload
  const mockImage = {
    type: 'image',
    mimeType: 'image/jpeg',
    data: Buffer.alloc(100).toString('base64'),
    fileName: 'night_rain_road.jpg',
    fileSize: 102400
  };

  // Mock video payload
  const mockVideo = {
    type: 'video',
    mimeType: 'video/mp4',
    data: Buffer.alloc(100).toString('base64'),
    fileName: 'two_friends_travel.mp4',
    fileSize: 2048000,
    duration: 18,
    frames: [
      'data:image/jpeg;base64,' + Buffer.alloc(50).toString('base64'),
      'data:image/jpeg;base64,' + Buffer.alloc(50).toString('base64')
    ]
  };

  test('TEST 1: Tamil + Tanglish keyword + Poem + Romantic + Image -> ONLY a romantic Tamil poem', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_mcg_t1_${Date.now()}`)
      .send({
        prompt: 'mazhaiyil avalai ninaithu',
        mode: 'poem',
        tone: 'romantic',
        language: 'ta',
        media: mockImage
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    expect(doneMatch).not.toBeNull();
    const doneData = JSON.parse(doneMatch[1]);
    const content = doneData.content;

    // Must be in Tamil script
    expect(content).toMatch(/[\u0B80-\u0BFF]/);
    // Must be a poem (multiple lines)
    expect(content.split('\n').filter((l) => l.trim().length > 0).length).toBeGreaterThanOrEqual(3);
    // MUST NOT contain meta analysis
    expect(content).not.toMatch(/image\s*analysis/i);
    expect(content).not.toMatch(/(^|\n)\s*mood\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*reason\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*detected\s*:/i);
    expect(content).not.toMatch(/real\s*language/i);
  });

  test('TEST 2: English + keywords + Poem + Cinematic + Image -> ONLY a cinematic English poem', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_mcg_t2_${Date.now()}`)
      .send({
        prompt: 'rainy street night reflections',
        mode: 'poem',
        tone: 'cinematic',
        language: 'en',
        media: mockImage
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    expect(doneMatch).not.toBeNull();
    const doneData = JSON.parse(doneMatch[1]);
    const content = doneData.content;

    // Must be in English
    expect(content).toMatch(/[a-zA-Z]/);
    // Must be a poem (multiple lines)
    expect(content.split('\n').filter((l) => l.trim().length > 0).length).toBeGreaterThanOrEqual(3);
    // MUST NOT contain meta analysis
    expect(content).not.toMatch(/image\s*analysis/i);
    expect(content).not.toMatch(/(^|\n)\s*mood\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*reason\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*detected\s*:/i);
  });

  test('TEST 3: Tamil + Story + Emotional + Image -> ONLY an emotional Tamil story in prose with dialogue', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_mcg_t3_${Date.now()}`)
      .send({
        prompt: 'தனிமை நடை',
        mode: 'story',
        tone: 'emotional',
        language: 'ta',
        media: mockImage
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    expect(doneMatch).not.toBeNull();
    const doneData = JSON.parse(doneMatch[1]);
    const content = doneData.content;

    // Must be Tamil narrative prose
    expect(content).toMatch(/[\u0B80-\u0BFF]/);
    // Must contain character dialogue in quotes
    expect(content).toMatch(/["“][^"”]+["”]/);
    // MUST NOT contain meta analysis
    expect(content).not.toMatch(/image\s*analysis/i);
    expect(content).not.toMatch(/(^|\n)\s*mood\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*reason\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*detected\s*:/i);
  });

  test('TEST 4: English + Story + Cinematic + Video -> ONLY an English cinematic story in prose with dialogue', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_mcg_t4_${Date.now()}`)
      .send({
        prompt: 'two friends travelling highway sunset',
        mode: 'story',
        tone: 'cinematic',
        language: 'en',
        media: mockVideo
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    expect(doneMatch).not.toBeNull();
    const doneData = JSON.parse(doneMatch[1]);
    const content = doneData.content;

    // Must be English narrative prose
    expect(content).toMatch(/[a-zA-Z]/);
    // Must contain dialogue
    expect(content).toMatch(/["“][^"”]+["”]/);
    // MUST NOT contain meta analysis
    expect(content).not.toMatch(/video\s*analysis/i);
    expect(content).not.toMatch(/frame\s*analysis/i);
    expect(content).not.toMatch(/(^|\n)\s*mood\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*reason\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*detected\s*:/i);
  });

  test('TEST 5: Tamil + Content Creator + image/video + trendy tone -> Publish-ready creator content without meta-analysis', async () => {
    const res = await request(app)
      .post('/api/chat/generate')
      .set('x-anon-id', `anon_mcg_t5_${Date.now()}`)
      .send({
        prompt: 'மழை இரவு வைப்',
        mode: 'creator',
        tone: 'creative',
        style: 'trendy',
        language: 'ta',
        media: mockVideo
      });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: done');

    const doneMatch = res.text.match(/event: done\ndata: ({.*})/);
    expect(doneMatch).not.toBeNull();
    const doneData = JSON.parse(doneMatch[1]);
    const content = doneData.content;

    // Must be in Tamil script
    expect(content).toMatch(/[\u0B80-\u0BFF]/);
    // MUST NOT contain meta analysis labels
    expect(content).not.toMatch(/video\s*analysis/i);
    expect(content).not.toMatch(/frame\s*analysis/i);
    expect(content).not.toMatch(/(^|\n)\s*mood\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*reason\s*:/i);
    expect(content).not.toMatch(/(^|\n)\s*detected\s*:/i);
    expect(content).not.toMatch(/real\s*language/i);
  });

  test('OUTPUT GUARD: Flags META_ANALYSIS_LEAK and produces correct retry instruction', () => {
    const leakedOutput = `Image Analysis:
Detected: Rainy road, solitary woman walking at night
Mood: Romantic and emotional
Reason: The dark lighting and wet asphalt reflect solitude and contemplation.

Under the rain the streets are quiet.`;

    const result = validateGuards(leakedOutput, {
      mode: 'poem',
      language: 'en',
      hasMedia: true
    });

    expect(result.valid).toBe(false);
    expect(result.code).toBe('META_ANALYSIS_LEAK');
    expect(result.retryPrompt).toContain('[RETRY RULE - NO META ANALYSIS]');
    expect(result.retryPrompt).toContain('Return ONLY the requested POEM output');
    expect(result.retryPrompt).toContain('Use the uploaded media as inspiration, not as something to explain');
  });
});
