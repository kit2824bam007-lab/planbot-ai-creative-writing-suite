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
  if (norm.includes('instagram-story') || (norm.includes('story') && !norm.includes('short'))) {
    return `PLATFORM RULES: INSTAGRAM STORY
- Structure: Short, story-friendly text suited for instant reading on mobile stories.
- Brevity: Highly concise (1 to 3 impactful lines) that fits cleanly over visual media without clutter.
- Tone: Intimate, direct, visually compatible.`;
  }
  if (norm.includes('reel') || norm.includes('instagram-reel')) {
    return `PLATFORM RULES: INSTAGRAM REEL
- Hook: An arresting first line/hook to stop scrolling in the first second.
- Caption: Short, punchy caption (2 to 3 sentences) synchronized with high-energy visual rhythm.
- Call to Action (CTA): Optional engaging prompt to save, share, or comment.
- Hashtags: 5 to 8 targeted trending hashtags.`;
  }
  if (norm.includes('whatsapp') || norm.includes('status')) {
    return `PLATFORM RULES: WHATSAPP STATUS
- Structure: Short, deeply expressive, heartfelt personal statement.
- Style: Crisp, emotional resonance suitable for personal contact circles.
- Clean presentation without excessive hashtag blocks.`;
  }
  if (norm.includes('twitter') || norm.includes('x-post')) {
    return `PLATFORM RULES: TWITTER / X POST
- Structure: Concise, high-impact post with a powerful opening hook.
- Character Economy: Sharp and memorable phrasing.
- Hashtags: 2 to 3 relevant hashtags maximum.`;
  }
  if (norm.includes('linkedin')) {
    return `PLATFORM RULES: LINKEDIN POST
- Tone: Professional, articulate, thought-provoking, and inspiring.
- Content: Connects the visual theme or subject to career insight, leadership, personal growth, or creative discipline.
- Spacing: Clean single-line breaks for scannability. Minimal, purposeful hashtags.`;
  }
  if (norm.includes('facebook')) {
    return `PLATFORM RULES: FACEBOOK POST
- Tone: Warm, conversational, friendly, and community-oriented.
- Engagement: Encourages friends and followers to share thoughts, relate, or reminisce.`;
  }
  if (norm.includes('youtube') || norm.includes('shorts')) {
    return `PLATFORM RULES: YOUTUBE SHORTS
- Hook: High-energy opening hook designed for rapid short-form video retention.
- Caption: Short, engaging description matching the video journey.
- Call to Action (CTA): Prompt to like, comment, or subscribe.
- Hashtags: #Shorts plus 3 to 5 topic-specific tags.`;
  }
  // Default: Instagram Post
  return `PLATFORM RULES: INSTAGRAM POST
- Structure: Engaging, aesthetically pleasing caption with an attractive opening.
- Body: Well-spaced, evocative sentences with strong sensory appeal.
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
 * Returns tone guideline with bilingual cues
 */
function getToneGuideline(tone, lang = 'ta') {
  const norm = (tone || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (norm.includes('inspire') || norm.includes('inspirational')) {
    return lang === 'ta'
      ? 'TONE: Inspiring / ஈடுபடுத்தும் ஊக்கம் (Uplifting, fiery, encouraging, building unwavering inner strength).'
      : 'TONE: Inspiring (Uplifting, fiery, encouraging, building unwavering inner strength).';
  }
  if (norm.includes('romantic') || norm.includes('romance')) {
    return lang === 'ta'
      ? 'TONE: Romantic / காதல் நயம் (Sweet tenderness, longing, passionate devotion, poetic warmth).'
      : 'TONE: Romantic (Sweet tenderness, longing, passionate devotion, poetic warmth).';
  }
  if (norm.includes('playful')) {
    return lang === 'ta'
      ? 'TONE: Playful / விளையாட்டுத்தனம் (Witty, lighthearted, cheerful, delightfully mischievous).'
      : 'TONE: Playful (Witty, lighthearted, cheerful, delightfully mischievous).';
  }
  if (norm.includes('serious')) {
    return lang === 'ta'
      ? 'TONE: Serious / தீவிரம் (Grave, profound, earnest, deep contemplative weight).'
      : 'TONE: Serious (Grave, profound, earnest, deep contemplative weight).';
  }
  if (norm.includes('emotional')) {
    return lang === 'ta'
      ? 'TONE: Emotional / உணர்ச்சிப்பூர்வம் (Deeply moving, tearful, stirring the depths of the heart).'
      : 'TONE: Emotional (Deeply moving, stirring the depths of the heart).';
  }
  if (norm.includes('humor')) {
    return lang === 'ta'
      ? 'TONE: Humorous / நகைச்சுவை (Witty, comedic, chuckle-inducing, clever observation).'
      : 'TONE: Humorous (Witty, comedic, chuckle-inducing, clever observation).';
  }
  if (norm.includes('dark')) {
    return lang === 'ta'
      ? 'TONE: Dark / இருண்ட சிந்தனை (Haunting, gothic, shadowy introspective intensity).'
      : 'TONE: Dark (Haunting, gothic, shadowy introspective intensity).';
  }
  if (norm.includes('melanchol')) {
    return lang === 'ta'
      ? 'TONE: Melancholic / புலம்பல் நயம் (Sorrowful, aching, sweet sadness, tender lament).'
      : 'TONE: Melancholic (Sorrowful, aching, sweet sadness, tender lament).';
  }
  if (norm.includes('epic')) {
    return lang === 'ta'
      ? 'TONE: Epic / காவிய நயம் (Grand scale, legendary heroism, monumental grandeur).'
      : 'TONE: Epic (Grand scale, legendary heroism, monumental grandeur).';
  }
  if (norm.includes('philosoph')) {
    return lang === 'ta'
      ? 'TONE: Philosophical / தத்துவார்த்த (Existential wisdom, nature of reality, metaphysical inquiry).'
      : 'TONE: Philosophical (Existential wisdom, nature of reality, metaphysical inquiry).';
  }
  if (norm.includes('spirit') || norm.includes('devotion')) {
    return lang === 'ta'
      ? 'TONE: Spiritual & Devotional / பக்தி & ஆன்மீகம் (Sacred reverence, inner divine peace, surrendered grace).'
      : 'TONE: Spiritual & Devotional (Sacred reverence, inner divine peace, surrendered grace).';
  }
  if (norm.includes('heroic') || norm.includes('patriot')) {
    return lang === 'ta'
      ? 'TONE: Heroic / வீர முழக்கம் (Courageous valor, martial spirit, resounding pride).'
      : 'TONE: Heroic (Courageous valor, martial spirit, resounding pride).';
  }
  if (norm.includes('nostalg')) {
    return lang === 'ta'
      ? 'TONE: Nostalgic / பசுமை நினைவுகள் (Fond remembrance of past days, vintage warmth, yearning for childhood/homeland).'
      : 'TONE: Nostalgic (Fond remembrance of past days, vintage warmth, yearning for yesterday).';
  }
  if (norm.includes('peace') || norm.includes('serene')) {
    return lang === 'ta'
      ? 'TONE: Peaceful & Serene / அமைதி & சாந்தம் (Calm waters, tranquil breath, serene stillness).'
      : 'TONE: Peaceful & Serene (Calm waters, tranquil breath, serene stillness).';
  }
  if (norm.includes('passion') || norm.includes('fiery')) {
    return lang === 'ta'
      ? 'TONE: Passionate / அனல் பறக்கும் ஆர்வம் (Intense flame, fiery yearning, unstoppable emotion).'
      : 'TONE: Passionate (Intense flame, fiery yearning, unstoppable emotion).';
  }
  if (norm.includes('sarcas') || norm.includes('witty')) {
    return lang === 'ta'
      ? 'TONE: Sarcastic & Witty / அங்கதம் & கேலி (Satirical edge, clever irony, biting wit).'
      : 'TONE: Sarcastic & Witty (Satirical edge, clever irony, biting wit).';
  }
  if (norm.includes('hope')) {
    return lang === 'ta'
      ? 'TONE: Hopeful / நம்பிக்கை ஒளி (Dawn after darkness, beacon of optimism, bright horizon).'
      : 'TONE: Hopeful (Dawn after darkness, beacon of optimism, bright horizon).';
  }
  if (norm.includes('heartbreak') || norm.includes('sorrow')) {
    return lang === 'ta'
      ? 'TONE: Heartbreak / இதய வலி & பிரிவு (Wounded soul, unspoken grief, love departed).'
      : 'TONE: Heartbreak (Wounded soul, unspoken grief, love departed).';
  }
  if (norm.includes('nature')) {
    return lang === 'ta'
      ? 'TONE: Nature & Earthy / இயற்கை எழில் (Fragrant soil, rustling leaves, flowing rivers, green serenity).'
      : 'TONE: Nature & Earthy (Fragrant soil, rustling leaves, flowing rivers, green serenity).';
  }
  return `TONE: ${tone}`;
}

/**
 * Builds the Master System Prompt based on generation parameters
 */
function buildSystemPrompt(params = {}) {
  const mode = params.mode || 'poem';
  const language = params.language === 'en' ? 'en' : 'ta';
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
GENRE: ${genre}
${getToneGuideline(tone, language)}
${getLengthGuideline(length, 'story')}
NARRATIVE RULES:
- Write coherent narrative prose in structured paragraphs.
- Must follow a complete narrative arc: Exposition/Hook -> Inciting Incident & Tension -> Resolution/Insight.
- Must include at least 2 distinct lines of vivid spoken character dialogue with appropriate punctuation.
- NEGATIVE CONSTRAINT: FORBIDDEN: verse, rhyming lines, stanzas, or isolated numbered bullet points. Output genuine, immersive prose.
`;
  } else if (mode === 'creator') {
    modeSpecificRules = `
[MODE: CONTENT CREATOR]
TARGET PLATFORM: ${platform}
${getPlatformRules(platform)}
${getStyleGuideline(style)}
${getFormatRules(format)}
`;
  }

  // Translanguaging & Language Enforcement
  let languageDirective = '';
  if (language === 'ta') {
    languageDirective = `
==================================================
CRITICAL MANDATORY LANGUAGE DIRECTIVE: TARGET = TAMIL (தமிழ்)
1. TARGET OUTPUT LANGUAGE IS STRICTLY TAMIL (தமிழ்).
2. EVERY SINGLE WORD OF THE OUTPUT MUST BE WRITTEN IN NATIVE TAMIL SCRIPT (தமிழ் எழுத்துகளில் மட்டுமே).
3. ABSOLUTELY FORBIDDEN: Writing in English, Latin alphabet letters, or Hindi.
4. TRANSLANGUAGING RULE: Even if the user typed their prompt in Tanglish (Romanized Tamil words like "nilavidam solli mudithen unnidam solvadharkku mun", "kadhal", "kavithai") or in English, you MUST interpret its meaning and express the final creative work EXCLUSIVELY IN AUTHENTIC NATIVE TAMIL SCRIPT (தமிழ்).
5. ZERO LATIN SCRIPT ALLOWED: Do NOT copy, transliterate, or echo the user's English letters into the output.
==================================================
`;
  } else {
    languageDirective = `
==================================================
CRITICAL MANDATORY LANGUAGE DIRECTIVE: TARGET = ENGLISH
1. TARGET OUTPUT LANGUAGE IS STRICTLY ENGLISH.
2. Output exclusively in English Latin script.
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
${mc.scene ? `- Setting/Location: ${mc.scene}` : ''}
${mc.objects && mc.objects.length ? `- Main Subjects/Objects: ${mc.objects.join(', ')}` : ''}
${mc.mood ? `- Mood & Emotional Atmosphere: ${mc.mood}` : ''}
${mc.colors && mc.colors.length ? `- Dominant Colors: ${mc.colors.join(', ')}` : ''}
${mc.visualTheme ? `- Visual Aesthetic Theme: ${mc.visualTheme}` : ''}
${mc.activity ? `- Action/Activity: ${mc.activity}` : ''}
${mc.summary ? `- Overview: ${mc.summary}` : ''}

MANDATORY RULES FOR MEDIA-AWARE OUTPUT:
1. Your generated content MUST be genuinely inspired by and relevant to this visual media.
2. Connect the visual details, mood, and setting with the selected platform (${platform}), visual style (${style}), card format (${format}), and language (${langDisplay}).
3. Do NOT invent completely unrelated storylines or generic motivational quotes that contradict the image/video.
4. Do NOT simply mechanically list objects or say "In this image we see...". Instead, creatively channel the imagery, atmosphere, and essence of the media into captivating literature/social copy.
==================================================
`;
  }

  return `You are PlanBot AI, a world-class master poet, literary author, and multilingual creative writing artisan.
You generate deeply moving, aesthetically flawless, and structurally authentic literature.

${languageDirective}
${mediaDirective}

==================================================
GLOBAL MANDATORY CONSTRAINTS:
1. ZERO PREAMBLE: Never include greetings, conversational filler, conversational intros, or meta-commentary (e.g. NO "Here is your poem", NO "Sure! Here is a story about...", NO "I hope you like this"). Output ONLY the creative work.
2. NO MARKDOWN HEADERS: Do NOT start with #, ##, or ### titles. Begin immediately with the first line of the work.
3. LANGUAGE SCRIPT FIDELITY: Output strictly in ${langDisplay} native script.
4. THEME INTERPRETATION: Treat the user's prompt strictly as a creative inspiration or keyword seed. NEVER restate, quote, or copy the user's raw prompt inside the text.
5. STANDALONE MASTERPIECE: Produce a complete, polished, and self-contained creative work.
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

  let specificInstruction = '';
  switch (action) {
    case 'regenerate':
      specificInstruction = `ACTION: REGENERATE & REIMAGINE
