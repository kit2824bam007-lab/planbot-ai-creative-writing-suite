class ApiError extends Error {
  constructor(code, statusCode = 400, message = '', meta = {}) {
    super(message || code);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
  }

  static badRequest(message, code = 'BAD_REQUEST', meta = {}) {
    return new ApiError(code, 400, message, meta);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new ApiError(code, 401, message);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(code, 403, message);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(code, 404, message);
  }

  static dailyLimitReached(meta = {}, message = 'Daily generation limit reached') {
    return new ApiError('DAILY_LIMIT_REACHED', 429, message, meta);
  }

  static providerBusy(message = 'AI provider is currently busy. Please retry shortly.', meta = {}) {
    return new ApiError('PROVIDER_BUSY', 503, message, meta);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new ApiError(code, 500, message);
  }
}

module.exports = { ApiError };
