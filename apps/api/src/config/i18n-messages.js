const messages = {
  en: {
    DAILY_LIMIT_REACHED: 'You have reached your daily creative writing generation limit. Your limit resets at midnight.',
    PROVIDER_BUSY: 'The AI is busy right now. Please wait a moment 🙏',
    UNAUTHORIZED: 'Please sign in to access this feature.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'Resource not found.',
    VALIDATION_ERROR: 'Invalid input parameters provided.',
    INTERNAL_ERROR: 'An unexpected server error occurred. Please try again.',
    KEYS_EXHAUSTED: 'All AI processing nodes are currently at capacity. Please try again in a few moments.'
  },
  ta: {
    DAILY_LIMIT_REACHED: 'இன்றைய படைப்புக்கான தினசரி வரம்பை எட்டிவிட்டீர்கள். உங்கள் வரம்பு நள்ளிரவில் மீண்டும் புதுப்பிக்கப்படும்.',
    PROVIDER_BUSY: 'AI சேவை தற்போது பிஸியாக உள்ளது. சற்று நேரம் பொறுத்திருக்கவும் 🙏',
    UNAUTHORIZED: 'இதை அணுக தயவுசெய்து உள்நுழையவும்.',
    FORBIDDEN: 'இதை செய்ய உங்களுக்கு அனுமதி இல்லை.',
    NOT_FOUND: 'கோரப்பட்ட விவரம் கிடைக்கவில்லை.',
    VALIDATION_ERROR: 'உள்ளீட்டு அளவுருக்களில் பிழை உள்ளது.',
    INTERNAL_ERROR: 'சேவையகத்தில் எதிர்பாராத பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
    KEYS_EXHAUSTED: 'அனைத்து AI சேவைகளும் தற்போது அதிக பயன்பாட்டில் உள்ளன. சற்று நேரம் கழித்து முயற்சிக்கவும்.'
  }
};

function getLocalizedMessage(key, acceptLanguage = 'en') {
  const lang = (acceptLanguage && acceptLanguage.toLowerCase().includes('ta')) ? 'ta' : 'en';
  return messages[lang]?.[key] || messages.en[key] || 'An error occurred';
}

module.exports = {
  messages,
  getLocalizedMessage
};
