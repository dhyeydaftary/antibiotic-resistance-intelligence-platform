// ===================================================================
// Auth middleware — gates every protected route (all of
// routes/prediction.js, plus /logout-everywhere and /me in
// routes/auth.js). Verifies the JWT's signature/expiry AND that its
// tokenVersion still matches the user's current tokenVersion in Mongo,
// so a password reset or "logout everywhere" invalidates old tokens
// immediately rather than waiting for natural expiry. On success sets
// req.userId for downstream handlers; on any failure, uniformly returns
// 401 AUTH_ERROR (deliberately doesn't distinguish "expired" from
// "malformed" from "stale tokenVersion" in the response).
// ===================================================================
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Express middleware: verifies a request's JWT and rejects revoked tokens.
// Called by every protected route.
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'AUTH_ERROR',
        message: 'No token provided',
        field: null,
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Cryptographic validity isn't enough on its own — the token also has
    // to match the user's *current* tokenVersion. A password reset or
    // "logout everywhere" bumps tokenVersion, which immediately invalidates
    // every token issued before that point, even ones that haven't
    // naturally expired yet.
    const user = await User.findById(decoded.userId);
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid or expired token',
          field: null,
        },
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired token',
        field: null,
      },
    });
  }
}

module.exports = verifyToken;