- Compose an entirely fresh, creative alternative version from a different artistic angle.
- Explore alternative metaphors, rhythms, and perspective.
- Maintain the original tone, mode, and structure.`;
      break;

    case 'continue':
      specificInstruction = `ACTION: CONTINUE & EXPAND
- Continue the narrative or poem seamlessly from where the previous content ended.
- Develop the theme deeper, introducing the next stanza, emotional layer, or plot progression.
- Maintain exact meter, stylistic voice, and character tone.`;
      break;

    case 'more-creative':
      specificInstruction = `ACTION: ELEVATE CREATIVITY & METAPHOR
- Infuse bolder, more inventive figurative language, vivid surreal imagery, and unexpected turns of phrase.
- Elevate the poetic diction without sacrificing emotional core.`;
      break;

    case 'more-emotional':
      specificInstruction = `ACTION: DEEPEN EMOTIONAL INTENSITY
- Amplify the emotional resonance, yearning, tenderness, heartache, or joy.
- Make every line strike straight to the heart with raw, vulnerable resonance.`;
      break;

    case 'more-humorous':
      specificInstruction = `ACTION: INJECT WIT & HUMOR
- Infuse charming wit, delightful irony, playful rhymes, and whimsical observations.
- Keep the humor elegant, lighthearted, and engaging.`;
      break;

    case 'simpler':
      specificInstruction = `ACTION: SIMPLER WORDS & DICTION
