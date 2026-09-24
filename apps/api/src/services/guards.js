/**
 * Output Validation Guards & Quality Enforcement
 * Inspects AI completions for mode mismatches, language leaks, and structural compliance.
 * Produces structured retry guidance if violation is detected.
 */

const WHITELIST_WORDS = new Set([
  'planbot', 'ai', 'instagram', 'whatsapp', 'x', 'twitter', 'post', 'status', 'reel'
]);

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
  if (romanizedInput && (language === 'ta' || language === 'hi')) {
    // Check if there are English words >= 4 letters leaked into native text
    const latinWords = cleanOutput.match(/[a-zA-Z]{4,}/g) || [];
    const leakedWords = latinWords.filter((w) => !WHITELIST_WORDS.has(w.toLowerCase()));

    if (leakedWords.length >= 3) {
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

  // Passed all guards
  return { valid: true };
}

module.exports = {
  validateGuards,
  looksLikePoem
};
