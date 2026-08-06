const mongoose = require('mongoose');

// Mongo schema for one append-only security-audit-trail entry.
// Append-only security-audit trail. Write-only from the app's perspective —
// there is deliberately no read endpoint exposing this collection (this
// project has explicitly dropped RBAC/admin panels). Event metadata only:
// never store passwords, password hashes, tokens, OTP codes, or reset codes
// here.
const securityEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'LOGIN_LOCKOUT',
      'SIGNUP',
      'EMAIL_VERIFIED',
      'PASSWORD_RESET',
      'LOGOUT_EVERYWHERE',
    ],
  },
  email: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  ip: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
