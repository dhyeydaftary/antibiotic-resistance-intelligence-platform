const mongoose = require('mongoose');

// A signup that hasn't completed OTP verification yet. Deliberately NOT a
// User document — nothing is written to the users collection until
// /verify-otp succeeds, so an abandoned signup (wrong email, closed tab,
// code never entered) never leaves a permanent, unverified account behind.
// Holds only the fields a not-yet-real account needs; tokenVersion,
// loginAttempts/loginLockedUntil, resetToken/resetTokenExpiry/resetAttempts,
// and hasReceivedWelcomeEmail all only make sense once a User exists.
const pendingSignupSchema = new mongoose.Schema({
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
  // Stores the OTP's hash, not the plaintext — same field name and
  // convention as User.js's identical `otp` field, despite the name (see
  // that model, and auth.js's /forgot-password comment on `resetToken` for
  // the same pattern). Not `required` (matches User.js): /verify-otp nulls
  // both fields out once otpAttempts hits MAX_OTP_ATTEMPTS, to invalidate
  // the code outright and force a fresh one via /resend-otp.
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
  // The exact instant this row should be swept — computed and set by
  // auth.js (see its own PENDING_SIGNUP_TTL_MINUTES) on creation and on
  // every /signup retry or /resend-otp, NOT derived from `createdAt`. A
  // createdAt-anchored TTL would not move on a resend, so a freshly
  // resent OTP could get its underlying document reaped before its own
  // otpExpiry elapses — this field exists so the document's lifetime
  // always tracks the *current* write, not the document's original
  // creation time. `default: null` is fine only because every write path
  // (create or overwrite) sets it explicitly.
  expiresAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// TTL index: `expireAfterSeconds: 0` is the Mongo convention for "expire at
// the exact timestamp stored in this field" (as opposed to "N seconds
// after this timestamp") — so this deletes a pending signup the instant
// `expiresAt` passes, whatever that value currently is. Abandoned signups
// are swept automatically; no cleanup job needed.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingSignup', pendingSignupSchema);
