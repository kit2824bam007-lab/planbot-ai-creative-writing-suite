const { ApiError } = require('../utils/errors');

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
];

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Strip HTML tags
  let cleaned = str.replace(/<[^>]*>?/gm, '');
  // Normalize extra whitespace
  return cleaned.trim();
}

function sanitizeInput(req, res, next) {
  try {
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          // Check injection patterns on prompt/message content
          if (key === 'prompt' || key === 'message' || key === 'content') {
            for (const pattern of INJECTION_PATTERNS) {
              if (pattern.test(value)) {
                return next(ApiError.badRequest('Input contains restricted phrases or unsafe syntax.'));
              }
            }
          }
          req.body[key] = sanitizeString(value);
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sanitizeInput,
  sanitizeString
};
