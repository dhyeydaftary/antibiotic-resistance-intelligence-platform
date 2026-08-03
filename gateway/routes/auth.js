const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
async function incorrectCodeResponse(code, res) {
  await compareOtp(code, DUMMY_OTP_HASH);
  return res.status(400).json({
    success: false,
    data: null,
    error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
  });
}

function signToken(userId, tokenVersion, remember = false) {
  return jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: remember ? '7d' : '24h' }
  );
}

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

// ---------------------------------------------------------------
// POST /signup
// Creates an unverified account, generates an OTP, emails it.
// If an unverified account already exists for this email, it's reused
// (name/password updated, new OTP issued) rather than blocked — this
// prevents users who abandoned verification from being permanently stuck.
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

    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
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

    let user;
    if (existingUser && !existingUser.isVerified) {
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      existingUser.otp = otpHash;
      existingUser.otpExpiry = otpExpiry;
      existingUser.otpAttempts = 0; // fresh code -> fresh attempt budget
      user = await existingUser.save();
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        otp: otpHash,
        otpExpiry,
        otpAttempts: 0,
        isVerified: false,
      });
    }

    const emailResult = await sendOtpEmail(user.email, otp, 'verify');
    if (!emailResult.success) {
      console.error('Signup OTP email failed to send:', emailResult.error);
      // Account still created — user can use /resend-otp to retry.
    }

    res.status(201).json({
      success: true,
      data: {
        email: user.email,
      },
      error: null,
    });

  } catch (err) {
    console.error('Error in /signup:', err);
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

// ---------------------------------------------------------------
// POST /login
// Unchanged except: blocks unverified accounts with a distinct error code
// so the frontend can redirect to /verify-email instead of showing a
// generic auth failure.
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid email or password',
          field: null,
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid email or password',
          field: null,
        },
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        data: { email: user.email },
        error: {
          code: 'NOT_VERIFIED',
          message: 'Account not verified — please verify your email',
          field: null,
        },
      });
    }

    if (!user.hasReceivedWelcomeEmail) {
      user.hasReceivedWelcomeEmail = true;
      await user.save();
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.error('Welcome email failed to send:', err)
      );
    }

    const token = signToken(user._id, user.tokenVersion, remember === true);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: toPublicUser(user),
      },
      error: null,
    });

  } catch (err) {
    console.error('Error in /login:', err);
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

// ---------------------------------------------------------------
// POST /verify-otp
// Verifies the signup OTP. On success, marks the account verified,
// clears the OTP fields, and issues a JWT (auto-login — per project
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

    const user = await User.findOne({ email });
    if (!user) {
      return await incorrectCodeResponse(code, res);
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'ALREADY_VERIFIED', message: 'This account is already verified', field: null },
      });
    }

    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      return lockedResponse(res, 'Too many incorrect attempts. Please request a new code.');
    }

    if (isExpired(user.otpExpiry)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_EXPIRED', message: 'Code has expired', field: null },
      });
    }

    const matches = await compareOtp(code, user.otp);
    if (!matches) {
      user.otpAttempts += 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        // Invalidate the code outright rather than just blocking further
        // guesses — forces a fresh code via /resend-otp.
        user.otp = null;
        user.otpExpiry = null;
      }
      await user.save();
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();

    if (!user.hasReceivedWelcomeEmail) {
      user.hasReceivedWelcomeEmail = true;
      await user.save();
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.error('Welcome email failed to send:', err)
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
    console.error('Error in /verify-otp:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

// ---------------------------------------------------------------
// POST /resend-otp
// Regenerates and re-sends the signup verification OTP.
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

    const user = await User.findOne({ email });

    // No account for this email: skip straight to the same generic success
    // response used below, without touching the DB or sending anything —
    // a client can't tell this apart from "account exists, code sent".
    if (!user) {
      return res.status(200).json({
        success: true,
        data: { email },
        error: null,
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'ALREADY_VERIFIED', message: 'This account is already verified', field: null },
      });
    }

    const otp = generateOtp();
    user.otp = await hashOtp(otp);
    user.otpExpiry = getOtpExpiry();
    user.otpAttempts = 0; // fresh code -> fresh attempt budget
    await user.save();

    const emailResult = await sendOtpEmail(user.email, otp, 'verify');
    if (!emailResult.success) {
      console.error('Resend OTP email failed to send:', emailResult.error);
    }

    res.status(200).json({
      success: true,
      data: { email },
      error: null,
    });

  } catch (err) {
    console.error('Error in /resend-otp:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

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
      console.error('Forgot-password OTP email failed to send:', emailResult.error);
    }

    res.status(200).json({
      success: true,
      data: { email },
      error: null,
    });

  } catch (err) {
    console.error('Error in /forgot-password:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

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
    console.error('Error in /verify-reset-otp:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

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

    res.status(200).json({
      success: true,
      data: null,
      error: null,
    });

  } catch (err) {
    console.error('Error in /reset-password:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});


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

    res.status(200).json({
      success: true,
      data: null,
      error: null,
    });

  } catch (err) {
    console.error('Error in /logout-everywhere:', err);
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  }
});

module.exports = router;