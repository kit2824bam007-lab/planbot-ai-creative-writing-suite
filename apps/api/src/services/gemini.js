const { GoogleGenerativeAI } = require('@google/generative-ai');
const keyPool = require('./keyPool');
const { env } = require('../config/env');

const DEFAULT_MODEL = env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * Handles communication with Gemini API, including streaming,
 * multi-key rotation, 429 backoff handling, and BYOK.
 */
class GeminiService {
  /**
   * Executes a streaming generation
   * @param {Object} options
   * @param {string} options.systemPrompt
   * @param {string} options.userPrompt
   * @param {string|null} [options.byokKey]
   * @param {Function} [options.onChunk] - callback for each text token/chunk
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<{ fullText: string, model: string, keyUsed: string }>}
   */
  async generateStream({ systemPrompt, userPrompt, media = null, onChunk = null, signal = null }) {
    let keyEntry = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        try {
          keyEntry = keyPool.getKey();
        } catch (keyErr) {
          if (keyErr.message === 'DAILY_QUOTA_EXHAUSTED') {
            console.warn('[GeminiService] All API keys have exhausted daily project quota.');
            if (process.env.NODE_ENV !== 'test') {
              const unavailableError = new Error('AI generation is temporarily unavailable. Please try again shortly.');
              unavailableError.code = 'AI_UNAVAILABLE';
              unavailableError.status = 503;
              throw unavailableError;
            }
            return await this.mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal });
          }
          if (keyErr.message === 'ALL_KEYS_EXHAUSTED' && attempts < maxAttempts) {
            console.warn(`[GeminiService] Keys temporarily cooling down, waiting 2s for attempt ${attempts}...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw keyErr;
        }

        // Check if test environment or demo/mock key without internet
        if (process.env.NODE_ENV === 'test' || !keyEntry.key || keyEntry.key === 'demo-dev-key' || keyEntry.key.startsWith('your-') || keyEntry.key.startsWith('key-')) {
          return await this.mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal });
        }

        const genAI = new GoogleGenerativeAI(keyEntry.key);
        const model = genAI.getGenerativeModel({
          model: DEFAULT_MODEL,
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            thinkingConfig: { thinkingBudget: 0 } // Eliminates the 45-second deep thinking latency
          }
        });

        // Assemble multimodal parts: ONLY images can be sent as inlineData (videos are rejected by Gemini inlineData API)
        const parts = [];
        if (media && media.data && media.type === 'image') {
          let rawBase64 = media.data;
          if (rawBase64.includes(';base64,')) {
            rawBase64 = rawBase64.split(';base64,')[1];
          }
          const cleanMime = (media.mimeType || '').toLowerCase().trim();
          const resolvedMime = cleanMime || 'image/jpeg';
          parts.push({
            inlineData: {
              mimeType: resolvedMime,
              data: rawBase64
            }
          });
        }
        parts.push({ text: userPrompt });

        const result = await model.generateContentStream({
          contents: [{ role: 'user', parts }]
        });

        if (result.response && typeof result.response.catch === 'function') {
          result.response.catch(() => {});
        }

        let fullText = '';
        for await (const chunk of result.stream) {
          if (signal && signal.aborted) {
            break;
          }
          const text = chunk.text();
          fullText += text;
          if (onChunk) {
            onChunk(text);
          }
        }

        keyPool.reportSuccess(keyEntry);
        return {
          fullText,
          model: DEFAULT_MODEL,
          keyUsed: keyEntry.id
        };
      } catch (err) {
        const isQuota = err.status === 429 || (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')));
        const isClientError = err.status === 400 || (err.message && err.message.includes('400'));
        if (keyEntry && !isClientError) {
          keyPool.reportFailure(keyEntry, isQuota, err.message, err);
        }

        if (attempts >= maxAttempts) {
          console.warn(`[GeminiService] All ${maxAttempts} live attempts failed (${err.message}).`);
          if (process.env.NODE_ENV !== 'test') {
            const unavailableError = new Error('AI generation is temporarily unavailable. Please try again shortly.');
            unavailableError.code = 'AI_UNAVAILABLE';
            unavailableError.status = 503;
            throw unavailableError;
          }
          return await this.mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal });
        }
        console.warn(`[GeminiService] Attempt ${attempts} failed (${err.message}). Retrying with next key...`);
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      const unavailableError = new Error('AI generation is temporarily unavailable. Please try again shortly.');
      unavailableError.code = 'AI_UNAVAILABLE';
      unavailableError.status = 503;
      throw unavailableError;
    }
    return await this.mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal });
  }

  /**
   * Generates complete non-streaming completion (e.g. for retries or guard fixes)
   */
  async generateComplete({ systemPrompt, userPrompt, media = null }) {
    let textResult = '';
    const res = await this.generateStream({
      systemPrompt,
      userPrompt,
      media,
      onChunk: (chunk) => {
        textResult += chunk;
      }
    });
    return res;
  }

  /**
   * High quality mock generation for local development without active Gemini API keys
   */
  async mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal }) {
    const isTanglish = systemPrompt.includes('TARGET = TANGLISH') || (userPrompt && userPrompt.toLowerCase().includes('tanglish'));
    const isTamil = !isTanglish && (systemPrompt.includes('TARGET = TAMIL') || systemPrompt.includes('Tamil (தமிழ்)') || systemPrompt.includes('வெண்பா'));
    let mockResponse = '';

    const hasMedia = systemPrompt.includes('VISUAL MEDIA CONTEXT');
    const combined = (systemPrompt + ' ' + (userPrompt || '')).toLowerCase();

    // Check for media-aware generation mock cases
    if (hasMedia) {
      const userPromptLower = (userPrompt || '').toLowerCase();
      const systemLower = (systemPrompt || '').toLowerCase();

      const isShorts = systemPrompt.includes('PLATFORM RULES: YOUTUBE SHORTS') || userPromptLower.includes('shorts') || userPromptLower.includes('youtube short');
      const isReel = systemPrompt.includes('PLATFORM RULES: INSTAGRAM REEL') || userPromptLower.includes('reel');
      const isStory = (systemPrompt.includes('PLATFORM RULES: INSTAGRAM STORY') || userPromptLower.includes('insta story') || userPromptLower.includes('instagram story') || userPromptLower === 'story') && !isShorts && !isReel;
      const isLinkedIn = systemPrompt.includes('PLATFORM RULES: LINKEDIN POST') || userPromptLower.includes('linkedin');
      const isHashtagsOnly = userPromptLower.includes('only hashtag') || userPromptLower.includes('hashtags only') || userPromptLower === 'hashtags' || userPromptLower === '#hashtags' || userPromptLower === 'tags only';

      const isFunny = userPromptLower.includes('funny') || userPromptLower.includes('humor') || userPromptLower.includes('joke');
      const isMotivational = userPromptLower.includes('motivat') || userPromptLower.includes('bold') || systemLower.includes('bold motivational');
      const isEmotional = userPromptLower.includes('emotional') || userPromptLower.includes('heart');
      const isRomantic = userPromptLower.includes('romantic') || userPromptLower.includes('love') || userPromptLower.includes('kadhal');
      const isMass = userPromptLower.includes('mass') || userPromptLower.includes('movie') || userPromptLower.includes('hero') || userPromptLower.includes('dialogue');

      const mcMatch = systemPrompt.match(/VISUAL MEDIA CONTEXT:\s*([\s\S]*?)(?:===|MANDATORY|$)/i);
      const mediaContextText = (mcMatch ? mcMatch[1] : '') + ' ' + (userPrompt || '');
      const contextLower = mediaContextText.toLowerCase();

      const isSunset = contextLower.includes('sunset') || contextLower.includes('beach') || contextLower.includes('ocean') || contextLower.includes('sea');
      const isFood = contextLower.includes('food') || contextLower.includes('restaurant') || contextLower.includes('dish') || contextLower.includes('biryani') || contextLower.includes('plate');
      const isMountain = contextLower.includes('mountain') || contextLower.includes('travel') || contextLower.includes('road') || contextLower.includes('climb') || contextLower.includes('summit');
      const isRain = contextLower.includes('rain') || contextLower.includes('street') || contextLower.includes('window');
      const isFriends = contextLower.includes('friend') || contextLower.includes('gang') || contextLower.includes('party');
      const isProduct = contextLower.includes('product') || contextLower.includes('watch') || contextLower.includes('shoe');
      const isTechDemo = contextLower.includes('tech_demo') || contextLower.includes('project') || contextLower.includes('student') || contextLower.includes('demo') || contextLower.includes('ai') || contextLower.includes('code') || contextLower.includes('software');

      if (isLinkedIn) {
        if (isTechDemo) {
          mockResponse = `Today, we got to see our AI project move from an idea on paper to something we could actually demonstrate.

Building this required wrestling with prompt architectures, visual grounding pipelines, and making sure the system responds to real user intent rather than spitting out generic text.

In this demo, you can see how the application analyzes the media context in real time and crafts grounded, platform-specific content with zero corporate fluff.

Big takeaway: AI tools are at their best when they augment human creativity rather than replacing it with buzzwords.

Excited to keep refining this further. What are your thoughts on grounding generative AI in multimodal context?

#SoftwareEngineering #AIProject #StudentInnovation #ArtificialIntelligence #MachineLearning #TechDemo`;
        } else if (isSunset || isMountain) {
          mockResponse = `Sometimes the best perspective on a complex problem comes when you step away from the desk and look at the bigger picture.

Spending time observing this natural transition reminded me that patience and steady iteration outlast rushed execution every time.

Grateful for moments of quiet focus that help reset our creative thinking before the next sprint.

How do you recharge your focus when tackling demanding milestones?

#Leadership #WorkLifeBalance #Mindset #Productivity #CreativeFocus`;
        } else if (isFood) {
          mockResponse = `Great craftsmanship often shares the same fundamental principles—whether you are architecting a codebase or perfecting a culinary tradition.

Attention to detail, balance, timing, and passion turn ordinary ingredients into an extraordinary experience.

Honoring the craft and the hard work behind every plate.

#Craftsmanship #CulinaryArt #Focus #Dedication #QualityFirst`;
        } else {
          mockResponse = `Real progress happens in the moments we capture here—authentic, focused, and driven by purpose.

Stepping into this milestone reinforced the importance of showing up consistently, learning through hands-on practice, and staying curious.

Excited for what lies ahead on this journey.

#ProfessionalGrowth #Innovation #CareerMilestones #ContinuousLearning`;
        }
      } else if (isHashtagsOnly) {
        if (isSunset) {
          mockResponse = isTamil
            ? `#அந்திவானம் #கடற்கரை #சூரியஅஸ்தமனம் #மாலைநேரம் #இயற்கைஅழகு #AestheticTamil #SunsetVibes`
            : isTanglish
            ? `#SunsetVibes #GoldenHour #BeachMood #TanglishCaption #SunsetLover #PeaceVibes`
            : `#SunsetVibes #GoldenHour #BeachMood #OceanBreeze #SunsetPhotography #ChasingSunsets`;
        } else if (isFood) {
          mockResponse = isTamil
            ? `#சுவையானஉணவு #பிரியாணி #உணவுப்பிரியன் #தமிழ்சுவை #FoodieTamil #FoodVibes`
            : `#Foodie #FoodPhotography #FoodLover #FoodVibes #CulinaryDelight #WeekendFeast`;
        } else {
          mockResponse = `#VisualStory #CreativeVibes #Photography #InstaGood #Momentum`;
        }
      } else if (isStory) {
        if (isTamil) {
          mockResponse = isSunset
            ? `✨ "சில மாலைகள்... பார்க்க மட்டும் இல்ல, மனசுல வச்சுக்கத்தான். 🌅🌊"`
            : isFood
            ? `✨ "ஒரு தட்டு சுவை... நாள் முழுக்க உற்சாகம்! 😋🔥"`
            : `✨ "இந்தக் கணத்தின் அழகு, அமைதியாய் மனதில் விரிகிறது."`;
        } else if (isTanglish) {
          mockResponse = isSunset
            ? `✨ "Sunset paakumbodhu, life konjam slow-ah poganum pola irukku. 🌅"`
            : isFood
            ? `✨ "Oru plate biryani podhum... full mood-um change aagidum! 😋🔥"`
            : `✨ "Mood: pure peace and good vibes only."`;
        } else {
          mockResponse = isSunset
            ? `✨ "Mood: somewhere between peace and sunset. 🌅"`
            : isFood
            ? `✨ "Good food, great mood, zero regrets. 😋"`
            : `✨ "Captured in the frame, alive in the moment."`;
        }
      } else if (isReel) {
        if (isTamil) {
          mockResponse = isSunset
            ? `🎬 ரீல் ஹூக்:\n"வானம் நிறம் மாறும் இந்த ஒரு நொடி... 🌅"\n\n📝 தலைப்பு:\nகடற்கரை அலைகளில் மறையும் செங்கதிர் போலே, உள்ளத்தின் பாரங்களும் மெல்லக் கரைகின்றன. அமைதியான மாலை நேரம் தரும் நிம்மதி அலாதியானது.\n\n🔥 பஞ்ச் வரி:\n"அமைதியைத் தேடிப் போகத் தேவையில்லை, இந்த மாலையே போதும்."\n\n#️⃣ Hashtags:\n#SunsetReels #அந்திவானம் #கடற்கரை #தமிழ்ரீல்ஸ் #AestheticTamil\n\n📣 செயலழைப்பு:\nஇந்த அமைதியான மாலை உங்களுக்குப் பிடித்திருந்தால் சேமித்து பகிருங்கள்!`
            : isMountain
            ? `🎬 ரீல் ஹூக்:\n"மேகங்களைத் தொடும் மலைச்சிகரங்களின் நடுவே ஒரு புத்தம் புதிய பயணம்! ⛰️"\n\n📝 தலைப்பு:\nவாழ்க்கை என்பது சேருமிடம் அல்ல, வழியில் நாம் சுவாசிக்கும் காற்று. ஒவ்வொரு மலையேற்றமும் புதிய நம்பிக்கையைத் தருகிறது.\n\n🔥 பஞ்ச் வரி:\n"உயரங்கள் சவாலானவை, ஆனால் உச்சி தரும் காட்சி அற்புதம்."\n\n#️⃣ Hashtags:\n#Shorts #தமிழ் #பயணம் #மலைச்சாரல் #TravelVlog #TamilTravel\n\n📣 செயலழைப்பு:\nமுழுப் பயணத்தையும் காண சப்ஸ்கிரைப் செய்யுங்கள்!`
            : `🎬 ரீல் ஹூக்:\n"இந்த ஒரு நொடி அழகு போதுமே... ✨"\n\n📝 தலைப்பு:\nகாட்சிகள் உணர்த்தும் மெல்லிய மௌனம் கவிதையாய் மலர்கிறது. பார்த்த கணத்தில் மனதைத் தொட்ட இந்த அழகு என்றும் நிலைத்திருக்கட்டும்.\n\n🔥 பஞ்ச் வரி:\n"கண்ணில் பதிந்த காட்சி, நெஞ்சில் நிறைந்த நிம்மதி."\n\n#️⃣ Hashtags:\n#தமிழ்ரீல்ஸ் #காட்சி #கவிதை #TamilVibes\n\n📣 செயலழைப்பு:\nலைக் மற்றும் ஷேர் செய்யுங்கள்!`;
        } else if (isTanglish) {
          mockResponse = isSunset
            ? `🎬 Reel Hook:\n"POV: The sunset understood the assignment. 🌅"\n\n📝 Caption:\nSun sets, waves hit, zero worries. Konjam neram idhula immerse aana, mind-ku apdiye relief kidakkum.\n\n🔥 Short Punch Line:\n"Golden hour scenes > everything else."\n\n#️⃣ Hashtags:\n#SunsetVibes #BeachMood #GoldenHour #TanglishReels #PeaceMode\n\n📣 Call to Action:\nSave this for your next beach evening!`
            : isFood
            ? `🎬 Reel Hook:\n"Wait for that first bite... 🤤🔥"\n\n📝 Caption:\nOru plate biryani paathale appetite control panna mudiyadhu. Hot, aromatic and packed with flavor.\n\n🔥 Short Punch Line:\n"Diet tomorrow, biryani today!"\n\n#️⃣ Hashtags:\n#BiryaniLove #FoodieReel #FoodVibes #TanglishFood #WeekendTreat\n\n📣 Call to Action:\nTag that one biryani lover friend!`
            : `🎬 Reel Hook:\n"Vibe check on point! ✨"\n\n📝 Caption:\nIndha visual-oda flow paathengala? Smooth transitions and aesthetic light work.\n\n🔥 Short Punch Line:\n"Simple frames, heavy impact."\n\n#️⃣ Hashtags:\n#ReelVibes #Tanglish #CreativeContent #TrendingStyle\n\n📣 Call to Action:\nShare this with your circle!`;
        } else {
          mockResponse = isSunset
            ? `🎬 Reel Hook:\n"POV: The sunset understood the assignment. 🌅"\n\n📝 Caption:\nWhere the ocean whispers to the setting sun, stillness settles in. Catch the quiet light before it slips into the evening.\n\n🔥 Short Punch Line:\n"Some views speak louder than words."\n\n#️⃣ Hashtags:\n#SunsetVibes #GoldenHour #OceanBreeze #AestheticMinimal #ChasingSunsets\n\n📣 Call to Action:\nDouble tap if you needed this peace today!`
            : isFood
            ? `🎬 Reel Hook:\n"Every master dish begins with relentless passion. 🍴🔥"\n\n📝 Caption:\nEvery culinary masterpiece begins with discipline, heat, and unstoppable passion. Fuel the hunger, savor the glory with great food and flavor.\n\n🔥 Short Punch Line:\n"Savor every single bite."\n\n#️⃣ Hashtags:\n#FoodieReel #CulinaryCraft #TasteThePassion #ChefLife #FoodMotivation\n\n📣 Call to Action:\nSave this recipe / spot for your next food craving!`
            : isMountain
            ? `🎬 Reel Hook:\n"The climb is steep, but the view from the summit proves every drop of effort was worth it. 🏔️"\n\n📝 Caption:\nNever stop ascending. Through misty peaks and winding roads, finding stillness above the clouds.\n\n🔥 Short Punch Line:\n"Never stop climbing."\n\n#️⃣ Hashtags:\n#Shorts #ClimbHigher #MountainMindset #Focus #Relentless #Adventure\n\n📣 Call to Action:\nSubscribe for more mountain journeys!`
            : `🎬 Reel Hook:\n"A single frame that speaks a thousand words. ✨"\n\n📝 Caption:\nCaptured in the frame, alive in the moment. Visual poetry written by light and atmosphere.\n\n🔥 Short Punch Line:\n"Light and motion in harmony."\n\n#️⃣ Hashtags:\n#VisualStorytelling #CreativeVibes #Momentum #ReelCraft\n\n📣 Call to Action:\nFollow for daily creative inspirations!`;
        }
      } else if (isShorts) {
        if (isTamil) {
          mockResponse = `🎬 Title:\nமலைச்சாரலின் மௌனப் பயணம் ⛰️\n\n🔥 Hook:\nமேகங்களைத் தொடும் மலைச்சிகரங்களின் நடுவே ஒரு புத்தம் புதிய பயணம்!\n\n📝 Short Description:\nவாழ்க்கை என்பது சேருமிடம் அல்ல, வழியில் நாம் சுவாசிக்கும் காற்று. இயற்கையோடு ஒரு பயணம்.\n\n#️⃣ Hashtags:\n#Shorts #தமிழ் #பயணம் #மலைச்சாரல் #TravelVlog #TamilTravel`;
        } else {
          mockResponse = `🎬 Title:\nSummit Views Beyond The Clouds 🏔️\n\n🔥 Hook:\nThe climb is steep, but the view from the summit proves every drop of effort was worth it.\n\n📝 Short Description:\nThrough misty peaks and winding roads, finding stillness above the clouds. Never stop ascending.\n\n#️⃣ Hashtags:\n#Shorts #MountainTravel #Wanderlust #TravelDiaries #AdventureShorts #ClimbHigher`;
        }
      } else if (systemPrompt.includes('Media Type: video') || systemPrompt.includes('[MEDIA-AWARE VIDEO GENERATION REQUEST]') || (mcMatch && mcMatch[1].includes('video'))) {
        // Structured Video Response: Caption + Dialogue-style suggestion + Mood + Reason
        const isNightWalk = contextLower.includes('walk') || contextLower.includes('night') || contextLower.includes('alone') || contextLower.includes('look') || contextLower.includes('emotional');
        const isDance = contextLower.includes('dance') || contextLower.includes('choreograph') || contextLower.includes('rhythm');
        const isAction = contextLower.includes('fight') || contextLower.includes('action') || contextLower.includes('punch');
        const isRomantic = contextLower.includes('romantic') || contextLower.includes('kadhal') || contextLower.includes('love') || contextLower.includes('couple');

        if (isTamil) {
          if (isNightWalk) {
            mockResponse = `Caption:\n"திரும்பிப் பார்க்க வைத்தது பாதை இல்லை... நினைவுகள்."\n\nDialogue-style:\n"சில பிரிவுகள் முடிவல்ல... ஒரு புதிய கதையின் தொடக்கம்."\n\nMood:\nEmotional + Cinematic\n\nReason:\n"இரவு தெருவிளக்கின் ஒளியில் தனிமையான நடையும், திரும்பிப் பார்க்கும் உணர்ச்சிகரமான தருணமும் காட்சிகளில் பதிவாகியுள்ளன."`;
          } else if (isDance) {
            mockResponse = `Caption:\n"தாளமும் பாதமும் இணையும் நொடியில்... நடனம் உயிர் பெறுகிறது! 🔥"\n\nDialogue-style:\n"ஆட்டம் ஆடலாம்... ஆனா ஸ்டைல் நம்முடையதா இருக்கணும்! 🔥"\n\nMood:\nEnergetic + Vibrant\n\nReason:\n"துடிப்பான உடல் அசைவுகளும் இசைக்கேற்ப ஆடும் நடனமும் வீடியோ காட்சிகளில் தெளிவாகப் பதிவாகியுள்ளன."`;
          } else if (isAction) {
            mockResponse = `Caption:\n"அமைதியை பலவீனமாய் நினைக்காதே... புயலுக்கு முன் வரும் நிசப்தம் இது! 🔥"\n\nDialogue-style:\n"ஒரு பார்வை போதும்... கதை மாறிடும்! 🔥"\n\nMood:\nIntense + Mass\n\nReason:\n"கூரிய பார்வையும் வேகமான சண்டை அசைவுகளும் காட்சிகளில் மாஸ் உணர்வை ஏற்படுத்துகின்றன."`;
          } else if (isRomantic) {
            mockResponse = `Caption:\n"வார்த்தைகள் தேவையில்லை... உன் விழிகளின் மௌனமே எனக்குக் கவிதை. ❤️"\n\nDialogue-style:\n"உலகம் முழுக்கத் தேடிய அமைதி... உன் ஒற்றைப் புன்னகையில் கிடைத்தது."\n\nMood:\nRomantic + Poetic\n\nReason:\n"மென்மையான பார்வை பரிமாற்றமும் இயற்கை வெளிச்சத்தில் நிகழும் அருகாமையும் காட்சிகளில் பதிவாகியுள்ளன."`;
          } else if (isMountain) {
            mockResponse = `Caption:\n"உயரங்களைத் தொட எட்டிப் பார்க்கும் ஒவ்வொரு கணமும் ஒரு புதிய நம்பிக்கை. ⛰️"\n\nDialogue-style:\n"வழிகள் முடிவதில்லை... நாம் நடக்கும் தூரம் தான் மாறுகிறது."\n\nMood:\nInspirational + Adventurous\n\nReason:\n"பனிமூட்டமான சிகரங்களும் மலைப்பாதையின் பயணமும் காட்சிகளில் தெளிவாகப் பதிவாகியுள்ளன."`;
          } else {
            mockResponse = `Caption:\n"ஒவ்வொரு நகர்விலும் ஒரு கதை... காட்சியின் ஓட்டமே தனி அழகு. ✨"\n\nDialogue-style:\n"சில தருணங்கள் காலத்தால் அழியாதவை... நெஞ்சில் நிலைத்து நிற்பவை."\n\nMood:\nCinematic + Aesthetic\n\nReason:\n"காட்சிகளின் இயல்பான இயக்கமும் காட்சி அழகியலும் இக்கவிதையான வரிகளுக்குப் பொருத்தமாக அமைந்துள்ளன."`;
          }
        } else if (isTanglish) {
          if (isNightWalk) {
            mockResponse = `Caption:\n"Thirumbi paaka vechathu paadhai illa... ninaivugal thaan."\n\nDialogue-style:\n"Sila pirivugal mudivu illa... pudhu kadhaiyoda thodakkam."\n\nMood:\nEmotional + Cinematic\n\nReason:\n"Visual frames-la solitary walk and emotional look-back moment cinematic lighting-la kaatapadudhu."`;
          } else {
            mockResponse = `Caption:\n"Scene moves fast, but the vibe stays forever. ✨"\n\nDialogue-style:\n"Sila moments marakkave mudiyadhu... frames-la freeze aana magic idhu!"\n\nMood:\nCinematic + Reel Style\n\nReason:\n"The dynamic visual progression across the video frames matches this engaging tone."`;
          }
        } else {
          // English
          if (isNightWalk) {
            mockResponse = `Caption:\n"What made me look back wasn't the road... but the memories."\n\nDialogue-style:\n"Some goodbyes are not endings—they are the quiet beginning of a whole new chapter."\n\nMood:\nEmotional + Cinematic\n\nReason:\n"The frames show a solitary walk with an emotional look-back moment and cinematic night lighting."`;
          } else if (isDance) {
            mockResponse = `Caption:\n"When rhythm meets passion, every step becomes pure art. 🔥"\n\nDialogue-style:\n"Every beat has a story; our rhythm speaks for itself."\n\nMood:\nEnergetic + Vibrant\n\nReason:\n"The sampled frames capture synchronized choreography, expressive footwork, and vibrant movement."`;
          } else if (isAction) {
            mockResponse = `Caption:\n"Never mistake stillness for hesitation—it is the gathering of the storm. 🔥"\n\nDialogue-style:\n"One decisive look is enough to shift the entire narrative."\n\nMood:\nIntense + Cinematic Action\n\nReason:\n"The frames display focused intensity, rapid physical action, and dramatic shadow framing."`;
          } else if (isRomantic) {
            mockResponse = `Caption:\n"No words needed when the quietest glances speak the loudest poetry. ❤️"\n\nDialogue-style:\n"The peace I sought across the world was found in a single smile."\n\nMood:\nRomantic + Poetic\n\nReason:\n"The sampled visual frames capture intimate eye contact and tender expressions under soft natural lighting."`;
          } else if (isMountain) {
            mockResponse = `Caption:\n"The climb is steep, but the view from the summit proves every drop of effort was worth it. ⛰️"\n\nDialogue-style:\n"Paths never truly end—it is the horizon that invites us further."\n\nMood:\nInspirational + Adventurous\n\nReason:\n"The sampled frames capture an active ascent across winding mountain roads and misty summits."`;
          } else {
            mockResponse = `Caption:\n"Captured in motion, alive in the moment. ✨"\n\nDialogue-style:\n"Some moments are not measured in time, but in the impressions they leave behind."\n\nMood:\nCinematic + Aesthetic\n\nReason:\n"The visual frames show a fluid narrative progression and expressive composition."`;
          }
        }
      } else if (isTamil) {
        // Standard Tamil Captions (3 Options + Original line + Hashtags)
        if (isRain && (systemPrompt.includes('FORMAT: Poem Card') || systemPrompt.includes('கவிதை அட்டை') || systemPrompt.includes('[MODE: POEM GENERATION]'))) {
          mockResponse = `மழைத்துளி தெறிக்கும் இரவுக் கண்ணாடியில்\nஒளிர்கிறது நனைந்த தெருவின் மௌனம்!\nவிழியோரம் வழியும் துளிகளெல்லாம்\nஉன் நினைவைச் சுமந்து கவிதையாகுதே!\nகாற்றினில் தவழும் ஈர வாசம்\nகாலத்தின் சுவடை மெல்லத் துடைக்குதே!`;
        } else if (isSunset) {
          if (isFunny) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
மாலையில் அந்திச் சூரியனைப் பார்த்தால் அமைதி வருதோ இல்லையோ, உடனே பஜ்ஜியும் டீயும் தான் ஞாபகத்துக்கு வருது! 🌅☕

✨ OPTION 2 — AESTHETIC
சூரியன் மறைந்தாலும் நம் டீ ஆசை ஒருபோதும் மறைவதில்லை. 🌇

✨ OPTION 3 — CASUAL
Golden hour photo எடுக்கப் போயி, கடேசில 3 பஜ்ஜி சாப்பிட்டு வந்தாச்சு! 😋

🎬 ORIGINAL CINEMATIC LINE
"சூரியன் மறையலாம்... ஆனா பசி மறையாது!"

🏷 HASHTAGS
#சூரியஅஸ்தமனம் #மாலைநேரம் #டீடைம் #பஜ்ஜிடைம் #AestheticTamil`;
          } else if (isMass) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
கடற்கரை அலைகளில் மறையும் செங்கதிர் போலே, உள்ளத்தின் பாரங்களும் மெல்லக் கரைகின்றன. 🌅🔥

✨ OPTION 2 — AESTHETIC
வானம் நிறம் மாறினாலும்... என் இலக்கு என்றும் மாறாது. ✨

✨ OPTION 3 — CASUAL
சூரியன் அஸ்தமனம் ஆகலாம், ஆனா நம்ம ஆட்டம் இப்பதான் ஆரம்பம்! 🌊

🎬 ORIGINAL CINEMATIC LINE
"வானம் அமைதியா இருக்குறது பலவீனமில்ல... புயலுக்கான முன்னெச்சரிக்கை! 🔥"

🏷 HASHTAGS
#அந்திவானம் #கடற்கரை #மாஸ் #தமிழ் #AestheticTamil #MassCaption`;
          } else {
            mockResponse = `✨ OPTION 1 — CINEMATIC
கடற்கரை அலைகளில் மறையும் செங்கதிர் போலே, உள்ளத்தின் பாரங்களும் மெல்லக் கரைகின்றன. அமைதியான மாலை நேரம் தரும் நிம்மதி அலாதியானது. 🌅🌊

✨ OPTION 2 — AESTHETIC
அமைதியான அலைகள். பொன்மாலைச் சூரியன். நெஞ்சில் நிறையும் மெல்லிய அமைதி. ✨

✨ OPTION 3 — CASUAL
சூரிய அஸ்தமனம் + கடற்கரை காற்று = இந்த நாளின் சிறந்த தருணம்! 🌇

🎬 ORIGINAL CINEMATIC LINE
"வானம் நிறம் மாறியது... மனசும் கொஞ்சம் அமைதியானது."

🏷 HASHTAGS
#அந்திவானம் #கடற்கரை #அமைதி #தமிழ் #AestheticTamil #SunsetVibes`;
          }
        } else if (isFood) {
          mockResponse = `✨ OPTION 1 — CINEMATIC
சுடச்சுட மணக்கும் இந்த ஒரு தட்டு விருந்து, நாக்கிற்கு மட்டுமல்ல நெஞ்சிற்கும் விருந்து. 😋🔥

✨ OPTION 2 — AESTHETIC
சுவைகளின் சங்கமம். பாரம்பர்ய மணம். தட்டெல்லாம் பரவும் மகிழ்ச்சி. ✨

✨ OPTION 3 — CASUAL
ஒரு தட்டு பிரியாணி போதும்... முழு mood-யும் change ஆகிடும்! 🍲

🎬 ORIGINAL CINEMATIC LINE
"வார்த்தைகள் சொல்ல முடியாத திருப்தியை ஒரு நல்ல உணவு சொல்லிவிடும்."

🏷 HASHTAGS
#உணவுப்பிரியன் #சுவை #பிரியாணி #தமிழ் #FoodLoverTamil #Foodie`;
        } else {
          mockResponse = `✨ OPTION 1 — CINEMATIC
காட்சிகள் உணர்த்தும் மெல்லிய மௌனம் கவிதையாய் மலர்கிறது. பார்த்த கணத்தில் மனதைத் தொட்ட இந்த அழகு நிலைத்திருக்கட்டும். ✨

✨ OPTION 2 — AESTHETIC
எளிமையான காட்சி. அழுத்தமான உணர்வு. அமைதியின் பிரதிபலிப்பு. 🌿

✨ OPTION 3 — CASUAL
ஒரு அழகான காட்சி... ஆயிரம் நினைவுகள்! 📸

🎬 ORIGINAL CINEMATIC LINE
"மௌனத்திற்குள்ளும் ஓர் அழகான கவிதை ஒளிந்திருக்கிறது."

🏷 HASHTAGS
#தமிழ் #காட்சி #கவிதை #TamilVibes #AestheticTamil`;
        }
      } else if (isTanglish) {
        // Tanglish Captions (3 Options + Original line + Hashtags)
        if (isSunset) {
          if (isMass) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Scene small-ah irukkalam... Aana sunset-ku pinnadi vara impact perusu! 🌅🔥

✨ OPTION 2 — AESTHETIC
Golden hour silence speaks louder than any dialogue. ✨🌊

✨ OPTION 3 — CASUAL
Sunset paathu vibe panradhula irukura kick-ey thani thaanya. 🌇

🎬 ORIGINAL CINEMATIC LINE
"Vaanam nirama maaralaam... Namba track eppovum straight thaan! 🔥"

🏷 HASHTAGS
#SunsetVibes #BeachMood #MassDialogue #TanglishCaption #GoldenHour`;
          } else if (isFunny) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Sunset-la photo edukkanum-nu vanthu, kadaseela tea kadaila settle aagiyachu. 🌅☕

✨ OPTION 2 — AESTHETIC
Golden hour glow vs Monday morning blues: Sunset wins always! ✨

✨ OPTION 3 — CASUAL
Sunset paaka vantha, namma mind-ku automatic-ah biryani craving start aagudhu! 😋

🎬 ORIGINAL CINEMATIC LINE
"Suriyan maraiyalam... Aana tea kudikura aasa marayuma?"

🏷 HASHTAGS
#SunsetHumor #TanglishVibes #TeaTime #BeachScenes #Relatable`;
          } else {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Sunset paakumbodhu, life konjam slow-ah poganum pola irukku. Waves whispering peace. 🌅🌊

✨ OPTION 2 — AESTHETIC
Golden hour glow, cool sea breeze, zero unwanted thoughts. ✨

✨ OPTION 3 — CASUAL
Sunset + beach + silent playlist = full peace of mind. 🌇

🎬 ORIGINAL CINEMATIC LINE
"Silence has its own frequency when the sky changes color."

🏷 HASHTAGS
#SunsetVibes #GoldenHour #BeachMood #TanglishCaption #AestheticVibes`;
          }
        } else if (isFood) {
          mockResponse = `✨ OPTION 1 — CINEMATIC
Oru plate aromatic biryani... Adhula irukra flavor direct-ah soul-ku connect aagum. 😋🔥

✨ OPTION 2 — AESTHETIC
Pure culinary satisfaction on a plate. Warm, rich, and unforgettable. ✨

✨ OPTION 3 — CASUAL
Oru plate biryani podhum, day-oda full stress-um gaali! 🍲

🎬 ORIGINAL CINEMATIC LINE
"Food nalla irundha... Life nalla irukkum."

🏷 HASHTAGS
#Foodie #BiryaniVibes #TanglishFood #WeekendMood #Tasty`;
        } else {
          mockResponse = `✨ OPTION 1 — CINEMATIC
Frame paatha theriyum, idhula irukra feel-ey vera level. ✨

✨ OPTION 2 — AESTHETIC
Simple visual, pure aesthetics, positive frequency. 🌿

✨ OPTION 3 — CASUAL
Casual moment, timeless memory! 📸

🎬 ORIGINAL CINEMATIC LINE
"Moments fade, but the vibe stays forever."

🏷 HASHTAGS
#TanglishVibes #Aesthetic #VisualStory #SocialStyle`;
        }
      } else {
        // English Media-Aware Output (3 Options + Original line + Hashtags)
        if (isSunset) {
          if (isFunny) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Running toward the sunset like it's the last plate of biryani at a wedding. 🌅✨

✨ OPTION 2 — AESTHETIC
Golden hour is magnificent until you realize tomorrow morning is Monday! 🌇

✨ OPTION 3 — CASUAL
Sunset + sea breeze + zero responsibilities = the ideal evening formula. 🌊

🎬 ORIGINAL CINEMATIC LINE
"Even the sun clocks out gracefully when the day is done."

🏷 HASHTAGS
#SunsetHumor #WeekendOver #GoldenHourGlow #Relatable #SunsetVibes`;
          } else if (isMass || isMotivational) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
The sun may set on the horizon, but the ambition never sleeps. 🌅🔥

✨ OPTION 2 — AESTHETIC
Quiet confidence mirrored in the golden expanse of the ocean. ✨

✨ OPTION 3 — CASUAL
Sunsets don't ask for attention—they command the sky. 🌇

🎬 ORIGINAL CINEMATIC LINE
"Let the light fade; the vision remains crystal clear."

🏷 HASHTAGS
#SunsetVibes #GoldenHour #OceanBreeze #BoldMindset #AestheticMinimal`;
          } else {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Where the ocean whispers to the setting sun, stillness settles in. Catch the quiet light before it slips into the evening. 🌅🌊

✨ OPTION 2 — AESTHETIC
Golden hour. Quiet waves. A little peace. ✨

✨ OPTION 3 — CASUAL
Sunset + sea + zero plans = perfect evening. 🌇

🎬 ORIGINAL CINEMATIC LINE
"Some sunsets don't need a filter, just a moment worth keeping."

🏷 HASHTAGS
#SunsetVibes #GoldenHour #OceanBreeze #AestheticMinimal #ChasingSunsets`;
          }
        } else if (isFood) {
          if (isMotivational) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Every culinary masterpiece begins with discipline, heat, and unstoppable passion. Fuel the hunger, savor the glory with great food. 🍴🔥

✨ OPTION 2 — AESTHETIC
Artistry on a plate. Rich aromas, balanced textures, and pure craft. ✨

✨ OPTION 3 — CASUAL
Good food doesn't need an introduction—just an appetite! 😋

🎬 ORIGINAL CINEMATIC LINE
"When passion guides the kitchen, every flavor tells a story."

🏷 HASHTAGS
#FoodieReel #CulinaryCraft #TasteThePassion #ChefLife #FoodMotivation #FoodLover`;
          } else {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Savoring every single flavor. Good food doesn't need an introduction—just an appetite and good company. 🍕✨

✨ OPTION 2 — AESTHETIC
Flavors balanced to perfection. Warm, comforting, and deeply satisfying. 🍜

✨ OPTION 3 — CASUAL
One good meal and every worry takes a back seat. 😋

🎬 ORIGINAL CINEMATIC LINE
"Good food is the shortest route to genuine joy."

🏷 HASHTAGS
#FoodLover #FoodieGram #CulinaryDelight #FoodVibes #ComfortFood`;
          }
        } else if (isMountain) {
          if (isMotivational) {
            mockResponse = `✨ OPTION 1 — CINEMATIC
The climb is steep, but the view from the summit proves every drop of effort was worth it. Never stop ascending. 🏔️🔥

✨ OPTION 2 — AESTHETIC
Above the clouds, where silence stretches across endless horizons. ✨

✨ OPTION 3 — CASUAL
High altitudes and clear thoughts. The road goes on. 🌄

🎬 ORIGINAL CINEMATIC LINE
"Mountains don't yield to wishes; they yield to footsteps."

🏷 HASHTAGS
#Shorts #ClimbHigher #MountainMindset #Focus #Relentless #Wanderlust`;
          } else {
            mockResponse = `✨ OPTION 1 — CINEMATIC
Through misty peaks and winding roads, finding stillness above the clouds. Subscribe for the full adventure! 🏔️✨

✨ OPTION 2 — AESTHETIC
Somewhere between the road and the sky, stillness waits. 🌄

✨ OPTION 3 — CASUAL
Pack light, aim high, and let the mountains do the talking. 🗺️

🎬 ORIGINAL CINEMATIC LINE
"The journey isn't just about reaching the peak; it's about the air you breathe on the way."

🏷 HASHTAGS
#Shorts #MountainTravel #Wanderlust #TravelDiaries #AdventureShorts #Nature`;
          }
        } else if (isRain) {
          mockResponse = `✨ OPTION 1 — CINEMATIC
Raindrops drumming on neon streets, a midnight symphony of gentle beats. Reflections glimmer in amber and blue. 🌧️✨

✨ OPTION 2 — AESTHETIC
Wet asphalt glowing under street lamps. A quiet pause in the city rhythm. 🌃

✨ OPTION 3 — CASUAL
Rainy evenings, warm drinks, and watching the city slow down. ☕

🎬 ORIGINAL CINEMATIC LINE
"Rain cleanses more than the streets; it resets the soul."

🏷 HASHTAGS
#RainyNight #CityVibes #MoodyAesthetic #MidnightThoughts #RainDrops`;
        } else if (isTechDemo) {
          mockResponse = `✨ OPTION 1 — CINEMATIC
Code running in real time, turning complex prompt architectures into an intuitive creative experience. 💻🚀

✨ OPTION 2 — NATURAL / HUMAN
Seeing the project work smoothly after weeks of debugging is honestly the best feeling. Real problem-solving over hype. 💡

✨ OPTION 3 — TRENDY / SOCIAL
From idea on paper to working demo on screen. We actually built this! 🔥

🎬 ORIGINAL CINEMATIC LINE
"The best code isn't the most complex; it's the one that solves a real human problem."

🏷 HASHTAGS
#AIProject #SoftwareEngineering #TechDemo #CodingJourney #StudentDeveloper`;
        } else {
          mockResponse = `✨ OPTION 1 — CINEMATIC
Captured in the frame, alive in the moment. Visual poetry written by light, texture, and atmosphere. ✨📸

✨ OPTION 2 — AESTHETIC
Simplicity composed with intention. Quiet elegance in every detail. 🌿

✨ OPTION 3 — CASUAL
Real moments don't need a filter—just the right light. 🌇

🎬 ORIGINAL CINEMATIC LINE
"A photograph captures a moment, but the vibe stays alive."

🏷 HASHTAGS
#VisualStorytelling #CreativeVibes #Momentum #AestheticFeed #Photography`;
        }
      }
    } else if (userPrompt && userPrompt.toLowerCase().includes('exam')) {
      // Case: "exam fear" in Poem Mode without media
      if (isTamil) {
        mockResponse = `தேர்வின் பயமென்னும் இருளதனை நீக்கி\nநேர்மை அறிவென்னும் சுடரேற்றி நில்!\nஊக்கமே உன் கையில் வெற்றியின் வித்து\nதுணிவே உன் நெஞ்சில் சாதனையின் முத்து!`;
      } else {
        mockResponse = `The shadow of the test may softly loom,\nYet courage blossoms in the quiet room.\nTrust in the hours you have given deep,\nThe harvest of your wisdom you shall reap.`;
      }
    } else if (combined.includes('kanavu') || (userPrompt && userPrompt.toLowerCase().includes('dream'))) {
      if (isTamil) {
        if (systemPrompt.includes('[MODE: STORY GENERATION]')) {
          mockResponse = `நள்ளிரவின் நிசப்தத்தில் மாறன் கண்ட அந்த விசித்திரக் கனவு, வெறும் கற்பனையல்ல என்பதை அவனது மனம் ஆழமாக உணர்ந்தது. கனவில் தோன்றிய அதே பழைய கோயில் வாயில், இப்போது அவனது கண்முன்னே நிஜமாய் விரிந்திருந்தது.\n\n"இது எப்படி சாத்தியம்? நேற்றிரவு நான் கண்ட காட்சி அப்படியே என் கண்முன் நடக்கிறதே!" என்று அவன் திகைப்புடன் தனக்குள் முணுமுணுத்தான்.\n\nகனவில் ஒரு குரல் எச்சரித்த அதே தருணத்தில், பழங்கால கல் கதவின் இடுக்கிலிருந்து மர்மமான நீல ஒளி ஒன்று வெளியே கசியத் தொடங்கியது. காலத்தின் திரையைத் தாண்டி நிகழ்வுகளை முன்கூட்டியே உணர்த்திய அந்தக் கனவின் மர்மத்தை நோக்கி, மாறன் தனது முதல் அடியை எடுத்து வைத்தான். உண்மை அவனுக்காக அங்கே காத்திருந்தது.`;
        } else {
          mockResponse = `அன்று கண்ட கனவெல்லாம் நினைவாகி முன்னே நிற்க\nநின்றிருந்த நிஜமெல்லாம் மௌனமாய் விழி பேச!\nகாலத்தின் கைகளிலே சுழல்கின்ற நிகழ்வெல்லாம்\nஆழ்மனதின் முன்னுரையாய் ஆச்சரியம் தருகுதே!`;
        }
      } else {
        mockResponse = `The dream that surfaced in the dead of night was no mere illusion—it was a premonition waiting to unfold.\n\nStanding before the ancient archway, Daniel froze as the exact scene from his sleep materialized before his waking eyes.\n\n"Some dreams don't just fade with the dawn," he whispered to the wind. "They are memories of what is yet to come."`;
      }
    } else if (isTamil) {
      const hasSabari = combined.includes('sabari') || combined.includes('சபரி');
      const hasKani = combined.includes('kani') || combined.includes('கனி');
      const isLoveStory = (hasSabari && hasKani) || combined.includes('kadhal') || combined.includes('lovers') || combined.includes('காதல்');

      const toneMatch = systemPrompt.match(/TONE DIRECTIVE:\s*([^\n\r]+)/i) || (userPrompt && userPrompt.match(/"tone":\s*"([^"]+)"/i));
      const toneStr = toneMatch ? toneMatch[1].toLowerCase() : '';
      const actionMatch = userPrompt && userPrompt.match(/ACTION:\s*([^\n\r]+)/i);
      const actionStr = actionMatch ? actionMatch[1].toLowerCase() : '';

      const toneCreative = toneStr.includes('creative') || actionStr.includes('creative');
      const toneEmotional = toneStr.includes('emotion') || actionStr.includes('emotion');
      const toneHumorous = toneStr.includes('humor') || toneStr.includes('funny') || actionStr.includes('humor');
      const toneSimpler = toneStr.includes('simple') || actionStr.includes('simpl');
      const toneShorter = toneStr.includes('short') || actionStr.includes('short');
      const toneLonger = toneStr.includes('long') || actionStr.includes('long');

      if (isLoveStory) {
        const sName = hasSabari ? 'சபரி' : 'மாறன்';
        const kName = hasKani ? 'கனி' : 'நிலா';
        if (toneCreative) {
          mockResponse = `${sName}யும் ${kName}யும் கடலோர மணல்வெளியில் அமர்ந்து, எழும் அலைகளைக் கற்பனைக் கவிதைகளாக மொழிபெயர்த்துக் கொண்டிருந்தனர். அவர்களின் காதல் வெறும் வழக்கமான வார்த்தைகளில் அடங்காத ஒரு புதிய வண்ண ஓவியமாய் விரிந்தது. வானத்து மேகங்கள் அவர்களின் நினைவுகளை விண்மீன்களாய் வரைந்து கொண்டிருந்தன.`;
        } else if (toneEmotional) {
          mockResponse = `கடற்கரையின் அந்தி வெளிச்சத்தில் ${sName}யின் கைகளை மெல்லப் பிடித்தபடி ${kName} நின்றிருந்தாள். மௌனமாய் வழிந்த விழியோரத் துளிகளுக்குள் பல வருடப் பிரிவு, சொல்லப்படாத தவிப்பு மற்றும் ஆழமான அன்பு எல்லாம் ஒருங்கே உறைந்திருந்தது. "நீ என்னோடு இருக்கும் இந்த நொடி போதும்," என்றாள் அவள் குரல் தழுதழுக்க.`;
        } else if (toneHumorous) {
          mockResponse = `${sName}யும் ${kName}யும் காதலர்கள் தான், ஆனால் அந்த காதல் பெரும்பாலும் 'இன்னைக்கு என்ன சாப்பிடுறது?' என்ற சுவையான விவாதத்தில்தான் ஆரம்பமாகும்! கடற்கரையில் தீவிரமாக பேசிக்கொண்டிருந்தபோது, "என் மனசுல நீ மட்டும்தான் இருக்க" என்று ${sName} சொல்ல, "சரி முதல்ல அந்த சுண்டல் வாங்கித் தாங்க!" என்று ${kName} சிரித்தாள்.`;
        } else if (toneSimpler) {
          mockResponse = `${sName}யும் ${kName}யும் ஒருவரையொருவர் உண்மையாக நேசித்தனர். அவர்களின் அன்பு மிகவும் எளிமையானது. தினமும் ஒன்றாக நடப்பதும், மனம் விட்டுப் பேசுவதும் மட்டுமே அவர்களுக்குப் பிடித்திருந்தது.`;
        } else if (toneShorter) {
          mockResponse = `${sName}யும் ${kName}யும் கடற்கரையில் நின்றனர். அமைதியான அந்திப் பொழுதில் அவர்களின் உள்ளங்கள் அன்பால் இணைந்தன.`;
        } else if (toneLonger) {
          mockResponse = `${sName}யும் ${kName}யும் மாலை வேளையில் பழமையான துறைமுகப் பாலத்தில் அமைதியாக நடந்து கொண்டிருந்தனர். கடலின் குளிர்ந்த காற்று மெல்லிய இசையாக அவர்கள் மேல் தவழ்ந்தது. கடந்த கால நினைவுகள், அவர்கள் கடந்து வந்த சவாலான பாதைகள், ஒருவருக்கொருவர் துணையாய் நின்ற தருணங்கள் என எல்லாவற்றையும் நினைத்துப் பார்த்தனர்.\n\n"${sName}, இத்தனை தூரம் நாம் ஒன்றாக வருவோம் என்று நான் நினைக்கவே இல்லை," என்று கடலை வெறித்தபடி மெல்லிய குரலில் சொன்னாள் ${kName}.\n\nஅவன் அவளது கண்களைப் பார்த்து புன்னகைத்தான். "${kName}, தூரங்கள் மாறலாம், ஆனால் நாம் பகிர்ந்த அன்பு என்றும் மாறாது." என்றான் உறுதியோடு. அந்த மாலை அவர்களின் வாழ்வின் மறக்க முடியாத அழகான அத்தியாயமாகப் பதிவானது.`;
        } else {
          mockResponse = `${sName}யும் ${kName}யும் கடற்கரையில் நின்றனர். அந்தி வானத்தின் செவ்வொளியில் அவர்களின் காதல் அமைதியாகப் பூத்துக் குலுங்கியது. இருவரின் கண்களிலும் எதிர்காலம் பற்றிய நம்பிக்கை சுடராய் ஒளிர்ந்தது.`;
        }
      } else if (systemPrompt.includes('[MODE: POEM GENERATION]')) {
        if (systemPrompt.includes('STRUCTURAL FORM: Haiku')) {
          mockResponse = `நிலவின் மென்வெளிச்சம்\nஉன் நினைவைச் சுமந்து\nஇரவை நனைக்குதே!`;
        } else if (systemPrompt.includes('வெண்பா')) {
          mockResponse = `வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே\nகானத்து வேய்ங்குழலின் இன்னிசையும் - தானுணர்ந்து\nபாடலின்பம் பொங்கப் பரவசமாய் நின்றாட\nநாளுமெழும் தூயநல் லன்பு!`;
        } else if (toneCreative) {
          mockResponse = `விண்மீன்கள் கோர்த்தெடுத்த விசித்திர வீணையிலே\nமண்ணாளும் தென்றலது மாயங்கள் செய்யுதடி!\nகற்பனைக் குதிரையிலே காலத்தைக் கடந்தோடி\nசிற்பமாய் நெஞ்சினிலே சேர்ந்தாயே செந்தேனே!`;
        } else if (toneEmotional) {
          mockResponse = `விழியோரம் வழியும் மெல்லிய துளியினிலே\nவழிகின்ற மௌனத்தின் பாரங்கள் எத்தனைதான்!\nசொல்லாத துயரமெல்லாம் சொல்லாமல் புரிகின்ற\nஉன் அன்பின் மடியில் உலகம் மறக்குதடி!`;
        } else if (toneHumorous) {
          mockResponse = `கவிதை எழுத வந்து காலைக் காபி ஆறிப்போச்சு\nசெவி சாய்க்கும் அழகியவள் சிரிச்சுட்டே ஓடிப்போச்சு!\nவார்த்தைகள் வரலைன்னா வடையாவது வாங்கித்தாரேன்\nபார்த்து நீ சிரிச்சாத்தான் பாட்டெல்லாம் பாடிவாரேன்!`;
        } else if (toneSimpler) {
          mockResponse = `காலைத் தென்றல் வீசுது\nமனதில் அமைதி பேசுது!\nஉன் புன்னகை போதுமே\nஇந்த நாளும் இனிக்குமே!`;
        } else if (toneShorter) {
          mockResponse = `அந்தி வானம் சிவக்குது\nஅன்பு நெஞ்சில் இனிக்குது!`;
        } else if (toneLonger) {
          mockResponse = `காற்றினில் தவழும் கானகம் போலே\nதோற்றுவித்தாய் ஓர் புதுநிலா ஒளியை!\nகாதலின் ஆழம் கடலிலும் பெரிதாய்\nநெஞ்சினில் நின்றே நிலைபெறு மானே!\n\nவிண்ணின் தாரகை கண் சிமிட்டும் நேரம்\nமண்ணின் மலர்கள் மனம் மயக்கும் நறுமணம்\nஉன்னோடு வாழும் ஒவ்வொரு நொடியும்\nஎன்னோடு இணையும் அழியாத கவிதை!\n\nகாலத்தின் சுவடுகள் மாறினாலும்\nகோலத்து நிலவின் ஒளி மங்கினாலும்\nநெஞ்சத்து நினைவுகள் நீங்குவதில்லை\nஎன்றுமே நம் அன்பு குறைவதில்லை!`;
        } else {
          mockResponse = `காற்றினில் தவழும் கானகம் போலே\nதோற்றுவித்தாய் ஓர் புதுநிலா ஒளியை!\nகாதலின் ஆழம் கடலிலும் பெரிதாய்\nநெஞ்சினில் நின்றே நிலைபெறு மானே!\n\nவிண்ணின் தாரகை கண் சிமிட்டும் நேரம்\nமண்ணின் மலர்கள் மனம் மயக்கும் நறுமணம்\nஉன்னோடு வாழும் ஒவ்வொரு நொடியும்\nஎன்னோடு இணையும் அழியாத கவிதை!`;
        }
      } else if (systemPrompt.includes('[MODE: STORY GENERATION]')) {
        const isDream = combined.includes('kanavu') || combined.includes('dream') || combined.includes('கனவு');
        const isLifePrompt = combined.includes('real life') || combined.includes('nothing to happen') || combined.includes('life') || combined.includes('வாழ்க்கை');
        if (isDream) {
          mockResponse = `அன்று கண்ட கனவு மாறனின் மனதை விடிய விடிய அமைதியிழக்கச் செய்திருந்தது. கனவில் கண்ட அதே பழைய பாழடைந்த மண்டபம், அதன் சுவரில் பொறிக்கப்பட்டிருந்த விசித்திரமான மர்மக் குறியீடு... எல்லாம் நிஜத்தில் கண்முன்னே நின்றபோது அவனது உடல் சிலிர்த்தது.\n\n"இது வெறும் கனவு மட்டுமல்ல, ஏதோ ஓர் உண்மையை வெளிக்கொண்டு வர காலம் போட்ட புதிர்" என்று முணுமுணுத்தான் மாறன்.\n\nமண்டபத்தின் நடுவே இருந்த கல் தூணின் அடியில் மெல்லத் தோண்டினான். அங்கே மண்ணில் புதையுண்டிருந்த ஒரு பழங்காலத்துச் செப்பேடு அவனது கைக்குக் கிடைத்தது. கனவு சொன்ன திசை நோக்கி அவன் அடியெடுத்து வைக்க, புதிரின் முதல் முடிச்சு அவிழ்ந்தது.`;
        } else if (isLifePrompt) {
          mockResponse = `"நிஜ வாழ்க்கையில் எதுவும் நடக்காதது போல சில அமைதியான நாட்கள் நகரும்... ஆனால் அந்த அமைதியில்தான் வாழ்க்கையின் மிகப்பெரிய திருப்பங்கள் அமைதியாகக் காத்திருக்கும்" என்று நினைத்துக் கொண்டான் அர்ஜுன்.\n\nகாலை நேரத்து காபி கோப்பையுடன் பால்கனியில் நின்றிருந்த அவனுக்கு, தினசரி வழக்கமான சலிப்பு ஒருவித ஏமாற்றத்தை தந்தது. "ஏன் என் வாழ்க்கையில் மட்டும் எந்த மாற்றமும் நிகழ மாட்டேங்குது?" என்று முணுமுணுத்தான்.\n\nஅப்போது அவனது கதவு தட்டப்பட்டது. எதிர்வீட்டுச் சிறுவன் ஓடிவந்து, "அண்ணா, நீங்க தேடிக்கிட்டு இருந்த உங்க அப்பாவோட பழைய டைரி எங்க பரண்ல கிடைச்சிருக்கு!" என்று ஒரு பழமையான நோட்டுப்புத்தகத்தை நீட்டினான். அதுவரை எதுவும் நடக்காததாகத் தோன்றிய அந்தச் சாதாரண நாள், அவனது குடும்பத்தின் 20 வருட ரகசியத்தை வெளிக்கொணரும் தொடக்கப் புள்ளியானது.`;
        } else {
          const hasPallathur = combined.includes('pallathur') || combined.includes('பள்ளத்தூர்') || combined.includes('பல்லாத்தூர்');
          const hasRock = combined.includes('rock') || combined.includes('பாறை');
          const hasTemple = combined.includes('temple') || combined.includes('கோயில்') || combined.includes('கோவில்');
          const hasCollege = combined.includes('college') || combined.includes('கல்லூரி');
          const hasFarewell = combined.includes('farewell') || combined.includes('பிரிவு');

          if (hasPallathur || (hasRock && hasTemple)) {
            mockResponse = `பள்ளத்தூர் கிராமத்து பழமையான கோயில் திடலில் அன்று மாலை பெருந்திரளான மக்கள் கூடியிருந்தனர். பாறை தூக்கும் போட்டி தொடங்கும் தருணத்தில், அங்கிருந்த இளைஞனும் இளம்பெண்ணும் ஒருவரையொருவர் நம்பிக்கையோடு நோக்கினர்.\n\n"இந்த முறை நீ நிச்சயம் அந்தப் பாறையைத் தூக்கி வெல்வாய்," என்று அவள் மெல்லிய குரலில் உற்சாகப்படுத்தினாள்.\n\nஅவன் புன்னகையுடன் கைகூப்பி இறைவனை வேண்டிவிட்டு, தனது முழு பலத்தையும் ஒன்று திரட்டி அந்தப் பாறையை நோக்கி முன்னேறினான். கோயில் மணியோசையோடு கூடிய உற்சாகக் குரல்கள் விண்ணைப் பிளந்தன.`;
          } else if (hasCollege || hasFarewell) {
            mockResponse = `கல்லூரி வளாகத்தின் கடைசி நாள் பிரிவுபசார விழாவில், கடந்த கால நினைவுகள் அலை அலையாய் நெஞ்சில் மோதின.\n\n"இந்த நட்பு இத்தோடு முடிந்துவிடாது, தூரங்கள் நம்மைப் பிரிக்க முடியாது," என்று அவன் உணர்ச்சிபொங்கக் கூறினான்.\n\nகண்ணீரும் சிரிப்பும் கலந்த அந்த மாலையில், தோழமையின் ஆழம் அனைவரின் இதயங்களிலும் அழியாத சுவடுகளாய் நிலைத்தது.`;
          } else {
            mockResponse = `அந்தி மாலையின் செவ்வானம் மெல்லக் கனிந்து கொண்டிருந்தது. பழனி மலையடிவாரத்துத் தென்றல் சில்லென்று வீச, கார்த்திக் மரத்தடியில் அமைதியாக நின்றிருந்தான்.\n\n"இத்தனை நாளா எங்க போயிருந்தீங்க?" என்று கேட்டபடி கயல்விழி அவனை நோக்கி வந்தாள்.\n\nஅவன் புன்னகையுடன் திரும்பிப் பார்த்தான். "தொலைந்த கனவுகளைத் தேடிப் போனேன், ஆனா நிஜமான அமைதி இங்கதான் இருக்குனு புரிஞ்சுக்கிட்டேன்." என்றான்.\n\nஇருவரின் கண்களிலும் புரிதலின் மெல்லிய வெளிச்சம் பரவியது. காலத்தின் சுவடுகள் கடந்து, புதியதொரு தொடக்கத்தை நோக்கி அவர்கள் அடியெடுத்து வைத்தனர்.`;
          }
        }
      } else if (systemPrompt.includes('[MODE: CONTENT CREATOR]')) {
        if (systemPrompt.includes('FORMAT: Short Quote') || systemPrompt.includes('Two-line Couplet')) {
          mockResponse = `நிலாவிடம் சொல்லிய மௌன ரகசியத்தை உன் விழிகள் அறியும் முன்னே, நெஞ்சம் அன்பால் மொழிபெயர்த்து விடுகிறது!`;
        } else if (systemPrompt.includes('FORMAT: Poem Card')) {
          mockResponse = `இரவின் மடியில் நிலவின் கீதம்\nஉன் பெயரை உச்சரிக்கும் காற்று\nவிண்ணில் ஒளிரும் வெள்ளித் தாரகை\nமண்ணில் மலரும் நமது காதல்!`;
        } else {
          mockResponse = `நிலவோடு பேசிய வார்த்தைகள் உன்னைச் சேரும் நொடி ஒரு புது வசந்தம்!\n\nசொல்லத் துடித்த ஆயிரம் மௌனங்கள் உன் ஒற்றைப் புன்னகையில் மெல்லக் கரைகின்றன.\n\n#தமிழ் #கவிதை #காதல் #நிலா #மனதின்அலைகள் #தமிழ்க்கவிதை #instaTamil #TamilQuotes #TamilLiterature`;
        }
      } else {
        mockResponse = `காற்றினில் தவழும் கானகம் போலே\nதோற்றுவித்தாய் ஓர் புதுநிலா ஒளியை!\nகாதலின் ஆழம் கடலிலும் பெரிதாய்\nநெஞ்சினில் நின்றே நிலைபெறு மானே!`;
      }
    } else {
      const hasSabari = combined.includes('sabari');
      const hasKani = combined.includes('kani');
      const isLoveStory = (hasSabari && hasKani) || combined.includes('lovers') || combined.includes('love');

      const toneMatch = systemPrompt.match(/TONE DIRECTIVE:\s*([^\n\r]+)/i) || (userPrompt && userPrompt.match(/"tone":\s*"([^"]+)"/i));
      const toneStr = toneMatch ? toneMatch[1].toLowerCase() : '';
      const actionMatch = userPrompt && userPrompt.match(/ACTION:\s*([^\n\r]+)/i);
      const actionStr = actionMatch ? actionMatch[1].toLowerCase() : '';

      const toneCreative = toneStr.includes('creative') || actionStr.includes('creative');
      const toneEmotional = toneStr.includes('emotion') || actionStr.includes('emotion');
      const toneHumorous = toneStr.includes('humor') || toneStr.includes('funny') || actionStr.includes('humor');
      const toneSimpler = toneStr.includes('simple') || actionStr.includes('simpl');
      const toneShorter = toneStr.includes('short') || actionStr.includes('short');
      const toneLonger = toneStr.includes('long') || actionStr.includes('long');

      if (isLoveStory) {
        const sName = hasSabari ? 'Sabari' : 'Daniel';
        const kName = hasKani ? 'Kani' : 'Maya';
        if (toneCreative) {
          mockResponse = `${sName} and ${kName} strolled along the twilight shoreline where the tide sculpted intricate constellations into the wet amber sand. Their love felt like an unspoken language composed of quiet glances, fresh ocean mist, and vivid dreams woven under an emerald-tinted horizon.`;
        } else if (toneEmotional) {
          mockResponse = `Standing beside the restless waves, ${sName} gently held ${kName}'s hand as evening settled over the sea. Years of quiet sacrifices, gentle patience, and deep devotion surfaced in the tender silence between them. "No matter what changes," ${sName} whispered, "my home will always be with you."`;
        } else if (toneHumorous) {
          mockResponse = `${sName} and ${kName} were completely in love, though their grandest romantic debates usually revolved around who stole the last slice of pizza! As ${sName} leaned in with dramatic cinematic flair to profess his eternal devotion, ${kName} simply laughed and said, "That's very poetic, but did you remember to bring the umbrella?"`;
        } else if (toneSimpler) {
          mockResponse = `${sName} and ${kName} loved each other very much. Their bond was simple and honest. They enjoyed walking together by the beach, talking about their day, and sharing quiet moments.`;
        } else if (toneShorter) {
          mockResponse = `${sName} and ${kName} stood by the evening sea, their hearts joined in quiet love.`;
        } else if (toneLonger) {
          mockResponse = `The amber sun dipped below the horizon as ${sName} and ${kName} walked along the weathered wooden pier, listening to the rhythmic swell of the incoming tide. Over the years, they had weathered doubts, shared triumphs, and built an unshakable trust that deepened with every changing season.\n\n"Do you ever think about the day we first met?" ${kName} asked, smiling as the salt breeze stirred her hair.\n\n${sName} met her gaze with quiet tenderness. "Every single day," he answered. Looking out across the boundless water, they realized that the greatest adventure wasn't chasing distant horizons, but choosing to stand side by side through every unfolding chapter of life.`;
        } else {
          mockResponse = `${sName} and ${kName} stood by the shore as the amber sky faded into dusk, their bond steady and calm against the rolling waves.`;
        }
      } else if (systemPrompt.includes('[MODE: POEM GENERATION]')) {
        if (systemPrompt.includes('STRUCTURAL FORM: Haiku')) {
          mockResponse = `Pale moon softly glows,\nWhispering ancient secrets,\nLove stirs in the heart.`;
        } else if (toneCreative) {
          mockResponse = `Stardust entangled in the weaver's loom,\nBreathes silver lanterns through the midnight gloom.\nAn uncharted voyage where the wild winds play,\nTurning the shadows into vibrant day.`;
        } else if (toneEmotional) {
          mockResponse = `In the quiet spaces where our whispers fall,\nA tender sorrow heeds the heart's deep call.\nThrough every teardrop and each breathless plea,\nYour gentle spirit anchors peace in me.`;
        } else if (toneHumorous) {
          mockResponse = `I sat to write a deeply moving verse,\nThen spilled my tea, which made the stanza worse!\nIf rhymes escape me in the morning sun,\nAt least we shared a warm and hearty pun!`;
        } else if (toneSimpler) {
          mockResponse = `The morning brings a gentle light,\nAnd chases away the cold dark night.\nA peaceful smile upon your face,\nMakes this the warmest, sweetest place.`;
        } else if (toneShorter) {
          mockResponse = `Sunlight on the sea,\nPeace is here with me.`;
        } else if (toneLonger) {
          mockResponse = `The whispers of the midnight breeze,\nAwaken slumber in the ancient trees.\nA tapestry of golden light,\nDispels the sorrow of the night.\n\nIn every step, a truth reclaimed,\nA silent wonder yet unnamed.\nAcross the hills where rivers run,\nWe greet the promise of the sun.`;
        } else {
          mockResponse = `The whispers of the midnight breeze,\nAwaken slumber in the ancient trees.\nA tapestry of golden light,\nDispels the sorrow of the night.\n\nIn every step, a truth reclaimed,\nA silent wonder yet unnamed.`;
        }
      } else if (systemPrompt.includes('[MODE: STORY GENERATION]')) {
        const isLife = combined.includes('real life') || combined.includes('nothing to happen');
        const hasPallathur = combined.includes('pallathur');
        const hasRock = combined.includes('rock');
        const hasTemple = combined.includes('temple');
        const hasCollege = combined.includes('college');
        const hasFarewell = combined.includes('farewell');

        if (isLife) {
          mockResponse = `"Nothing ever happens in real life," Julian muttered, staring out the rain-streaked window of the coffee shop, stirring his lukewarm espresso.\n\nHe watched the familiar routine of people passing by with umbrellas, longing for even a small spark of adventure to disrupt the monotony.\n\nJust as he stood up to leave, the elderly man sitting across from him forgot a leather-bound sketchbook on the velvet bench. Julian picked it up to run after him, only to open the first page and see an intricate, hyper-realistic sketch of himself—sitting at that very table, drawn hours before he had even arrived.`;
        } else if (hasPallathur || (hasRock && hasTemple)) {
          mockResponse = `At the ancient temple grounds in Pallathur, the crowd gathered under the amber dusk for the annual rock lifting competition. The boy stood before the massive stone, exchanging a quiet glance of encouragement with the girl.\n\n"You've trained for this moment," she said softly, her belief steady and calm.\n\nTaking a deep breath, he gripped the rugged surface of the rock, feeling the weight of the moment and the quiet resolve echoing through the temple courtyards.`;
        } else if (hasCollege || hasFarewell) {
          mockResponse = `The sun set across the college quad as the farewell evening drew to a close. Years of shared laughter and late-night study sessions seemed to linger in the evening air.\n\n"Distance won't change what we built here," he promised, looking at his circle of friends.\n\nA quiet gratitude filled the space as they stepped forward into tomorrow.`;
        } else {
          mockResponse = `The autumn leaves crunched beneath Daniel's boots as the afternoon faded into lavender dusk.\n\n"You never thought you'd come back here, did you?" Maya asked, leaning against the wooden fence.\n\nDaniel gazed past the tree line toward the horizon. "I ran away thinking the world held better answers," he admitted softly, turning to meet her gaze. "Turns out, the only place that mattered was right here."\n\nA quiet understanding settled between them as nightfall embraced the valley.`;
        }
      } else if (systemPrompt.includes('[MODE: CONTENT CREATOR]')) {
        if (systemPrompt.includes('FORMAT: Short Quote')) {
          mockResponse = `Before the words could cross my lips, the silent moon had already delivered my soul to yours.`;
        } else if (systemPrompt.includes('FORMAT: Poem Card')) {
          mockResponse = `Silver light upon the streams,\nWoven into timeless dreams.\nEvery shadow fades away,\nIn the tender light of day.`;
        } else {
          mockResponse = `Whispered to the midnight moon long before the courage found my voice.\n\nSome feelings are meant to be felt in quiet reverence.\n\n#Poetry #MidnightThoughts #Moonlight #AestheticVibes #PoemOfTheDay #LoveNotes`;
        }
      } else {
        mockResponse = `The whispers of the midnight breeze,\nAwaken slumber in the ancient trees.\nA tapestry of golden light,\nDispels the sorrow of the night.\n\nIn every step, a truth reclaimed,\nA silent wonder yet unnamed.`;
      }
    }

    // Simulate streaming delay
    const words = mockResponse.split(' ');
    let fullText = '';
    for (const word of words) {
      if (signal && signal.aborted) break;
      const piece = word + ' ';
      fullText += piece;
      if (onChunk) onChunk(piece);
      await new Promise((r) => setTimeout(r, 20));
    }

    return {
      fullText,
      model: DEFAULT_MODEL,
      keyUsed: 'DEV_MOCK'
    };
  }
}

const geminiService = new GeminiService();
module.exports = geminiService;
