import { toast } from 'sonner';

export type AuthErrorCode =
  | 'INVALID_EMAIL'
  | 'DISPOSABLE_EMAIL'
  | 'EMAIL_EXISTS'
  | 'WRONG_PASSWORD'
  | 'EMAIL_NOT_VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'VERIFICATION_EXPIRED'
  | 'PASSWORD_TOO_SHORT'
  | 'NETWORK_ERROR';

/**
 * Maps any auth error, status code, or server error into a friendly, non-technical notification.
 * Never exposes raw backend responses, stack traces, or API internals to the user.
 */
export function showAuthErrorToast(errOrCode: any, fallbackMessage?: string): void {
  // If a known symbol/code is passed directly
  if (typeof errOrCode === 'string') {
    switch (errOrCode) {
      case 'INVALID_EMAIL':
        toast.error('Please enter a valid email address.', { duration: 4000 });
        return;
      case 'DISPOSABLE_EMAIL':
        toast.error('Temporary or disposable email addresses are not permitted. Please use your genuine email.', { duration: 4500 });
        return;
      case 'EMAIL_EXISTS':
        toast.error('This email is already registered. Please sign in instead.', { duration: 4500 });
        return;
      case 'WRONG_PASSWORD':
        toast.error('Incorrect email or password. Please double-check your credentials.', { duration: 4000 });
        return;
      case 'EMAIL_NOT_VERIFIED':
        toast.warning('Email verification is required before signing in. Please check your inbox.', { duration: 5000 });
        return;
      case 'VERIFICATION_FAILED':
        toast.error('Invalid verification code. Please check the code and try again.', { duration: 4500 });
        return;
      case 'VERIFICATION_EXPIRED':
        toast.error('Verification code has expired. Please request a new code.', { duration: 4500 });
        return;
      case 'PASSWORD_TOO_SHORT':
        toast.error('Password must be at least 6 characters.', { duration: 4000 });
        return;
      case 'NETWORK_ERROR':
        toast.error('Unable to connect to the server. Please check your internet connection and try again.', { duration: 4500 });
        return;
      default:
        toast.error(errOrCode, { duration: 4000 });
        return;
    }
  }

  // Parse error object from api.ts or fetch
  const status = errOrCode?.status;
  const code = (errOrCode?.code || '').toString().toUpperCase();
  const rawMsg = (errOrCode?.message || '').toString().toLowerCase();

  // 1. Email Already Exists
  if (code === 'EMAIL_EXISTS' || rawMsg.includes('already registered') || rawMsg.includes('email exists') || rawMsg.includes('already in use')) {
    toast.error('This email is already registered. Please sign in instead.', { duration: 4500 });
    return;
  }

  // 2. Invalid / Disposable Email
  if (
    code === 'INVALID_EMAIL' ||
    code === 'DISPOSABLE_EMAIL' ||
    rawMsg.includes('fake or disposable') ||
    rawMsg.includes('domain does not exist') ||
    (code === 'VALIDATION_ERROR' && rawMsg.includes('email')) ||
    rawMsg.includes('invalid email')
  ) {
    toast.error('Please enter a valid email address.', { duration: 4000 });
    return;
  }

  // 3. Email Verification Required
  if (
    status === 403 ||
    code === 'EMAIL_NOT_VERIFIED' ||
    rawMsg.includes('verify') ||
    rawMsg.includes('verification required') ||
    rawMsg.includes('unverified')
  ) {
    toast.warning('Email verification is required before signing in. Please check your inbox.', { duration: 5000 });
    return;
  }

  // 4. Verification Failed / Expired
  if (code === 'VERIFICATION_EXPIRED' || rawMsg.includes('expired')) {
    toast.error('Verification code has expired. Please request a new code.', { duration: 4500 });
    return;
  }

  if (code === 'VERIFICATION_FAILED' || rawMsg.includes('invalid code') || rawMsg.includes('invalid verification') || rawMsg.includes('invalid otp')) {
    toast.error('Invalid verification code. Please check the code and try again.', { duration: 4500 });
    return;
  }

  // 4b. Resend Cooldown
  if (code === 'RESEND_COOLDOWN' || (status === 429 && (rawMsg.includes('wait') || rawMsg.includes('cooldown')))) {
    const message = errOrCode?.message || 'Please wait a moment before requesting another verification code.';
    toast.warning(message, { duration: 4500 });
    return;
  }

  // 5. Wrong Password / Unauthorized
  if (
    status === 401 ||
    code === 'UNAUTHORIZED' ||
    rawMsg.includes('invalid email or password') ||
    rawMsg.includes('invalid credentials') ||
    rawMsg.includes('incorrect password') ||
    rawMsg.includes('password')
  ) {
    toast.error('Incorrect email or password. Please double-check your credentials.', { duration: 4000 });
    return;
  }

  // 6. Network or Server Errors (5xx, Network request failed, fetch failed)
  if (
    (typeof status === 'number' && status >= 500) ||
    code === 'INTERNAL_ERROR' ||
    code === 'PROVIDER_BUSY' ||
    rawMsg.includes('network') ||
    rawMsg.includes('failed to fetch') ||
    rawMsg.includes('econnrefused')
  ) {
    toast.error('Unable to connect to the server. Please check your internet connection and try again.', { duration: 4500 });
    return;
  }

  // Safe user-friendly fallback (never leak technical errors or stack traces)
  toast.error(fallbackMessage || 'Authentication request could not be completed. Please try again.', { duration: 4000 });
}

/**
 * Displays clean user-friendly success notifications for authentication actions.
 */
export function showAuthSuccessToast(
  type: 'signup' | 'login' | 'verification' | 'google',
  customMessage?: string
): void {
  switch (type) {
    case 'signup':
      toast.success(customMessage || 'Account created successfully! Welcome to DreamInk.', { duration: 4000 });
      break;
    case 'login':
      toast.success(customMessage || 'Welcome back! Signed in successfully.', { duration: 3500 });
      break;
    case 'verification':
      toast.success(customMessage || 'Email verified successfully! You can now sign in.', { duration: 4000 });
      break;
    case 'google':
      toast.success(customMessage || 'Signed in with Google!', { duration: 3500 });
      break;
    default:
      toast.success(customMessage || 'Success!', { duration: 3500 });
      break;
  }
}
