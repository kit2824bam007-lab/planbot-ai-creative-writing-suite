// 1. LANGUAGES (Strictly English and Tamil)
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
];

// 2. GENRES (Story mode - expansive choices)
const GENRES = [
  { value: 'generic', label: 'Generic / பொதுவான' },
  { value: 'romance', label: 'Romance / காதல்' },
  { value: 'mystery', label: 'Mystery / மர்மம்' },
  { value: 'adventure', label: 'Adventure / சாகசம்' },
  { value: 'drama', label: 'Drama / நாடகம்' },
  { value: 'comedy', label: 'Comedy / நகைச்சுவை' },
  { value: 'horror', label: 'Horror / அச்சம்' },
  { value: 'thriller', label: 'Thriller / பதற்றம்' },
  { value: 'fantasy', label: 'Fantasy / கற்பனை' },
  { value: 'scifi', label: 'Sci-Fi / அறிவியல் கற்பனை' },
  { value: 'poetic-drama', label: 'Poetic Drama / கவிதை நாடகம்' },
  { value: 'folklore', label: 'Folklore & Myth / நாட்டுப்புறக் கதை & புராணம்' },
  { value: 'historical', label: 'Historical Fiction / வரலாற்றுப் புனைவு' },
  { value: 'village-life', label: 'Village & Rural Life / கிராமத்து மண்வாசம்' },
  { value: 'psychological', label: 'Psychological / மனோதத்துவம்' },
  { value: 'crime-detective', label: 'Crime & Detective / துப்பறியும் கதை' },
  { value: 'slice-of-life', label: 'Slice of Life / வாழ்வியல் பதிவு' },
  { value: 'friendship', label: 'Friendship & Brotherhood / நட்பு & பாசம்' },
  { value: 'time-travel', label: 'Time Travel & Destiny / காலப் பயணம் & விதி' },
  { value: 'action-martial', label: 'Action & Martial / வீர சாகசப் போர்' },
  { value: 'family-emotion', label: 'Family & Sentiment / குடும்ப உறவு & பாசம்' },
];

// 3. TONES (All modes - expansive choices)
const TONES = [
  { value: 'inspirational', label: 'Inspiring / ஈடுபடுத்தும்' },
  { value: 'romantic', label: 'Romantic / காதல் நயம்' },
  { value: 'playful', label: 'Playful / விளையாட்டுத்தனம்' },
  { value: 'serious', label: 'Serious / தீவிரம்' },
  { value: 'emotional', label: 'Emotional / உணர்ச்சிப்பூர்வம்' },
  { value: 'humorous', label: 'Humorous / நகைச்சுவையான' },
  { value: 'dark', label: 'Dark / இருண்ட' },
  { value: 'melancholic', label: 'Melancholic / புலம்பல்' },
  { value: 'epic', label: 'Epic / காவியம்' },
  { value: 'philosophical', label: 'Philosophical / தத்துவார்த்த' },
  { value: 'mystical', label: 'Mystical / மெய்ஞ்ஞான' },
  { value: 'spiritual', label: 'Spiritual & Devotional / பக்தி நயம்' },
  { value: 'heroic', label: 'Heroic & Patriotic / வீர முழக்கம்' },
  { value: 'nostalgic', label: 'Nostalgic / பசுமை நினைவுகள்' },
  { value: 'peaceful', label: 'Peaceful & Serene / அமைதி & சாந்தம்' },
  { value: 'passionate', label: 'Passionate & Fiery / அனல் பறக்கும் ஆர்வம்' },
  { value: 'sarcastic', label: 'Sarcastic & Witty / அங்கதம் & கேலி' },
  { value: 'hopeful', label: 'Hopeful & Optimistic / நம்பிக்கை ஒளி' },
  { value: 'heartbreak', label: 'Sorrow & Heartbreak / இதய வலி & பிரிவு' },
  { value: 'nature-vibe', label: 'Nature & Earthy / இயற்கை எழில்' },
];

// Tamil Classical forms list
const TAMIL_CLASSICAL_FORMS = [
  'வெண்பா',
  'குறிஞ்சி',
  'முல்லை',
  'மருதம்',
  'நேய்தல்',
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
  'புதுக்கவிதை',
];

