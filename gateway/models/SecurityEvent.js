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
      'SESSION_SUCCESS',
      'SESSION_FAILURE',
      'LOGOUT_EVERYWHERE',
    ],
  },
  email: {
    type: String,
    // Not required: a session-exchange event where Firebase token
    // verification itself fails has no identifiable email at all
    // (verification failed before any claims could be decoded) -- still
    // a meaningful event to record for monitoring, just one without an
    // associated address. No read endpoint exists for this collection
    // (write-only, by design), so nothing downstream assumes email is
    // always present.
    default: null,
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