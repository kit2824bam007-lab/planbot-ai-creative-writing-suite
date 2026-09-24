/**
 * Language & Script Detection Service
 * Simplified 2-output mapping:
 * - Native Tamil Unicode OR romanized-Tamil (Tanglish) fingerprint match -> 'ta'
 * - Explicit fallbackLang === 'ta' with Latin input -> 'ta' (romanizedInput: true)
 * - Everything else (English, Hinglish like "ek kahani likho", etc.) -> 'en'
 */

const TANGLISH_KEYWORDS = new Set([
  'kavithai', 'kavidhai', 'kavitha', 'kadhal', 'kaadhal', 'kadhalu',
  'vanakkam', 'epdi', 'eppadi', 'irukinga', 'irukka', 'amma', 'appa',
  'tamil', 'thamizh', 'thamizhil', 'solla', 'solle', 'sollu', 'podu',
  'nalla', 'romba', 'enaku', 'enakku', 'unaku', 'unakku', 'panna',
  'pannu', 'venum', 'vendum', 'azhagu', 'thozha', 'anbu', 'manasu',
  'valkai', 'vaazhkai', 'mazhai', 'kanavu', 'nilavu', 'kaatru', 'paatu',
  'paadal', 'natpu', 'pasam', 'pirivu', 'valigal', 'vazhi', 'kannir',
  'kannur', 'varigal', 'ezhuthu', 'neeyum', 'naanum', 'oru', 'chinna',
  'periya', 'kaalam', 'neram', 'kangal', 'idhayathil', 'idhayame',
  // Expanded Tanglish roots and variations
  'nila', 'nilavidam', 'nilavin', 'solli', 'solren', 'solgiren', 'solvadharkku',
  'solvadhu', 'sonna', 'sonnen', 'mudithen', 'mudithu', 'mudiyala', 'mudiyum',
  'mudiyathu', 'unnidam', 'ennidam', 'unnai', 'ennai', 'unthan', 'enthan',
  'mun', 'munbu', 'pin', 'pinbu', 'idhayam', 'ullam', 'uyire', 'anbe',
  'kannae', 'pesu', 'pesi', 'pesinen', 'paarthu', 'paarthen', 'paarkiren',
  'irukku', 'irukken', 'iruntha', 'varum', 'vandhu', 'vandhen', 'poraen',
  'endru', 'enru', 'adharku', 'idharku', 'edharku', 'seri', 'illai',
  'kooda', 'mattum', 'thaan', 'than', 'ippo', 'appo', 'eppo', 'engae',
  'yaaru', 'yaar', 'edhu', 'edhukku', 'sollunga', 'vaanga', 'ponga'
]);

const TANGLISH_STEMS = [
  'nilav', 'solv', 'kavith', 'kadh', 'unak', 'enak', 'unni', 'enni',
  'mudith', 'mudiy', 'idhay', 'uyir', 'paart', 'vaazh', 'thamizh'
];

/**
 * Detects whether input is Tamil (native or Tanglish) or English.
 * @param {string} text - User prompt
 * @param {string} fallbackLang - 'en' | 'ta'
 */
function detectLanguage(text = '', fallbackLang = 'en') {
  if (!text || typeof text !== 'string') {
    return {
      language: fallbackLang === 'ta' ? 'ta' : 'en',
      script: 'unknown',
      romanizedInput: false,
      confidence: 0.5
    };
  }

  const cleanText = text.trim();

  // 1. Native Tamil Unicode Check
  const tamilRegex = /[\u0B80-\u0BFF]/g;
  const tamilMatches = cleanText.match(tamilRegex);
  if (tamilMatches && tamilMatches.length >= 1) {
    return {
      language: 'ta',
      script: 'Tamil',
      romanizedInput: false,
      confidence: 0.99
    };
  }

  // 2. Romanized Tamil (Tanglish) Lexical Fingerprinting
  const tokens = cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  let tanglishHits = 0;
  for (const token of tokens) {
    if (TANGLISH_KEYWORDS.has(token)) {
      tanglishHits++;
    } else if (TANGLISH_STEMS.some((stem) => token.startsWith(stem))) {
      tanglishHits++;
    }
  }

  if (tanglishHits >= 1) {
    return {
      language: 'ta',
      script: 'Latin (Tanglish)',
      romanizedInput: true,
      confidence: Math.min(0.75 + tanglishHits * 0.1, 0.99),
      hits: tanglishHits
    };
  }

  // 3. If explicit fallback is Tamil and user input is in Latin/English characters
  if (fallbackLang === 'ta' && /[a-zA-Z]/.test(cleanText)) {
    return {
      language: 'ta',
      script: 'Latin (Translanguaged)',
      romanizedInput: true,
      confidence: 0.85
    };
  }

  // 4. Everything else defaults strictly to English ('en')
  return {
    language: 'en',
    script: 'Latin',
    romanizedInput: false,
    confidence: 0.95
  };
}

module.exports = {
  detectLanguage,
  TANGLISH_KEYWORDS
};
