const crypto = require('crypto');
const { env } = require('../config/env');
const { ApiError } = require('../utils/errors');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Extracts pure email address from potential "Name <email@domain.com>" format
 * @param {string} fromStr
 * @returns {string}
 */
function cleanSenderEmail(fromStr) {
  if (!fromStr || typeof fromStr !== 'string' || !fromStr.trim()) return '';
  const match = fromStr.match(/<([^>]+)>/);
  return (match ? match[1] : fromStr).trim();
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit string (100000 - 999999)
 */
function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes OTP using SHA-256 for secure database storage
 * @param {string} otp
 * @returns {string} hex hash
 */
function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

/**
 * Verifies if entered OTP matches stored hash
 * @param {string} enteredOtp
 * @param {string} storedHash
 * @returns {boolean}
 */
function verifyOtpHash(enteredOtp, storedHash) {
  if (!enteredOtp || !storedHash) return false;
  const computedHash = hashOtp(enteredOtp);
  try {
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return computedHash === storedHash;
  }
}

/**
 * Sends branded verification email with 6-digit OTP using Brevo HTTPS API
 * @param {string} email
 * @param {string} otp
 * @param {string} [name]
 * @returns {Promise<{ success: boolean, simulated: boolean, messageId?: string }>}
 */
async function sendVerificationOtp(email, otp, name = '') {
  const senderEmail = cleanSenderEmail(env.EMAIL_FROM);
  const brevoApiKey = (env.BREVO_API_KEY || '').trim();

  // In production, Brevo API key and sender email are strictly mandatory.
  if (env.NODE_ENV === 'production') {
    if (!brevoApiKey || !senderEmail) {
      console.error('[EmailService] BREVO_API_KEY or EMAIL_FROM is missing in production environment. Registration halted.');
      throw ApiError.internal('Email delivery service is currently not configured. Please contact support.');
    }
  } else {
    // Development and test fallback: log clean console OTP if Brevo is not configured or during automated tests
    if (!brevoApiKey || !senderEmail || env.NODE_ENV === 'test') {
      console.log('\n======================================================');
      console.log('📧 [EMAIL VERIFICATION CODE]');
      console.log(`   To: ${email}`);
      console.log(`   Recipient: ${name || 'User'}`);
      console.log(`   6-Digit OTP: ${otp}`);
      console.log('   Expires: in 15 minutes');
      console.log('======================================================\n');
      return { success: true, simulated: true };
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7FF; margin: 0; padding: 24px; color: #2D253B; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px 32px; border: 1px solid #E8E2D9; box-shadow: 0 4px 20px rgba(0,0,0,0.04); }
        .logo { font-size: 22px; font-weight: 700; color: #6B5488; text-align: center; margin-bottom: 20px; }
        .otp-box { background: #F6F2FC; border: 1px dashed #6B5488; border-radius: 14px; text-align: center; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #513670; font-family: monospace; }
        .footer { font-size: 11px; color: #8F8599; text-align: center; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">✨ PlanBot AI</div>
        <h2 style="font-size: 18px; margin: 0 0 12px 0;">Verify your email address</h2>
        <p style="font-size: 13px; color: #594E66; line-height: 1.5;">
          Hello ${name || 'there'},<br>
          Thank you for signing up for PlanBot AI. Please use the verification code below to verify your email address and activate your account:
        </p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="font-size: 12px; color: #7B7188; text-align: center;">This code will expire in <strong>15 minutes</strong>.</p>
        <div class="footer">
          If you did not request this email, no further action is required and you can safely ignore it.<br>
          &copy; ${new Date().getFullYear()} PlanBot AI Studio.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Your PlanBot AI verification code is: ${otp}. It expires in 15 minutes.`;

  const payload = {
    sender: { name: 'PlanBot AI', email: senderEmail },
    to: [{ email, name: name || 'User' }],
    subject: `${otp} is your PlanBot AI verification code`,
    htmlContent,
    textContent
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[EmailService] Brevo HTTPS API returned status ${response.status}:`, errorText);
      if (env.NODE_ENV === 'production') {
        throw ApiError.internal('Unable to deliver verification email. Please try again later.');
      }
      // In non-production, log fallback banner so local testing continues
      console.log(`[EmailService Dev Fallback OTP] For ${email}: ${otp}`);
      return { success: true, simulated: true };
    }

    const data = await response.json().catch(() => ({}));
    return { success: true, simulated: false, messageId: data?.messageId };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[EmailService] Failed to send email via Brevo HTTPS API:', err.message);
    if (env.NODE_ENV === 'production') {
      throw ApiError.internal('Unable to deliver verification email. Please try again later.');
    }
    // In local dev, log OTP as fallback so testing continues
    console.log(`[EmailService Dev Fallback OTP] For ${email}: ${otp}`);
    return { success: true, simulated: true };
  }
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  sendVerificationOtp
};
