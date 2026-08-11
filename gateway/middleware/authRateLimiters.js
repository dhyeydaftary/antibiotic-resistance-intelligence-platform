// IP-keyed rate limiter for routes/auth.js. Only one route remains
// (/session) after the Firebase migration -- Firebase itself now owns
// rate-limiting for password/OTP attempts, signup, and email sends (see
// ADR-0005). This limiter is a secondary, IP-level guard against a client
// hammering the Gateway's own token-exchange endpoint, independent of
// whatever Firebase does on its side.
const rateLimit = require('express-rate-limit');

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

// Deliberately generous: a legitimate user hits this once per real login,
// not per keystroke -- 20/15min comfortably covers normal use (including
// retries after a typo'd Firebase credential) while still bounding abuse.
const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitResponse,
});

module.exports = { sessionLimiter };