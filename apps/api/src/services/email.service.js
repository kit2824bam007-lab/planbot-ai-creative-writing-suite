const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const { ApiError } = require('../utils/errors');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE || false,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
      console.log('✅ Nodemailer SMTP transport initialized.');
    } catch (err) {
      console.warn('⚠️ Nodemailer SMTP initialization error:', err.message);
      transporter = null;
    }
  }

  return transporter;
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
 * Sends branded verification email with 6-digit OTP
 * @param {string} email
 * @param {string} otp
 * @param {string} [name]
 * @returns {Promise<{ success: boolean, simulated: boolean }>}
 */
async function sendVerificationOtp(email, otp, name = '') {
  const mailTransporter = getTransporter();

  // In production, SMTP configuration is strictly mandatory.
  // Registration must never silently succeed with a console fallback in production.
  if (env.NODE_ENV === 'production') {
    if (!mailTransporter || !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      console.error('[EmailService] SMTP configuration is missing in production environment. Registration halted.');
      throw ApiError.internal('Email delivery service is currently not configured. Please contact support.');
    }
  } else {
    // Development and test environments: use clean console OTP fallback if SMTP is unavailable or during tests
    if (!mailTransporter || env.NODE_ENV === 'test') {
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
        <div class="logo">✨ DreamInk AI</div>
        <h2 style="font-size: 18px; margin: 0 0 12px 0;">Verify your email address</h2>
        <p style="font-size: 13px; color: #594E66; line-height: 1.5;">
          Hello ${name || 'there'},<br>
          Thank you for signing up for DreamInk AI. Please use the verification code below to verify your email address and activate your account:
        </p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="font-size: 12px; color: #7B7188; text-align: center;">This code will expire in <strong>15 minutes</strong>.</p>
        <div class="footer">
          If you did not request this email, no further action is required and you can safely ignore it.<br>
          &copy; ${new Date().getFullYear()} DreamInk AI Studio.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await mailTransporter.sendMail({
      from: env.EMAIL_FROM || env.SMTP_USER,
      to: email,
      subject: `${otp} is your DreamInk AI verification code`,
      text: `Your DreamInk AI verification code is: ${otp}. It expires in 15 minutes.`,
      html: htmlContent
    });
    return { success: true, simulated: false };
  } catch (err) {
    console.error('[EmailService] Failed to send email via SMTP:', err.message);
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
