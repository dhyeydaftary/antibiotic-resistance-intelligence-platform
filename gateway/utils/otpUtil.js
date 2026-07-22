const bcrypt = require('bcrypt');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const SALT_ROUNDS = 10;

/**
 * Generates a random 6-digit numeric code as a string (e.g. "042917").
 */
function generateOtp() {
  const min = 0;
  const max = 10 ** OTP_LENGTH - 1;
  const num = Math.floor(min + Math.random() * (max - min + 1));
  return String(num).padStart(OTP_LENGTH, '0');
}

/**
 * Hashes a plaintext OTP the same way passwords are hashed — never store
 * a valid, usable code in the database as plaintext.
 */
async function hashOtp(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

/**
 * Compares a plaintext OTP against its stored hash.
 */
async function compareOtp(code, hash) {
  if (!hash) return false;
  return bcrypt.compare(code, hash);
}

/**
 * Returns a Date OTP_TTL_MINUTES from now, for storing as an expiry timestamp.
 */
function getOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

function isExpired(expiryDate) {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}

module.exports = {
  generateOtp,
  hashOtp,
  compareOtp,
  getOtpExpiry,
  isExpired,
  OTP_TTL_MINUTES,
};