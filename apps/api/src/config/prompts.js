/**
 * PlanBot AI Prompt Engine
 * Complete, production-grade system prompts for poetry, classical Tamil forms,
 * stories, and social content generation with strict anti-leak and action rules.
 */

const LANGUAGE_NAMES = {
  ta: 'Tamil (தமிழ்)',
  en: 'English'
};

function langName(lang) {
  if (lang === 'tanglish') return 'Tanglish (Romanized Tamil + English)';
  return lang === 'ta' ? 'Tamil (தமிழ்)' : 'English';
}

const CLASSICAL_TAMIL_FORMS = [
  'வெண்பா',
  'குறிஞ்சி',
  'முல்லை',
  'மருதம்',
  'நெய்தல்',
  'அந்தாதி',
  'கட்டளைக் கலித்துறை',
  'பரணி',
  'சிந்து',
  'குறவஞ்சி',
  'ஆசிரியப்பா',
  'கலிப்பா',
  'வஞ்சிப்பா',
  'விருத்தம்',
  'நாட்டுப்புறப் பாடல்',
  'சித்தர் பாடல்',
  'புதுக்கவிதை'
];

/**
 * Returns rules for Western poetry types
 */
function getWesternPoemRules(type) {
  const normalized = (type || 'free verse').toLowerCase().replace(/-/g, ' ').trim();
  switch (normalized) {
    case 'haiku':
      return `STRUCTURAL FORM: Haiku.
- Exactly 3 lines with 5-7-5 syllable structure (or 3 rhythmic concise verses in Tamil).
- Line 1: 5 syllables. Line 2: 7 syllables. Line 3: 5 syllables.
- Evoke a moment of vivid sensory perception, nature, or seasonal connection (kigo).`;

    case 'sonnet':
      return `STRUCTURAL FORM: Shakespearean Sonnet.
- Exactly 14 lines in iambic pentameter (10 syllables per line, unstressed/stressed cadence).
- Rhyme scheme strictly: ABAB CDCD EFEF GG.
- Structured into three quatrains establishing a theme and a final rhyming couplet delivering a resolution/turn (volta).`;

    case 'limerick':
      return `STRUCTURAL FORM: Limerick.
- Exactly 5 lines with strict rhyme scheme: AABBA.
- Lines 1, 2, and 5 have three metrical beats (anapestic trimeter).
- Lines 3 and 4 have two metrical beats (anapestic dimeter).
- Tone is playful, rhythmic, whimsical, or witty.`;

    case 'acrostic':
      return `STRUCTURAL FORM: Acrostic Poem.
- The first letter of each successive line MUST vertically spell out the central subject or key term.
- Every line must be coherent, poetic, and directly related to the theme.`;

    case 'free verse':
      return `STRUCTURAL FORM: Free Verse.
- No forced rhyme scheme or fixed syllable count.
- Rely on natural lyrical speech cadences, evocative line breaks, internal rhythm, assonance, and vivid imagery.`;

    case 'blank verse':
      return `STRUCTURAL FORM: Blank Verse.
- Unrhymed lines of regular iambic pentameter (10 syllables per line).
- Elevated tone, majestic cadence, no end rhymes.`;

    case 'couplet':
      return `STRUCTURAL FORM: Rhymed Couplets.
- Series of rhymed pairs of lines (AABBCC...).
- Each couplet expresses a complete poetic thought or crisp observation.`;

    case 'villanelle':
      return `STRUCTURAL FORM: Villanelle.
- 19 lines consisting of 5 tercets (ABA) followed by 1 quatrain (ABAA).
- Two repeating refrains woven through the stanza endings with strict rhyme preservation.`;

    case 'ballad':
      return `STRUCTURAL FORM: Ballad.
- Stanzas of 4 lines (quatrains) with an ABCB or ABAB rhyme scheme.
- Alternating lines of 8 and 6 syllables (iambic tetrameter / trimeter).
- Narrative storytelling with emotional tension and musical refrain.`;

    case 'ode':
      return `STRUCTURAL FORM: Classical Ode.
- Solemn, passionate, or lyrical celebration dedicated to glorifying an object, person, state of mind, or nature.
- Elevated diction, dignified flow, and rich metaphorical praise.`;

    case 'elegy':
      return `STRUCTURAL FORM: Elegy.
- Reflective poem of serious mourning, remembrance, and contemplation of mortality or lost beauty.
- Moves through lamentation, praise, and culminates in a quiet, consoling resolution.`;

    case 'ghazal':
      return `STRUCTURAL FORM: Ghazal.
- Series of 5 to 10 autonomous couplets sharing a strict refrain (radif) and rhyme (qafia).
- Deep romantic yearning, spiritual beauty, and introspective sorrow.`;

    case 'rubaiyat':
      return `STRUCTURAL FORM: Rubaiyat.
- Four-line stanzas (quatrains) with AABA rhyme scheme.
- Philosophical reflections on mortal destiny, love, fleeting time, and inner truth.`;

    case 'cinquain':
      return `STRUCTURAL FORM: Cinquain.
- Exactly 5 lines with 2-4-6-8-2 syllable structure.
- Line 1: Title/Subject (2). Line 2: Description (4). Line 3: Action (6). Line 4: Feeling (8). Line 5: Essence (2).`;

    case 'tanka':
      return `STRUCTURAL FORM: Tanka.
- Exactly 5 lines with 5-7-5-7-7 syllable structure.
- Lyrical, concise, painting an unforgettable emotional landscape.`;

    case 'prose poem':
      return `STRUCTURAL FORM: Prose Poem.
- Dense, highly poetic prose without line breaks, glowing with vivid metaphors, internal rhythm, and emotional intensity.`;

    case 'lyrical verse':
      return `STRUCTURAL FORM: Lyrical Song Verse.
- Song-like rhythm, rhyming flow, emotional intimacy, and melodic cadence suited for musical expression.`;

    default:
      return `STRUCTURAL FORM: ${type}.
- Maintain artistic meter, intentional line breaks, musicality, and strong poetic imagery.`;
  }
}

/**
 * Returns structural rules for Classical Tamil poetry meters
 */
