// Per-user rate limiters for routes/prediction.js — applied after
// verifyToken, so req.userId is always set (see keyByUser below).
const rateLimit = require('express-rate-limit');

// Sends the standard 429 response when a rate limit is exceeded.
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
// Rate-limit key generator: buckets by authenticated user, not IP.
function keyByUser(req) {
  return req.userId;
}

// Generous per-user limiter for cheap, read-only routes.
// Cheap/read-only routes: /trends, /dataset-stats, /explain-trend, /history.
// No external API cost — just a Mongo query or a read from Django's
// in-memory dataset — so the budget is generous, mainly to blunt scripted
// scraping/polling rather than cost control.
//
// max=300, not the originally-calibrated 30: the frontend legitimately
// fires far more than one request per page visit against these routes.
// HomePage's tools panel and TrendsPage's overview chart each loop over
// all 15 antibiotics via Promise.all (see HomeToolsPanel.jsx,
// TrendsPage.jsx) to build multi-antibiotic comparison views — visiting
// Home alone costs ~15 requests, visiting Trends alone costs ~20 more
// (hero chart + 15-antibiotic overview + dataset-stats + up to 4 for the
// organism overlay), and all four read routes share this single budget.
// A single realistic session (Home, Trends, History, Explore, with a
// couple of page revisits) can legitimately reach 100+ requests with zero
// abuse involved — the original max=30 was calibrated as if one page
// view cost one request, which doesn't hold for this frontend's actual
// design. 300 comfortably covers several full session's worth of normal
// navigation while still blocking sustained scripted scraping, which
// would need to run for a while to approach that volume.
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: rateLimitResponse,
});

// Tight per-user limiter for routes with real external/API cost.
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