// 4. POEM_TYPES (Western + Classical & Traditional Tamil)
const POEM_TYPES = [
  // Western Poetry
  { value: 'haiku', label: 'Haiku / ஹைக்கூ', group: 'Western Poetry' },
  { value: 'sonnet', label: 'Sonnet / சானட்', group: 'Western Poetry' },
  { value: 'limerick', label: 'Limerick / லிமெரிக்', group: 'Western Poetry' },
  { value: 'acrostic', label: 'Acrostic / எழுத்தெடுப்பு', group: 'Western Poetry' },
  { value: 'free-verse', label: 'Free Verse / சுதந்திர பாடல்', group: 'Western Poetry' },
  { value: 'blank-verse', label: 'Blank Verse / வெற்று பாடல்', group: 'Western Poetry' },
  { value: 'couplet', label: 'Couplet / இணைப்பா', group: 'Western Poetry' },
  { value: 'villanelle', label: 'Villanelle / வில்லனல்', group: 'Western Poetry' },
  { value: 'ballad', label: 'Ballad / பாலட்', group: 'Western Poetry' },
  { value: 'ode', label: 'Ode / புகழ்ச்சிப் பாடல்', group: 'Western Poetry' },
  { value: 'elegy', label: 'Elegy / புலம்பற் பாடல்', group: 'Western Poetry' },
  { value: 'ghazal', label: 'Ghazal / கஜல்', group: 'Western Poetry' },
  { value: 'rubaiyat', label: 'Rubaiyat / ருபாயத்', group: 'Western Poetry' },
  { value: 'cinquain', label: 'Cinquain / ஐந்து வரி பாடல்', group: 'Western Poetry' },
  { value: 'tanka', label: 'Tanka / தான்கா', group: 'Western Poetry' },
  { value: 'prose-poem', label: 'Prose Poem / உரைநடை கவிதை', group: 'Western Poetry' },
  { value: 'lyrical-verse', label: 'Lyrical Song Verse / இசைப் பாடல் வரிகள்', group: 'Western Poetry' },

  // Tamil Classical optgroup
  { value: 'வெண்பா', label: 'வெண்பா (Venpa)', group: 'Tamil Classical' },
  { value: 'குறிஞ்சி', label: 'குறிஞ்சித் திணை (மலையும் காதலும்)', group: 'Tamil Classical' },
  { value: 'முல்லை', label: 'முல்லைத் திணை (காத்திருத்தல்)', group: 'Tamil Classical' },
  { value: 'மருதம்', label: 'மருதத் திணை (ஊடலும் சமாதானமும்)', group: 'Tamil Classical' },
  { value: 'நேய்தல்', label: 'நேய்தல் திணை (கடற்கரை பிரிவு)', group: 'Tamil Classical' },
  { value: 'அந்தாதி', label: 'அந்தாதி (அந்தம் ஆதி தொடுப்பு)', group: 'Tamil Classical' },
  { value: 'கட்டளைக் கலித்துறை', label: 'கட்டளைக் கலித்துறை (யாப்பு)', group: 'Tamil Classical' },
  { value: 'பரணி', label: 'பரணி இலக்கியம் (வீரம்)', group: 'Tamil Classical' },
  { value: 'சிந்து', label: 'சிந்து / காவடிச்சிந்து நடை', group: 'Tamil Classical' },
  { value: 'குறவஞ்சி', label: 'குறவஞ்சி நாடக நடை', group: 'Tamil Classical' },
  { value: 'ஆசிரியப்பா', label: 'ஆசிரியப்பா (அகவற்பா)', group: 'Tamil Classical' },
  { value: 'கலிப்பா', label: 'கலிப்பா (துள்ளல் ஓசை)', group: 'Tamil Classical' },
  { value: 'வஞ்சிப்பா', label: 'வஞ்சிப்பா (தூங்கல் ஓசை)', group: 'Tamil Classical' },
  { value: 'விருத்தம்', label: 'விருத்தம் (அறுசீர்/எண்சீர்)', group: 'Tamil Classical' },
  { value: 'நாட்டுப்புறப் பாடல்', label: 'நாட்டுப்புறப் பாடல் / தாலாட்டு', group: 'Tamil Classical' },
  { value: 'சித்தர் பாடல்', label: 'சித்தர் பாடல் ஞான நடை', group: 'Tamil Classical' },
  { value: 'புதுக்கவிதை', label: 'புதுக்கவிதை (Modern Verse)', group: 'Tamil Classical' },
];