function getClassicalTamilRules(form) {
  switch (form) {
    case 'வெண்பா':
      return `மரபு வடிவம்: வெண்பா (Venpa).
- மொத்தம் 4 அடிகள்.
- முதல் மூன்று அடிகள் நாற்சீராய் (4 சீர்கள்), நான்காவது அடி முச்சீராய் (3 சீர்கள்) அமைதல் வேண்டும்.
- வெண்டளை நெறி: 'மாமுன் நிரை', 'விளம்முன் நேர்', 'காய்முன் நேர்' எனும் தளை விதிகள் தவறாமல் அமைதல் வேண்டும்.
- ஈற்றுச் சீர் (கடைசிச் சீர்) நாள், மலர், காசு, பிறப்பு ஆகியவற்றில் ஒன்றாய் முடிதல் கட்டாயம்.
- தூய செந்தமிழ்ச் சொற்களால், சந்த நயத்துடன் எழுதப்பட வேண்டும்.`;

    case 'குறிஞ்சி':
      return `திணை வடிவம்: குறிஞ்சித் திணை (Kurinji).
- நிலம்: மலையும் மலை சார்ந்த பகுதியும்.
- உரிப்பொருள்: புணர்தலும் புணர்தல் நிமித்தமும் (காதல் ஒன்றுதல், தலைவன் தலைவி சந்திப்பு).
- கருப்பொருட்கள்: வேங்கை மரம், செங்காந்தள் மலர், குறிஞ்சிப் பூ, மயில்கள், அருவி நீர், தேன் கூடு, இரவு அல்லது கூதிர்/பனிக்காலப் பின்னணி.
- அகநானூறு/குறுந்தொகை மரபில் ஆழ்ந்த காதல் உணர்வும் இயற்கை எழிலும் மிளிர வேண்டும்.`;

    case 'முல்லை':
      return `திணை வடிவம்: முல்லைத் திணை (Mullai).
- நிலம்: காடும் காடு சார்ந்த இடமும்.
- உரிப்பொருள்: இருத்தலும் இருத்தல் நிமித்தமும் (பிரிவில் தலைவனுக்காக ஆற்றியிருத்தல்/காத்திருத்தல்).
- கருப்பொருட்கள்: செவ்விய முல்லைப் பூ, கார் கால மேகம்/மழை, மாலைப் பொழுது, ஆயர் வாழ்வியல், மான் கூட்டம், புல்லாங்குழல் இசை.
- அமைதியான நம்பிக்கையும் ஏக்கமும் கலந்த காதலின் தூய்மை வெளிப்பட வேண்டும்.`;

    case 'மருதம்':
      return `திணை வடிவம்: மருதத் திணை (Marudham).
- நிலம்: வயலும் வயல் சார்ந்த நிலமும்.
- உரிப்பொருள்: ஊடலும் ஊடல் நிமித்தமும் (செல்லக் கோபம், சிறு பிணக்கு, சமாதானம்).
- கருப்பொருட்கள்: செங்கழுநீர், தாமரை, கயல் மீன், உழவர் உழவுப் பாடல், விடியல் பொழுது, பொய்கை.
- மெல்லிய காதற் சினமும், அதைத் தீர்க்கும் நயமும் கவிதையில் திகழ வேண்டும்.`;

    case 'நெய்தல்':
      return `திணை வடிவம்: நெய்தல் திணை (Neidhal).
- நிலம்: கடலும் கடல் சார்ந்த இடமும்.
- உரிப்பொருள்: இரங்கலும் இரங்கல் நிமித்தமும் (பிரிவுத் துயரம், பெருமூச்சு, அலைகளின் ஓலம் போன்ற மன வலி).
- கருப்பொருட்கள்: வெண்மணல் பரப்பு, உப்புக்கழிகள், புன்னை மரம், தாழை மலர், சங்குகள், அலைகளின் ஓயாத சத்தம், மாலைச் சூரிய மறைவு (ஏற்பாடு).
- கடல் அலைகளோடு சங்கமிக்கும் ஆழ்ந்த பிரிவுத் தவிப்பு ஒலிக்க வேண்டும்.`;

    case 'அந்தாதி':
      return `மரபு வடிவம்: அந்தாதி (Anthathi).
- கட்டமைப்பு விதி: முந்தைய அடியின்/பாடலின் கடைசிச் சொல் (அந்தம்) அடுத்த அடியின்/பாடலின் முதல் சொல்லாக (ஆதி) தொடங்குதல் வேண்டும்.
- குறைந்தது 4-6 சீரான கண்ணிகள்/அடிகள்.
- சங்கிலித் தொடர் போன்ற எதுகை-மோனை சொற்களின் தடையற்ற ஓட்டம் மற்றும் பொருள் பொதிந்த அழகு.`;

    case 'கட்டளைக் கலித்துறை':
      return `மரபு வடிவம்: கட்டளைக் கலித்துறை (Kattalai Kalithurai).
- 4 அடிகள். அடிதோறும் 5 சீர்கள்.
- அடிகளில் முதற்சீர் நெடிலாக இருந்தால் ஒற்றொழித்து 16 எழுத்துகளும், குறிலாக இருந்தால் ஒற்றொழித்து 17 எழுத்துகளும் அமையும் கணிப்பு.
- அடிதோறும் எதுகை அமைதி பெற்று, கம்பீரமான சந்த நடையுடன் அமைதல் வேண்டும்.`;

    case 'பரணி':
      return `மரபு வடிவம்: பரணி இலக்கிய நடை (Parani).
- பாடுபொருள்: வீரம், போர்க்களக் காட்சிகள், வெற்றிப் புகழ், அஞ்சா நெஞ்சம்.
- நடை: கலித்தாழிசை அமைதி, முழங்கும் சொற்கள், இடி போன்ற எதுகை ஓசை, கம்பீரமான தமிழ்ச் சொற்கட்டு.`;

    case 'சிந்து':
      return `மரபு வடிவம்: காவடிச் சிந்து / நாட்டுப்புற சிந்து நடை (Sindhu).
- நடை: துள்ளல் ஓசை கொண்ட தாளக் கட்டு, பாமரரும் பாடிப் பரவசமாகும் இசைச் சந்தம்.
- எடுப்பு, தொடுப்பு போன்ற அமைதி, 'தந்தனத் தானா' என்ற வகையிலான உள்ளுறை தாள லயத்துடன் கூடிய பக்தி அல்லது காதல் மணம்.`;

    case 'குறவஞ்சி':
      return `மரபு வடிவம்: குறவஞ்சி நடை (Kuravanji).
- நடை: குறி சொல்லும் குறமகள் அல்லது குறவன் உரையாடல் வடிவம்.
- மலை வளம், இயற்கை எழில், எதிர்கால நற்செய்தி உரைத்தல், கொச்சை நயமும் செந்தமிழும் கலந்த வசீகர இசைப்பாடல் முறை.`;

    case 'ஆசிரியப்பா':
      return `மரபு வடிவம்: ஆசிரியப்பா (Agavalpa).
- அகவலோசை அமைதி, அடிதோறும் 4 சீர்கள் (நாற்சீர்), இயற்சீர் மிகுந்து நேரொன்றாசிரியத் தளை அல்லது நிரையொன்றாசிரியத் தளை தழுவி வருதல்.
- சங்க இலக்கியப் பாடல்களின் ஆழமும் கம்பீரமும் நிறைந்த சொற்கட்டு.`;

    case 'கலிப்பா':
      return `மரபு வடிவம்: கலிப்பா (Kalippa).
- துள்ளல் ஓசை, கலித்தளை அமைதி ('காய்முன் நிரை'), உற்சாகமும் கம்பீரமும் கலந்த ஓட்டம்.`;

    case 'வஞ்சிப்பா':
      return `மரபு வடிவம்: வஞ்சிப்பா (Vanjippa).
- தூங்கல் ஓசை, வஞ்சித்தளை அமைதி ('கனிமுன் நேர்'), மெல்லிய ஓட்டமுடைய பா வகை.`;

    case 'விருத்தம்':
      return `மரபு வடிவம்: விருத்தம் (Virutham).
- அறுசீர் அல்லது எண்சீர் கழிநெடிலடி ஆசிரிய விருத்தம், சந்த நயமும் எதுகை மோனை அமைப்பும் திகழும் காவிய நடை (கம்பராமாயண நடை).`;

    case 'நாட்டுப்புறப் பாடல்':
      return `மரபு வடிவம்: நாட்டுப்புறப் பாடல் / தாலாட்டு (Folk Verse).
- மண்வாசம் கமழும் நாட்டுப்புறச் சந்தம், தாலாட்டு அல்லது ஏற்றப்பாட்டு இசை நயம், எளிய சொல்லாட்சி, நெஞ்சைத் தொடும் கிராமியப் பாசம்.`;

    case 'சித்தர் பாடல்':
      return `மரபு வடிவம்: சித்தர் பாடல் (Siddhar Verse).
- ஞான நெறி, உடலின் மாயை, உள்ளொளி, தத்துவார்த்த சாட்டை அடி, எளிய எதுகை கொண்ட ஆழமான ஆன்மீக நடை.`;

    case 'புதுக்கவிதை':
      return `மரபு வடிவம்: புதுக்கவிதை (Modern Free Verse).
- யாப்புக் கட்டுப்பாடுகளைத் தாண்டி, படிமங்கள், குறியீடுகள், கவித்துவ வெளிப்பாடு, சிந்தனையைத் தூண்டும் நவீன தமிழ் நடை.`;

    default:
      return `மரபுத் தமிழ்க் கவிதை வடிவம்: செந்தமிழ்ச் சொற்கள், சீர், எதுகை, மோனை நயங்களுடன் அமைதல் வேண்டும்.`;
  }
}

/**
 * Returns length guidelines
 */
function getLengthGuideline(length, mode) {
  const norm = (length || 'medium').toLowerCase();
  if (mode === 'poem') {
    switch (norm) {
      case 'short': return 'LENGTH: Short (4 to 8 lines, compact and punchy).';
      case 'long': return 'LENGTH: Long (16 to 24 lines, thoroughly developed stanzas).';
      case 'medium':
      default: return 'LENGTH: Medium (8 to 14 lines, balanced depth).';
    }
  } else if (mode === 'story') {
    switch (norm) {
      case 'short': return 'LENGTH: Short story flash-fiction (~250-400 words).';
      case 'long': return 'LENGTH: Extended comprehensive short story (~800-1200 words).';
      case 'medium':
      default: return 'LENGTH: Engaging standard short story (~500-750 words).';
    }
  } else {
    // creator
    switch (norm) {
      case 'short': return 'LENGTH: Ultra-compact, single punchy statement.';
      case 'long': return 'LENGTH: Multi-line captivating narrative/card.';
      default: return 'LENGTH: Standard social post fit.';
    }
  }
}

/**
 * Returns creator format rules
 */
