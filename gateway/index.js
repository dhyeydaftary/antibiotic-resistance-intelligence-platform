require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const predictionRoutes = require('./routes/prediction');

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

// HSTS: tells browsers to only ever contact this origin over HTTPS, once
// they've seen this header over an actual HTTPS connection once. Plain
// manual middleware rather than helmet — helmet isn't currently a
// dependency, and pulling it in for one header while explicitly disabling
// everything else it does (CSP, frameguard, etc., which belong to a later,
// separate HTTP Security Headers sub-phase) would add a dependency and a
// larger surface to configure correctly for less clarity than one line.
//
// max-age=31536000 (1 year) + includeSubDomains: the standard baseline
// (OWASP/Mozilla) for a first HSTS rollout. `preload` is deliberately left
// out for now — submitting to the browser preload list is essentially
// permanent (removal takes months and requires shipping the removal to
// users of every major browser first) and ties the commitment to a specific
// domain. This app has no confirmed hosting platform or domain yet, so that
// decision belongs to the actual deployment, not this pass.
//
// HSTS has no effect over plain HTTP — browsers only start enforcing it
// after receiving this header on an HTTPS response, and ignore it entirely
// otherwise. So this header is inert in local dev (HTTP) and only takes
// effect once the app is actually served over HTTPS, which is expected at
// this stage.
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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
  console.error('Unhandled error reached global error handler:', err);
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
  console.error('Unhandled promise rejection:', reason);
});

// uncaughtException: per Node's own guidance, once this fires the process
// is in an undefined state — continuing to serve requests risks corrupted
// in-memory state or repeating whatever broke in a way that's worse than
// just stopping. So: log everything we can, then exit non-zero and let a
// process manager (pm2/systemd/Docker restart policy/etc.) bring up a fresh,
// known-good process. Swallowing this and staying alive is the wrong
// trade-off — a brief restart beats an indefinitely half-broken process.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception — exiting process:', err);
  process.exit(1);
});

// Connect to MongoDB, then start the server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Gateway server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });