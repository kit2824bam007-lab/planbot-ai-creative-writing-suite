const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);
const ALGORITHM = 'aes-256-gcm';

// Derive or fallback a 32-byte key from JWT_SECRET or random
function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'planbot-master-encryption-secret-default';
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const parts = payload.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

function generateSlug(prefix = '') {
  const id = nanoid();
  return prefix ? `${prefix}-${id}` : id;
}

function hashString(str) {
  return crypto.createHash('sha256').update(str || '').digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSlug,
  hashString
};