function getFormatRules(format) {
  const norm = (format || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (norm.includes('quote')) {
    return `FORMAT: Short Quote.
- Strict limit: Maximum 20 words total.
- Punchy, memorable, highly shareable, poetic wisdom.
- No hashtags inside the quote.`;
  }
  if (norm.includes('poem-card') || norm.includes('card')) {
    return `FORMAT: Poem Card.
- Exactly 4 to 8 lines.
- Maximum 8 words per line for optimal visual typography on cards.
- Perfect for Instagram/WhatsApp image cards.`;
  }
  if (norm.includes('micro-story') || norm.includes('story')) {
    return `FORMAT: Micro Story.
- Exactly 3 to 4 vivid lines delivering a powerful beginning, twist, and emotional climax.`;
  }
  if (norm.includes('couplet') || norm.includes('hook')) {
    return `FORMAT: Two-line Couplet / Hook.
- Exactly 2 rhyming/rhythmic lines of deep insight or emotional resonance.`;
  }
  return `FORMAT: Caption + Hashtags.
- Hook: An arresting opening single sentence.
- Body: 2 to 3 engaging, evocative sentences expanding the theme.
- Hashtags: Exactly 8 to 12 relevant, highly trending hashtags.`;
}

/**
 * Returns structural rules for social media platforms (Creator mode)
 */
function getPlatformRules(platform) {
  const norm = (platform || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (norm.includes('linkedin')) {
    return `PLATFORM RULES: LINKEDIN POST
- Tone: Professional, articulate, thought-provoking, and deeply human.
- CORE OBJECTIVE: Write an authentic, insightful, Professional post based DIRECTLY on what is happening in the uploaded media (event, demo, project, workshop, or achievement).
- START WITH THE REAL MOMENT: Begin with the actual event, demo, or project depicted. Explain what is happening, why it matters, and what problem was tackled (e.g. "Today, we got to see our AI project move from an idea on paper to something we could actually demonstrate.").
- STRICT ANTI-JARGON CONSTRAINT: ABSOLUTELY FORBIDDEN to use hollow corporate buzzwords and clichés (e.g., NO "In today's fast-paced digital world...", NO "Seamless execution is the bridge between...", NO "Transforming paradigms", NO "Unlocking synergy", NO "Empowering cross-functional delivery").
- AUTHENTIC HUMAN VOICE: Sound like a passionate, grounded professional or engineer sharing a real journey. Keep it professional, candid, and humble.
- GENUINE TAKEAWAYS: Include 1-2 practical reflections or takeaways drawn from the visible work, without exaggerated claims or fabricated numbers.
- FORMAT: Clean single-line breaks for mobile readability. An engaging concluding question to spark discussion.
- HASHTAGS: Exactly 3 to 5 highly relevant professional hashtags matching the actual domain (e.g. #SoftwareEngineering #AIProject #StudentInnovation).`;
  }
  if (norm.includes('instagram-story') || (norm.includes('story') && !norm.includes('short'))) {
    return `PLATFORM RULES: INSTAGRAM STORY
- Structure: Short, story-friendly text suited for instant reading on mobile stories.
- Brevity: Highly concise (1 to 2 impactful lines) that fits cleanly over visual media without cluttering or covering the subject.
- Tone: Intimate, direct, candid, and visually compatible.`;
  }
  if (norm.includes('reel') || norm.includes('instagram-reel')) {
    return `PLATFORM RULES: INSTAGRAM REEL
- Hook: An arresting first line/hook to stop scrolling in the first 2 seconds, tied directly to the visual movement or opening scene.
- Caption: Short, punchy caption (2 to 3 sentences) synchronized with high-energy visual rhythm.
- Short Punch Line: Memorable closing line that lingers after the video loops.
- Call to Action (CTA): Optional engaging prompt to save, share, or comment.
- Hashtags: 5 to 8 targeted trending-style hashtags reflecting the exact scene.`;
  }
  if (norm.includes('whatsapp') || norm.includes('status')) {
    return `PLATFORM RULES: WHATSAPP STATUS
- Structure: Short, deeply expressive, heartfelt personal statement.
- Style: Crisp, emotional resonance suitable for personal contact circles.
- Clean presentation without excessive hashtag blocks.`;
  }
  if (norm.includes('twitter') || norm.includes('x-post')) {
    return `PLATFORM RULES: TWITTER / X POST
- Structure: Concise, high-impact post under 280 characters with a powerful opening hook.
- Character Economy: Sharp and memorable phrasing.
- Hashtags: 1 to 2 relevant hashtags maximum.`;
  }
  if (norm.includes('facebook')) {
    return `PLATFORM RULES: FACEBOOK POST
- Tone: Warm, conversational, friendly, and community-oriented.
- Engagement: Encourages friends and followers to share thoughts, relate, or reminisce about the visible moment.`;
  }
  if (norm.includes('youtube') || norm.includes('shorts')) {
    return `PLATFORM RULES: YOUTUBE SHORTS
- Title: High-retention, clickable title based on the actual media subject.
- Hook: High-energy opening hook designed for rapid short-form video retention matching the first 2 seconds of action.
- Caption: Short, engaging description matching the video journey.
- Call to Action (CTA): Prompt to like, comment, or subscribe.
- Hashtags: #Shorts plus 3 to 5 topic-specific tags.`;
  }
  // Default: Instagram Post
  return `PLATFORM RULES: INSTAGRAM POST
- Structure: Engaging, aesthetically pleasing caption with an attractive, scroll-stopping opening hook.
- Body: Well-spaced, evocative sentences with strong sensory appeal grounded in the actual visual textures and mood.
- Hashtags: 5 to 8 curated, relevant hashtags placed cleanly at the end.`;
}

/**
 * Returns style guidelines for creator mode
 */
function getStyleGuideline(style) {
  const norm = (style || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (norm.includes('pastel')) {
    return `VISUAL & EMOTIONAL STYLE: Soft Pastel (மென்மையான நிறம் & உணர்வு)
- Vocabulary & Tone: Gentle, tender, dreamy, soothing, whisper-soft emotional resonance.
- Sentence Length: Fluid, melodic, graceful medium-length phrasing.
- Imagery: Ethereal dawn, pastel watercolors, gentle breezes, tender touches.`;
  }
  if (norm.includes('aesthetic')) {
    return `VISUAL & EMOTIONAL STYLE: Aesthetic Minimal (அழகிய எளிமை)
- Vocabulary & Tone: Short, elegant, clean, understated, deeply evocative.
- Sentence Length: Very concise, punchy, maximum whitespace and breathing room.
- Imagery: Crisp light, quiet moments, raw unfiltered beauty, calm simplicity.`;
  }
  if (norm.includes('bold')) {
    return `VISUAL & EMOTIONAL STYLE: Bold Motivational (துணிச்சல் ஊக்கம்)
- Vocabulary & Tone: Strong, energetic, confident, commanding, electrifying conviction.
- Sentence Length: Sharp, dynamic, punchy statements of unyielding drive.
- Imagery: Blazing sparks, relentless momentum, summit triumphs, unstoppable will.`;
  }
  if (norm.includes('dark')) {
    return `VISUAL & EMOTIONAL STYLE: Dark Moody (இருண்ட சிந்தனை)
- Vocabulary & Tone: Atmospheric, mysterious, emotional, haunting, shadowy depth.
- Sentence Length: Measured, brooding cadence with deep emotional weight.
- Imagery: Midnight rain, deep shadows, neon reflections on wet asphalt, introspective stillness.`;
  }
  if (norm.includes('nature')) {
    return `VISUAL & EMOTIONAL STYLE: Nature Vibe (இயற்கை உணர்வு)
- Vocabulary & Tone: Earthy, grounding, tranquil, organic, deeply serene.
- Sentence Length: Flowing, rhythmic, like ocean waves or rustling leaves.
- Imagery: Petrichor rain scents, mountain mist, emerald canopies, flowing streams.`;
  }
  if (norm.includes('classical')) {
    return `VISUAL & EMOTIONAL STYLE: Tamil Classical (தமிழ் பாரம்பரியம்)
- Vocabulary & Tone: Literary, regal, timeless cultural richness, dignified historic grandeur.
- Sentence Length: Structured, poetic, elevating literary classical vocabulary.
- Imagery: Chola temple architecture, lotus ponds, ancient poetic metaphors, sangam nature landscapes.`;
  }
  if (norm.includes('neon')) {
    return `VISUAL & EMOTIONAL STYLE: Neon Cyber (நவீன நியான்)
- Vocabulary & Tone: Vibrant, futuristic, urban pulse, glowing electronic nocturnal electricity.
- Sentence Length: Rapid-fire, rhythmic, electric modern pacing.
- Imagery: Luminescent neon signs, digital reflections, cyber cityscapes, midnight frequencies.`;
  }
  if (norm.includes('vintage') || norm.includes('retro')) {
    return `VISUAL & EMOTIONAL STYLE: Vintage Retro (பழமை நயம்)
- Vocabulary & Tone: Sepia nostalgia, vintage film grains, warm analog memories, antique romance.
- Sentence Length: Lyrical, nostalgic, reminiscent of golden eras gone by.
- Imagery: Analog film grain, cassette tape warmth, polaroids, timeless wistful smiles.`;
  }
  if (norm.includes('royal')) {
    return `VISUAL & EMOTIONAL STYLE: Royal Heritage (அரச கம்பீரம்)
- Vocabulary & Tone: Aristocratic elegance, golden ornate diction, majestic and noble authority.
- Sentence Length: Grand, stately, polished sentences with dignified presence.
- Imagery: Golden halls, silk tapestries, crown jewel metaphors, sovereign heritage.`;
  }
  if (norm.includes('corporate') || norm.includes('clean')) {
    return `VISUAL & EMOTIONAL STYLE: Clean Corporate (நேர்த்தியான பதிவு)
- Vocabulary & Tone: Professional, precise, polished, articulate, leadership-focused impact.
- Sentence Length: Clear, structured, executive readability without slang.
- Imagery: Modern architectural glass, focused desks, visionary strategy, purposeful execution.`;
  }
  return `VISUAL & EMOTIONAL STYLE: ${style}.`;
}

/**
 * Comprehensive Semantic Tone Definitions
 * Ensures tone actually influences style, vocabulary, emotional depth, pacing, and dialogue
 * while strictly preserving user intent and selected language.
 */
const TONE_INSTRUCTIONS = {
  creative: {
    name: 'Creative & Imaginative / கற்பனை நயம்',
    en: 'Use fresh, imaginative ideas and original phrasing. Create vivid scenes and memorable descriptions. Avoid generic or predictable wording. Introduce interesting details, imagery, and creative perspectives while preserving the user\'s original topic and intent.',
    ta: 'புதிய, கற்பனை நயமிக்க சொற்களையும் வரிகளையும் பயன்படுத்துக. உயிருள்ள காட்சிகளையும் நினைவில் நிற்கும் வர்ணனைகளையும் உருவாக்குக. பொதுவான வழக்கமான சொற்களைத் தவிர்க்கவும். பயனரின் மூலக் கருத்தை மாற்றாமல், புதிய கோணங்களையும் உவமைகளையும் சேர்க்கவும்.'
  },
  emotional: {
    name: 'Emotional / உணர்ச்சிப்பூர்வம்',
    en: 'Create genuine emotional depth. Focus on feelings, relationships, internal reactions, meaningful moments, atmosphere, and emotional progression. Avoid simply adding words like "sad", "love", or "heart". Show emotion through situations, thoughts, actions, dialogue, and meaningful details.',
    ta: 'உண்மையான உணர்ச்சி ஆழத்தை உருவாக்குக. உணர்வுகள், உறவுகள், அகப்போராட்டங்கள், அர்த்தமுள்ள தருணங்கள் மற்றும் உணர்வு ரீதியான மாற்றங்களில் கவனம் செலுத்துக. "கண்ணீர்", "துக்கம்" போன்ற வெற்று வார்த்தைகளை மட்டும் திணிக்காமல், காட்சிகள், எண்ணங்கள், உரையாடல்கள் மற்றும் சூழல்கள் மூலம் உணர்வை வெளிப்படுத்துக.'
  },
  humorous: {
    name: 'Humorous / நகைச்சுவையான',
    en: 'Use natural, context-appropriate humor. Prefer witty observations, playful situations, light irony, or amusing dialogue where appropriate. Do not force jokes into serious situations. Keep the original meaning and topic.',
    ta: 'இயற்கையான, சூழலுக்குப் பொருத்தமான நகைச்சுவையைப் பயன்படுத்துக. கூர்மையான அவதானிப்புகள், விளையாட்டுத்தனமான தருணங்கள், மெல்லிய அங்கதம் மற்றும் நகைச்சுவை உரையாடல்களை முன்வைக்க. மூலக் கருத்தை மாற்றாமல் நகைச்சுவை நயத்தை வெளிப்படுத்துக.'
  },
  simpler: {
    name: 'Simpler / எளிய நடை',
    en: 'Use simple, natural, easy-to-understand language. Prefer shorter sentences and familiar vocabulary. Do not unnecessarily simplify away important meaning.',
    ta: 'எளிமையான, இயல்பான, எளிதில் புரியும் நடையைப் பயன்படுத்துக. சிறிய வாக்கியங்களையும் பழக்கமான சொற்களையும் தேர்ந்தெடுக்க. கருத்தின் ஆழம் குறையாமல் எளிய நடையில் வடிக்க.'
  },
  shorter: {
    name: 'Shorter / சுருக்கமான',
    en: 'Produce a genuinely shorter version. Remove repetition, unnecessary descriptions, and filler. Preserve the central idea, important details, and emotional meaning.',
    ta: 'தேவையற்ற விவரங்கள் மற்றும் மீள்வரிப்புகளை நீக்கி, சுருக்கமான வடிவத்தை உருவாக்குக. மையக்கருத்து, முக்கிய உண்மைகள் மற்றும் உணர்வின் ஆழத்தை முழுமையாகப் பாதுகாக்க.'
  },
  longer: {
    name: 'Longer / விரிவான',
    en: 'Expand the content meaningfully. Add relevant details, scenes, explanations, descriptions, dialogue, emotions, or context. Do not repeat the same information just to increase length.',
    ta: 'உள்ளடக்கத்தை அர்த்தமுள்ள வகையில் விரிவுபடுத்துக. பொருத்தமான காட்சிகள், உரையாடல்கள், வர்ணனைகள், பின்னணி மற்றும் உணர்வு அடுக்குகளைச் சேர்க்க. வார்த்தைகளை வீணாக இழுக்காமல் வளமான காட்சிகளை விரிக்குக.'
  },
  inspirational: {
    name: 'Inspiring / ஈடுபடுத்தும் ஊக்கம்',
    en: 'Inspiring, uplifting, and empowering. Focus on resilience, inner strength, purposeful action, and overcoming challenges with unwavering determination.',
    ta: 'நெஞ்சில் உரம் சேர்க்கும் எழுச்சியூட்டும் நடை. விடாமுயற்சி, உள்வலிமை, தன்னம்பிக்கை மற்றும் இலக்கை நோக்கிய தெளிவான உத்வேகத்தை விதைக்க.'
  },
  romantic: {
    name: 'Romantic / காதல் நயம்',
    en: 'Romantic, intimate, and tender. Capture subtle chemistry, gentle longing, warmth of connection, and poetic beauty of love.',
    ta: 'காதல் நயம், மென்மை மற்றும் கவித்துவ உணர்வு. இரு உள்ளங்களின் மெல்லிய பிணைப்பு, ஏக்கம், அன்பு மற்றும் பாசத்தின் தூய்மையை வெளிப்படுத்துக.'
  },
  playful: {
    name: 'Playful / விளையாட்டுத்தனம்',
    en: 'Playful, lighthearted, and spirited. Infuse delightful mischief, cheerful banter, and whimsical joy while keeping the core topic.',
    ta: 'துள்ளலான, விளையாட்டுத்தனமான மற்றும் கலகலப்பான நடை. சுட்டித்தனமான குறும்புகள், உற்சாகமான உரையாடல்கள் மற்றும் மகிழ்ச்சியைத் தூவுக.'
  },
  serious: {
    name: 'Serious / தீவிரம்',
    en: 'Serious, grave, and thoughtful. Treat the subject with dignity, deep contemplative weight, and earnest focus.',
    ta: 'ஆழமான, தீவிரமான மற்றும் சிந்தனையைத் தூண்டும் கம்பீரமான நடை. கருத்தின் கனத்தையும் முக்கியத்துவத்தையும் நிலைநிறுத்துக.'
  },
  dark: {
    name: 'Dark / இருண்ட சிந்தனை',
    en: 'Dark, haunting, and atmospheric. Explore shadowy introspection, tension, gothic depth, and emotional gravity.',
    ta: 'இருண்ட, மர்மமான மற்றும் ஆழமான சிந்தனை நடை. நிழல்கள், மன அழுத்தங்கள் மற்றும் தீவிர உணர்வு அலைகளை விவரிக்க.'
  },
  melancholic: {
    name: 'Melancholic / புலம்பல் நயம்',
    en: 'Melancholic and soulful. Evoke tender sorrow, longing, bittersweet reflection, and the quiet ache of absence.',
    ta: 'புலம்பல் நயம், நெகிழ்ச்சி மற்றும் மெல்லிய சோகம். பிரிவின் வலி, ஏக்கம், ஏக்கத்தின் இனிமை மற்றும் நினைவுகளின் சுவடுகளைப் பதிவு செய்க.'
  },
  epic: {
    name: 'Epic / காவிய நயம்',
    en: 'Epic and grand. Monumental scale, legendary resonance, striking heroism, and historic grandeur.',
    ta: 'காவிய நயம், பிரம்மாண்டமான களம், வரலாற்று வீரம் மற்றும் கம்பீரமான சொல்லாட்சியை வெளிப்படுத்துக.'
  },
  philosophical: {
    name: 'Philosophical / தத்துவார்த்த',
    en: 'Philosophical and reflective. Explore existential insight, metaphysical questions, meaning, and timeless wisdom.',
    ta: 'தத்துவார்த்த பார்வை, வாழ்க்கை மெய்ஞானம், காலத்தின் சுழற்சி மற்றும் ஆழ்ந்த வாழ்வியல் உண்மைகளை வெளிப்படுத்துக.'
  },
  spiritual: {
    name: 'Spiritual & Devotional / பக்தி & ஆன்மீகம்',
    en: 'Spiritual, sacred, and serene. Foster divine reverence, inner peace, stillness, and surrendered devotion.',
    ta: 'பக்தி நயம், ஆன்மீக அமைதி, தெய்வீக அருள் மற்றும் சரணாகதி உணர்வை மெய்யுருக விவரிக்க.'
  },
  heroic: {
    name: 'Heroic & Patriotic / வீர முழக்கம்',
    en: 'Heroic, courageous, and proud. Resound with bravery, valor, duty, and victorious conviction.',
    ta: 'வீர முழக்கம், துணிவு, தாயகப்பற்று மற்றும் வெற்றிப் பாதையின் தியாகத்தை உணர்த்தும் நடை.'
  },
  nostalgic: {
    name: 'Nostalgic / பசுமை நினைவுகள்',
    en: 'Nostalgic and evocative. Rekindle fond memories, bittersweet remembrance, vintage warmth, and the gentle echoes of yesterday.',
    ta: 'பசுமை நினைவுகள், கடந்த காலத் தென்றல், பால்யத்தின் நினைவுகள் மற்றும் பழமையின் கதகதப்பை மீட்டுத்தருக.'
  },
  peaceful: {
    name: 'Peaceful & Serene / அமைதி & சாந்தம்',
    en: 'Peaceful, tranquil, and serene. Calm waters, gentle breathing, quiet stillness, and soothing harmony.',
    ta: 'அமைதி மற்றும் சாந்தம். சலனமற்ற நதி, மெல்லிய காற்று மற்றும் மனதிற்கு இதமளிக்கும் நிசப்தத்தைப் பொழிக.'
  },
  passionate: {
    name: 'Passionate & Fiery / அனல் பறக்கும் ஆர்வம்',
    en: 'Passionate, fiery, and intense. Unstoppable drive, ardent longing, burning devotion, and electrified emotion.',
    ta: 'அனல் பறக்கும் ஆர்வம், தீவிர உணர்ச்சி மற்றும் தணியாத வேட்கையை அனல் தெறிக்கும் வார்த்தைகளால் வடிக்க.'
  },
  sarcastic: {
    name: 'Sarcastic & Witty / அங்கதம் & கேலி',
    en: 'Sarcastic, sharp, and witty. Clever irony, dry humor, sharp observations, and satirical edge.',
    ta: 'அங்கதம், கூர்மையான கேலி மற்றும் சமயோசித அறிவு. நகைச்சுவை கலந்த முரண்களையும் கூர்மையான பார்வைகளையும் வெளிப்படுத்துக.'
  },
  hopeful: {
    name: 'Hopeful & Optimistic / நம்பிக்கை ஒளி',
    en: 'Hopeful, radiant, and optimistic. Dawn after darkness, gentle renewal, bright horizons, and faith in tomorrow.',
    ta: 'நம்பிக்கை ஒளி, இருள் விலகும் விடியல், புது வசந்தம் மற்றும் நாளைய வெற்றிக்கான உறுதிமொழியைத் தருக.'
  },
  heartbreak: {
    name: 'Heartbreak / இதய வலி & பிரிவு',
    en: 'Heartbreak and poignant grief. The raw ache of separation, fractured trust, unspoken tears, and the silence of loss.',
    ta: 'இதய வலி, தாங்கொணா பிரிவு, மௌனக் கண்ணீர் மற்றும் உடைந்த கனவுகளின் சோகத்தை உள்ளுருக வடிக்க.'
  },
  'nature-vibe': {
    name: 'Nature & Earthy / இயற்கை எழில்',
    en: 'Nature-infused and earthy. Fragrant soil, rustling leaves, rivers, birdsong, and deep organic harmony.',
    ta: 'இயற்கை எழில், மண்வாசம், சலசலக்கும் ஓடை, மரங்களின் பசுமை மற்றும் இயற்கையோடு இயைந்த மெல்லிய உணர்வை வரைக.'
  }
};

/**
 * Returns tone guideline with semantic depth and bilingual cues
 */
function getToneGuideline(tone, lang = 'ta') {
  const norm = (tone || '').toLowerCase().replace(/[\s_]+/g, '-');
  let matchKey = null;

  if (norm.includes('creative') || norm.includes('imagin') || norm.includes('artistic')) {
    matchKey = 'creative';
  } else if (norm.includes('emotional') || norm.includes('emotion') || norm.includes('heart')) {
    matchKey = 'emotional';
  } else if (norm.includes('humor') || norm.includes('funny') || norm.includes('comedy') || norm.includes('joke')) {
    matchKey = 'humorous';
  } else if (norm.includes('simpler') || norm.includes('simple')) {
    matchKey = 'simpler';
  } else if (norm.includes('shorter') || norm.includes('short') || norm.includes('concise')) {
    matchKey = 'shorter';
  } else if (norm.includes('longer') || norm.includes('long') || norm.includes('expand')) {
    matchKey = 'longer';
  } else if (norm.includes('inspire') || norm.includes('inspirational')) {
    matchKey = 'inspirational';
  } else if (norm.includes('romantic') || norm.includes('romance') || norm.includes('kadhal')) {
    matchKey = 'romantic';
  } else if (norm.includes('playful')) {
    matchKey = 'playful';
  } else if (norm.includes('serious')) {
    matchKey = 'serious';
  } else if (norm.includes('dark')) {
    matchKey = 'dark';
  } else if (norm.includes('melanchol')) {
    matchKey = 'melancholic';
  } else if (norm.includes('epic')) {
    matchKey = 'epic';
  } else if (norm.includes('philosoph')) {
    matchKey = 'philosophical';
  } else if (norm.includes('spirit') || norm.includes('devotion')) {
    matchKey = 'spiritual';
  } else if (norm.includes('heroic') || norm.includes('patriot')) {
    matchKey = 'heroic';
  } else if (norm.includes('nostalg')) {
    matchKey = 'nostalgic';
  } else if (norm.includes('peace') || norm.includes('serene')) {
    matchKey = 'peaceful';
  } else if (norm.includes('passion') || norm.includes('fiery')) {
    matchKey = 'passionate';
  } else if (norm.includes('sarcas') || norm.includes('witty')) {
    matchKey = 'sarcastic';
  } else if (norm.includes('hope')) {
    matchKey = 'hopeful';
  } else if (norm.includes('heartbreak') || norm.includes('sorrow')) {
    matchKey = 'heartbreak';
  } else if (norm.includes('nature') || norm.includes('earthy')) {
    matchKey = 'nature-vibe';
  }

  const def = matchKey ? TONE_INSTRUCTIONS[matchKey] : null;
  const isTa = lang === 'ta';
  const targetScript = isTa ? 'Tamil (தமிழ்)' : 'English';

  if (def) {
    return `TONE DIRECTIVE: ${def.name}
- SEMANTIC WRITING INSTRUCTION: ${isTa ? `${def.ta}\n(${def.en})` : def.en}
- TONE PRINCIPLE: The tone modifies the emotional atmosphere, pacing, vocabulary, and dialogue style. It must NEVER change the user's requested topic or switch away from ${targetScript}.`;
  }

  return `TONE DIRECTIVE: ${tone || 'Natural'}
- Apply the requested tone/mood appropriately while maintaining the user's requested topic, characters, and ${targetScript} output language.`;
}

/**
 * Extracts key semantic anchors (Place, Setting, Characters, Event/Plot, Emotional feel)
 * from user prompt to ensure strict AI grounding.
 */
function extractContentAnchors(promptText = '') {
  if (!promptText || typeof promptText !== 'string') {
    return {
      rawPrompt: '',
      keywords: [],
      place: null,
      setting: null,
      characters: [],
      event: null,
      feel: null,
      summary: ''
    };
  }

  const rawPrompt = promptText.trim();
  const words = rawPrompt
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const STOPWORDS = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
    'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'write', 'create', 'generate', 'make', 'give', 'compose', 'story', 'poem', 'content', 'post',
    'please', 'tell', 'me', 'want', 'like', 'need', 'some', 'that', 'this', 'these', 'those',
    'ஒரு', 'மற்றும்', 'என்று', 'என', 'உள்ள', 'ஆகிய', 'கதை', 'கவிதை', 'எழுது', 'உருவாக்கு'
  ]);

  const keywords = words.filter((w) => !STOPWORDS.has(w.toLowerCase()));

  const SETTING_WORDS = new Set([
    'temple', 'church', 'mosque', 'beach', 'sea', 'ocean', 'mountain', 'hill', 'forest', 'jungle',
    'river', 'lake', 'college', 'school', 'university', 'office', 'village', 'town', 'city', 'street',
    'road', 'station', 'airport', 'hospital', 'garden', 'park', 'house', 'room', 'balcony', 'roof',
    'ground', 'field',
    'கோயில்', 'கோவில்', 'ஆலயம்', 'கடற்கரை', 'கடல்', 'மலை', 'காடு', 'ஆறு', 'குளம்', 'கல்லூரி', 'பள்ளி',
    'அலுவலகம்', 'கிராமம்', 'ஊர்', 'நகரம்', 'தெரு', 'வீடு', 'அறை', 'திடல்'
  ]);

  const CHARACTER_WORDS = new Set([
    'boy', 'girl', 'man', 'woman', 'child', 'children', 'kid', 'kids', 'baby', 'friend', 'friends',
    'mother', 'father', 'mom', 'dad', 'parent', 'parents', 'brother', 'sister', 'lover', 'lovers',
    'husband', 'wife', 'teacher', 'student', 'doctor', 'soldier', 'farmer', 'hero', 'heroine',
    'சிறுவன்', 'சிறுமி', 'பையன்', 'பெண்', 'ஆண்', 'குழந்தை', 'தோழன்', 'தோழி', 'நண்பன்', 'நண்பர்கள்',
    'அம்மா', 'அப்பா', 'தாய்', 'தந்தை', 'காதலன்', 'காதலி', 'கணவன்', 'மனைவி', 'ஆசிரியர்', 'மாணவன்', 'விவசாயி'
  ]);

  const EVENT_WORDS = new Set([
    'competition', 'contest', 'race', 'match', 'tournament', 'game', 'fight', 'battle', 'war',
    'farewell', 'wedding', 'marriage', 'festival', 'celebration', 'party', 'journey', 'travel', 'trip',
    'exam', 'test', 'interview', 'meeting', 'reunion', 'rebellion', 'protest', 'sacrifice',
    'போட்டி', 'பந்தயம்', 'விளையாட்டு', 'சண்டை', 'போர்', 'பிரிவு', 'பிரிவுபசார', 'திருமணம்', 'விழா',
    'பண்டிகை', 'பயணம்', 'தேர்வு', 'சந்திப்பு'
  ]);

  const FEEL_WORDS = new Set([
    'feel', 'feeling', 'emotional', 'emotion', 'sad', 'sadness', 'happy', 'happiness', 'joy',
    'pain', 'heartbreak', 'sorrow', 'grief', 'tear', 'tears', 'humor', 'funny', 'comedy',
    'romantic', 'romance', 'love', 'suspense', 'thrill', 'thrilling', 'horror', 'fear',
    'fearful', 'calm', 'peace', 'peaceful', 'hope', 'hopeful', 'inspire', 'inspiring',
    'உணர்ச்சி', 'சோகம்', 'மகிழ்ச்சி', 'வலி', 'பிரிவு', 'காதல்', 'நகைச்சுவை', 'திகில்', 'அமைதி', 'நம்பிக்கை'
  ]);

  let place = null;
  let setting = null;
  const characters = [];
  let event = null;
  let feel = null;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wLower = w.toLowerCase();

    if (FEEL_WORDS.has(wLower)) {
      feel = feel ? `${feel}, ${w}` : w;
      continue;
    }

    if (CHARACTER_WORDS.has(wLower)) {
      characters.push(w);
      continue;
    }

    if (SETTING_WORDS.has(wLower)) {
      setting = setting ? `${setting}, ${w}` : w;
      continue;
    }

    // Check compound events (e.g., "rock competition", "farewell party")
    if (i < words.length - 1) {
      const nextWord = words[i + 1].toLowerCase();
      if ((EVENT_WORDS.has(nextWord) || nextWord.includes('competition') || nextWord.includes('match')) && !SETTING_WORDS.has(nextWord)) {
        event = `${w} ${words[i + 1]}`;
        i++;
        continue;
      }
    }

    if (EVENT_WORDS.has(wLower)) {
      event = event ? `${event}, ${w}` : w;
      continue;
    }

    // Place / named location identification (e.g. Pallathur, Madurai, etc.)
    if (!place && !STOPWORDS.has(wLower)) {
      if (!SETTING_WORDS.has(wLower) && !CHARACTER_WORDS.has(wLower) && !EVENT_WORDS.has(wLower) && !FEEL_WORDS.has(wLower)) {
        place = w;
      }
    }
  }

  return {
    rawPrompt,
    keywords,
    place,
    setting,
    characters,
    event,
    feel,
    summary: [
      place ? `Place: ${place}` : '',
      setting ? `Setting: ${setting}` : '',
      characters.length ? `Characters: ${characters.join(', ')}` : '',
      event ? `Main Event: ${event}` : '',
      feel ? `Feel/Tone: ${feel}` : ''
    ].filter(Boolean).join(' | ')
  };
}

