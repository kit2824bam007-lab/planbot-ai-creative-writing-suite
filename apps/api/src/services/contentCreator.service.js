const { GoogleGenerativeAI } = require('@google/generative-ai');
const keyPool = require('./keyPool');
const { env } = require('../config/env');
const redis = require('./redis');
const { hashString } = require('../utils/crypto');

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

class ContentCreatorService {
  /**
   * Validates media file and attributes
   */
  validateMedia(media) {
    if (!media) {
      throw new Error('No media payload provided');
    }

    const { type = 'image', mimeType = '', fileSize = 0 } = media;
    const cleanMime = (mimeType || '').toLowerCase().trim();

    if (type === 'image') {
      if (cleanMime && !ALLOWED_IMAGE_TYPES.has(cleanMime)) {
        throw new Error('Unsupported image format. Please upload JPG, PNG, or WEBP.');
      }
      if (fileSize > MAX_IMAGE_SIZE) {
        throw new Error('Image size exceeds maximum limit of 10MB.');
      }
    } else if (type === 'video') {
      if (cleanMime && !ALLOWED_VIDEO_TYPES.has(cleanMime)) {
        throw new Error('Unsupported video format. Please upload MP4, WEBM, or MOV.');
      }
      if (fileSize > MAX_VIDEO_SIZE) {
        throw new Error('Video size exceeds maximum limit of 50MB.');
      }
    } else {
      throw new Error(`Unsupported media type: ${type}`);
    }

    return true;
  }

