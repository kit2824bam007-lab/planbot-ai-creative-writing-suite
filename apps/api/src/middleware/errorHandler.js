const { ApiError } = require('../utils/errors');
const { getLocalizedMessage } = require('../config/i18n-messages');

function errorHandler(err, req, res, next) {
  const acceptLang = req.headers['accept-language'] || 'en';

  // Check if it's already an instance of ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...err.meta
      }
    });
  }

  // Check if it's an upstream LLM rate-limit or overload (429 or RESOURCE_EXHAUSTED)
  const isUpstream429 =
    err.status === 429 ||
    (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('ALL_KEYS_EXHAUSTED')));

  if (isUpstream429) {
    const localizedMsg = getLocalizedMessage('PROVIDER_BUSY', acceptLang);
    return res.status(503).json({
      error: {
        code: 'PROVIDER_BUSY',
        message: localizedMsg,
        retryAfter: err.retryAfterSec || 5
      }
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        details: err.errors
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: getLocalizedMessage('UNAUTHORIZED', acceptLang)
      }
    });
  }

  // Log unexpected errors internally without exposing raw internals
  console.error('Unhandled Server Error:', err);

  const internalMsg = getLocalizedMessage('INTERNAL_ERROR', acceptLang);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: internalMsg
    }
  });
}

module.exports = { errorHandler };
