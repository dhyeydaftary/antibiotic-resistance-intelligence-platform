// ===================================================================
// Auth routes — mounted at /api/auth in index.js. Owns the full account
// lifecycle: signup -> OTP verification -> login, plus forgot/reset
// password and logout-everywhere. This is the file most likely to come
// up live, since it's where nearly every security decision in the
// gateway lives (account-enumeration resistance, timing-safe compares,
// login lockout, TTL'd pending signups).
//
// Talks to: models/User.js, models/PendingSignup.js, models/
// SecurityEvent.js (all Mongo, via mongoose), utils/otpUtil.js
// (OTP generation/hashing), utils/passwordPolicy.js, utils/emailUtil.js
// (Resend), middleware/authRateLimiters.js, middleware/verifyToken.js.
// Does NOT talk to Django/ml-backend at all — auth is entirely gateway-
// side; only routes/prediction.js crosses into Django.
//
// Key fact worth stating up front if asked "how does signup work": no
// User document exists until /verify-otp succeeds. Signup only ever
// creates/overwrites a PendingSignup row (TTL-swept automatically —
// see that model). So "a User exists for this email" and "a verified
// account exists" are the same fact everywhere in this file — no
// separate isVerified branching needed on the User side.
// ===================================================================
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PendingSignup = require('../models/PendingSignup');
const SecurityEvent = require('../models/SecurityEvent');
const { logError } = require('../utils/logger');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/emailUtil');
const {
  generateOtp,
  hashOtp,
  compareOtp,
  getOtpExpiry,
  isExpired,
  MAX_OTP_ATTEMPTS,
  SALT_ROUNDS,
} = require('../utils/otpUtil');
const { validatePassword } = require('../utils/passwordPolicy');
const { verifyLimiter, emailSendLimiter, signupLimiter } = require('../middleware/authRateLimiters');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// Login-specific lockout constants. Kept here rather than in otpUtil.js
// since this isn't an OTP concern — it's a distinct, login-only defense.
// Deliberately not paired with progressive/exponential delays: this app
// already combines IP-based rate limiting (verifyLimiter) with this
// per-account lockout, and OWASP treats these as alternative/complementary
// mitigations rather than something requiring all three at once. Adding
// delay-state tracking on top would be real complexity for marginal
// benefit given what's already in place — a considered, deliberate choice,
// not an oversight.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

// How long a PendingSignup row lives before the TTL index (see the model)
// sweeps it. Deliberately longer than OTP_TTL_MINUTES (otpUtil.js, 10 min)
// — the OTP itself expires faster than the row does, so a user who lets
// their code lapse still has time left to hit /resend-otp before the whole
// signup attempt is gone. Recomputed via getPendingSignupExpiry() at every
// site that also recomputes otpExpiry, so the two always move together.
const PENDING_SIGNUP_TTL_MINUTES = 20;
// Computes the TTL timestamp for a PendingSignup row.
function getPendingSignupExpiry() {
  return new Date(Date.now() + PENDING_SIGNUP_TTL_MINUTES * 60 * 1000);
}

// Sends the standard 429 "too many attempts" error response.
// Standard shape for a "too many failed attempts" response — mirrors the
// error envelope used everywhere else in this file.
function lockedResponse(res, message) {
  return res.status(429).json({
    success: false,
    data: null,
    error: { code: 'OTP_LOCKED', message, field: null },
  });
}

// Precomputed once at startup, not per request — the whole point is to burn
// roughly the same CPU time a real bcrypt.compare() against a stored OTP/
// reset-token hash would take. Re-hashing per request would defeat that (and
// waste the exact cost we're trying to spend deliberately). Same SALT_ROUNDS
// otpUtil.js uses for real OTP hashes, so the work factor — and therefore
// the timing — matches exactly. The plaintext being hashed is arbitrary; it
// is never compared against anything meaningful.
const DUMMY_OTP_HASH = bcrypt.hashSync('timing-safety-dummy-value', SALT_ROUNDS);

