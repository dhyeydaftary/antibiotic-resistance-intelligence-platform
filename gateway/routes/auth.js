// ===================================================================
// Auth routes — mounted at /api/auth in index.js. Per ADR-0005, Firebase
// is now this app's identity provider (password, Google, GitHub all go
// through Firebase directly on the frontend); this file's only job is to
// verify a Firebase-issued ID token server-side, find-or-create the
// corresponding MongoDB User (associated by Firebase UID), and issue the
// Gateway's own downstream session JWT with tokenVersion -- the same
// session/revocation layer this app has always had, now sitting after a
// verified Firebase identity instead of after direct password/OTP
// verification (see ADR-0006, not superseded by this migration).
//
// What Firebase now owns, no longer this file's concern: password
// hashing, OTP delivery/verification, login lockout, email verification.
//
// Talks to: config/firebaseAdmin.js (ID token verification), models/
// User.js, models/SecurityEvent.js, utils/emailUtil.js (welcome email
// only), middleware/authRateLimiters.js, middleware/verifyToken.js.
// ===================================================================
const express = require('express');
const jwt = require('jsonwebtoken');
const { auth: firebaseAuth } = require('../config/firebaseAdmin');
const User = require('../models/User');
const SecurityEvent = require('../models/SecurityEvent');
const { logError } = require('../utils/logger');
const { sendWelcomeEmail } = require('../utils/emailUtil');
const { sessionLimiter } = require('../middleware/authRateLimiters');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// Issues the Gateway's own downstream session token -- unchanged in
// shape and reasoning from before this migration (see ADR-0006).
function signToken(userId, tokenVersion, remember = false) {
  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '7d' : '24h' }
  );
}

// Strips a Mongo User document down to the safe subset sent to clients.
function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

// Fire-and-forget write to the SecurityEvent audit trail -- deliberately
// not awaited, so a slow or failing Mongo write never affects the actual
// HTTP response's content or timing. Any failure is logged (safe subset
// only) and otherwise swallowed.
function recordSecurityEvent(eventType, { email, userId = null, ip = null }) {
  SecurityEvent.create({ eventType, email, userId, ip }).catch((err) => {
    logError('Failed to write SecurityEvent', { eventType, email, error: err.message });
  });
}

// ---------------------------------------------------------------
// POST /session
// The single entry point for authentication, regardless of which Firebase
// provider (password, Google, GitHub) the frontend used. The frontend
// authenticates directly against Firebase first and sends the resulting
// ID token here -- this route verifies it, never trusting anything the
// client claims about who signed in, then finds-or-creates a User
// associated by Firebase UID and issues the Gateway's own session JWT.
// ---------------------------------------------------------------
router.post('/session', sessionLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Firebase ID token is required', field: null },
      });
    }

    let decoded;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch (err) {
      // Token failed verification -- expired, malformed, or not really
      // signed by Firebase for this project. Never trust it past this
      // point. No email is knowable here (verification failed before any
      // claims could be decoded).
      recordSecurityEvent('SESSION_FAILURE', { email: null, userId: null, ip: req.ip });
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'AUTH_ERROR', message: 'Session could not be verified', field: null },
      });
    }

    const { uid: firebaseUid, email, name, email_verified: emailVerified } = decoded;

    if (!email || !emailVerified) {
      // Firebase itself is unsure the email is real (e.g. a provider that
      // didn't confirm it) -- don't treat this as a usable identity.
      // Distinct error code from the token-verification-failure case
      // above: this one is actionable (resend verification), that one
      // isn't -- the frontend needs to tell them apart.
      recordSecurityEvent('SESSION_FAILURE', { email: email || null, userId: null, ip: req.ip });
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email before signing in.', field: null },
      });
    }

    let user = await User.findOne({ firebaseUid });
    let isNewAccount = false;

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        firebaseUid,
      });
      isNewAccount = true;
    }

    const token = signToken(user._id, user.tokenVersion, true);

    recordSecurityEvent('SESSION_SUCCESS', { email: user.email, userId: user._id, ip: req.ip });

    if (isNewAccount && !user.hasReceivedWelcomeEmail) {
      // Fire-and-forget, same reasoning as recordSecurityEvent above -- a
      // slow or failing send must never block or fail the actual login.
      sendWelcomeEmail(user.email, user.name).catch((err) => {
        logError('Failed to send welcome email', { email: user.email, error: err.message });
      });
      user.hasReceivedWelcomeEmail = true;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        token,
        user: toPublicUser(user),
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /session', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// ---------------------------------------------------------------
// POST /logout-everywhere
// Bumps tokenVersion, immediately invalidating every Gateway JWT issued
// for this user -- unchanged from before this migration. This is the
// Gateway's own session layer; independent of whatever Firebase's own
// session state does on its side.
// ---------------------------------------------------------------
router.post('/logout-everywhere', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Account not found', field: null },
      });
    }

    user.tokenVersion += 1;
    await user.save();

    recordSecurityEvent('LOGOUT_EVERYWHERE', { email: user.email, userId: user._id, ip: req.ip });

    res.status(200).json({
      success: true,
      data: null,
      error: null,
    });

  } catch (err) {
    logError('Error in /logout-everywhere', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// ---------------------------------------------------------------
// GET /me
// Lightweight session-validity check the frontend calls once at app
// mount -- unchanged from before this migration.
// ---------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    res.status(200).json({
      success: true,
      data: { user: toPublicUser(user) },
      error: null,
    });

  } catch (err) {
    logError('Error in /me', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

module.exports = router;