const rateLimit = require('express-rate-limit');

// Shared response shape, consistent with authRateLimiters.js.
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

// These routes all sit behind verifyToken, so req.userId is already set by
// the time this runs — key on the authenticated account, not the network
// address. IP-based keying would either punish every user behind the same
// NAT/shared IP together, or let one account dodge the limit by rotating
// IPs; per-user keying does neither.
function keyByUser(req) {
  return req.userId;
}

// Cheap/read-only routes: /trends, /dataset-stats, /explain-trend, /history.
// No external API cost — just a Mongo query or a read from Django's
// in-memory dataset — so the budget is generous, mainly to blunt scripted
// scraping/polling rather than cost control.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: rateLimitResponse,
});

// Expensive routes: /predict, /extract-report, /research-papers. Each of
// these triggers a real external cost or a third-party API call — /predict
// and /extract-report both invoke Gemini (see ai_insights.py /
// extract_report_llm.py), and /research-papers calls PubMed's E-utilities,
// which has its own rate limits that a single abusive user could exhaust
// for everyone. Tighter budget accordingly.
const expensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: rateLimitResponse,
});

module.exports = { readLimiter, expensiveLimiter };