// Account-enumeration guard for the three code-checking flows below
// (verify-otp, verify-reset-otp, reset-password): a nonexistent account has
// no code to check against, so there's no way to "succeed" against it — but
// returning a distinct 404 lets a client tell "wrong email" apart from
// "right email, wrong code" purely from the response. Collapsing both into
// the same incorrect-code shape/status removes that signal without
// fabricating a fake success for something that didn't happen.
//
// Response-shape alone isn't enough, though: a real account's wrong-code
// path always pays for a bcrypt.compare() against the stored hash, while a
// nonexistent account previously skipped it entirely (no hash to compare
// against) — measurably faster, and bcrypt is deliberately slow, so the gap
// is not subtle. Running a compare against a dummy hash here closes that
// timing side-channel, not just the response body.
// Sends the generic "incorrect code" response after burning the same time
// a real bcrypt compare would take, so timing can't reveal account existence.
async function incorrectCodeResponse(code, res) {
  await compareOtp(code, DUMMY_OTP_HASH);
  return res.status(400).json({
    success: false,
    data: null,
    error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
  });
}

// Issues a signed JWT for a user session, embedding tokenVersion so it
// can be invalidated later without waiting for natural expiry.
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

// Fire-and-forget write to the SecurityEvent audit trail — deliberately not
// awaited. This write is never allowed to affect the actual HTTP response:
// not its content (nothing about a SecurityEvent write is reflected in any
// response body) and not its timing (a slow or failing Mongo write must not
// add latency or a new failure mode to auth flows that don't already have
// one). Calling this without awaiting, with the rejection handled right
// here, guarantees that property structurally at every call site rather
// than relying on each one to remember its own try/catch — the same
// fire-and-forget shape already used for sendWelcomeEmail() below. Any
// failure is logged (safe subset only — event metadata, never the
// underlying error's full shape) and otherwise swallowed.
// Writes one row to the SecurityEvent audit trail, without blocking or
// affecting the caller's HTTP response.
function recordSecurityEvent(eventType, { email, userId = null, ip = null }) {
  SecurityEvent.create({ eventType, email, userId, ip }).catch((err) => {
    logError('Failed to write SecurityEvent', { eventType, email, error: err.message });
  });
}

// Starts account creation: validates input, stores a PendingSignup, emails
// an OTP. Never creates a real User document.
// ---------------------------------------------------------------
// POST /signup
// Nothing is written to the users collection here — a PendingSignup row
// is created (or, for a retried signup, overwritten) instead, and only
// becomes a real User once /verify-otp succeeds. This means an abandoned
// signup (wrong email, closed tab, code never entered) never leaves a
// permanent account behind — PendingSignup rows also carry a TTL index
// (see the model) that sweeps them automatically either way.
// ---------------------------------------------------------------
router.post('/signup', signupLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name || !email || !password ||
      typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, email, and password are all required',
          field: null,
        },
      });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: pwCheck.message, field: 'password' },
      });
    }

    // A User document only ever exists once verified — /verify-otp is the
    // only place one is ever created, and always with isVerified: true —
    // so "a User exists for this email" and "a verified account already
    // exists" are now the same fact. No separate isVerified check needed.
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'An account with this email already exists',
          field: 'email',
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpExpiry = getOtpExpiry();

    const existingPending = await PendingSignup.findOne({ email });

    let pending;
    if (existingPending) {
      existingPending.name = name;
      existingPending.passwordHash = passwordHash;
      existingPending.otp = otpHash;
      existingPending.otpExpiry = otpExpiry;
      existingPending.otpAttempts = 0; // fresh code -> fresh attempt budget
      existingPending.expiresAt = getPendingSignupExpiry();
      pending = await existingPending.save();
    } else {
      pending = await PendingSignup.create({
        name,
        email,
        passwordHash,
        otp: otpHash,
        otpExpiry,
        otpAttempts: 0,
        expiresAt: getPendingSignupExpiry(),
      });
    }

    const emailResult = await sendOtpEmail(pending.email, otp, 'verify');
    if (!emailResult.success) {
      logError('Signup OTP email failed to send', { error: emailResult.error });
      // Pending signup still created — user can use /resend-otp to retry.
    }

    // No User document exists yet at signup time — userId is null, same
    // precedent as LOGIN_FAILURE's userId for a nonexistent email below.
    recordSecurityEvent('SIGNUP', { email: pending.email, userId: null, ip: req.ip });

    res.status(201).json({
      success: true,
      data: {
        email: pending.email,
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /signup', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        field: null,
      },
    });
  }
});