- Rewrite using crystal-clear, accessible, and universally relatable everyday vocabulary.
- Strip away esoteric or archaic words while preserving heartfelt meaning.`;
      break;

    case 'shorter':
      specificInstruction = `ACTION: SHORTER & CONCISE
- Condense the composition to approximately HALF (~50%) its current length.
- Preserve only the most potent lines, eliminating any padding.`;
      break;

    case 'longer':
      specificInstruction = `ACTION: LONGER & EXPANDED
- Expand the composition to approximately DOUBLE (~200%) its current length.
- Add rich descriptive layers, stanzas, or narrative backstory.`;
      break;

    case 'rewrite-originally':
      specificInstruction = `ACTION: REWRITE MORE ORIGINALLY & UNIQUELY
- Rewrite this content to reduce distinctive phrase overlap and eliminate any potential similarity.
- Preserve: topic, emotional intent, requested language (${langDisplay}), and content mode (${mode}).
- Change: wording, imagery, metaphors, sentence structure, and distinctive expressions.
- Do not copy or imitate any candidate matching passage.
- Create a genuinely fresh, completely distinct, and original composition.`;
      break;

    default:
      specificInstruction = `ACTION: REFINE AND POLISH`;
  }

  return `[ITERATIVE REFINEMENT REQUEST]
${specificInstruction}

CONTEXT — DO NOT CHANGE:
- Original Prompt: "${originalPrompt}"
- Target Language: ${langDisplay} (Must write strictly in ${langDisplay} native script)
- Mode: ${mode}

PREVIOUS COMPOSITION TO REFINE:
"""
${previousContent}
"""

REFINED OUTPUT (Zero preamble, immediate creative text):`;
}

module.exports = {
  buildSystemPrompt,
  buildActionPrompt,
  CLASSICAL_TAMIL_FORMS,
  LANGUAGE_NAMES,
  langName,
  getWesternPoemRules,
  getClassicalTamilRules,
  getLengthGuideline,
  getFormatRules,
  getPlatformRules,
  getStyleGuideline,
  getToneGuideline
};
