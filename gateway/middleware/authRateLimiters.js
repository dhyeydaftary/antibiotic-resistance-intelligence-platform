const rateLimit = require('express-rate-limit');

// Shared response shape, consistent with the rest of the auth API.
function rateLimitResponse(req, res) {
    res.status(429).json({
        success: false,
        data: null,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            field: null,
        },
    });
}

// Login / OTP-code verification endpoints — brute-force baseline.
// OTP-verifying routes also have a per-account attempt counter (otpUtil.js
// consumers in auth.js); this is a secondary, IP-level guard.
const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse,
});

// Endpoints that directly trigger an outbound email (signup OTP, resend,
// forgot-password). Tighter, since these cost Resend quota and can be used
// to spam a victim's inbox.
const emailSendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse,
});

// Signup specifically: slightly looser than resend/forgot-password since it
// also gates on account creation, not just an email send.
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse,
});

module.exports = { verifyLimiter, emailSendLimiter, signupLimiter };