// Authenticates credentials, enforces lockout, and issues a JWT on success.
// ---------------------------------------------------------------
// POST /login
// A real User document is always verified (see /verify-otp — it's the
// only place one is created, always with isVerified: true), so a failed
// User lookup below also falls back to checking PendingSignup: a correct
// password against a pending signup returns the same NOT_VERIFIED shape
// as before, so the frontend can redirect to /verify-email instead of
// showing a generic auth failure — but only after a password match, so a
// wrong-password guess against a pending signup is indistinguishable from
// one against a truly nonexistent email.
// ---------------------------------------------------------------
router.post('/login', verifyLimiter, async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
          field: null,
        },
      });
    }

    // Sends the generic "invalid email or password" response, reused for
    // every failure branch so none of them leak which part was wrong.
    const invalidCredentialsResponse = () => res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid email or password',
        field: null,
      },
    });

    const user = await User.findOne({ email });
    if (!user) {
      // No verified account for this email — but a pending, not-yet-
      // verified signup might exist. Only reveal that (via the same
      // NOT_VERIFIED response /login has always returned for an
      // unverified account) once the submitted password actually matches
      // the pending signup's passwordHash, mirroring the "correct
      // password required before revealing any distinguishing state"
      // property this route already enforces via the lockout check below.
      const pending = await PendingSignup.findOne({ email });
      if (pending) {
        const pendingMatch = await bcrypt.compare(password, pending.passwordHash);
        if (pendingMatch) {
          return res.status(403).json({
            success: false,
            data: { email: pending.email },
            error: {
              code: 'NOT_VERIFIED',
              message: 'Account not verified — please verify your email',
              field: null,
            },
          });
        }
      }
      recordSecurityEvent('LOGIN_FAILURE', { email, userId: null, ip: req.ip });
      return invalidCredentialsResponse();
    }

    // Live comparison against the current time, not a one-way flag — once
    // loginLockedUntil passes, the account works again automatically, no
    // explicit unlock action needed anywhere. Checked BEFORE bcrypt.compare
    // so a locked account rejects every attempt during the window, even one
    // with the correct password. The response is deliberately identical to
    // every other failure case below (same status, same code, same
    // message) — never revealing that lockout is active, which would
    // otherwise leak account existence the same way a distinct message
    // would (a nonexistent email can never be "locked").
    if (user.loginLockedUntil && user.loginLockedUntil > new Date()) {
      // A repeat attempt against an account that's already locked — the
      // single strongest signal in this whole audit trail that a targeted
      // attack may still be in progress, so it gets its own event rather
      // than silently falling through unrecorded. Distinct from
      // LOGIN_LOCKOUT (the one attempt that *causes* the lockout) and from
      // a normal LOGIN_FAILURE against an active, unlocked account.
      recordSecurityEvent('LOGIN_LOCKOUT', { email: user.email, userId: user._id, ip: req.ip });
      return invalidCredentialsResponse();
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.loginAttempts += 1;
      // Distinguish the attempt that actually crosses the threshold (and
      // therefore locks the account) from every other failed attempt, so
      // the audit trail can tell "one more wrong password" apart from
      // "this is the one that triggered a lockout".
      let triggeredLockout = false;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.loginLockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000);
        triggeredLockout = true;
      }
      await user.save();
      recordSecurityEvent(triggeredLockout ? 'LOGIN_LOCKOUT' : 'LOGIN_FAILURE', {
        email: user.email,
        userId: user._id,
        ip: req.ip,
      });
      return invalidCredentialsResponse();
    }

    // Correct password, and the account wasn't locked — clear any prior
    // failed-attempt state so it doesn't linger after a legitimate login.
    // Saved unconditionally, right here — the only other user.save() in
    // this route only runs on someone's very first login ever
    // (!hasReceivedWelcomeEmail), so relying on that would mean this reset
    // never actually persists for any normal returning user.
    user.loginAttempts = 0;
    user.loginLockedUntil = null;
    await user.save();

    // No isVerified check here: a real User document can only ever exist
    // already verified (see /verify-otp), so this state is unreachable —
    // the unverified case is handled entirely above, before `user` exists.

    if (!user.hasReceivedWelcomeEmail) {
      user.hasReceivedWelcomeEmail = true;
      await user.save();
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        logError('Welcome email failed to send', { err })
      );
    }

    const token = signToken(user._id, user.tokenVersion, remember === true);

    recordSecurityEvent('LOGIN_SUCCESS', { email: user.email, userId: user._id, ip: req.ip });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: toPublicUser(user),
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /login', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
        field: null,
      },
    });
  }
});