/**
 * Builds a structured user prompt containing complete generation context and anchor directives.
 */
function buildStructuredUserPrompt(params = {}) {
  const {
    prompt = '',
    mode = 'poem',
    poemType,
    genre,
    tone = 'natural',
    length = 'medium',
    language = 'ta',
    platform,
    style,
    format,
    mediaContext
  } = params;

  const rawInput = (prompt || '').trim();
  const langDisplay = langName(language === 'tanglish' ? 'ta' : language);
  const anchors = extractContentAnchors(rawInput);

  let contentTypeLabel = 'Creative Writing';
  if (mode === 'poem') {
    contentTypeLabel = `Poem (${poemType || (language === 'ta' ? 'மரபுக் கவிதை' : 'Free Verse')})`;
  } else if (mode === 'story') {
    contentTypeLabel = `Short Story (Genre: ${genre || 'General'})`;
  } else if (mode === 'creator') {
    contentTypeLabel = `Social Content (${platform || 'Instagram'} - ${format || 'Post'})`;
  }

  const structuredContext = {
    userInput: rawInput,
    contentType: contentTypeLabel,
    genre: genre || 'None specified',
    tone: tone || 'Natural',
    mood: anchors.feel || tone || 'Natural',
    language: language === 'tanglish' ? 'Tanglish (Romanized Tamil + English)' : langDisplay,
    length: length || 'medium',
    otherOptions: {
      poemType: poemType || undefined,
      platform: platform || undefined,
      style: style || undefined,
      format: format || undefined
    }
  };

  let mediaSummary = '';
  if (mediaContext) {
    const mc = mediaContext;
    mediaSummary = `
[VISUAL MEDIA CONTEXT]:
- Type: ${mc.mediaType || 'visual media'}
${mc.category ? `- Category: ${mc.category}` : ''}
${mc.scene ? `- Setting/Location: ${mc.scene}` : ''}
${(mc.subjects || mc.objects)?.length ? `- Main Subjects: ${(mc.subjects || mc.objects).join(', ')}` : ''}
${mc.mood ? `- Mood: ${mc.mood}` : ''}
`;
  }

  const anchorItems = [];
  if (anchors.place) anchorItems.push(`- Place/Location: ${anchors.place}`);
  if (anchors.setting) anchorItems.push(`- Setting/Environment: ${anchors.setting}`);
  if (anchors.characters.length) anchorItems.push(`- Characters: ${anchors.characters.join(', ')}`);
  if (anchors.event) anchorItems.push(`- Main Event/Plot: ${anchors.event}`);
  if (anchors.feel) anchorItems.push(`- Requested Feel: ${anchors.feel}`);
  if (anchors.keywords.length && anchorItems.length === 0) {
    anchorItems.push(`- Key Anchors: ${anchors.keywords.join(', ')}`);
  }

  return `[STRUCTURED GENERATION REQUEST]
${JSON.stringify(structuredContext, null, 2)}
${mediaSummary}
USER'S ACTUAL INPUT (PRIMARY SOURCE OF TRUTH):
"${rawInput}"

CONTENT ANCHORS TO WEAVE INTO THE WORK:
${anchorItems.length > 0 ? anchorItems.join('\n') : `- Topic: ${rawInput}`}

MANDATORY GENERATION DIRECTIVES:
1. WHAT TO WRITE ABOUT: The user's actual input is the primary source of the content. Every generated scene or verse MUST revolve around the anchors above (${anchors.summary || rawInput}).
2. NO GENERIC SUBSTITUTION: Never replace the user's topic with a generic template or invent an unrelated story.
3. GENRE ROLE: The selected genre ("${genre || 'General'}") provides the stylistic framework/backdrop only. It must NEVER override the user's specific topic.
4. TONE ROLE: The selected tone ("${tone}") controls HOW the content is written (style, vocabulary, emotional depth, pacing, dialogue), not WHAT it is about.
${getToneGuideline(tone, language)}
5. LANGUAGE: Write strictly in ${language === 'tanglish' ? 'Tanglish' : langDisplay}.
6. NO FILLER OR CLICHÉS: Begin immediately with the first line of creative content. No preamble, no meta-announcements, no markdown header titles.`;
}

