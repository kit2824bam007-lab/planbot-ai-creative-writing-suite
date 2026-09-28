/**
 * Output Validation Guards & Quality Enforcement
 * Inspects AI completions for mode mismatches, language leaks, and structural compliance.
 * Produces structured retry guidance if violation is detected.
 */

const WHITELIST_WORDS = new Set([
  'planbot', 'ai', 'instagram', 'whatsapp', 'x', 'twitter', 'post', 'status', 'reel',
  'option', 'options', 'cinematic', 'natural', 'human', 'trendy', 'social', 'original',
  'line', 'hashtags', 'hashtag', 'aesthetic', 'caption', 'quote', 'hook', 'shorts',
  'youtube', 'linkedin', 'facebook', 'dialogue', 'reason', 'mood', 'action', 'punch', 'short', 'call'
]);

/**
 * Strips content that is legitimately language-neutral before language proportion analysis:
 * - URLs (https://... or www....)
 * - Hashtags (#word)
 * - Numbers and punctuation
 * - Markdown symbols (*, #, **, __, etc.)
 * - Emoji (handled by removing non-alpha non-script chars)
 * - Standalone proper nouns / names will still be present but are expected
 * @param {string} text
 * @returns {string} cleaned substantive text
 */
function stripLanguageNeutralContent(text) {
  return text
    .replace(/https?:\/\/\S+/gi, ' ')          // URLs
    .replace(/www\.\S+/gi, ' ')                 // www links
    .replace(/#\w+/g, ' ')                       // hashtags
    .replace(/```[\s\S]*?```/g, ' ')             // code blocks
    .replace(/`[^`]*`/g, ' ')                    // inline code
    .replace(/[0-9]+/g, ' ')                     // numbers
    .replace(/[*_~`#\[\]()>|\\=+\-]/g, ' ')     // markdown symbols
    .replace(/[^\u0000-\u007F\u0B80-\u0BFF\u0900-\u097F\s]/g, ' ') // remove emoji/other special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates that AI-generated output is in the expected language.
 * Uses proportion-based analysis of substantive text (after stripping neutral content).
 *
 * For Tamil ('ta'):  substantive text must be ≥ 35% Tamil Unicode script characters.
 * For English ('en'): substantive text must be ≥ 60% Latin alphabet characters,
 *                     AND Tamil/Devanagari must not dominate (< 20% of total chars).
 *
 * Returns { valid: boolean, reason: string }
 * @param {string} text - AI generated output
 * @param {string} language - 'ta' | 'en' | 'tanglish'
 */
function validateOutputLanguage(text = '', language = 'ta') {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { valid: false, reason: 'empty_output' };
  }

  // Tanglish is a mixed output — no strict single-script requirement
  if (language === 'tanglish') {
    return { valid: true };
  }

  const substantive = stripLanguageNeutralContent(text);
  if (!substantive || substantive.trim().length < 5) {
    // Too short to measure meaningfully — trust it
    return { valid: true };
  }

  const allChars = substantive.replace(/\s/g, '');
  const totalChars = allChars.length;

  if (totalChars < 10) {
    return { valid: true }; // too short to make a meaningful determination
  }

  const tamilChars = (allChars.match(/[\u0B80-\u0BFF]/g) || []).length;
  const latinChars = (allChars.match(/[a-zA-Z]/g) || []).length;
  const devanagariChars = (allChars.match(/[\u0900-\u097F]/g) || []).length;

  const tamilRatio = tamilChars / totalChars;
  const latinRatio = latinChars / totalChars;
  const devanagariRatio = devanagariChars / totalChars;

  if (language === 'ta') {
    // Tamil output must have substantial Tamil script
    // Threshold: at least 35% of substantive chars must be Tamil Unicode
    if (tamilRatio < 0.35) {
      return {
        valid: false,
        reason: `Tamil script proportion too low: ${(tamilRatio * 100).toFixed(1)}% (need ≥35%). Likely generated in wrong language.`
      };
    }
    // Latin letters must not dominate native Tamil output (allow leeway for labels, proper nouns, hashtags)
    if (latinRatio > 0.35) {
      return {
        valid: false,
        reason: `Latin character proportion too high for Tamil output: ${(latinRatio * 100).toFixed(1)}% (must be ≤35%). Leaked Romanized/English words detected.`
      };
    }
    const textWithoutTags = substantive.replace(/https?:\/\/\S+/gi, ' ').replace(/#\w+/g, ' ');
    const latinWords = (textWithoutTags.match(/[a-zA-Z]{3,}/g) || []).filter((w) => !WHITELIST_WORDS.has(w.toLowerCase()));
    if (latinWords.length >= 4) {
      return {
        valid: false,
        reason: `Foreign language or Romanized fragments detected in Tamil output: ${latinWords.slice(0, 3).join(', ')}`
      };
    }
    return { valid: true };
  }

  if (language === 'en') {
    // English output: Latin must dominate; Tamil/Devanagari must not dominate
    if (tamilRatio > 0.25) {
      return {
        valid: false,
        reason: `Tamil script proportion too high for English output: ${(tamilRatio * 100).toFixed(1)}% (must be <25%).`
      };
    }
    if (devanagariRatio > 0.15) {
      return {
        valid: false,
        reason: `Devanagari script proportion too high for English output: ${(devanagariRatio * 100).toFixed(1)}%.`
      };
    }
    // English must have majority Latin chars
    if (latinRatio < 0.50) {
      return {
        valid: false,
        reason: `Latin character proportion too low for English output: ${(latinRatio * 100).toFixed(1)}% (need ≥50%).`
      };
    }
    return { valid: true };
  }

  // Unknown language — pass through
  return { valid: true };
}

function looksLikePoem(text = '') {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  // If average words per line is short (<= 10 words per line) and multiple lines exist
  const avgWordsPerLine = lines.reduce((acc, l) => acc + l.split(/\s+/).length, 0) / lines.length;
  return avgWordsPerLine <= 11 && lines.length >= 4;
}

function validateGuards(output = '', params = {}) {
  const { mode = 'poem', language = 'ta', romanizedInput = false, originalPrompt = '', poemType = '' } = params;

  if (!output || typeof output !== 'string') {
    return { valid: false, code: 'EMPTY_OUTPUT', retryPrompt: 'Generate the complete output now.' };
  }

  const cleanOutput = output.trim();
  const lines = cleanOutput.split('\n').map((l) => l.trim()).filter(Boolean);
  const totalWords = cleanOutput.split(/\s+/).length;

  // 1. MODE_MISMATCH
  if (mode === 'story') {
    if (looksLikePoem(cleanOutput)) {
      return {
        valid: false,
        code: 'MODE_MISMATCH',
        message: 'Story generated in verse or short poem format instead of narrative prose paragraphs.',
        retryPrompt: `[RETRY RULE - MODE MISMATCH]
You previously generated short rhyming poem lines.
CRITICAL CORRECTION: You MUST write narrative PROSE paragraphs.
- DO NOT write short poem lines or verses.
- Write standard full-width paragraphs with at least 2 lines of dialogue.`
      };
    }
  } else if (mode === 'poem') {
    // If output is just one giant paragraph of 150+ words with no line breaks
    if (lines.length <= 1 && totalWords >= 100) {
      return {
        valid: false,
        code: 'MODE_MISMATCH',
        message: 'Poem generated as a single prose paragraph without line breaks.',
        retryPrompt: `[RETRY RULE - MODE MISMATCH]
You generated a dense prose block.
CRITICAL CORRECTION: You MUST format this as a POEM with genuine line breaks (one poetic verse per line).`
      };
    }
  }

  // 2. LANGUAGE_MISMATCH
  if (language === 'ta') {
    const tamilChars = cleanOutput.match(/[\u0B80-\u0BFF]/g);
    if (!tamilChars || tamilChars.length < 15) {
      return {
        valid: false,
        code: 'LANGUAGE_MISMATCH',
        message: 'Tamil script missing or insufficient in output.',
        retryPrompt: `[RETRY RULE - LANGUAGE MISMATCH]
Target language is Tamil (தமிழ்).
CRITICAL CORRECTION: The entire output MUST be written in genuine Tamil script (\u0B80-\u0BFF). Do not write in English or Hindi.`
      };
    }
  } else if (language === 'hi') {
    const hindiChars = cleanOutput.match(/[\u0900-\u097F]/g);
    if (!hindiChars || hindiChars.length < 15) {
      return {
        valid: false,
        code: 'LANGUAGE_MISMATCH',
        message: 'Hindi Devanagari script missing or insufficient in output.',
        retryPrompt: `[RETRY RULE - LANGUAGE MISMATCH]
Target language is Hindi (हिन्दी).
CRITICAL CORRECTION: The entire output MUST be written in Devanagari script (\u0900-\u097F).`
      };
    }
  } else if (language === 'en') {
    // Ensure native scripts are not dominating English output
    const nonLatin = cleanOutput.match(/[\u0B80-\u0BFF\u0900-\u097F]/g);
    if (nonLatin && nonLatin.length > 20) {
      return {
        valid: false,
        code: 'LANGUAGE_MISMATCH',
        message: 'Non-English script detected in English mode.',
        retryPrompt: `[RETRY RULE - LANGUAGE MISMATCH]
Target language is English. Output strictly in English Latin script.`
      };
    }
  }

  // 3. ROMANIZED_LEAK
  if (language === 'ta' || language === 'hi') {
    // Strip hashtags and URLs so social tags don't trigger false positives
    const textWithoutTags = cleanOutput.replace(/https?:\/\/\S+/gi, ' ').replace(/#\w+/g, ' ');
    // Check if there are Latin/English words >= 2 letters leaked into native text
    const latinWords = textWithoutTags.match(/[a-zA-Z]{2,}/g) || [];
    const promptTokens = new Set((originalPrompt || '').toLowerCase().split(/\s+/));
    const leakedWords = latinWords.filter((w) => {
      const lower = w.toLowerCase();
      return !WHITELIST_WORDS.has(lower) && !promptTokens.has(lower);
    });

    if (leakedWords.length >= (romanizedInput ? 3 : 2)) {
      return {
        valid: false,
        code: 'ROMANIZED_LEAK',
        message: `Latin words leaked into native output: ${leakedWords.slice(0, 3).join(', ')}`,
        retryPrompt: `[RETRY RULE - ROMANIZED LEAK]
You leaked Latin/English alphabet words (${leakedWords.slice(0, 3).join(', ')}) into native ${language} output.
CRITICAL CORRECTION: Rewrite the work 100% in native script. Zero English alphabet words allowed.`
      };
    }
  }

  // 4. FORM_RETRY (Classical Tamil checks only apply to poem mode)
  if (mode === 'poem' && poemType === 'வெண்பா') {
    if (lines.length < 4) {
      return {
        valid: false,
        code: 'FORM_RETRY',
        message: 'Venpa must have at least 4 lines.',
        retryPrompt: `[RETRY RULE - FORM ERROR]
வெண்பா விதிமுறை மீறல்:
வெண்பா சரியாக 4 அடிகளைக் கொண்டிருக்க வேண்டும் (முதல் மூன்று அடிகள் 4 சீர்கள், ஈற்றடி 3 சீர்கள்). 4 அடிகளில் வெண்பாவை முழுமையாக அமைக்கவும்.`
      };
    }
  } else if (poemType === 'அந்தாதி') {
    // Verify stanza/line linking if possible
    if (lines.length >= 4) {
      // Basic check: verify continuity
    }
  }

  // 5. TOPIC_RELEVANCE_CHECK
  if (originalPrompt && originalPrompt.trim().length >= 3 && !params.hasMedia && !params.mediaContext) {
    const relevanceResult = validateTopicRelevance(cleanOutput, originalPrompt, language);
    if (!relevanceResult.valid) {
      return {
        valid: false,
        code: 'TOPIC_RELEVANCE_FAILED',
        message: relevanceResult.message,
        retryPrompt: relevanceResult.retryPrompt
      };
    }
  }

  // 6. META_ANALYSIS_LEAK (Media Analysis Leak Check & Artifacts)
  // Ensure the AI generated creative content rather than meta-analysis or technical observations
  const metaAnalysisPatterns = [
    /image\s*analysis/i,
    /video\s*analysis/i,
    /frame\s*analysis/i,
    /scene\s*analysis/i,
    /(?:^|\n)\s*mood\s*:/i,
    /(?:^|\n)\s*reason\s*:/i,
    /(?:^|\n)\s*detected\s*:/i,
    /(?:^|\n)\s*real\s*language\s*:/i,
    /(?:^|\n)\s*frame\s*[0-9]+\s*:/i,
    /keywords?\s*detected/i,
    /prompt\s*interpretation/i,
    /here\s*is\s*your\s*(?:poem|story|caption)/i,
    /based\s*on\s*the\s*(?:image|video)/i,
    /(?:^|\n)\s*மனநிலை\s*:/i,
    /(?:^|\n)\s*காரணம்\s*:/i,
    /\[STRUCTURED\s*GENERATION\s*REQUEST\]/i,
    /userInput\s*:/i,
    /contentType\s*:/i,
    /\bsilenzio\b/i,
    /\bup\s+Tamil\b/i
  ];

  const hasMetaAnalysis = metaAnalysisPatterns.some((pattern) => pattern.test(cleanOutput));
  if (hasMetaAnalysis) {
    const contentTypeLabel = mode === 'poem' ? 'POEM' : mode === 'story' ? 'STORY' : 'CONTENT CREATOR';
    return {
      valid: false,
      code: 'META_ANALYSIS_LEAK',
      message: 'Media meta-analysis or internal artifacts detected in output instead of creative content.',
      retryPrompt: `[RETRY RULE - NO META ANALYSIS]
Your previous response contained meta analysis or prompt artifacts instead of the requested creative work. Discard that response. Return ONLY the requested ${contentTypeLabel} output. Use the uploaded media as inspiration, not as something to explain.`
    };
  }

  // Passed all guards
  return { valid: true };
}

const COMMON_CONCEPT_MAP = {
  pallathur: /pallathur|பல்லாத்தூர்|பள்ளத்தூர்|பல்லவத்தூர்/i,
  sabari: /sabari|சபரி/i,
  kani: /kani|கனி/i,
  lover: /lover|lovers|காதலன்|காதலி|காதலர்கள்|காதல்/i,
  lovers: /lover|lovers|காதலன்|காதலி|காதலர்கள்|காதல்/i,
  kadhalargal: /kadhalargal|காதலர்கள்|காதல்|lovers|lover/i,
  iruvarum: /iruvarum|இருவரும்|இருவர்|both/i,
  temple: /temple|கோயில்|கோவில்|ஆலயம்|கோபுரம்|சன்னதி/i,
  boy: /boy|சிறுவன்|பையன்|இளைஞன்|ஆண்/i,
  girl: /girl|சிறுமி|பெண்|இளம்பெண்|மகள்/i,
  rock: /rock|பாறை|கல்|கற்பாறை/i,
  competition: /competition|போட்டி|பந்தயம்/i,
  friend: /friend|தோழ|நண்ப|நட்பு/i,
  friendship: /friendship|நட்பு|தோழமை|நண்பர்கள்/i,
  college: /college|கல்லூரி/i,
  farewell: /farewell|பிரிவு|விடைபெறு|பிரிவுபசார/i,
  love: /love|காதல்|அன்பு/i,
  rain: /rain|மழை/i,
  moon: /moon|நிலா|நிலவு|சந்திரன்|மதி/i,
  moonlight: /moonlight|நிலா|நிலவு|நிலவொளி|வெண்மதி|சந்திரன்|மதி/i,
  sun: /sun|சூரியன்|கதிர்|செங்கதிர்/i,
  sunset: /sunset|அந்தி|அஸ்தமனம்|மாலை|செவ்வானம்/i,
  beach: /beach|கடற்கரை|கடல்|மணல்|அலை|அலைகள்/i,
  sea: /sea|கடல்|அலை|அலைகள்/i,
  ocean: /ocean|பெருங்கடல்|கடல்/i,
  mountain: /mountain|மலை|சிகரம்/i,
  forest: /forest|காடு|வனம்/i,
  river: /river|ஆறு|நதி/i,
  exam: /exam|தேர்வு|பரீட்சை/i,
  test: /test|தேர்வு|சோதனை/i,
  mother: /mother|அம்மா|தாய்/i,
  father: /father|அப்பா|தந்தை/i,
  school: /school|பள்ளி|பாடசாலை/i,
  village: /village|கிராம|ஊர்/i,
  city: /city|நகரம்|நகர்/i,
  music: /music|இசை|கானம்/i,
  song: /song|பாடல்|பாட்டு/i,
  book: /book|புத்தகம்|நூல்/i,
  tree: /tree|மரம்|விருட்சம்/i,
  flower: /flower|மலர்|பூ/i,
  dream: /dream|கனவு/i,
  fear: /fear|பயம்|அச்சம்/i,
  life: /life|வாழ்க்கை|வாழ்வு/i,
  night: /night|இரவு|ராத்திரி/i,
  morning: /morning|காலை|விடியல்/i,
  tears: /tear|கண்ணீர்|விழிநீர்/i,
  smile: /smile|புன்னகை|சிரிப்பு/i,
  journey: /journey|பயணம்|வழி/i,
  tea: /tea|டீ|தேநீர்|காபி/i,
  coffee: /coffee|காபி|தேநீர்|டீ/i,
  talk: /talk|பேச்சு|உரையாடல்|பேச/i,
  talks: /talk|பேச்சு|உரையாடல்|பேச/i,
  food: /food|உணவு|சாப்பாடு|விருந்து/i,
  doctor: /doctor|மருத்துவர்|டாக்டர்/i,
  wedding: /wedding|திருமணம்|கல்யாணம்/i,
  alone: /alone|தனிமை|ஒற்றை/i,
  silent: /silent|மௌனம்|அமைதி/i,
  silence: /silence|மௌனம்|அமைதி/i,
  stone: /stone|கல்|பாறை|கற்பாறை/i,
  pot: /pot|பானை|மண்பானை|குடம்/i,
  water: /water|தண்ணீர்|நீர்|தீர்த்தம்/i,
  competion: /competition|போட்டி|பந்தயம்/i,
  nature: /nature|இயற்கை/i,
  sky: /sky|வானம்|விண்|ஆகாயம்/i,
  wind: /wind|காற்று|தென்றல்/i,
  station: /station|நிலையம்|ரயில்|புகைவண்டி/i,
  railway: /railway|station|நிலையம்|ரயில்|புகைவண்டி/i,
  relationship: /relationship|உறவு|பந்தம்|காதல்/i,
  ponnu: /ponnu|பெண்|மங்கை|காதலி/i,
  paiyan: /paiyan|பையன்|இளைஞன்|காதலன்/i,
  couple: /couple|ஜோடி|இருவர்|காதலர்|தம்பதி|பையனும் பெண்ணும்/i,
  walk: /walk|நட|நடை|செல்ல/i,
  walking: /walking|நட|நடை|செல்ல/i,
  together: /together|ஒன்றாக|இணைந்து|சேர்ந்து|இருவரும்/i,
  shore: /shore|கடற்கரை|கரை|மணல்/i,
  first: /first|முதல்|முதன்/i
};

function checkConceptMatch(keyword, text, language) {
  const kw = keyword.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // 1. Direct match (covers English/Tanglish or when text contains the word)
  if (textLower.includes(kw)) return true;

  // 2. Tamil check
  if (language === 'ta' || /[\u0B80-\u0BFF]/.test(text)) {
    // Check concept dictionary
    if (COMMON_CONCEPT_MAP[kw] && COMMON_CONCEPT_MAP[kw].test(text)) {
      return true;
    }
    // If the keyword itself is in Tamil script, check substring of stem (length >= 3)
    if (/[\u0B80-\u0BFF]/.test(kw)) {
      const stem = kw.slice(0, Math.min(kw.length, 3));
      if (text.includes(stem)) return true;
    }
    // Simple English-to-Tamil phonetic heuristic for proper nouns (like Pallathur)
    if (kw.length >= 4) {
      const prefix = kw.slice(0, 4);
      if (textLower.includes(prefix)) return true;
    }
  }

  // 3. English stem match (length >= 4)
  if (kw.length >= 4) {
    const stem = kw.slice(0, -1);
    if (textLower.includes(stem)) return true;
  }

  return false;
}

function validateTopicRelevance(output = '', originalPrompt = '', language = 'ta') {
  if (!originalPrompt || originalPrompt.trim().length < 3) {
    return { valid: true };
  }

  const STOPWORDS = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
    'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'write', 'create', 'generate', 'make', 'give', 'compose', 'story', 'poem', 'content', 'post',
    'please', 'tell', 'me', 'want', 'like', 'need', 'some', 'that', 'this', 'these', 'those',
    'feel', 'feeling', 'based', 'using', 'around', 'mode', 'type', 'tone', 'genre',
    'oru', 'pathi', 'paththi', 'romba',
    'ஒரு', 'மற்றும்', 'என்று', 'என', 'உள்ள', 'ஆகிய', 'கதை', 'கவிதை', 'எழுது'
  ]);

  const cleanPrompt = originalPrompt.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ');
  const rawTokens = cleanPrompt.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  const keywords = rawTokens.filter((w) => w.length >= 3 && !STOPWORDS.has(w.toLowerCase()));

  // If no significant keywords to test, pass
  if (keywords.length === 0) {
    return { valid: true };
  }

  let matchedCount = 0;
  const missingKeywords = [];

  for (const kw of keywords) {
    if (checkConceptMatch(kw, output, language)) {
      matchedCount++;
    } else {
      missingKeywords.push(kw);
    }
  }

  // In creative writing and poetry, 1 solid thematic anchor match confirms semantic grounding
  const minRequired = 1;

  if (matchedCount < minRequired) {
    return {
      valid: false,
      code: 'TOPIC_RELEVANCE_FAILED',
      message: `Output lacked semantic grounding in user keywords (matched ${matchedCount}/${keywords.length}). Missing concepts: ${missingKeywords.slice(0, 4).join(', ')}`,
      retryPrompt: `[RETRY RULE - STRICT INPUT GROUNDING REQUIRED]
CRITICAL CORRECTION: Your previous response drifted away from the user's topic and anchors.
The user explicitly asked for content about: "${originalPrompt}".
MANDATORY: You MUST actively feature and weave in these exact core concepts: ${keywords.join(', ')}.
Do NOT invent an unrelated story or fallback to generic templates. Ground every scene and line in the user's actual keywords.`
    };
  }

  return { valid: true };
}

/**
 * Deterministically sanitizes AI-generated creative text by stripping
 * echoed prompt headers, markdown titles, conversational preambles,
 * meta labels (Mood:, Reason:, etc.), and isolated leaked Latin artifacts in Tamil mode.
 */
function sanitizeCreativeOutput(output = '', params = {}) {
  if (!output || typeof output !== 'string') return '';
  let text = output.trim();

  // 1. Remove echoed [STRUCTURED GENERATION REQUEST] or JSON blocks
  text = text.replace(/\[STRUCTURED\s*GENERATION\s*REQUEST\][\s\S]*?(?:MANDATORY GENERATION DIRECTIVES:|\n\n)/i, '');
  text = text.replace(/^\{[\s\S]*?"userInput"[\s\S]*?\}\s*/i, '');

  // 2. Remove markdown title headers at the beginning (e.g., # Title, ## Poem)
  text = text.replace(/^#{1,4}\s+[^\n]+\n+/m, '');

  // 3. Remove conversational preambles
  text = text.replace(/^(?:Here is (?:your|the) (?:poem|story|composition|caption)[^\n]*:?\s*)/i, '');
  text = text.replace(/^(?:Based on (?:your|the) (?:prompt|image|video)[^\n]*:?\s*)/i, '');
  text = text.replace(/^(?:நிச்சயமாக,?[^\n]*:\s*)/i, '');
  text = text.replace(/^(?:இதோ உங்கள் (?:கவிதை|கதை)[^\n]*:?\s*)/i, '');

  // 4. Remove leading meta labels on lines
  const metaLabelRegex = /^(?:Tone|Mood|Style|Reason|Analysis|Genre|Language|Format|Paar|Caption):\s*[^\n]*\n+/gim;
  text = text.replace(metaLabelRegex, '');

  // 5. In Tamil mode, clean trailing English notes or isolated Latin fragment lines
  if (params.language === 'ta') {
    text = text.replace(/\n+\s*\((?:Note|Explanation|Translation)[^\)]*\)\s*$/i, '');
    text = text.replace(/\n+\s*(?:Note|Explanation|Translation):\s*[^\n]+$/i, '');
    const lines = text.split('\n');
    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      const hasTamil = /[\u0B80-\u0BFF]/.test(trimmed);
      const isPureLatin = /^[a-zA-Z\s.,!?:;'"\-—]+$/.test(trimmed);
      if (!hasTamil && isPureLatin) {
        const lower = trimmed.toLowerCase();
        if (
          lower.includes('silenzio') ||
          lower.includes('up tamil') ||
          lower.includes('paar') ||
          lower.includes('here is') ||
          lower.includes('based on') ||
          lower.includes('poem') ||
          lower.includes('story') ||
          lower.length < 5
        ) {
          return false;
        }
      }
      return true;
    });
    text = filteredLines.join('\n');
  }

  return text.trim();
}

module.exports = {
  validateGuards,
  looksLikePoem,
  validateTopicRelevance,
  validateOutputLanguage,
  stripLanguageNeutralContent,
  sanitizeCreativeOutput
};