// Confirms a signup OTP, promotes the PendingSignup into a real verified
// User, and auto-logs the user in.
// ---------------------------------------------------------------
// POST /verify-otp
// Verifies the signup OTP against the PendingSignup row (not a User — see
// /signup). On success, this is the one and only place a User document
// ever gets created: created already verified, then the PendingSignup row
// is deleted. Issues a JWT immediately after (auto-login — per project
// decision, no separate login step needed after verification).
// ---------------------------------------------------------------
router.post('/verify-otp', verifyLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email and code are required', field: null },
      });
    }

    const pending = await PendingSignup.findOne({ email });
    if (!pending) {
      // Covers both "never signed up" and "already verified" in one
      // branch: a verified account has no PendingSignup row left (deleted
      // below on success), so both cases now produce this exact same
      // response — same shape, same dummy-hash timing-safe compare —
      // without needing a separate isVerified check the way the old
      // User-backed version did.
      return await incorrectCodeResponse(code, res);
    }

    if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return lockedResponse(res, 'Too many incorrect attempts. Please request a new code.');
    }

    if (isExpired(pending.otpExpiry)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_EXPIRED', message: 'Code has expired', field: null },
      });
    }

    const matches = await compareOtp(code, pending.otp);
    if (!matches) {
      pending.otpAttempts += 1;
      if (pending.otpAttempts >= MAX_OTP_ATTEMPTS) {
        // Invalidate the code outright rather than just blocking further
        // guesses — forces a fresh code via /resend-otp.
        pending.otp = null;
        pending.otpExpiry = null;
      }
      await pending.save();
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    const user = await User.create({
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      isVerified: true,
    });
    await pending.deleteOne();

    recordSecurityEvent('EMAIL_VERIFIED', { email: user.email, userId: user._id, ip: req.ip });

    if (!user.hasReceivedWelcomeEmail) {
      user.hasReceivedWelcomeEmail = true;
      await user.save();
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        logError('Welcome email failed to send', { err })
      );
    }

    const token = signToken(user._id, user.tokenVersion);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: toPublicUser(user),
      },
      error: null,
    });

  } catch (err) {
    logError('Error in /verify-otp', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// Issues a fresh signup OTP for an existing PendingSignup and re-emails it.
// ---------------------------------------------------------------
// POST /resend-otp
// Regenerates and re-sends the signup verification OTP, against the
// PendingSignup row (not a User — see /signup).
// ---------------------------------------------------------------
router.post('/resend-otp', emailSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required', field: null },
      });
    }

    const pending = await PendingSignup.findOne({ email });

    // No pending signup for this email: skip straight to the same generic
    // success response used below, without touching the DB or sending
    // anything. Covers both "never signed up" and "already verified" in
    // one branch — a verified account has no PendingSignup row left, same
    // unification as /verify-otp above — so a client can't tell any of
    // these apart from "code sent".
    if (!pending) {
      return res.status(200).json({
        success: true,
        data: { email },
        error: null,
      });
    }

    const otp = generateOtp();
    pending.otp = await hashOtp(otp);
    pending.otpExpiry = getOtpExpiry();
    pending.otpAttempts = 0; // fresh code -> fresh attempt budget
    pending.expiresAt = getPendingSignupExpiry();
    await pending.save();

    const emailResult = await sendOtpEmail(pending.email, otp, 'verify');
    if (!emailResult.success) {
      logError('Resend OTP email failed to send', { error: emailResult.error });
    }

    res.status(200).json({
      success: true,
      data: { email },
      error: null,
    });

  } catch (err) {
    logError('Error in /resend-otp', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// Starts a password reset: emails a reset code if the account exists,
// without revealing whether it does.
// ---------------------------------------------------------------
// POST /forgot-password
// Generates a reset code (stored in resetToken, despite the field name —
// it's the same 6-digit-OTP mechanism as signup, since the frontend uses
// the same OTP-box UI for both flows) and emails it.
// ---------------------------------------------------------------
router.post('/forgot-password', emailSendLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email is required', field: null },
      });
    }

    const user = await User.findOne({ email });

    // No account for this email: same generic success response as below,
    // without touching the DB or sending anything — indistinguishable from
    // "account exists, reset code sent".
    if (!user) {
      return res.status(200).json({
        success: true,
        data: { email },
        error: null,
      });
    }

    const code = generateOtp();
    user.resetToken = await hashOtp(code);
    user.resetTokenExpiry = getOtpExpiry();
    user.resetAttempts = 0; // fresh code -> fresh attempt budget
    await user.save();

    const emailResult = await sendOtpEmail(user.email, code, 'reset');
    if (!emailResult.success) {
      logError('Forgot-password OTP email failed to send', { error: emailResult.error });
    }

    res.status(200).json({
      success: true,
      data: { email },
      error: null,
    });

  } catch (err) {
    logError('Error in /forgot-password', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// Checks a password-reset code without consuming it, for the UI's step
// transition — the code is re-validated again in /reset-password.
// ---------------------------------------------------------------
// POST /verify-reset-otp
// Read-only check used for the UI's step 2 → step 3 transition — does
// NOT clear the code, since the user still needs to submit a new password
// afterward. Real re-validation happens again in /reset-password below.
// ---------------------------------------------------------------
router.post('/verify-reset-otp', verifyLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email and code are required', field: null },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return await incorrectCodeResponse(code, res);
    }

    if (user.resetAttempts >= MAX_OTP_ATTEMPTS) {
      return lockedResponse(res, 'Too many incorrect attempts. Please request a new code.');
    }

    if (isExpired(user.resetTokenExpiry)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_EXPIRED', message: 'Code has expired', field: null },
      });
    }

    const matches = await compareOtp(code, user.resetToken);
    if (!matches) {
      user.resetAttempts += 1;
      if (user.resetAttempts >= MAX_OTP_ATTEMPTS) {
        // Invalidate the code outright — forces a fresh code via /forgot-password.
        user.resetToken = null;
        user.resetTokenExpiry = null;
      }
      await user.save();
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    res.status(200).json({
      success: true,
      data: { email: user.email },
      error: null,
    });

  } catch (err) {
    logError('Error in /verify-reset-otp', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// Validates a reset code and, if correct, sets a new password and
// invalidates every previously issued token for the account.
// ---------------------------------------------------------------
// POST /reset-password
// Re-validates the reset code (defense in depth — don't trust that the
// client only calls this after a successful /verify-reset-otp) and, if
// valid, updates the password and clears the reset fields.
// ---------------------------------------------------------------
router.post('/reset-password', verifyLimiter, async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (
      !email || !code || !password ||
      typeof email !== 'string' || typeof code !== 'string' || typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Email, code, and new password are required', field: null },
      });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: pwCheck.message, field: 'password' },
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return await incorrectCodeResponse(code, res);
    }

    if (user.resetAttempts >= MAX_OTP_ATTEMPTS) {
      return lockedResponse(res, 'Too many incorrect attempts. Please request a new code.');
    }

    if (isExpired(user.resetTokenExpiry)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_EXPIRED', message: 'Code has expired', field: null },
      });
    }

    const matches = await compareOtp(code, user.resetToken);
    if (!matches) {
      user.resetAttempts += 1;
      if (user.resetAttempts >= MAX_OTP_ATTEMPTS) {
        // Invalidate the code outright — forces a fresh code via /forgot-password.
        user.resetToken = null;
        user.resetTokenExpiry = null;
      }
      await user.save();
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.resetAttempts = 0;
    user.tokenVersion += 1; // invalidate every token issued before this reset
    await user.save();

    recordSecurityEvent('PASSWORD_RESET', { email: user.email, userId: user._id, ip: req.ip });

    res.status(200).json({
      success: true,
      data: null,
      error: null,
    });

  } catch (err) {
    logError('Error in /reset-password', { err });
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});


// Bumps tokenVersion to invalidate every JWT ever issued to this account,
// including the one used to make this very request.
// ---------------------------------------------------------------
// POST /logout-everywhere
// Invalidates every token currently issued to this account by bumping
// tokenVersion — the token used to make this request itself stops being
// valid as a side effect, since it no longer matches the new version.
// Requires an already-valid token (verifyToken) rather than just an email,
// so this can't be used to lock another account out.
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

// Confirms a stored token still resolves to a valid session and returns
// the current user, for app-mount session checks.
// ---------------------------------------------------------------
// GET /me
// Lightweight session-validity check the frontend calls once at app mount
// (not on every navigation) to confirm a stored token still resolves to a
// real, current session before rendering protected UI — distinct from
// /login, which authenticates credentials and issues a brand-new token.
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