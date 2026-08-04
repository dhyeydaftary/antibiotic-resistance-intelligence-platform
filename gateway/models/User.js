const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpiry: {
    type: Date,
    default: null,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
  },
  resetAttempts: {
    type: Number,
    default: 0,
  },
  hasReceivedWelcomeEmail: {
    type: Boolean,
    default: false,
  },
  // Failed-password-attempt counter for /login, mirroring the pattern
  // already used for otpAttempts/resetAttempts above. Unlike those two —
  // which invalidate the code outright, forcing an explicit resend —
  // this one is purely time-based and self-resolving: loginLockedUntil
  // just needs to pass, no explicit unlock action required. Reset to 0
  // on any successful login.
  loginAttempts: {
    type: Number,
    default: 0,
  },
  // Set once loginAttempts reaches MAX_LOGIN_ATTEMPTS (see auth.js) — a
  // live timestamp checked against the current time on every login
  // attempt, not a one-way flag. Cleared back to null on a successful
  // login.
  loginLockedUntil: {
    type: Date,
    default: null,
  },
  // Incremented to invalidate every previously issued JWT for this user in
  // one write — checked against the JWT payload in verifyToken.js. Bumped
  // on password reset and "logout everywhere"; the same pattern applies to
  // any future account-security event (password change, email change,
  // admin-initiated disable) once those features exist.
  tokenVersion: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);