// 5. LENGTHS (Poem & Story)
const LENGTHS = [
  { value: 'short', label: 'Short (~50 words) / குறுகிய (~50 சொற்கள்)' },
  { value: 'medium', label: 'Medium (~200 words) / நடுத்தரம் (~200 சொற்கள்)' },
  { value: 'long', label: 'Long (~500 words) / நீளமான (~500 சொற்கள்)' },
];

const STORY_LENGTHS = [
  { value: 'standard', label: 'Standard Story / தரமான கதை' },
  { value: 'short', label: 'Short (~50 words) / குறுகிய (~50 சொற்கள்)' },
  { value: 'medium', label: 'Medium (~200 words) / நடுத்தரம் (~200 சொற்கள்)' },
  { value: 'long', label: 'Long (~500 words) / நீளமான (~500 சொற்கள்)' },
];

// 6. PLATFORMS (Creator mode)
const PLATFORMS = [
  { value: 'instagram-post', label: 'Instagram Post / இன்ஸ்டாகிராம் இடுகை' },
  { value: 'instagram-story', label: 'Instagram Story / இன்ஸ்டாகிராம் ஸ்டோரி' },
  { value: 'instagram-reel', label: 'Instagram Reel Caption / ரீல் தலைப்பு' },
  { value: 'whatsapp-status', label: 'WhatsApp Status / வாட்ஸ்அப் ஸ்டேட்டஸ்' },
  { value: 'twitter', label: 'Twitter/X Post / ட்விட்டர் இடுகை' },
  { value: 'linkedin', label: 'LinkedIn Post / லிங்க்ட்இன் பதிவு' },
  { value: 'facebook', label: 'Facebook Post / முகநூல் பதிவு' },
  { value: 'youtube-shorts', label: 'YouTube Shorts / யூடியூப் குறும்பதிவு' },
];

// 7. STYLES (Creator mode)
const STYLES = [
  { value: 'aesthetic', label: 'Aesthetic Minimal / அழகிய எளிமை' },
  { value: 'bold', label: 'Bold Motivational / துணிச்சல் ஊக்கம்' },
  { value: 'dark', label: 'Dark Moody / இருண்ட சிந்தனை' },
  { value: 'pastel', label: 'Soft Pastel / மென்மையான நிறம்' },
  { value: 'nature', label: 'Nature Vibe / இயற்கை உணர்வு' },
  { value: 'classical', label: 'Tamil Classical / தமிழ் பாரம்பரியம்' },
  { value: 'neon-cyber', label: 'Neon Cyber / நவீன நியான்' },
  { value: 'vintage-retro', label: 'Vintage Retro / பழமை நயம்' },
  { value: 'royal-heritage', label: 'Royal Heritage / அரச கம்பீரம்' },
  { value: 'clean-corporate', label: 'Clean Corporate / நேர்த்தியான பதிவு' },
];

// 8. FORMATS (Creator mode)
const FORMATS = [
  { value: 'quote', label: 'Short Quote (≤20 words) / குறும் கருத்து (≤20 சொற்கள்)' },
  { value: 'poem-card', label: 'Poem Card (4–8 lines) / கவிதை அட்டை (4–8 வரிகள்)' },
  { value: 'caption', label: 'Caption + Hashtags / தலைப்பு + ஹேஷ்டேகுகள்' },
  { value: 'micro-story', label: 'Micro Story (3 lines) / மூன்று வரி சிறுகதை' },
  { value: 'couplet-hook', label: 'Two-line Couplet / ஈரடி பொன்மொழி' },
];

module.exports = {
  LANGUAGES,
  GENRES,
  TONES,
  TAMIL_CLASSICAL_FORMS,
  POEM_TYPES,
  LENGTHS,
  STORY_LENGTHS,
  PLATFORMS,
  STYLES,
  FORMATS,
};
