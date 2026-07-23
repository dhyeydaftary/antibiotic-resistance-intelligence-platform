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
} = require('../utils/otpUtil');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
router.post('/signup', async (req, res) => {
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
      user = await existingUser.save();
    } else {
      user = await User.create({
        name,
        email,
        passwordHash,
        otp: otpHash,
        otpExpiry,
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const token = signToken(user._id);

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
router.post('/verify-otp', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'No account matches that email', field: 'email' },
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'ALREADY_VERIFIED', message: 'This account is already verified', field: null },
      });
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
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    if (!user.hasReceivedWelcomeEmail) {
      user.hasReceivedWelcomeEmail = true;
      await user.save();
      sendWelcomeEmail(user.email, user.name).catch((err) =>
        console.error('Welcome email failed to send:', err)
      );
    }

    const token = signToken(user._id);

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
router.post('/resend-otp', async (req, res) => {
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
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'No account matches that email', field: 'email' },
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
    await user.save();

    const emailResult = await sendOtpEmail(user.email, otp, 'verify');
    if (!emailResult.success) {
      console.error('Resend OTP email failed to send:', emailResult.error);
    }

    res.status(200).json({
      success: true,
      data: { email: user.email },
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
router.post('/forgot-password', async (req, res) => {
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
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'No account matches that email', field: 'email' },
      });
    }

    const code = generateOtp();
    user.resetToken = await hashOtp(code);
    user.resetTokenExpiry = getOtpExpiry();
    await user.save();

    const emailResult = await sendOtpEmail(user.email, code, 'reset');
    if (!emailResult.success) {
      console.error('Forgot-password OTP email failed to send:', emailResult.error);
    }

    res.status(200).json({
      success: true,
      data: { email: user.email },
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
router.post('/verify-reset-otp', async (req, res) => {
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
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'No account matches that email', field: 'email' },
      });
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
router.post('/reset-password', async (req, res) => {
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'No account matches that email', field: 'email' },
      });
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
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'OTP_INCORRECT', message: 'Incorrect code', field: null },
      });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
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

module.exports = router;