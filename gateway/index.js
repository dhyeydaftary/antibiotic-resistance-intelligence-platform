require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const predictionRoutes = require('./routes/prediction');
const { logInfo, logError } = require('./utils/logger');

const app = express();

// Trust exactly one reverse-proxy hop (e.g. a single load balancer/PaaS
// router in front of the app) so Express derives req.ip from the
// X-Forwarded-For header instead of the proxy's own socket address. This
// matters directly for gateway/middleware/authRateLimiters.js's three
// limiters, which key by req.ip with no custom keyGenerator: without this
// setting behind a real proxy, every user shares one rate-limit bucket (the
// proxy's IP). Set to the number 1 rather than `true` — express-rate-limit
// (see gateway/node_modules/express-rate-limit/dist/index.cjs, the
// `trustProxy` validation) treats `trust proxy: true` as trusting the entire
// X-Forwarded-For chain, which lets a client spoof its own IP by sending a
// fake header and trivially bypass IP-based rate limiting; `1` trusts only
// the nearest hop, which the proxy itself controls.
//
// MUST be revisited when a real hosting platform is chosen: this value has
// to match the actual number of proxy hops in front of the app. Too low (or
// unset, the default) breaks rate limiting the way described above; too
// high or `true` makes it spoofable. In local development, where there is
// no proxy and no X-Forwarded-For header to (mis)trust, this setting is
// inert — Express falls back to the direct socket address either way.
app.set('trust proxy', 1);

// Security headers, via helmet — the scope grew from "just HSTS" (Transport
// Security) to five headers (this sub-phase), which is exactly the point
// past which hand-rolling stops making sense and helmet's purpose-built
// config becomes the better call.
//
// This is a pure JSON API with no HTML/JS/CSS of its own, so the CSP is
// deliberately maximally restrictive rather than helmet's own defaults
// (which assume a self-hosted web app and allow 'self' for scripts,
// styles, images, forms, etc. — none of which this service ever serves).
// useDefaults: false is required for this — without it, helmet MERGES a
// custom `directives` object with its own defaults rather than replacing
// them, verified directly before writing this config.
//
// X-Frame-Options: DENY (helmet's own default is SAMEORIGIN) — there's no
// legitimate reason for this API to be framed at all, not even
// same-origin, since it serves no page to frame.
//
// Left at helmet's own defaults, verified directly rather than assumed:
// Referrer-Policy (no-referrer), X-Content-Type-Options (nosniff), and HSTS
// (max-age=31536000; includeSubDomains — identical to the manual value this
// replaces, so no behavior change there). Same HSTS caveats as before still
// apply: inert over plain HTTP, `preload` still deliberately excluded until
// a real domain is confirmed.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
}));

// Permissions-Policy: not implemented by helmet 8.x at all (the underlying
// spec is still evolving upstream; helmet dropped support for it rather
// than maintain an incomplete/shifting implementation) — confirmed directly
// against the installed version rather than assumed. Denies the browser
// features with no legitimate use in a JSON API, as defense-in-depth
// against the unlikely case this response is ever rendered in a browsing
// context at all (e.g. a misconfigured proxy).
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()'
  );
  next();
});

// Minimal request/access log — custom middleware rather than morgan,
// consistent with the "no new dependencies" choice in utils/logger.js.
// Logs only method, path, status, and duration. Deliberately never logs
// req.body: /login and /signup bodies contain plaintext passwords, and
// logging them would defeat the entire point of hashing those passwords
// before they're ever persisted. res.on('finish') fires once the response
// has actually been sent, so res.statusCode reflects the real outcome
// (including responses written by the global error handler below).
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logInfo('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
});

// Comma-separated list of origins allowed to call this API from a browser.
// Named to match ml-backend's own CORS_ALLOWED_ORIGINS setting (settings.py)
// even though Django's is a hardcoded list rather than env-driven — same
// concept (which origins may call this service), same name, so anyone
// familiar with one side immediately understands the other.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    // No Origin header at all means this isn't a browser cross-origin
    // request — curl, Postman, server-to-server calls don't send one, and
    // CORS has nothing to enforce against a client that isn't a browser
    // subject to the same-origin policy in the first place.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/predictor', predictionRoutes);

// Simple health check route
app.get('/', (req, res) => {
  res.json({ message: 'AMR-Insight gateway is running' });
});

// Final error-handling middleware — catches anything that reaches Express
// without having been handled by a route's own try/catch (e.g. a bug in
// middleware itself, or a synchronous throw before a route's try block).
// Every route already returns this same {success,data,error} envelope on
// failure; this just guarantees the same shape even when nothing upstream
// caught the error. Never leak the raw error/stack to the client — log the
// full detail server-side only.
app.use((err, req, res, next) => {
  logError('Unhandled error reached global error handler', { err });
  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      field: null,
    },
  });
});

// unhandledRejection: a rejected Promise with no .catch anywhere. Node's
// own default here is just a warning (not a crash), but we log explicitly
// rather than relying on that default silently changing between Node
// versions. The process itself is still in a known-good state after this,
// so there's no reason to exit.
process.on('unhandledRejection', (reason) => {
  logError('Unhandled promise rejection', { reason });
});

// uncaughtException: per Node's own guidance, once this fires the process
// is in an undefined state — continuing to serve requests risks corrupted
// in-memory state or repeating whatever broke in a way that's worse than
// just stopping. So: log everything we can, then exit non-zero and let a
// process manager (pm2/systemd/Docker restart policy/etc.) bring up a fresh,
// known-good process. Swallowing this and staying alive is the wrong
// trade-off — a brief restart beats an indefinitely half-broken process.
process.on('uncaughtException', (err) => {
  logError('Uncaught exception — exiting process', { err });
  process.exit(1);
});

// Connect to MongoDB, then start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logInfo('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logInfo('Gateway server running', { port: PORT });
    });
  })
  .catch((err) => {
    logError('MongoDB connection error', { err });
  });