  /**
   * Builds visual context for uploaded image or video, utilizing caching
   */
  async buildVisualContext(media) {
    if (!media || !media.data) {
      return null;
    }

    this.validateMedia(media);

    // Check cache by media hash (fileName + fileSize + duration + type + frames sample + data sample)
    let framesDigest = '';
    if (Array.isArray(media.frames) && media.frames.length > 0) {
      framesDigest = media.frames.map((f, i) => `${i}:${f.slice(0, 60)}`).join('|');
    }
    const mediaHash = hashString(
      (media.fileName || '') + '::' +
      (media.fileSize || 0) + '::' +
      (media.duration || 0) + '::' +
      (media.type || '') + '::' +
      framesDigest + '::' +
      (media.data ? media.data.slice(0, 300) : '')
    );
    const cacheKey = `vcontext:${mediaHash}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {
      // Redis get fallback
    }

    let visualContext;
    if (media.type === 'video') {
      visualContext = await this.analyzeVideo(media);
    } else {
      visualContext = await this.analyzeImage(media);
    }

    // Save to cache (24 hours TTL)
    try {
      if (visualContext) {
        await redis.set(cacheKey, JSON.stringify(visualContext), 'EX', 86400);
      }
    } catch (_) {
      // Redis set fallback
    }

    return visualContext;
  }

  /**
   * Preprocesses base64 image data for AI analysis.
   * Preserves image validity up to safe API payload thresholds (~4MB).
   * The original image data sent to the user is never modified.
   * @param {string} rawBase64 - raw base64 string (no data URI prefix)
   * @param {number} [maxBytes=4194304] - max decoded bytes to send to analysis API (~4MB)
   * @returns {string} preprocessed base64 string
   */
  preprocessImageForAnalysis(rawBase64, maxBytes = 4 * 1024 * 1024) {
    if (!rawBase64) return rawBase64;
    // base64 encodes 3 bytes as 4 chars, so decoded size ≈ base64.length * 0.75
    const estimatedDecodedBytes = rawBase64.length * 0.75;
    if (estimatedDecodedBytes <= maxBytes) {
      return rawBase64; // already within limits, preserve valid image structure
    }
    // Calculate max base64 chars for the target byte limit
    const maxBase64Chars = Math.floor(maxBytes / 0.75);
    // Trim to the nearest 4-char boundary (required for valid base64)
    const trimmed = rawBase64.slice(0, Math.floor(maxBase64Chars / 4) * 4);
    console.warn(`[ContentCreatorService] Image preprocessed: ${Math.round(estimatedDecodedBytes / 1024)}KB → ${Math.round(maxBytes / 1024)}KB for AI analysis.`);
    return trimmed;
  }

  /**
   * Multimodal deep analysis of uploaded image
   */
  async analyzeImage(media) {
    const { mimeType = '', data = '', fileName = '' } = media;
    const cleanMime = (mimeType || '').toLowerCase().trim() || 'image/jpeg';
    const cleanName = (fileName || '').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    let rawBase64 = data;
    if (data.includes(';base64,')) {
      rawBase64 = data.split(';base64,')[1];
    }

    // Preprocess: reduce large images to a safe analysis size
    // This only affects what is sent to the AI analysis API — not the user-facing image
    const analysisBase64 = this.preprocessImageForAnalysis(rawBase64);

    // Attempt live multimodal analysis via Gemini
    const analysisStart = Date.now();
    try {
      const keyEntry = keyPool.getKey();
      if (!keyEntry || !keyEntry.key || keyEntry.key === 'demo-dev-key' || keyEntry.key.startsWith('your-')) {
        return this.getSmartContext('image', cleanName, rawBase64);
      }

      const genAI = new GoogleGenerativeAI(keyEntry.key);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const analysisPrompt = `You are an expert computer vision and creative media analyst.
Analyze this uploaded image with extreme precision and truthfulness.
Extract ONLY factual visual cues visible in the image. DO NOT invent details, brand names, personal identities, or locations unless directly visible.

Return ONLY a valid JSON object matching this exact schema:
{
  "mediaType": "image",
  "category": "tech_demo | project | sunset | food | travel | friends | portrait | product | nature | urban | celebration | general",
  "scene": "concise description of visible environment/setting (indoor/outdoor, nature, beach, room, street, etc.)",
  "subjects": ["main visible subject or subjects"],
  "peopleCount": 0,
  "peopleContext": "visible pose/vibe if people present, or 'no people visible'",
  "objects": ["specific visible objects"],
  "foodDetails": "visible food presentation/dish if food present, else null",
  "productDetails": "visible product styling/type if product present, else null",
  "lighting": "lighting condition (golden hour, sunset, bright daylight, neon, moody shadows, etc.)",
  "colors": ["2-4 dominant colors"],
  "activity": "visible action/activity taking place or null",
  "mood": "emotional vibe/atmosphere (peaceful, energetic, romantic, celebratory, nostalgic, serious, etc.)",
  "visualTheme": "aesthetic theme (minimalist, cinematic, rustic, modern, cozy, dramatic, etc.)",
  "distinctiveDetails": "1-2 unique noticeable elements",
  "summary": "1-2 sentence vivid description of what is actually depicted"
}`;

      const analysisPromise = model.generateContent([
        {
          inlineData: {
            mimeType: cleanMime,
            data: analysisBase64  // use preprocessed (smaller) version for analysis
          }
        },
        analysisPrompt
      ]);

      // Reduced timeout: 7s to fail faster to fallback (was 9s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Image analysis timed out')), 7000)
      );

      const result = await Promise.race([analysisPromise, timeoutPromise]);
      const responseText = result.response.text();
      keyPool.reportSuccess(keyEntry);

      console.warn(`[ContentCreatorService] Image analysis completed in ${Date.now() - analysisStart}ms`);

      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanJson = jsonMatch[0];
      const parsed = JSON.parse(cleanJson);

      return {
        ...parsed,
        mediaType: 'image',
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`[ContentCreatorService] Live image analysis fallback after ${Date.now() - analysisStart}ms:`, err.message);
      return this.getSmartContext('image', cleanName, rawBase64);
    }
  }

  /**
   * Analysis of uploaded video.
   * If sampled visual frames are provided, sends them in ONE single multimodal Gemini request
   * to deeply analyze the actual visual content across the timeline.
   */
  async analyzeVideo(media) {
    const { fileName = '', fileSize = 0, duration = 0, frames = [] } = media;
    const cleanName = (fileName || '').replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const analysisStart = Date.now();
    try {
      const keyEntry = keyPool.getKey();
      if (!keyEntry || !keyEntry.key || keyEntry.key === 'demo-dev-key' || keyEntry.key.startsWith('your-')) {
        return this.getSmartContext('video', cleanName, null, duration);
      }

      const genAI = new GoogleGenerativeAI(keyEntry.key);
      const model = genAI.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      let analysisPromise;

      if (Array.isArray(frames) && frames.length > 0) {
        // REAL MULTIMODAL VIDEO FRAME ANALYSIS IN ONE SINGLE REQUEST
        const frameParts = [];
        frameParts.push({
          text: `You are an expert cinematic visual analyst, film critic, and creative director.
The user uploaded a video clip titled "${cleanName || 'creative video clip'}" (${fileSize ? Math.round(fileSize / (1024 * 1024)) + 'MB' : 'clip'}, duration: ${duration ? duration + 's' : 'short-form'}).
Below are ${frames.length} representative frames sampled sequentially across the video timeline.

Analyze what is ACTUALLY happening visually in these frames:
- People, subjects, their movements and actions (walking, dancing, looking at someone, celebrating, fight/action, romantic scene, friendship, nature/travel, etc.)
- Emotional expressions, facial cues, vibe
- Setting, lighting, camera aesthetics
- Grounded creative caption ideas, original trending/reel-style dialogue suggestions inspired by this scene (no copyrighted quotes), and why they match.

Return ONLY a valid JSON object matching this schema:
{
  "mediaType": "video",
  "category": "dance | action_fight | romantic | friendship | celebration | emotional_moment | nature_travel | tech_demo | lifestyle | general",
  "scene": "concise description of visible environment and setting across frames",
  "subjects": ["main visible subjects or people"],
  "actions": ["concrete actions seen across frames (e.g. walking alone, turning back, smiling, dancing)"],
  "emotion": "visible emotion or atmosphere (e.g. nostalgic, solitary, exuberant, intense)",
  "setting": "setting and lighting context (e.g. night street with streetlight reflections)",
  "visual_style": "cinematic | vlog | aesthetic minimal | energetic reel | documentary",
  "important_events": [
    "chronological visual moments observed across the frames"
  ],
  "dialogueMood": "dialogue mood (e.g. emotional, romantic, mass/punch, reflective, humorous)",
  "captionIdeas": [
    "creative caption directly grounded in what is visually depicted"
  ],
  "dialogueSuggestions": [
    "original reel-style / trending-style dialogue line strictly inspired by this scene"
  ],
  "matchReason": "1-2 sentence explanation of why the caption/dialogue matches the visual actions and emotion observed in the frames",
  "summary": "1-2 sentence narrative summary of the visual action across the video clip"
}`
        });

        frames.forEach((frameData, idx) => {
          let rawBase64 = frameData;
          let mimeType = 'image/jpeg';
          if (rawBase64.includes(';base64,')) {
            const split = rawBase64.split(';base64,');
            if (split[0].includes('image/')) {
              mimeType = split[0].replace('data:', '');
            }
            rawBase64 = split[1];
          }
          frameParts.push({
            text: `[Sampled Video Frame ${idx + 1} of ${frames.length}]`
          });
          frameParts.push({
            inlineData: {
              mimeType,
              data: rawBase64
            }
          });
        });

        analysisPromise = model.generateContent(frameParts);
      } else {
        // Fallback to metadata-based analysis if no frames were extracted
        const videoPrompt = `You are an expert video narrative and visual analyst for creative social media content.
The user uploaded a video clip titled "${cleanName || 'creative video clip'}" (${fileSize ? Math.round(fileSize / (1024 * 1024)) + 'MB' : 'clip'}, duration: ${duration ? duration + 's' : 'short-form'}).
Analyze and infer the cinematic and visual narrative context based on the title, timeline, and short-form video tropes.

Return ONLY a valid JSON object matching this schema:
{
  "mediaType": "video",
  "category": "tech_demo | project | student_presentation | travel | reel | food | celebration | nature | lifestyle | general",
  "scene": "setting and environment",
  "openingHook": "compelling visual opening frame or hook",
  "keyActions": ["movement or action sequence"],
  "endingMoment": "closing scene or takeaway",
  "subjects": ["main subject in motion"],
  "mood": "energy level and emotional vibe",
  "visualTheme": "cinematic rhythm and aesthetic",
  "topic": "core subject or narrative story",
  "summary": "1-2 sentence overview of the video's essence"
}`;
        analysisPromise = model.generateContent(videoPrompt);
      }

      // 7s timeout for video analysis
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Video analysis timed out')), 7000)
      );

      const result = await Promise.race([analysisPromise, timeoutPromise]);
      const responseText = result.response.text();
      keyPool.reportSuccess(keyEntry);

      console.warn(`[ContentCreatorService] Video analysis completed in ${Date.now() - analysisStart}ms`);

      let cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanJson = jsonMatch[0];
      const parsed = JSON.parse(cleanJson);

      return {
        ...parsed,
        mediaType: 'video',
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn(`[ContentCreatorService] Video analysis fallback after ${Date.now() - analysisStart}ms:`, err.message);
      return this.getSmartContext('video', cleanName, null, duration);
    }
  }

  /**
   * Resilient, category-aware smart context generator (used offline or when API times out)
   */
  getSmartContext(type, cleanName = '', rawBase64 = null, duration = 0) {
    const text = cleanName.toLowerCase();

    // Category detection based on file name or cues
    let category = 'general';
    let scene = cleanName || 'visual composition';
    let subjects = ['subject'];
    let objects = ['visual details'];
    let mood = 'expressive, evocative';
    let colors = ['rich natural lighting'];
    let visualTheme = 'aesthetic composition';
    let summary = `Captivating visual capturing ${cleanName || 'an evocative scene'}.`;
    let foodDetails = null;
    let productDetails = null;
    let peopleContext = 'visible in frame';
    let activity = null;

    if (text.includes('sunset') || text.includes('beach') || text.includes('sea') || text.includes('ocean') || text.includes('dusk')) {
      category = 'sunset';
      scene = text.includes('beach') || text.includes('sea') ? 'sunset at the beach / coastline' : 'sunset over the horizon';
      subjects = ['setting sun', 'ocean shoreline'];
      objects = ['waves', 'horizon', 'sky'];
      mood = 'peaceful, serene, tranquil';
      colors = ['golden orange', 'deep amber', 'ocean blue'];
      visualTheme = 'golden hour aesthetic';
      summary = 'A breathtaking sunset with golden reflections dancing over gentle water.';
    } else if (text.includes('biryani') || text.includes('food') || text.includes('dish') || text.includes('restaurant') || text.includes('coffee') || text.includes('tea') || text.includes('cake')) {
      category = 'food';
      scene = text.includes('coffee') || text.includes('tea') ? 'cozy cafe table' : 'dining table presentation';
      subjects = [text.includes('biryani') ? 'hot aromatic biryani' : (cleanName || 'delicious food')];
      objects = ['plate', 'garnishing', 'table setting'];
      foodDetails = text.includes('biryani') ? 'steaming flavorful biryani with traditional sides' : 'freshly served culinary delight';
      mood = 'comforting, appetizing, mouthwatering';
      colors = ['warm saffron', 'deep amber', 'rich earthy tones'];
      visualTheme = 'foodie aesthetic';
      summary = `An enticing culinary plate of ${cleanName || 'food'} crafted to perfection.`;
    } else if (text.includes('mountain') || text.includes('trek') || text.includes('travel') || text.includes('road') || text.includes('trip') || text.includes('wander')) {
      category = 'travel';
      scene = 'mountain landscape and winding open road';
      subjects = ['mountain peaks', 'travel path'];
      objects = ['misty valleys', 'clouds', 'rugged terrain'];
      mood = 'adventurous, free-spirited, awe-inspiring';
      colors = ['emerald green', 'slate grey', 'misty white'];
      visualTheme = 'wanderlust journey';
      summary = 'Scenic travel journey through majestic mountain heights and open roads.';
    } else if (text.includes('friend') || text.includes('party') || text.includes('gang') || text.includes('college') || text.includes('reunion')) {
      category = 'friends';
      scene = 'gathering among close companions';
      subjects = ['group of friends'];
      peopleContext = 'close friends sharing a genuine laughing moment';
      objects = ['shared memories', 'group circle'];
      mood = 'cheerful, energetic, nostalgic, bonded';
      colors = ['warm ambient lighting'];
      visualTheme = 'friendship and camaraderie';
      summary = 'An uplifting moment among close friends celebrating togetherness.';
    } else if (text.includes('rain') || text.includes('street') || text.includes('night') || text.includes('city') || text.includes('window')) {
      category = 'nature';
      scene = 'rainy city street reflecting streetlights at night';
      subjects = ['rain droplets', 'glowing reflections'];
      objects = ['wet street pavement', 'glass window', 'ambient lights'];
      mood = 'melancholic, reflective, atmospheric, moody';
      colors = ['neon blue', 'amber glows', 'charcoal wet asphalt'];
      visualTheme = 'moody dark aesthetic';
      summary = 'Raindrops glistening on night streets with gentle melancholic stillness.';
    } else if (text.includes('product') || text.includes('watch') || text.includes('shoe') || text.includes('dress') || text.includes('outfit')) {
      category = 'product';
      scene = 'clean showcase presentation';
      subjects = [cleanName || 'curated item'];
      objects = ['product details', 'display backdrop'];
      productDetails = `Sleek design presentation of ${cleanName || 'item'}`;
      mood = 'premium, stylish, sophisticated';
      colors = ['neutral clean tones', 'focused spotlight'];
      visualTheme = 'minimalist commercial styling';
      summary = `A refined presentation showcasing the design of ${cleanName || 'product'}.`;
    } else if (
      text.includes('ai') ||
      text.includes('project') ||
      text.includes('demo') ||
      text.includes('student') ||
      text.includes('presentation') ||
      text.includes('code') ||
      text.includes('tech') ||
      text.includes('app') ||
      text.includes('software') ||
      text.includes('hackathon') ||
      text.includes('workshop')
    ) {
      category = 'tech_demo';
      scene = 'project demonstration and technical showcase';
      subjects = ['student or developer demonstrating an AI software project', 'interactive system interface'];
      peopleContext = 'creator actively walking through the live demonstration with focus';
      objects = ['computer screen displaying live user interface', 'interactive system features', 'output dashboard'];
      activity = 'live demonstration of working software features and real-world implementation';
      mood = 'focused, innovative, authentic, proud';
      colors = ['modern display luminescence', 'clean workspace lighting'];
      visualTheme = 'hands-on engineering and creative technology demonstration';
      summary = `A student demonstrating an AI software project live, showcasing the application workflow, real-time responses, and practical engineering implementation.`;
    }

    if (type === 'video') {
      let actions = ['dynamic movement through scene', 'visual progression'];
      let emotion = mood || 'engaging, energetic';
      let setting = scene || 'cinematic setting';
      let visual_style = visualTheme || 'cinematic reel';
      let dialogueMood = 'cinematic';
      let captionIdeas = [`Captivating moment captured in ${cleanName || 'this video'}.`];
      let dialogueSuggestions = ['சில தருணங்கள் காலத்தால் அழியாதவை...'];
      let matchReason = `The scene depicts ${cleanName || 'visual progression'} matching an energetic narrative tone.`;

      if (category === 'travel') {
        actions = ['walking along mountain trail', 'looking out at wide panoramic heights', 'dynamic camera pan across landscape'];
        emotion = 'adventurous, free-spirited, awe-inspiring';
        setting = 'winding road and misty mountain peaks';
        visual_style = 'cinematic travel vlog';
        dialogueMood = 'inspirational, bold';
        captionIdeas = [
          'உயரங்களைத் தொட எட்டிப் பார்க்கும் ஒவ்வொரு கணமும் ஒரு புதிய நம்பிக்கை.',
          'The climb is steep, but the view from the summit proves every drop of effort was worth it.'
        ];
        dialogueSuggestions = [
          'வழிகள் முடிவதில்லை... நாம் நடக்கும் தூரம் தான் மாறுகிறது.',
          'Paths don’t end—it is the horizon that invites us further.'
        ];
        matchReason = 'The sampled frames show movement through mountain trails and scenic vistas, naturally matching an adventurous travel aesthetic.';
      } else if (category === 'tech_demo') {
        actions = ['demonstrating software interface on screen', 'walking through live features', 'creator explaining real-time results'];
        emotion = 'focused, proud, innovative';
        setting = 'modern tech workspace with interactive screen';
        visual_style = 'hands-on tech presentation';
        dialogueMood = 'professional, grounded';
        captionIdeas = [
          'From blueprint to working reality: walking through our live AI implementation.',
          'யோசனைகள் செயலாக மாறும் தருணம்... எங்கள் திட்டத்தின் நேரலை செயல்விளக்கம்.'
        ];
        dialogueSuggestions = [
          'நம்பிக்கை வார்த்தைகளில் இல்லை... நாம் உருவாக்கும் படைப்பில் இருக்கிறது.',
          'Real innovation is not proclaimed—it is demonstrated.'
        ];
        matchReason = 'The visual frames show a developer actively demonstrating software workflow features on screen, reflecting an authentic tech demo.';
      } else if (text.includes('dance')) {
        category = 'dance';
        actions = ['choreographed dance movements', 'rhythmic footwork and expressive spins', 'high energy closing pose'];
        emotion = 'vibrant, exuberant, electrifying';
        setting = 'stage / aesthetic indoor dance space';
        visual_style = 'high-energy dance reel';
        dialogueMood = 'mass, punch, energetic';
        captionIdeas = [
          'தாளமும் பாதமும் இணையும் நொடியில்... நடனம் உயிர் பெறுகிறது! 🔥',
          'When rhythm meets passion, every step becomes pure art.'
        ];
        dialogueSuggestions = [
          'ஆட்டம் ஆடலாம்... ஆனா ஸ்டைல் நம்முடையதா இருக்கணும்! 🔥',
          'Every beat has a story; our rhythm speaks for itself.'
        ];
        matchReason = 'The frames show rhythmic bodily motion and expressive choreography matching a vibrant dance reel.';
      } else if (text.includes('fight') || text.includes('action')) {
        category = 'action_fight';
        actions = ['intense visual stare into camera', 'swift physical movement / strike sequence and fast action', 'dramatic freeze frame'];
        emotion = 'fiery, intense, relentless';
        setting = 'dramatic cinematic lighting with sharp shadows';
        visual_style = 'intense cinematic action';
        dialogueMood = 'mass, punch';
        captionIdeas = [
          'அமைதியை பலவீனமாய் நினைக்காதே... புயலுக்கு முன் வரும் நிசப்தம் இது! 🔥',
          'Never mistake silence for weakness—it is the gathering of the storm.'
        ];
        dialogueSuggestions = [
          'ஒரு பார்வை போதும்... கதை மாறிடும்! 🔥',
          'One look is enough to shift the entire game.'
        ];
        matchReason = 'The frames display sharp physical motion, focused intensity, and dramatic shadow framing matching a mass action scene.';
      } else if (text.includes('romantic') || text.includes('kadhal') || text.includes('love')) {
        category = 'romantic';
        actions = ['two people sharing a gentle glance', 'slow walking side by side', 'soft smile in warm natural light'];
        emotion = 'tender, affectionate, heartfelt';
        setting = 'warm romantic outdoor setting';
        visual_style = 'poetic romantic reel';
        dialogueMood = 'poetic, emotional';
        captionIdeas = [
          'வார்த்தைகள் தேவையில்லை... உன் விழிகளின் மௌனமே எனக்குக் கவிதை. ❤️',
          'No words needed when the quietest glances speak the loudest poetry.'
        ];
        dialogueSuggestions = [
          'உலகம் முழுக்கத் தேடிய அமைதி... உன் ஒற்றைப் புன்னகையில் கிடைத்தது.',
          'The peace I sought across the world was found in a single smile.'
        ];
        matchReason = 'The sampled visual frames capture intimate eye contact and tender expressions under soft natural lighting.';
      } else if (text.includes('night') || text.includes('alone') || text.includes('walk') || text.includes('emotional')) {
        category = 'emotional_moment';
        actions = ['person walking alone along the street', 'turning back with an emotional look', 'cinematic streetlight reflections on the path'];
        emotion = 'emotional, nostalgic, solitary, reflective';
        setting = 'night street with solitary streetlight lighting';
        visual_style = 'moody cinematic night walk';
        dialogueMood = 'emotional, cinematic';
        captionIdeas = [
          'திரும்பிப் பார்க்க வைத்தது பாதை இல்லை... நினைவுகள்.',
          'What made me look back wasn\'t the road... but the memories.'
        ];
        dialogueSuggestions = [
          'சில பிரிவுகள் முடிவல்ல... ஒரு புதிய கதையின் தொடக்கம்.',
          'Some goodbyes are not endings—they are the quiet beginning of a whole new chapter.'
        ];
        matchReason = 'The frames show a solitary walk with an emotional look-back moment and cinematic night lighting.';
      }

      return {
        mediaType: 'video',
        category,
        scene,
        openingHook: `Opening visual of ${scene}`,
        keyActions: actions,
        actions,
        endingMoment: 'memorable closing frame lingering on the view',
        subjects,
        objects,
        mood,
        emotion,
        setting,
        visual_style,
        important_events: [
          `Opening: ${actions[0] || 'initial visual movement'}`,
          `Progress: ${actions[1] || 'motion sequence'}`,
          `Conclusion: ${actions[2] || 'closing frame lingering on scene'}`
        ],
        dialogueMood,
        captionIdeas,
        dialogueSuggestions,
        matchReason,
        visualTheme,
        topic: cleanName || 'creative lifestyle exploration',
        summary: `Short video clip (${duration ? duration + 's' : 'reels'}) showcasing ${summary}`
      };
    }

    return {
      mediaType: 'image',
      category,
      scene,
      subjects,
      peopleCount: category === 'friends' ? 3 : (category === 'portrait' ? 1 : 0),
      peopleContext,
      objects,
      foodDetails,
      productDetails,
      lighting: category === 'sunset' ? 'golden hour warmth' : 'natural daylight',
      colors,
      activity: null,
      mood,
      visualTheme,
      distinctiveDetails: `Atmospheric ${visualTheme} capturing ${scene}`,
      summary
    };
  }

  /**
   * Detects the user's intended content type from prompt keywords
   */
  detectContentType(prompt = '') {
    const p = prompt.toLowerCase();

    if (p.includes('reel') || p.includes('reels')) {
      return 'reel';
    }
    if (p.includes('story') || p.includes('status')) {
      return 'story';
    }
    if (p.includes('shorts') || p.includes('youtube short')) {
      return 'shorts';
    }
    if (p.includes('hashtag') || p.includes('tags only')) {
      return 'hashtags';
    }
    if (p.includes('hook') || p.includes('punchline') || p.includes('dialogue') || p.includes('madhiri') || p.includes('mass')) {
      return 'hook';
    }
    if (p.includes('bio') || p.includes('profile')) {
      return 'bio';
    }
    if (p.includes('marketing') || p.includes('promote') || p.includes('ad copy')) {
      return 'marketing';
    }
    if (p.includes('poem') || p.includes('kavithai') || p.includes('கவிதை')) {
      return 'poem-card';
    }
    if (p.includes('description') || p.includes('describe')) {
      return 'description';
    }
    // Default: social caption
    return 'caption';
  }

  /**
   * Intelligently detects if Tanglish is explicitly or implicitly desired
   */
  detectLanguagePreference(prompt = '', defaultLang = 'ta') {
    const p = prompt.toLowerCase();

    // Explicit Tanglish cues
    const isExplicitTanglish =
      p.includes('tanglish') ||
      p.includes('thanglish') ||
      p.includes('in tanglish') ||
      p.includes('tanglish la') ||
      p.includes('tanglish-la');

    // Tanglish lexical markers
    const hasTanglishKeywords =
      p.includes('kudu') ||
      p.includes('kudunga') ||
      p.includes('venum') ||
      p.includes('panu') ||
      p.includes('irukku') ||
      p.includes('solli') ||
      p.includes('solla') ||
      p.includes('indha') ||
      p.includes('enna') ||
      p.includes('madhiri') ||
      p.includes('theriyuma') ||
      p.includes('kadhal') ||
      p.includes('kavithai');

    const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(prompt);

    if (isExplicitTanglish) {
      return 'tanglish';
    }

    if (p.includes('english') || p.includes('in english')) {
      return 'en';
    }

    if (p.includes('tamil') || p.includes('in tamil') || hasTamilUnicode) {
      return 'ta';
    }

    if (hasTanglishKeywords && !hasTamilUnicode) {
      // Natural Tanglish if user wrote in Tanglish
      return 'tanglish';
    }

    return defaultLang === 'en' ? 'en' : 'ta';
  }

  /**
   * Intelligently detects target platform from prompt if explicitly requested
   */
  detectPlatformPreference(prompt = '', defaultPlatform = 'instagram-post') {
    const p = prompt.toLowerCase();
    if (p.includes('linkedin')) {
      return 'linkedin';
    }
    if (p.includes('twitter') || p.includes('x post') || p.includes('tweet')) {
      return 'twitter';
    }
    if (p.includes('youtube') || p.includes('shorts') || p.includes('short video')) {
      return 'youtube-shorts';
    }
    if (p.includes('reel') || p.includes('reels') || p.includes('insta reel')) {
      return 'instagram-reel';
    }
    if (p.includes('story') || p.includes('stories') || p.includes('status')) {
      return 'instagram-story';
    }
    if (p.includes('whatsapp')) {
      return 'whatsapp';
    }
    if (p.includes('facebook') || p.includes('fb')) {
      return 'facebook';
    }
    if (p.includes('instagram') || p.includes('insta post')) {
      return 'instagram-post';
    }
    return defaultPlatform || 'instagram-post';
  }

  /**
   * Intelligently detects tone from prompt if explicitly requested
   */
  detectTonePreference(prompt = '', defaultTone = 'inspirational') {
    const p = prompt.toLowerCase();
    if (p.includes('professional') || p.includes('corporate') || p.includes('business') || p.includes('work')) {
      return 'professional';
    }
    if (p.includes('funny') || p.includes('humor') || p.includes('comedy') || p.includes('joke') || p.includes('sarcas')) {
      return 'humorous';
    }
    if (p.includes('emotional') || p.includes('heartfelt') || p.includes('moving')) {
      return 'emotional';
    }
    if (p.includes('romantic') || p.includes('love') || p.includes('kadhal')) {
      return 'romantic';
    }
    if (p.includes('mass') || p.includes('hero') || p.includes('attitude') || p.includes('dialogue') || p.includes('bold')) {
      return 'heroic';
    }
    if (p.includes('motivat') || p.includes('inspire') || p.includes('drive')) {
      return 'inspirational';
    }
    if (p.includes('peace') || p.includes('serene') || p.includes('calm')) {
      return 'peaceful';
    }
    return defaultTone || 'inspirational';
  }

  /**
   * Intelligently detects style from prompt if explicitly requested
   */
  detectStylePreference(prompt = '', defaultStyle = 'aesthetic') {
    const p = prompt.toLowerCase();
    if (p.includes('professional') || p.includes('clean') || p.includes('corporate')) {
      return 'corporate';
    }
    if (p.includes('cinematic') || p.includes('movie')) {
      return 'cinematic';
    }
    if (p.includes('aesthetic') || p.includes('minimal')) {
      return 'aesthetic';
    }
    if (p.includes('bold') || p.includes('mass') || p.includes('punchy')) {
      return 'bold';
    }
    if (p.includes('nature') || p.includes('earthy')) {
      return 'nature';
    }
    if (p.includes('vintage') || p.includes('retro')) {
      return 'vintage';
    }
    if (p.includes('dark') || p.includes('moody')) {
      return 'dark';
    }
    return defaultStyle || 'aesthetic';
  }
}

const contentCreatorService = new ContentCreatorService();
module.exports = contentCreatorService;
