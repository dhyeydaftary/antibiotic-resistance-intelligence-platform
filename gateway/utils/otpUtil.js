const bcrypt = require('bcrypt');
const { randomInt } = require('crypto');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const SALT_ROUNDS = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generates a random 6-digit numeric code as a string (e.g. "042917").
 * Uses crypto.randomInt (CSPRNG, uniform distribution, no modulo bias)
 * rather than Math.random(), which is not cryptographically secure.
 */
function generateOtp() {
  const max = 10 ** OTP_LENGTH; // exclusive upper bound for randomInt
  const num = randomInt(0, max);
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
  MAX_OTP_ATTEMPTS,
  SALT_ROUNDS,
};