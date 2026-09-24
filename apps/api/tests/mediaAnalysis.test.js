const mediaAnalysisService = require('../src/services/mediaAnalysis.service');
const { buildSystemPrompt, getPlatformRules, getStyleGuideline } = require('../src/config/prompts');
const geminiService = require('../src/services/gemini');

describe('Media-Aware Creative Generation System', () => {
  describe('Media Validation & Security', () => {
    test('rejects unsupported image types', async () => {
      await expect(
        mediaAnalysisService.analyzeMedia({
          type: 'image',
          mimeType: 'image/gif',
          data: 'base64test',
          fileSize: 1000
        })
      ).rejects.toThrow('Unsupported image format');
    });

    test('rejects image exceeding 10MB', async () => {
      await expect(
        mediaAnalysisService.analyzeMedia({
          type: 'image',
          mimeType: 'image/jpeg',
          data: 'base64test',
          fileSize: 11 * 1024 * 1024
        })
      ).rejects.toThrow('Image size exceeds maximum limit of 10MB');
    });

    test('rejects unsupported video types', async () => {
      await expect(
        mediaAnalysisService.analyzeMedia({
          type: 'video',
          mimeType: 'video/avi',
          data: 'base64test',
          fileSize: 1000
        })
      ).rejects.toThrow('Unsupported video format');
    });

    test('rejects video exceeding 50MB', async () => {
      await expect(
        mediaAnalysisService.analyzeMedia({
          type: 'video',
          mimeType: 'video/mp4',
          data: 'base64test',
          fileSize: 55 * 1024 * 1024
        })
      ).rejects.toThrow('Video size exceeds maximum limit of 50MB');
    });

    test('provides clean structured fallback context for image', () => {
      const fallback = mediaAnalysisService.getFallbackContext('image', 'sunset_beach.jpg');
      expect(fallback.mediaType).toBe('image');
      expect(fallback.scene).toContain('sunset beach');
      expect(fallback.mood).toBeDefined();
      expect(fallback.objects).toBeInstanceOf(Array);
    });

    test('provides clean structured fallback context for video', () => {
      const fallback = mediaAnalysisService.getFallbackContext('video', 'mountain_travel.mp4');
      expect(fallback.mediaType).toBe('video');
      expect(fallback.scene).toContain('mountain travel');
      expect(fallback.topic).toBeDefined();
    });
  });

  describe('Platform & Style Rules Integration', () => {
    test('getPlatformRules generates specific rules for Instagram Reel', () => {
      const rules = getPlatformRules('instagram-reel');
      expect(rules).toContain('PLATFORM RULES: INSTAGRAM REEL');
      expect(rules).toContain('Hook');
      expect(rules).toContain('Hashtags');
    });

    test('getPlatformRules generates specific rules for YouTube Shorts', () => {
      const rules = getPlatformRules('youtube-shorts');
      expect(rules).toContain('PLATFORM RULES: YOUTUBE SHORTS');
      expect(rules).toContain('#Shorts');
      expect(rules).toContain('Call to Action');
    });

    test('getPlatformRules generates specific rules for LinkedIn Post', () => {
      const rules = getPlatformRules('linkedin');
      expect(rules).toContain('PLATFORM RULES: LINKEDIN POST');
      expect(rules).toContain('Professional');
    });

    test('getStyleGuideline influences sentence length and vocabulary', () => {
      const aesthetic = getStyleGuideline('aesthetic');
      expect(aesthetic).toContain('Aesthetic Minimal');
      expect(aesthetic).toContain('Sentence Length');

      const bold = getStyleGuideline('bold');
      expect(bold).toContain('Bold Motivational');
      expect(bold).toContain('relentless momentum');
    });
  });

  describe('Prompt Integration with Media Context', () => {
    test('buildSystemPrompt injects VISUAL MEDIA CONTEXT when mediaContext is provided', () => {
      const mediaContext = {
        mediaType: 'image',
        scene: 'sunset at the beach',
        objects: ['waves', 'orange sun', 'shoreline'],
        mood: 'tranquil and peaceful',
        colors: ['golden orange', 'deep blue'],
        visualTheme: 'aesthetic serenity'
      };

      const prompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      expect(prompt).toContain('CRITICAL REQUIREMENT: MEDIA-AWARE CREATIVE GENERATION');
      expect(prompt).toContain('sunset at the beach');
      expect(prompt).toContain('tranquil and peaceful');
      expect(prompt).toContain('PLATFORM RULES: INSTAGRAM POST');
    });

    test('preserves existing text-only prompt when mediaContext is absent', () => {
      const prompt = buildSystemPrompt({
        mode: 'poem',
        language: 'en',
        poemType: 'haiku'
      });

      expect(prompt).not.toContain('CRITICAL REQUIREMENT: MEDIA-AWARE CREATIVE GENERATION');
      expect(prompt).toContain('[MODE: POEM GENERATION]');
    });
  });

  describe('Generation Cases Verification', () => {
    test('Case 1: Image = sunset, Instagram Post, Aesthetic Minimal, English', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext: {
          mediaType: 'image',
          scene: 'sunset at beach',
          mood: 'peaceful',
          objects: ['sun', 'ocean']
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'sunset'
      });

      expect(res.fullText.toLowerCase()).toContain('sunset');
      expect(res.fullText).toContain('#');
    });

    test('Case 2: Image = food, Instagram Reel, Bold Motivational, English', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-reel',
        style: 'bold',
        format: 'caption',
        mediaContext: {
          mediaType: 'image',
          scene: 'restaurant dish',
          objects: ['food', 'plate'],
          mood: 'intense craftsmanship'
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'food'
      });

      expect(res.fullText.toLowerCase()).toContain('food');
    });

    test('Case 3: Video = travel mountains, YouTube Shorts, Tamil', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'ta',
        platform: 'youtube-shorts',
        style: 'nature',
        format: 'caption',
        mediaContext: {
          mediaType: 'video',
          scene: 'mountain travel',
          topic: 'mountain adventure'
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'travel in mountain'
      });

      expect(res.fullText).toContain('மலை');
      expect(res.fullText).toContain('#Shorts');
    });

    test('Case 4: Image = rainy street, Poem Card, Tamil', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'ta',
        platform: 'instagram-post',
        style: 'dark',
        format: 'poem-card',
        mediaContext: {
          mediaType: 'image',
          scene: 'rainy street at night',
          mood: 'melancholic and reflective'
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'rainy window'
      });

      expect(res.fullText).toContain('மழை');
    });

    test('Case 5: No media, "exam fear", Poem Mode preserved', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'poem',
        language: 'ta',
        poemType: 'வெண்பா'
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'exam fear'
      });

      expect(res.fullText).toContain('தேர்வின்');
    });

    test('Case 6: Image + user prompt "Make it funny"', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext: {
          mediaType: 'image',
          scene: 'sunset',
          mood: 'evening'
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Make it funny'
      });

      expect(res.fullText.toLowerCase()).toMatch(/monday|biryani|humor|sunset/);
    });

    test('Case 7: Video + user prompt "Give me a motivational caption"', async () => {
      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'youtube-shorts',
        style: 'bold',
        format: 'caption',
        mediaContext: {
          mediaType: 'video',
          scene: 'mountain climb',
          topic: 'travel'
        }
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me a motivational caption'
      });

      expect(res.fullText.toLowerCase()).toMatch(/summit|climb|ascend/);
    });
  });
});
