const request = require('supertest');
const app = require('../src/app');
const mediaAnalysisService = require('../src/services/mediaAnalysis.service');
const contentCreatorService = require('../src/services/contentCreator.service');
const { buildSystemPrompt, buildActionPrompt } = require('../src/config/prompts');
const geminiService = require('../src/services/gemini');
const redis = require('../src/services/redis');
const { hashString } = require('../src/utils/crypto');

describe('Video Frame Analysis & Grounded Creative Generation System', () => {
  jest.setTimeout(25000);

  // Mock sampled frames (lightweight base64 JPEGs)
  const mockFrame1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const mockFrame2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const mockFrame3 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const mockFrames = [mockFrame1, mockFrame2, mockFrame3];

  describe('1. Frame Extraction, Sampling Limits & Sanitization', () => {
    test('1. Validates video format and accepts sampled frames array', async () => {
      const result = await mediaAnalysisService.analyzeMedia({
        type: 'video',
        mimeType: 'video/mp4',
        data: 'video',
        fileName: 'night_walk_solitary.mp4',
        fileSize: 15 * 1024 * 1024,
        duration: 12,
        frames: mockFrames
      });

      expect(result).toBeDefined();
      expect(result.mediaType).toBe('video');
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.emotion).toBeDefined();
      expect(result.setting).toBeDefined();
      expect(result.matchReason).toBeDefined();
    });

    test('2. Bounds frames count to maximum limit (12) to prevent payload explosion', async () => {
      jest.spyOn(contentCreatorService, 'buildVisualContext').mockResolvedValueOnce({
        mediaType: 'video',
        category: 'general',
        actions: ['motion'],
        emotion: 'neutral'
      });

      const excessFrames = new Array(20).fill(mockFrame1);
      const media = {
        type: 'video',
        mimeType: 'video/mp4',
        data: 'video',
        fileName: 'action_scene.mp4',
        fileSize: 20 * 1024 * 1024,
        duration: 25,
        frames: excessFrames
      };

      await mediaAnalysisService.analyzeMedia(media);
      expect(media.frames.length).toBeLessThanOrEqual(12);
    });

    test('3. Rejects video exceeding 50MB size limit', async () => {
      await expect(
        mediaAnalysisService.analyzeMedia({
          type: 'video',
          mimeType: 'video/mp4',
          data: 'video',
          fileName: 'oversized.mp4',
          fileSize: 55 * 1024 * 1024,
          duration: 30
        })
      ).rejects.toThrow('Video size exceeds maximum limit of 50MB');
    });

    test('4. Gracefully handles video when frames are missing or empty', async () => {
      const result = await mediaAnalysisService.analyzeMedia({
        type: 'video',
        mimeType: 'video/mp4',
        data: 'video',
        fileName: 'mountain_trek.mp4',
        fileSize: 10 * 1024 * 1024,
        duration: 18,
        frames: []
      });

      expect(result).toBeDefined();
      expect(result.mediaType).toBe('video');
      expect(result.category).toBe('travel');
      expect(result.actions).toBeDefined();
    });
  });

  describe('2. Multimodal Frame Analysis & Structured Visual Context', () => {
    test('5. Extracts actions, emotions, and dialogue suggestions for night walk video', async () => {
      const context = contentCreatorService.getSmartContext('video', 'person walking alone at night look back.mp4', null, 15);
      expect(context.mediaType).toBe('video');
      expect(context.category).toBe('emotional_moment');
      expect(context.actions.join(' ')).toContain('walking');
      expect(context.actions.join(' ')).toContain('look');
      expect(context.emotion).toContain('emotional');
      expect(context.setting).toContain('night street');
      expect(context.dialogueSuggestions).toBeInstanceOf(Array);
      expect(context.dialogueSuggestions.length).toBeGreaterThan(0);
      expect(context.matchReason).toContain('frames show a solitary walk');
    });

    test('6. Extracts actions and high energy mood for dance video', async () => {
      const context = contentCreatorService.getSmartContext('video', 'hip hop dance stage reel.mp4', null, 20);
      expect(context.category).toBe('dance');
      expect(context.actions.join(' ')).toContain('dance');
      expect(context.emotion).toContain('vibrant');
      expect(context.dialogueMood).toContain('energetic');
      expect(context.dialogueSuggestions[0]).toContain('ஆட்டம்');
    });

    test('7. Extracts intense action and mass punch dialogue for fight scene', async () => {
      const context = contentCreatorService.getSmartContext('video', 'cinematic action fight scene.mp4', null, 10);
      expect(context.category).toBe('action_fight');
      expect(context.actions.join(' ')).toContain('action');
      expect(context.emotion).toContain('intense');
      expect(context.dialogueSuggestions[0]).toContain('ஒரு பார்வை போதும்');
    });

    test('8. Extracts romantic glance and poetic dialogue for romantic video', async () => {
      const context = contentCreatorService.getSmartContext('video', 'couple romantic walk kadhal.mp4', null, 15);
      expect(context.category).toBe('romantic');
      expect(context.actions.join(' ')).toContain('gentle glance');
      expect(context.emotion).toContain('tender');
      expect(context.dialogueSuggestions[0]).toContain('அமைதி');
    });
  });

  describe('3. Redis Caching & Cache Key Stability', () => {
    test('9. Caches visual context in Redis and reuses it on subsequent calls', async () => {
      const media = {
        type: 'video',
        mimeType: 'video/mp4',
        data: 'video',
        fileName: 'cached_test_video.mp4',
        fileSize: 12000000,
        duration: 14,
        frames: mockFrames
      };

      const firstCall = await contentCreatorService.buildVisualContext(media);
      expect(firstCall).toBeDefined();

      // Second call should return identical context
      const secondCall = await contentCreatorService.buildVisualContext(media);
      expect(secondCall).toEqual(firstCall);
    });

    test('10. Action buttons preserve video frame actions and context in prompt', () => {
      const mediaContext = {
        mediaType: 'video',
        category: 'emotional_moment',
        scene: 'night street with solitary streetlight lighting',
        actions: ['person walking alone', 'turning back with an emotional look'],
        emotion: 'emotional, nostalgic',
        setting: 'night street with streetlights',
        matchReason: 'The frames show a solitary walk with an emotional look-back moment'
      };

      const actionPrompt = buildActionPrompt('more-emotional', {
        originalPrompt: 'night walk',
        previousContent: 'Caption: Walking alone at night.',
        metadata: { mode: 'creator', language: 'en' },
        mediaContext
      });

      expect(actionPrompt).toContain('ACTION: DEEPEN EMOTIONAL INTENSITY');
      expect(actionPrompt).toContain('person walking alone');
      expect(actionPrompt).toContain('turning back with an emotional look');
      expect(actionPrompt).toContain('VISUAL MEDIA CONTEXT TO PRESERVE ACROSS THIS ACTION');
    });
  });

  describe('4. Generation & Language / Tone Integrity', () => {
    test('11. Generates Caption, Dialogue-style suggestion, Mood, and Reason for night walk video in Tamil', async () => {
      const mediaContext = {
        mediaType: 'video',
        category: 'emotional_moment',
        scene: 'night street with streetlight lighting',
        actions: ['person walking alone along the street', 'turning back with an emotional look'],
        emotion: 'emotional, nostalgic, solitary, reflective',
        setting: 'night street with solitary streetlight lighting',
        matchReason: 'The frames show a solitary walk with an emotional look-back moment and cinematic night lighting.'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'ta',
        platform: 'instagram-post',
        style: 'cinematic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'night walk look back'
      });

      expect(res.fullText).toContain('Caption:');
      expect(res.fullText).toContain('Dialogue-style:');
      expect(res.fullText).toContain('Mood:');
      expect(res.fullText).toContain('Reason:');
      // Must be in Tamil script
      expect(res.fullText).toMatch(/[\u0B80-\u0BFF]/);
      expect(res.fullText).toContain('பாதை');
    });

    test('12. Generates Caption, Dialogue-style suggestion, Mood, and Reason in English when English is selected', async () => {
      const mediaContext = {
        mediaType: 'video',
        category: 'emotional_moment',
        scene: 'night street with streetlight lighting',
        actions: ['person walking alone along the street', 'turning back with an emotional look'],
        emotion: 'emotional, nostalgic, solitary, reflective',
        setting: 'night street with solitary streetlight lighting',
        matchReason: 'The frames show a solitary walk with an emotional look-back moment and cinematic night lighting.'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'cinematic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'night walk look back'
      });

      expect(res.fullText).toContain('Caption:');
      expect(res.fullText).toContain('Dialogue-style:');
      expect(res.fullText).toContain('Mood:');
      expect(res.fullText).toContain('Reason:');
      expect(res.fullText).toContain('memories');
    });

    test('13. Dialogue suggestions are original and do not claim fake trending status', async () => {
      const context = contentCreatorService.getSmartContext('video', 'action punch fight scene.mp4');
      const suggestion = context.dialogueSuggestions[0];
      // Should be an original line
      expect(suggestion).toBeDefined();
      expect(suggestion.length).toBeGreaterThan(5);
      // Prompt directives strictly forbid claiming real-world trending status or copying copyrighted script
      const prompt = buildSystemPrompt({
        mode: 'creator',
        language: 'ta',
        mediaContext: context
      });
      expect(prompt).toContain('Do NOT reproduce copyrighted movie dialogues word-for-word');
      expect(prompt).toContain('All dialogue suggestions must be 100% ORIGINAL');
      expect(prompt).toContain('Do NOT falsely claim that a dialogue is currently trending');
    });
  });

  describe('5. End-to-End Chat API Stream Integration', () => {
    test('14. POST /api/chat/generate processes video request with sampled frames', async () => {
      jest.spyOn(mediaAnalysisService, 'analyzeMedia').mockResolvedValueOnce({
        mediaType: 'video',
        category: 'emotional_moment',
        scene: 'night street with solitary streetlight lighting',
        actions: ['person walking alone along the street', 'turning back with an emotional look'],
        emotion: 'emotional, nostalgic',
        setting: 'night street with solitary streetlight lighting',
        summary: 'A solitary night walk with reflective look-back moment.'
      });

      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_vid_test_${Date.now()}`)
        .send({
          prompt: 'night walk look back',
          mode: 'creator',
          language: 'ta',
          media: {
            type: 'video',
            mimeType: 'video/mp4',
            data: 'video',
            fileName: 'night_walk_alone.mp4',
            fileSize: 8 * 1024 * 1024,
            duration: 10,
            frames: mockFrames
          }
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('event: status');
      expect(res.text).toContain('Analyzing video frames...');
      expect(res.text).toContain('event: token');
      expect(res.text).toContain('event: done');
    });

    test('15. Image generation regression: standard image still generates correctly', async () => {
      const res = await request(app)
        .post('/api/chat/generate')
        .set('x-anon-id', `anon_img_reg_${Date.now()}`)
        .send({
          prompt: 'sunset beach caption',
          mode: 'creator',
          language: 'en',
          media: {
            type: 'image',
            mimeType: 'image/jpeg',
            data: mockFrame1,
            fileName: 'sunset.jpg',
            fileSize: 300000
          }
        });

      expect(res.status).toBe(200);
      expect(res.text).toContain('event: token');
      expect(res.text).toContain('event: done');
    });
  });
});
