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