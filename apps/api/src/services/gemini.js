const { GoogleGenerativeAI } = require('@google/generative-ai');
const keyPool = require('./keyPool');
const { env } = require('../config/env');

const DEFAULT_MODEL = env.GEMINI_MODEL || 'gemini-3.6-flash';

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
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        keyEntry = keyPool.getKey();

        // Check if demo/mock key in dev environment without internet or valid key
        if (!keyEntry.key || keyEntry.key === 'demo-dev-key' || keyEntry.key.startsWith('your-')) {
          return await this.mockStreamGeneration({ userPrompt, systemPrompt, onChunk, signal });
        }

        const genAI = new GoogleGenerativeAI(keyEntry.key);
        const model = genAI.getGenerativeModel({
          model: DEFAULT_MODEL,
          systemInstruction: systemPrompt
        });

        // Assemble multimodal parts: media inlineData + user prompt
        const parts = [];
        if (media && media.data) {
          let rawBase64 = media.data;
          if (rawBase64.includes(';base64,')) {
            rawBase64 = rawBase64.split(';base64,')[1];
          }
          const cleanMime = (media.mimeType || '').toLowerCase().trim();
          const resolvedMime = cleanMime || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
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
        const isQuota = err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('RESOURCE_EXHAUSTED'));
        if (keyEntry) {
          keyPool.reportFailure(keyEntry, isQuota, err.message);
        }

        if (attempts >= maxAttempts) {
          throw err;
        }
        console.warn(`[GeminiService] Attempt ${attempts} failed (${err.message}). Retrying with next key...`);
      }
    }
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
    const isTamil = systemPrompt.includes('TARGET = TAMIL') || systemPrompt.includes('Tamil (தமிழ்)') || systemPrompt.includes('வெண்பா');
    let mockResponse = '';

    const hasMedia = systemPrompt.includes('VISUAL MEDIA CONTEXT');
    const combined = (systemPrompt + ' ' + (userPrompt || '')).toLowerCase();

    // Check for media-aware generation mock cases
    if (hasMedia) {
      const isFunny = combined.includes('funny') || combined.includes('humor');
      const isMotivational = combined.includes('motivat') || combined.includes('bold');
      const isSunset = combined.includes('sunset') || combined.includes('beach') || combined.includes('ocean');
      const isFood = combined.includes('food') || combined.includes('restaurant') || combined.includes('dish');
      const isMountain = combined.includes('mountain') || combined.includes('travel') || combined.includes('road');
      const isRain = combined.includes('rain') || combined.includes('street') || combined.includes('night');

      if (isTamil) {
        if (isRain && (systemPrompt.includes('FORMAT: Poem Card') || systemPrompt.includes('கவிதை அட்டை') || systemPrompt.includes('[MODE: POEM GENERATION]'))) {
          mockResponse = `மழைத்துளி தெறிக்கும் இரவுக் கண்ணாடியில்\nஒளிர்கிறது நனைந்த தெருவின் மௌனம்!\nவிழியோரம் வழியும் துளிகளெல்லாம்\nஉன் நினைவைச் சுமந்து கவிதையாகுதே!\nகாற்றினில் தவழும் ஈர வாசம்\nகாலத்தின் சுவடை மெல்லத் துடைக்குதே!`;
        } else if (isMountain) {
          mockResponse = `மேகங்களைத் தொடும் மலைச்சிகரங்களின் நடுவே ஒரு புத்தம் புதிய பயணம்!\n\nவாழ்க்கை என்பது சேருமிடம் அல்ல, வழியில் நாம் சுவாசிக்கும் காற்று.\n\nமுழுப் பயணத்தையும் காண சப்ஸ்கிரைப் செய்யுங்கள்!\n\n#Shorts #தமிழ் #பயணம் #மலைச்சாரல் #TravelVlog #TamilTravel`;
        } else if (isSunset) {
          mockResponse = isFunny
            ? `மாலையில் அந்திச் சூரியனைப் பார்த்தால் அமைதி வருதோ இல்லையோ, உடனே பஜ்ஜியும் டீயும் தான் ஞாபகத்துக்கு வருது!\n\n#சூரியஅஸ்தமனம் #மாலைநேரம் #டீடைம்`
            : `கடற்கரை அலைகளில் மறையும் செங்கதிர் போலே, உள்ளத்தின் பாரங்களும் மெல்லக் கரைகின்றன.\n\nஅமைதியான மாலை நேரம் தரும் நிம்மதி அலாதியானது.\n\n#அந்திவானம் #கடற்கரை #அமைதி #தமிழ் #AestheticTamil`;
        } else {
          mockResponse = `காட்சிகள் உணர்த்தும் மெல்லிய மௌனம் கவிதையாய் மலர்கிறது!\n\nபார்த்த கணத்தில் மனதைத் தொட்ட இந்த அழகு என்றும் நிலைத்திருக்கட்டும்.\n\n#தமிழ் #காட்சி #கவிதை #TamilVibes`;
        }
      } else {
        // English media-aware outputs
        if (isSunset) {
          if (isFunny) {
            mockResponse = `Running toward the sunset like it's the last plate of biryani at a wedding.\n\nGolden hour is magnificent until you realize tomorrow morning is Monday!\n\n#SunsetHumor #WeekendOver #GoldenHourGlow #Relatable`;
          } else {
            mockResponse = `Where the ocean whispers to the setting sun, stillness settles in.\n\nCatch the quiet light before it slips into the evening.\n\n#SunsetVibes #GoldenHour #OceanBreeze #AestheticMinimal #ChasingSunsets`;
          }
        } else if (isFood) {
          if (isMotivational) {
            mockResponse = `Every culinary masterpiece begins with discipline, heat, and unstoppable passion.\n\nFuel the hunger. Savor the glory.\n\n#FoodieReel #CulinaryCraft #TasteThePassion #ChefLife #FoodMotivation`;
          } else {
            mockResponse = `Savoring every single flavor.\n\nGood food doesn't need an introduction—just an appetite.\n\n#FoodLover #FoodieGram #CulinaryDelight`;
          }
        } else if (isMountain) {
          if (isMotivational) {
            mockResponse = `The climb is steep, but the view from the summit proves every drop of effort was worth it.\n\nNever stop ascending.\n\n#Shorts #ClimbHigher #MountainMindset #Focus #Relentless`;
          } else {
            mockResponse = `Through misty peaks and winding roads, finding stillness above the clouds.\n\nSubscribe for the full adventure!\n\n#Shorts #MountainTravel #Wanderlust #TravelDiaries #AdventureShorts`;
          }
        } else if (isRain) {
          mockResponse = `Raindrops drumming on neon streets,\nA midnight symphony of gentle beats.\nThe reflections glimmer in amber and blue,\nEvery quiet step brings thoughts of you.\n\n#RainyNight #CityVibes #MoodyAesthetic #MidnightThoughts`;
        } else {
          mockResponse = `Captured in the frame, alive in the moment.\n\nVisual poetry written by light and atmosphere.\n\n#VisualStorytelling #CreativeVibes #Momentum`;
        }
      }
    } else if (userPrompt.toLowerCase().includes('exam') && userPrompt.toLowerCase().includes('fear')) {
      // Case 5: "exam fear" in Poem Mode without media
      if (isTamil) {
        mockResponse = `தேர்வின் பயமென்னும் இருளதனை நீக்கி\nநேர்மை அறிவென்னும் சுடரேற்றி நில்!\nஊக்கமே உன் கையில் வெற்றியின் வித்து\nதுணிவே உன் நெஞ்சில் சாதனையின் முத்து!`;
      } else {
        mockResponse = `The shadow of the test may softly loom,\nYet courage blossoms in the quiet room.\nTrust in the hours you have given deep,\nThe harvest of your wisdom you shall reap.`;
      }
    } else if (isTamil) {
      if (systemPrompt.includes('[MODE: POEM GENERATION]')) {
        if (systemPrompt.includes('STRUCTURAL FORM: Haiku')) {
          mockResponse = `நிலவின் மென்வெளிச்சம்\nஉன் நினைவைச் சுமந்து\nஇரவை நனைக்குதே!`;
        } else if (systemPrompt.includes('வெண்பா')) {
          mockResponse = `வானத்து வெண்மதியைக் கண்டுமகிழ் நெஞ்சமே\nகானத்து வேய்ங்குழலின் இன்னிசையும் - தானுணர்ந்து\nபாடலின்பம் பொங்கப் பரவசமாய் நின்றாட\nநாளுமெழும் தூயநல் லன்பு!`;
        } else {
          mockResponse = `காற்றினில் தவழும் கானகம் போலே\nதோற்றுவித்தாய் ஓர் புதுநிலா ஒளியை!\nகாதலின் ஆழம் கடலிலும் பெரிதாய்\nநெஞ்சினில் நின்றே நிலைபெறு மானே!\n\nவிண்ணின் தாரகை கண் சிமிட்டும் நேரம்\nமண்ணின் மலர்கள் மனம் மயக்கும் நறுமணம்\nஉன்னோடு வாழும் ஒவ்வொரு நொடியும்\nஎன்னோடு இணையும் அழியாத கவிதை!`;
        }
      } else if (systemPrompt.includes('[MODE: STORY GENERATION]')) {
        mockResponse = `அந்தி மாலையின் செவ்வானம் மெல்லக் கனிந்து கொண்டிருந்தது. பழனி மலையடிவாரத்துத் தென்றல் சில்லென்று வீச, கார்த்திக் மரத்தடியில் அமைதியாக நின்றிருந்தான்.\n\n"இத்தனை நாளா எங்க போயிருந்தீங்க?" என்று கேட்டபடி கயல்விழி அவனை நோக்கி வந்தாள்.\n\nஅவன் புன்னகையுடன் திரும்பிப் பார்த்தான். "தொலைந்த கனவுகளைத் தேடிப் போனேன், ஆனா நிஜமான அமைதி இங்கதான் இருக்குனு புரிஞ்சுக்கிட்டேன்." என்றான்.\n\nஇருவரின் கண்களிலும் புரிதலின் மெல்லிய வெளிச்சம் பரவியது. காலத்தின் சுவடுகள் கடந்து, புதியதொரு தொடக்கத்தை நோக்கி அவர்கள் அடியெடுத்து வைத்தனர்.`;
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
      if (systemPrompt.includes('[MODE: POEM GENERATION]')) {
        if (systemPrompt.includes('STRUCTURAL FORM: Haiku')) {
          mockResponse = `Pale moon softly glows,\nWhispering ancient secrets,\nLove stirs in the heart.`;
        } else {
          mockResponse = `The whispers of the midnight breeze,\nAwaken slumber in the ancient trees.\nA tapestry of golden light,\nDispels the sorrow of the night.\n\nIn every step, a truth reclaimed,\nA silent wonder yet unnamed.`;
        }
      } else if (systemPrompt.includes('[MODE: STORY GENERATION]')) {
        mockResponse = `The autumn leaves crunched beneath Daniel's boots as the afternoon faded into lavender dusk.\n\n"You never thought you'd come back here, did you?" Maya asked, leaning against the wooden fence.\n\nDaniel gazed past the tree line toward the horizon. "I ran away thinking the world held better answers," he admitted softly, turning to meet her gaze. "Turns out, the only place that mattered was right here."\n\nA quiet understanding settled between them as nightfall embraced the valley.`;
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
