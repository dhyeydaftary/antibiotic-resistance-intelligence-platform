// A user record associated with a Firebase-verified identity. Password
// hashing, OTP verification, and login lockout are now Firebase's
// responsibility (see ADR-0005) -- this model owns only what the Gateway's
// own downstream session layer needs (tokenVersion) plus application
// profile data. Created/found by firebaseUid in routes/auth.js's /session
// route; read on every protected request by middleware/verifyToken.js
// (tokenVersion check).
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
  // The Firebase-issued UID -- the actual identity anchor now, not email.
  // Unique and required: every User document corresponds to exactly one
  // Firebase identity, regardless of which provider (password, Google,
  // GitHub) that identity was established through.
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
  },
  hasReceivedWelcomeEmail: {
    type: Boolean,
    default: false,
  },
  // Incremented to invalidate every previously issued Gateway JWT for this
  // user in one write -- checked against the JWT payload in
  // verifyToken.js. Bumped on "logout everywhere"; the same pattern
  // applies to any future account-security event (role change,
  // admin-initiated disable) once those features exist. Retained from the
  // pre-Firebase design per ADR-0005 -- this is the Gateway's own session
  // layer, downstream of Firebase, not something Firebase manages.
  tokenVersion: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);