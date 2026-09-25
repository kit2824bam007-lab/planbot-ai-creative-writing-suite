const contentCreatorService = require('../src/services/contentCreator.service');
const mediaAnalysisService = require('../src/services/mediaAnalysis.service');
const { buildSystemPrompt, buildActionPrompt } = require('../src/config/prompts');
const geminiService = require('../src/services/gemini');
const originalityService = require('../src/services/originality.service');

describe('Content Creator Visual Understanding & Social-Media Generation Upgrade', () => {
  describe('Visual Context Extraction & Media Intelligence', () => {
    test('Image analysis extracts rich grounded visual context for sunset', async () => {
      const context = contentCreatorService.getSmartContext('image', 'sunset beach ocean.jpg');
      expect(context.mediaType).toBe('image');
      expect(context.category).toBe('sunset');
      expect(context.scene).toContain('sunset');
      expect(context.subjects).toContain('setting sun');
      expect(context.mood).toContain('peaceful');
      expect(context.colors).toContain('golden orange');
      expect(context.visualTheme).toBe('golden hour aesthetic');
    });

    test('Image analysis extracts rich grounded visual context for food', async () => {
      const context = contentCreatorService.getSmartContext('image', 'chicken biryani dish.jpg');
      expect(context.mediaType).toBe('image');
      expect(context.category).toBe('food');
      expect(context.foodDetails).toBeDefined();
      expect(context.mood).toContain('mouthwatering');
    });

    test('Video analysis extracts narrative progression for travel', async () => {
      const context = contentCreatorService.getSmartContext('video', 'mountain trek vlog.mp4', null, 30);
      expect(context.mediaType).toBe('video');
      expect(context.category).toBe('travel');
      expect(context.openingHook).toBeDefined();
      expect(context.keyActions).toBeInstanceOf(Array);
      expect(context.endingMoment).toBeDefined();
    });

    test('Validates image format and size limits', () => {
      expect(() => {
        contentCreatorService.validateMedia({
          type: 'image',
          mimeType: 'image/gif',
          fileSize: 1000
        });
      }).toThrow('Unsupported image format');

      expect(() => {
        contentCreatorService.validateMedia({
          type: 'image',
          mimeType: 'image/jpeg',
          fileSize: 12 * 1024 * 1024
        });
      }).toThrow('Image size exceeds maximum limit of 10MB');
    });
  });

  describe('Intent & Language Detection', () => {
    test('Detects reel, story, and shorts content types from prompt', () => {
      expect(contentCreatorService.detectContentType('give me an instagram reel caption')).toBe('reel');
      expect(contentCreatorService.detectContentType('give me an insta story line')).toBe('story');
      expect(contentCreatorService.detectContentType('youtube shorts title')).toBe('shorts');
      expect(contentCreatorService.detectContentType('only hashtags please')).toBe('hashtags');
      expect(contentCreatorService.detectContentType('mass dialogue kudu')).toBe('hook');
      expect(contentCreatorService.detectContentType('standard caption')).toBe('caption');
    });

    test('Detects Tanglish when requested or written in Tanglish', () => {
      expect(contentCreatorService.detectLanguagePreference('tanglish caption kudu', 'ta')).toBe('tanglish');
      expect(contentCreatorService.detectLanguagePreference('indha photo ku caption venum', 'ta')).toBe('tanglish');
      expect(contentCreatorService.detectLanguagePreference('write an english caption', 'ta')).toBe('en');
      expect(contentCreatorService.detectLanguagePreference('தமிழில் கவிதை', 'en')).toBe('ta');
    });
  });

  describe('Generation Test Cases', () => {
    // 1. No image + normal poem
    test('1. No image + normal poem works as standard poem generator', async () => {
      const prompt = buildSystemPrompt({
        mode: 'poem',
        language: 'ta',
        poemType: 'வெண்பா'
      });
      expect(prompt).toContain('[MODE: POEM GENERATION]');
      expect(prompt).not.toContain('CRITICAL REQUIREMENT: MEDIA-AWARE CREATIVE GENERATION');

      const res = await geminiService.generateComplete({
        systemPrompt: prompt,
        userPrompt: 'exam fear'
      });
      expect(res.fullText).toContain('தேர்வின்');
    });

    // 2. No image + normal story
    test('2. No image + normal story works as standard story generator', async () => {
      const prompt = buildSystemPrompt({
        mode: 'story',
        genre: 'Drama',
        language: 'en'
      });
      expect(prompt).toContain('[MODE: STORY GENERATION]');
      expect(prompt).toContain('dialogue');
    });

    // 3. Image + caption (structured 3 options + original line + hashtags)
    test('3. Image + caption produces 3 distinct creative options and hashtags', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset near the beach',
        subjects: ['ocean waves', 'setting sun'],
        mood: 'peaceful, serene'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me captions for this sunset'
      });

      expect(res.fullText).toContain('OPTION 1 — CINEMATIC');
      expect(res.fullText).toContain('OPTION 2 — AESTHETIC');
      expect(res.fullText).toContain('OPTION 3 — CASUAL');
      expect(res.fullText).toContain('ORIGINAL CINEMATIC LINE');
      expect(res.fullText).toContain('#');
      expect(res.fullText.toLowerCase()).toContain('sunset');
    });

    // 4. Image + Tamil caption
    test('4. Image + Tamil caption outputs authentic Tamil script', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset at beach',
        mood: 'peaceful'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'ta',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Instagram caption kudu'
      });

      expect(res.fullText).toContain('அந்திவானம்');
      expect(res.fullText).toContain('#');
    });

    // 5. Image + Tanglish caption
    test('5. Image + Tanglish caption produces natural Tanglish blending', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset at beach',
        mood: 'peaceful'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'tanglish',
        isTanglish: true,
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'tanglish caption kudu'
      });

      expect(res.fullText).toContain('Sunset');
      expect(res.fullText.toLowerCase()).toMatch(/paakumbodhu|vibe|nalla|waves/);
    });

    // 6. Image + English caption
    test('6. Image + English caption produces polished English copy', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset at beach'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Aesthetic caption please'
      });

      expect(res.fullText).toContain('OPTION 1');
      expect(res.fullText.toLowerCase()).toContain('sunset');
    });

    // 7. Image + funny caption
    test('7. Image + funny caption produces witty humor grounded in image', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset at beach',
        mood: 'peaceful'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Make it funny'
      });

      expect(res.fullText.toLowerCase()).toMatch(/monday|biryani|humor|sunset/);
    });

    // 8. Image + emotional caption
    test('8. Image + emotional caption amplifies feeling without losing visual context', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset over calm waters',
        mood: 'deeply moving'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        style: 'emotional',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me an emotional caption'
      });

      expect(res.fullText.toLowerCase()).toContain('sunset');
    });

    // 9. Image + cinematic / mass caption (original wording, no copyright infringement)
    test('9. Image + mass movie-style caption produces original wording without copying copyrighted movie dialogue', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'golden hour shoreline'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'tanglish',
        isTanglish: true,
        platform: 'instagram-post',
        style: 'bold',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me a mass dialogue caption'
      });

      expect(res.fullText).toContain('Scene small-ah irukkalam');
      expect(res.fullText).toContain('ORIGINAL CINEMATIC LINE');
      // Verifies original line does not claim to be from any copyrighted movie
      expect(res.fullText).not.toContain('Rajinikanth');
      expect(res.fullText).not.toContain('Vijay movie');
    });

    // 10. Image + hashtags only
    test('10. Image + hashtags produces clean targeted tags', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset beach'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-post',
        format: 'hashtags',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'hashtags only'
      });

      expect(res.fullText).toContain('#SunsetVibes');
      expect(res.fullText).toContain('#GoldenHour');
    });

    // 11. Image + Instagram Reel
    test('11. Image + Instagram Reel generates Hook, Caption, Punchline, Hashtags, and CTA', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset waves'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-reel',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me a reel caption'
      });

      expect(res.fullText).toContain('Reel Hook');
      expect(res.fullText).toContain('Caption');
      expect(res.fullText).toContain('Short Punch Line');
      expect(res.fullText).toContain('Hashtags');
      expect(res.fullText).toContain('Call to Action');
    });

    // 12. Image + Instagram Story
    test('12. Image + Instagram Story generates concise story quote', async () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset beach'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'instagram-story',
        style: 'aesthetic',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me an insta story line'
      });

      expect(res.fullText).toContain('Mood: somewhere between peace and sunset');
    });

    // 13. Video + YouTube Shorts
    test('13. Video + YouTube Shorts generates Title, Hook, Description, and #Shorts', async () => {
      const mediaContext = {
        mediaType: 'video',
        category: 'travel',
        scene: 'mountain climb',
        topic: 'travel adventure'
      };

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'youtube-shorts',
        style: 'bold',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'Give me shorts content'
      });

      expect(res.fullText).toContain('Title');
      expect(res.fullText).toContain('Hook');
      expect(res.fullText).toContain('#Shorts');
      expect(res.fullText.toLowerCase()).toMatch(/summit|climb|mountain/);
    });

    // 14. Action buttons: Shorter, Longer, More Creative, Humorous preserve visual mediaContext
    test('14. Action buttons preserve visual mediaContext across refinements', () => {
      const mediaContext = {
        mediaType: 'image',
        category: 'sunset',
        scene: 'sunset at the beach',
        mood: 'peaceful'
      };

      const shorterAction = buildActionPrompt('shorter', {
        originalPrompt: 'Give me a sunset caption',
        previousContent: 'Where the ocean whispers to the setting sun...',
        metadata: { mode: 'creator', language: 'en' },
        mediaContext
      });

      expect(shorterAction).toContain('ACTION: SHORTER & CONCISE');
      expect(shorterAction).toContain('VISUAL MEDIA CONTEXT TO PRESERVE');
      expect(shorterAction).toContain('sunset at the beach');

      const creativeAction = buildActionPrompt('more-creative', {
        originalPrompt: 'sunset caption',
        previousContent: 'Sunset on the beach',
        metadata: { mode: 'creator', language: 'en' },
        mediaContext
      });

      expect(creativeAction).toContain('ACTION: ELEVATE CREATIVITY & METAPHOR');
      expect(creativeAction).toContain('sunset at the beach');
    });

    // 15. Originality Screening on generated caption
    test('15. Originality Screening screens generated content and flags risk accurately', async () => {
      const screening = await originalityService.checkOriginality({
        content: 'Where the ocean whispers to the setting sun, stillness settles in.',
        contentType: 'creator'
      });

      expect(screening.riskLevel).toBe('LOW');
      expect(screening.exactMatchFound).toBe(false);
      expect(screening.sourcesChecked).toContain('PlanBot');
    });

    // 16. LinkedIn professional post for video demonstration (avoids generic corporate buzzwords)
    test('16. Generates grounded LinkedIn post for video demo without corporate buzzwords', async () => {
      const mediaContext = contentCreatorService.getSmartContext('video', 'student-ai-project-demo.mp4', null, 45);
      expect(mediaContext.category).toBe('tech_demo');
      expect(mediaContext.summary).toContain('AI software project');

      const systemPrompt = buildSystemPrompt({
        mode: 'creator',
        language: 'en',
        platform: 'linkedin',
        style: 'corporate',
        format: 'caption',
        mediaContext
      });

      const res = await geminiService.generateComplete({
        systemPrompt,
        userPrompt: 'give LinkedIn professional description for this video'
      });

      // Grounded in the actual project
      expect(res.fullText).toContain('AI project');
      expect(res.fullText).toContain('#SoftwareEngineering');
      expect(res.fullText).toContain('#AIProject');

      // Free of generic corporate buzzword fluff
      expect(res.fullText).not.toContain('Seamless execution is the bridge');
      expect(res.fullText).not.toContain("In today's fast-paced digital world");
      expect(res.fullText).not.toContain('Transforming paradigms');
    });

    // 17. Preference detectors for platform, tone, and style
    test('17. Detects platform, tone, and style accurately from prompt', () => {
      expect(contentCreatorService.detectPlatformPreference('give LinkedIn professional description')).toBe('linkedin');
      expect(contentCreatorService.detectPlatformPreference('write a twitter post for this')).toBe('twitter');
      expect(contentCreatorService.detectPlatformPreference('youtube shorts video')).toBe('youtube-shorts');
      expect(contentCreatorService.detectPlatformPreference('give me a reel caption')).toBe('instagram-reel');

      expect(contentCreatorService.detectTonePreference('give professional description')).toBe('professional');
      expect(contentCreatorService.detectTonePreference('make it funny and witty')).toBe('humorous');
      expect(contentCreatorService.detectTonePreference('write an emotional caption')).toBe('emotional');
      expect(contentCreatorService.detectTonePreference('mass dialogue kudu')).toBe('heroic');

      expect(contentCreatorService.detectStylePreference('clean corporate look')).toBe('corporate');
      expect(contentCreatorService.detectStylePreference('give cinematic caption')).toBe('cinematic');
      expect(contentCreatorService.detectStylePreference('aesthetic minimal')).toBe('aesthetic');
    });
  });
});