/**
 * Builds the Master System Prompt based on generation parameters
 */
function buildSystemPrompt(params = {}) {
  const mode = params.mode || 'poem';
  const language = params.language === 'en' ? 'en' : (params.language === 'tanglish' ? 'tanglish' : 'ta');
  const poemType = params.poemType || (language === 'ta' ? 'வெண்பா' : 'Free Verse');
  const genre = params.genre || 'generic';
  const tone = params.tone || 'inspirational';
  const length = params.length || 'medium';
  const platform = params.platform || 'instagram-post';
  const style = params.style || 'aesthetic';
  const format = params.format || 'quote';
  const romanizedInput = Boolean(params.romanizedInput);

  const langDisplay = langName(language);
  const isClassical = CLASSICAL_TAMIL_FORMS.includes(poemType);

  let modeSpecificRules = '';

  if (mode === 'poem') {
    const formRules = isClassical ? getClassicalTamilRules(poemType) : getWesternPoemRules(poemType);

    modeSpecificRules = `
[MODE: POEM GENERATION]
${formRules}
${getToneGuideline(tone, language)}
${getLengthGuideline(length, 'poem')}
POETIC LINE BREAK RULE:
- Preserve genuine poetic line breaks (one verse/line per line).
- Do not compress lines into a single running paragraph.
- Use line breaks meaningfully for cadence and rhythm.
`;
  } else if (mode === 'story') {
    modeSpecificRules = `
[MODE: STORY GENERATION]
GENRE FRAMEWORK: ${genre}
(CRITICAL: The genre defines ONLY the atmospheric backdrop and creative framework. It must NEVER override or replace the user's specific topic with generic ${genre} tropes.)
${getToneGuideline(tone, language)}
${getLengthGuideline(length, 'story')}
NARRATIVE RULES:
- Write coherent narrative prose in structured paragraphs.
- Must follow a complete narrative arc: Exposition/Hook -> Inciting Incident & Tension -> Resolution/Insight.
- Must include at least 2 distinct lines of vivid spoken character dialogue with appropriate punctuation.
- NEGATIVE CONSTRAINT: FORBIDDEN: verse, rhyming lines, stanzas, or isolated numbered bullet points. Output genuine, immersive prose.
`;
  } else if (mode === 'creator') {
    const isLinkedIn = (platform || '').toLowerCase().includes('linkedin');
    modeSpecificRules = `
[MODE: CONTENT CREATOR]
TARGET PLATFORM: ${platform}
${getPlatformRules(platform)}
${getStyleGuideline(style)}
${getFormatRules(format)}
${getToneGuideline(tone, language)}

==================================================
CONTENT CREATOR PHILOSOPHY & HUMAN VOICE DIRECTIVE:
1. CORE PRINCIPLE — MEDIA FIRST, NEVER INVERT PRIORITIES:
   - MEDIA = WHAT THE CONTENT IS ABOUT (The grounded source of truth)
   - USER REQUEST = WHAT THEY WANT (The creative instruction and direction)
   - PLATFORM = WHERE IT WILL BE USED (${platform})
   - TONE/STYLE = HOW IT SHOULD SOUND (${tone} / ${style})
   - LANGUAGE = HOW IT SHOULD BE EXPRESSED (${langDisplay})
   - CREATIVITY = HOW INTERESTING THE FINAL WRITING SHOULD FEEL

2. THE "HUMAN CREATOR" INTERNAL PERSPECTIVE:
   Before generating, think like a thoughtful, creative human creator:
   - What would a real person notice first when looking at this photo or video?
   - What is interesting, unique, or memorable about this particular moment?
   - What emotion, story, or message does this visual naturally communicate?
   - What would make someone stop scrolling?
   - What would a real human actually say about this?
   - What detail makes this media different from a generic stock photo or video?

3. THE "HUMAN TEST" (MANDATORY INTERNAL QUALITY FILTER):
   "If I remove the uploaded media and give this exact text to 10 completely different images or videos, would it still make sense?"
   If YES, the text is too generic! You MUST rewrite it using specific details from the actual uploaded media.

4. STRICT BANNED AI CLICHÉS & BUZZWORDS (DO NOT USE BY DEFAULT):
   - "In today's fast-paced digital world..."
   - "Seamless execution is the bridge between..."
   - "Transforming ideas into impactful solutions..."
   - "Embracing the journey..."
   - "Creating meaningful experiences..."
   - "Unlocking new possibilities..."
   - "Where creativity meets innovation..."
   - "Capturing moments that last forever..."
   - "Making memories that will last a lifetime..."
   - "Every moment is special..."
   - "Living my best life..."
   - "Delivering seamless excellence..."
   - "A testament to..."
   Instead, use specific details and natural human observations from the actual visual.

5. OUTPUT FORMAT DIRECTIVE:
   ${isLinkedIn ? `Since the target platform is LINKEDIN:
   Output an authentic, well-structured professional LinkedIn post:
   - Strong, grounded opening hook stating the real moment/project/demo
   - Clear context: what is happening, what was built or achieved, and what problem was tackled
   - Sincere human takeaway or lesson learned (avoiding corporate hype)
   - Engaging concluding question for the community
   - 3 to 5 targeted professional hashtags` : `Unless the user explicitly specifies a different single-item format, structure standard caption generation with distinct creative directions:
   ✨ OPTION 1 — CINEMATIC
   [A cinematic, atmospheric caption capturing the visual depth and sensory details]

   ✨ OPTION 2 — NATURAL / HUMAN
   [A genuine, personal observation written in an authentic human voice, honest feeling, and candid conversational warmth]

   ✨ OPTION 3 — TRENDY / SOCIAL
   [A relatable, punchy, modern social-media-style caption tailored for mobile feeds]

   🎬 ORIGINAL CINEMATIC LINE
   [An original, memorable punchline or quote inspired by the visual mood]

   🏷 HASHTAGS
   #tag1 #tag2 #tag3 #tag4 #tag5 #tag6`}

   - If user requested Reel content:
     🎬 Reel Hook: [Arresting visual hook for the first 2-3 seconds]
     📝 Caption: [Engaging, rhythmic 2-3 sentence reel caption]
     🔥 Short Punch Line: [Memorable ending punch line]
     #️⃣ Hashtags: [5-8 targeted hashtags]
     📣 Optional CTA: [Save / Share / Comment prompt]

   - If user requested Story content:
     ✨ [Ultra-concise, aesthetic story line suitable for Instagram/WhatsApp mobile story overlay]

   - If user requested YouTube Shorts:
     🎬 Title: [High-retention video title]
     🔥 Hook: [Opening hook matching the video motion]
     📝 Short Description: [Engaging description]
     #️⃣ Hashtags: #Shorts [plus 3-5 targeted tags]

6. EMOJIS & HASHTAGS:
   - Use 2 to 8 relevant emojis carefully chosen to match the actual visuals (e.g. sunset: 🌅 🌇 ✨ 🌊; food: 🍕 🍜 ☕ 😋; tech/demo: 💻 🚀 💡 🎯; friends: 🫶 😂 ❤️).
   - DO NOT place an emoji after every single word. Avoid emoji clutter.
   - Generate 5 to 10 targeted hashtags directly reflecting the visible scene, mood, and language. Do not output 30-50 generic hashtags.

7. ORIGINALITY & MOVIE-STYLE GUIDANCE:
   - When the user asks for "movie dialogue", "mass dialogue", "hero entry vibe", or "cinematic lines":
     Generate 100% ORIGINAL, evocative wording capturing that electrifying mood.
     ABSOLUTELY FORBIDDEN: Copying, reproducing, or quoting copyrighted movie dialogues, famous punchlines, or protected song lyrics.
     Do NOT present generated lines as actual quotes from any existing film.

8. ZERO HALLUCINATION SAFEGUARDS:
   - Never invent: brand names, prices, discounts, unverified statistics, fake achievements, or sensitive personal attributes.
   - For travel: if location is unknown, use evocative general travel language (e.g. "Somewhere between the road and the sky. 🌄").
   - For food: ground the copy in the visible plate, presentation, and appetizing aesthetic.
   - For products: highlight visible craftsmanship, texture, and styling without medical or unverified performance claims.
   - For people/selfies: reflect visible outfit vibe, lighting, posture, and expression; do not identify real persons or assume private personal details.
   - For tech/demos: focus on the visible application, UI walkthrough, code, or presentation without fabricating fake company names or client metrics.
==================================================
`;
  }

  // Translanguaging & Language Enforcement
  let languageDirective = '';
  if (language === 'tanglish') {
    languageDirective = `
==================================================
CRITICAL MANDATORY LANGUAGE DIRECTIVE: TARGET = TANGLISH (தமிழ் + ஆங்கிலம் கலவை)
INPUT UNDERSTANDING: Understand the user's input regardless of whether it is written in Tamil script, Romanized Tamil (Tanglish), plain English, or a mix.
1. TARGET OUTPUT LANGUAGE IS NATURAL CONVERSATIONAL TANGLISH.
2. Write in authentic Romanized Tamil words blended naturally with English (e.g. "Sunset paakumbodhu, life konjam slow-ah poganum pola irukku. 🌅").
3. Keep the cadence rhythmic, authentic, youth-centric, and natural to modern Tamil social media conversation.
4. Do NOT output textbook formal Tamil script or pure English when Tanglish is requested.
5. OUTPUT LANGUAGE RULE: The selected output language (Tanglish) is the FINAL AUTHORITY. Do not switch to formal Tamil or pure English mid-response.
==================================================
`;
  } else if (language === 'ta') {
    languageDirective = `
==================================================
CRITICAL MANDATORY LANGUAGE DIRECTIVE: TARGET = TAMIL (தமிழ்)
INPUT UNDERSTANDING: Understand the user's input regardless of whether it is written in:
- Native Tamil script (தமிழ் எழுத்துகள்)
- Romanized Tamil / Tanglish (e.g. "sabari matrum kani iruvarum kadhalargal", "kadhal kavithai")
- Plain English (e.g. "Sabari and Kani are lovers")
- Any mixed-language combination

OUTPUT LANGUAGE RULE: The selected output language is TAMIL. This is the FINAL AUTHORITY.
1. EVERY SINGLE WORD OF THE OUTPUT MUST BE WRITTEN IN NATIVE TAMIL SCRIPT (தமிழ் எழுத்துகளில் மட்டுமே).
2. NEVER infer the output language from the input language. Even if the user typed in English or Tanglish, the OUTPUT must be in Tamil.
3. ABSOLUTELY FORBIDDEN: Writing in English, Latin alphabet letters, Hindi, Malayalam, Telugu, or any other script for prose/verse content.
4. Do NOT copy, transliterate, or echo the user's English or Romanized Tamil letters into the output.
5. Do NOT switch languages in the middle of the response.
6. Do NOT randomly introduce Hindi, Malayalam, Telugu, Kannada, Bengali, or other languages.
7. EXCEPTION (allowed): Proper nouns (names like Sabari, Kani), unavoidable technical terms, URLs, hashtags, and brand names may appear where contextually appropriate — but the surrounding prose must be Tamil.
8. Prefer natural, expressive Tamil prose. Do NOT generate Romanized Tamil/Tanglish output unless Tanglish is explicitly selected as the output format.
==================================================
`;
  } else {
    languageDirective = `
==================================================
CRITICAL MANDATORY LANGUAGE DIRECTIVE: TARGET = ENGLISH
INPUT UNDERSTANDING: Understand the user's input regardless of whether it is written in:
- English
- Tamil script (தமிழ்)
- Romanized Tamil / Tanglish (e.g. "sabari matrum kani kadhalargal")
- Any mixed-language combination

OUTPUT LANGUAGE RULE: The selected output language is ENGLISH. This is the FINAL AUTHORITY.
1. Output exclusively in English Latin script.
2. NEVER infer the output language from the input language. Even if the user typed in Tamil or Tanglish, the OUTPUT must be in English.
3. Do NOT switch to Tamil, Tanglish, Hindi, or any other language mid-response.
4. Do NOT randomly introduce Tamil script, Devanagari, or other non-Latin scripts into the prose.
5. EXCEPTION (allowed): Proper nouns (names, places), unavoidable technical terms, URLs, and hashtags may remain as-is where appropriate.
6. Generate natural, fluent English prose. Do not use broken English or echo the input language.
==================================================
`;
  }

  // Media-Aware Creative Generation Directive
  let mediaDirective = '';
  if (params.mediaContext) {
    const mc = params.mediaContext;
    mediaDirective = `
==================================================
CRITICAL REQUIREMENT: MEDIA-AWARE CREATIVE GENERATION
The user uploaded an ${mc.mediaType || 'image/video'}.
VISUAL MEDIA CONTEXT:
- Media Type: ${mc.mediaType || 'visual'}
${mc.category ? `- Category: ${mc.category}` : ''}
${mc.scene ? `- Setting/Location: ${mc.scene}` : ''}
${(mc.subjects || mc.objects) && (mc.subjects || mc.objects).length ? `- Main Subjects/Objects: ${(mc.subjects || mc.objects).join(', ')}` : ''}
${mc.actions && mc.actions.length ? `- Observed Actions in Frames: ${mc.actions.join(' -> ')}` : ''}
${mc.emotion ? `- Emotion & Expressions: ${mc.emotion}` : ''}
${mc.setting ? `- Setting & Lighting: ${mc.setting}` : ''}
${mc.visual_style ? `- Visual Style: ${mc.visual_style}` : ''}
${mc.important_events && mc.important_events.length ? `- Key Events Across Frames: ${mc.important_events.join(' | ')}` : ''}
${mc.dialogueMood ? `- Dialogue Mood: ${mc.dialogueMood}` : ''}
${mc.captionIdeas && mc.captionIdeas.length ? `- Grounded Caption Concepts: ${mc.captionIdeas.join(' | ')}` : ''}
${mc.dialogueSuggestions && mc.dialogueSuggestions.length ? `- Dialogue Suggestions: ${mc.dialogueSuggestions.join(' | ')}` : ''}
${mc.matchReason ? `- Visual Grounding Context: ${mc.matchReason}` : ''}
${mc.peopleContext ? `- People Context: ${mc.peopleContext}` : ''}
${mc.foodDetails ? `- Food Presentation: ${mc.foodDetails}` : ''}
${mc.productDetails ? `- Product Styling: ${mc.productDetails}` : ''}
${mc.lighting ? `- Lighting: ${mc.lighting}` : ''}
${mc.mood ? `- Mood & Emotional Atmosphere: ${mc.mood}` : ''}
${mc.colors && mc.colors.length ? `- Dominant Colors: ${mc.colors.join(', ')}` : ''}
${mc.visualTheme ? `- Visual Aesthetic Theme: ${mc.visualTheme}` : ''}
${mc.activity ? `- Action/Activity: ${mc.activity}` : ''}
${mc.distinctiveDetails ? `- Distinctive Elements: ${mc.distinctiveDetails}` : ''}
${mc.openingHook ? `- Video Opening Frame: ${mc.openingHook}` : ''}
${mc.keyActions && mc.keyActions.length ? `- Video Movements: ${mc.keyActions.join(' -> ')}` : ''}
${mc.endingMoment ? `- Video Ending Scene: ${mc.endingMoment}` : ''}
${mc.summary ? `- Overview: ${mc.summary}` : ''}

MANDATORY RULES FOR MEDIA-AWARE OUTPUT:
1. Your generated content MUST be genuinely inspired by and relevant to this visual media.
2. Connect the visual details, mood, and setting with the selected platform (${platform}), visual style (${style}), card format (${format}), and language (${langDisplay}).
3. Do NOT invent completely unrelated storylines or generic motivational quotes that contradict the image/video.
4. Do NOT simply mechanically list objects or say "In this image we see...". Instead, creatively channel the imagery, atmosphere, and essence of the media into captivating literature/social copy.
${mc.mediaType === 'video' ? `
SPECIAL RULES FOR VIDEO GENERATION:
- Ground your output in the actual observed movements and scene actions (${mc.actions?.join(', ') || mc.scene || 'video scene'}).
- Unless the user specifically asks for another format (like haiku or short story), provide:
  * Caption: A scene-grounded creative caption matching the tone (${tone}).
  * Dialogue-style: An original trending-style / reel-style dialogue suggestion inspired by the visual mood. (Do NOT copy long copyrighted movie dialogues; create 100% original cinematic lines).
  * Mood: The emotional and visual aesthetic mood.
  * Reason: A concise 1-2 sentence explanation of why the caption and dialogue match the actual visual scene in the frames.
- COPYRIGHT & TRENDING INTEGRITY:
  * Do NOT reproduce copyrighted movie dialogues word-for-word.
  * All dialogue suggestions must be 100% ORIGINAL dialogue-style lines inspired by the scene.
  * Clearly label them as original dialogue-style suggestions (e.g. "Trending-style Dialogue" or "Reel Dialogue Suggestion").
  * Do NOT falsely claim that a dialogue is currently trending in real-world charts.
- LANGUAGE FIDELITY:
  * Output strictly in ${langDisplay}. Caption, Dialogue-style, and Reason must all be in ${langDisplay}.
` : ''}
==================================================
`;
  }

  return `You are DreamInk AI, a controlled creative writing engine, world-class master poet, literary author, and multilingual creative artisan.
Generate content strictly based on the user's actual request.

${languageDirective}
${mediaDirective}

==================================================
CORE GROUNDING PRINCIPLES (HIGHEST PRIORITY):
1. USER INPUT = WHAT TO WRITE ABOUT
   - THE USER'S ACTUAL INPUT IS THE PRIMARY SOURCE OF THE CONTENT.
   - Do NOT generate random content.
   - Do NOT use generic filler.
   - Do NOT ignore keywords.
   - Do NOT replace user-provided concepts with your own concepts.
   - Do NOT invent an unrelated story just because a genre is selected.

2. STRICT PRIORITY HIERARCHY:
   1. USER'S ACTUAL INPUT / KEYWORDS (Highest Priority)
   2. SELECTED CONTENT TYPE
   3. SELECTED GENRE
   4. SELECTED TONE / MOOD / FEEL
   5. SELECTED LANGUAGE
   6. SELECTED LENGTH
   7. OTHER USER-SELECTED OPTIONS
   The model must never allow a generic genre template to override the user's actual topic.

3. STRICT INPUT GROUNDING:
   - Expand the user's keywords creatively, but preserve their semantic identity.
   - If the user provides only keywords, infer reasonable connections between those keywords, but do not introduce unrelated major concepts.
   - Every major part of the output must remain relevant to the user's requested topic.
   - Creativity must come from wording, imagery, emotion, pacing, dialogue, atmosphere, and narrative development — not from changing the user's subject.

4. TONE CONTROLS HOW THE CONTENT IS WRITTEN (STYLE & EMOTIONAL DEPTH):
   - The selected tone MUST genuinely and noticeably influence the generation style, emotional depth, vocabulary, pacing, descriptions, and dialogue.
   - TONE MUST NOT OVERRIDE USER INTENT: Keep the user's topic, characters, names, important facts, requested format, and selected output language intact. Tone modifies HOW the story or poem is told, NOT WHAT it is about.
   - STRICT PRIORITY HIERARCHY:
     1. User intent / requested content & anchors (Highest)
     2. Selected output language (${langDisplay} is FINAL AUTHORITY — tone must NEVER change output language)
     3. Selected tone/style (${tone})
     4. Requested length/format/action
     5. Creativity and style enhancements
   - TONE DIFFERENTIATION: Distinct tone options must produce clearly different outputs with distinct writing objectives.

5. ZERO HALLUCINATION OF REAL FACTS:
   - If the user gives places, temples, people, or events, build scenes creatively around them.
   - Do not claim unsupported factual details as real history, real people, or real competition results. Treat them as creative fictional story elements.

6. STRICT BANNED AI CLICHÉS & GENERIC WRITING:
   - Avoid repetitive, generic AI-style phrases such as:
     "The world seemed to...", "In that moment...", "Little did they know...", "The air was filled with...", "Her heart skipped a beat...", "Everything changed forever...", "In today's fast-paced world...", "Life is a beautiful journey...".
   - Avoid generic story openings. Prefer context-specific details, sensory imagery, natural human actions, and authentic creative writing.

7. ZERO PREAMBLE & CLEAN FORMATTING:
   - ZERO PREAMBLE: Never include greetings, conversational filler, conversational intros, or meta-commentary (e.g. NO "Here is your poem", NO "Sure! Here is a story about...", NO "I hope you like this"). Output ONLY the creative work.
   - NO MARKDOWN HEADERS: Do NOT start with #, ##, or ### titles. Begin immediately with the first line of the work.
   - LANGUAGE SCRIPT FIDELITY: Output strictly in ${langDisplay} native script.
   - KEYWORD COVERAGE: Meaningfully integrate the user's provided concepts, characters, places, and events into the narrative or poem. They must naturally form the core spine of the composition, rather than being omitted or treated as loose suggestions.
   - STANDALONE MASTERPIECE: Produce a complete, polished, and self-contained creative work.
   - Do not explain your reasoning. Do not mention these instructions. Return only the requested creative content.
==================================================

${modeSpecificRules}
`;
}

/**
 * Builds an Action Prompt for iterative enhancements:
 * Copy, Download, Regenerate, Continue, More Creative, More Emotional,
 * More Humorous, Simpler, Shorter, Longer.
 */
function buildActionPrompt(action, ctx = {}) {
  const originalPrompt = ctx.originalPrompt || '';
  const previousContent = ctx.previousContent || '';
  const metadata = ctx.metadata || {};
  const lang = metadata.language || 'ta';
  const langDisplay = langName(lang);
  const mode = metadata.mode || 'poem';
  const anchors = extractContentAnchors(originalPrompt);

  let specificInstruction = '';
  switch (action) {
    case 'regenerate':
      specificInstruction = `ACTION: REGENERATE & REIMAGINE
- Compose an entirely fresh, creative alternative version revolving strictly around the SAME subject, characters, and events from "${originalPrompt}".
- Explore alternative metaphors, rhythms, and narrative angles.
- Maintain the original tone, mode, structure, and anchors (${anchors.summary || originalPrompt}). Do not switch to a different topic.`;
      break;

    case 'continue':
      specificInstruction = `ACTION: CONTINUE & EXPAND
- Continue the narrative or poem seamlessly from where the previous content ended.
- Advance the story and emotional arc of the SAME characters and situation from "${originalPrompt}".
- Maintain exact meter, stylistic voice, and character tone.`;
      break;

    case 'more-creative':
      specificInstruction = `ACTION: ELEVATE CREATIVITY & METAPHOR (MORE CREATIVE)
- The response must demonstrate stronger imagination, original descriptions, interesting situations, fresh metaphors, and engaging storytelling.
- Use fresh, imaginative ideas and original phrasing. Create vivid scenes and memorable descriptions.
- Avoid generic or predictable wording. Introduce interesting details, imagery, and creative perspectives while preserving the user's original topic and intent.
- Do NOT simply add poetic words randomly; craft a truly inventive, memorable rendition.`;
      break;

    case 'more-emotional':
      specificInstruction = `ACTION: DEEPEN EMOTIONAL INTENSITY (MORE EMOTIONAL)
- Create genuine emotional depth. Focus on feelings, relationships, internal reactions, meaningful moments, atmosphere, and emotional progression.
- Avoid simply adding words like 'sad', 'love', or 'heart'. Show emotion through situations, thoughts, actions, dialogue, and meaningful details.
- Deepen the emotional resonance while preserving the exact same characters, setting, and plot from "${originalPrompt}".`;
      break;

    case 'more-humorous':
      specificInstruction = `ACTION: INJECT WIT & HUMOR (MORE HUMOROUS)
- Use natural, context-appropriate humor. Prefer witty observations, playful situations, light irony, or amusing dialogue where appropriate.
- Do not force jokes into serious situations. Keep the humor organic and engaging while preserving the exact subject matter and characters from "${originalPrompt}".`;
      break;

    case 'simpler':
      specificInstruction = `ACTION: SIMPLER WORDS & DICTION
- Rewrite using crystal-clear, accessible, and universally relatable everyday vocabulary with simpler sentences.
- Use simple, natural, easy-to-understand language. Prefer shorter sentences and familiar vocabulary.
- Do not unnecessarily simplify away important meaning from "${originalPrompt}".`;
      break;

    case 'shorter':
      specificInstruction = `ACTION: SHORTER & CONCISE
- Condense the composition to approximately HALF (~50%) its current length.
- Produce a genuinely shorter version. Remove repetition, unnecessary descriptions, and filler.
- Preserve the central idea, important details, characters, and emotional meaning from "${originalPrompt}".`;
      break;

    case 'longer':
      specificInstruction = `ACTION: LONGER & EXPANDED
- Expand the composition to approximately DOUBLE (~200%) its current length.
- Meaningfully expand the content. Add relevant details, scenes, explanations, descriptions, dialogue, emotions, or context.
- Do not repeat the same information just to increase length; develop the world, narrative, and characters deeply.`;
      break;

    case 'rewrite-originally':
      specificInstruction = `ACTION: REWRITE MORE ORIGINALLY & UNIQUELY
- Rewrite this content to reduce distinctive phrase overlap and eliminate any potential similarity.
- Preserve: topic, emotional intent, requested language (${langDisplay}), and content mode (${mode}).
- Change: wording, imagery, metaphors, sentence structure, and distinctive expressions.
- Maintain strict fidelity to the original prompt anchors: "${originalPrompt}".`;
      break;

    default:
      specificInstruction = `ACTION: REFINE AND POLISH`;
  }

  let mediaContextInstruction = '';
  if (ctx.mediaContext) {
    const mc = ctx.mediaContext;
    mediaContextInstruction = `
VISUAL MEDIA CONTEXT TO PRESERVE ACROSS THIS ACTION:
- Media Type: ${mc.mediaType || 'visual media'}
${mc.category ? `- Category: ${mc.category}` : ''}
${mc.scene ? `- Setting/Scene: ${mc.scene}` : ''}
${(mc.subjects || mc.objects)?.length ? `- Visual Elements: ${(mc.subjects || mc.objects).join(', ')}` : ''}
${mc.actions && mc.actions.length ? `- Observed Actions: ${mc.actions.join(' -> ')}` : ''}
${mc.emotion ? `- Emotion: ${mc.emotion}` : ''}
${mc.setting ? `- Setting: ${mc.setting}` : ''}
${mc.matchReason ? `- Visual Grounding Context: ${mc.matchReason}` : ''}
${mc.mood ? `- Mood: ${mc.mood}` : ''}
${mc.visualTheme ? `- Visual Theme: ${mc.visualTheme}` : ''}
${mc.foodDetails ? `- Food Presentation: ${mc.foodDetails}` : ''}
${mc.productDetails ? `- Product Styling: ${mc.productDetails}` : ''}

CRITICAL: Strictly ground this refined version in the uploaded ${mc.mediaType || 'media'} context above. Do not lose the connection to what is visually depicted!
`;
  }

  return `[ITERATIVE REFINEMENT REQUEST]
${specificInstruction}
${mediaContextInstruction}

CONTEXT — DO NOT CHANGE:
- Original Prompt: "${originalPrompt}"
- Target Language: ${langDisplay} (Must write strictly in ${langDisplay} native script)
- Mode: ${mode}

CRITICAL GROUNDING DIRECTIVE:
You MUST maintain the EXACT same subject matter, characters, setting, and plot elements from the original request: "${originalPrompt}". Do NOT create an unrelated topic or story. Modify ONLY the presentation, emotional intensity, pacing, or continuation of the SAME existing scenario.

PREVIOUS COMPOSITION TO REFINE:
"""
${previousContent}
"""

REFINED OUTPUT (Zero preamble, immediate creative text):`;
}

module.exports = {
  buildSystemPrompt,
  buildActionPrompt,
  extractContentAnchors,
  buildStructuredUserPrompt,
  CLASSICAL_TAMIL_FORMS,
  LANGUAGE_NAMES,
  langName,
  getWesternPoemRules,
  getClassicalTamilRules,
  getLengthGuideline,
  getFormatRules,
  getPlatformRules,
  getStyleGuideline,
  getToneGuideline,
  TONE_INSTRUCTIONS
};

