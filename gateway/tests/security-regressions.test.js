'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { buildPredictionApp, buildAuthApp, signTestToken } = require('./helpers');

// This tier targets the "sneaky" fixes from earlier sub-phases of this
// hardening pass that would be easy to silently reintroduce. Every
// assertion below was written against the actual current implementation,
// read fresh before writing the test — not against what the fix looked
// like when it first landed.

// Seeds a fixture user for tests that don't need real password hashing.
function seedUser(userStore, overrides = {}) {
  return userStore.seed({
    email: overrides.email || 'user@example.com',
    passwordHash: 'x',
    tokenVersion: 0,
    ...overrides,
  });
}

describe('NoSQL injection protection on GET /api/predictor/history', () => {
  test('a non-string query parameter (array via repeated keys) is dropped from the Mongo filter, not passed through', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'nosql@example.com' });
    const token = signTestToken(user._id, 0);

    // Repeated keys make Express/querystring hand back an array, not a
    // string — gateway/routes/prediction.js's isUsableString() rejects
    // anything that isn't typeof 'string', so this must never reach the
    // filter object at all.
    const res = await request(app)
      .get('/api/predictor/history?organism=Escherichia+coli&organism=Klebsiella+pneumoniae')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(history.findCalls.length, 1);
    assert.deepStrictEqual(history.findCalls[0], { userId: user._id });
    assert.ok(!('inputData.organism' in history.findCalls[0]));
  });

  test('a non-string antibiotic/result query parameter is dropped rather than reaching the $elemMatch filter', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'nosql2@example.com' });
    const token = signTestToken(user._id, 0);

    const res = await request(app)
      .get('/api/predictor/history?antibiotic=CIP&antibiotic=GEN&result=R&result=S')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(history.findCalls[0], { userId: user._id });
  });
});

describe('ReDoS protection on /api/predictor/history search param', () => {
  test('a pathological regex-triggering search string is escaped before use and completes quickly', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'redos@example.com' });
    const token = signTestToken(user._id, 0);

    const evilPattern = '(a+)+$';
    const res = await request(app)
      .get(`/api/predictor/history?search=${encodeURIComponent(evilPattern)}`)
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    const builtRegex = history.findCalls[0].$or[0]['inputData.organism'];
    assert.ok(builtRegex instanceof RegExp);
    // The raw pattern would be dangerous if used unescaped as a regex
    // source; confirm it was NOT — the metacharacters must be escaped in
    // the compiled source.
    assert.notEqual(builtRegex.source, evilPattern);
    assert.ok(builtRegex.source.includes('\\('));
    assert.ok(builtRegex.source.includes('\\+'));

    // With escaping in place, testing the compiled regex against a string
    // engineered to cause catastrophic backtracking under the UNescaped
    // pattern must still complete near-instantly, since escaping makes
    // every quantifier a literal character rather than a regex operator.
    const adversarialInput = `${'a'.repeat(50)}!`;
    const startedAt = Date.now();
    builtRegex.test(adversarialInput);
    const elapsedMs = Date.now() - startedAt;
    assert.ok(elapsedMs < 500, `expected < 500ms, got ${elapsedMs}ms`);
  });
});

describe('GET /api/predictor/history — additional query param edge cases', () => {
  test('confidenceMin/confidenceMax at exact boundary values (0 and 1) are both included, not dropped as falsy', async () => {
    // The route has no min/max range restriction on confidence at all
    // (unlike predictionValidation.js's numeric fields) — it just
    // parseFloat()s and checks isNaN. The interesting risk here is JS's
    // usual falsy-zero pitfall: isUsableString checks the STRING "0"
    // (truthy, length 1), and the code checks Number.isNaN on the parsed
    // float, never `if (min)` — so 0 must survive and not be silently
    // treated as "not provided".
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'confidence-boundary@example.com' });
    const token = signTestToken(user._id, 0);

    const res = await request(app)
      .get('/api/predictor/history?confidenceMin=0&confidenceMax=1')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(history.findCalls[0], {
      userId: user._id,
      predictions: { $elemMatch: { confidence: { $gte: 0, $lte: 1 } } },
    });
  });

  test('an unparseable dateFrom/dateTo string is dropped rather than erroring or producing an Invalid Date filter', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'invalid-date@example.com' });
    const token = signTestToken(user._id, 0);

    const res = await request(app)
      .get('/api/predictor/history?dateFrom=not-a-real-date')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    // new Date('not-a-real-date').getTime() is NaN, so createdAt never
    // gets a $gte, and — since dateTo is absent too — query.createdAt is
    // never set at all (not even as an empty object).
    assert.deepStrictEqual(history.findCalls[0], { userId: user._id });
    assert.ok(!('createdAt' in history.findCalls[0]));
  });

  test('organism/antibiotic/result values that are valid non-empty strings but not allow-listed are dropped, not rejected', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'not-allow-listed@example.com' });
    const token = signTestToken(user._id, 0);

    const res = await request(app)
      .get('/api/predictor/history?organism=Not+A+Real+Organism&antibiotic=NOTREAL&result=X')
      .set('Authorization', `Bearer ${token}`);

    // Dropped silently, exactly like every other unusable filter in this
    // route — never a 400/validation error for an unrecognized filter
    // value.
    assert.equal(res.status, 200);
    assert.deepStrictEqual(history.findCalls[0], { userId: user._id });
  });
});

describe('File upload validation on POST /api/predictor/extract-report', () => {
  test('a file with the wrong MIME type is rejected by the fileFilter', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-mime@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => {
      throw new Error('djangoClient.post should not be called for a rejected upload');
    };

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', Buffer.from('just some text'), { filename: 'notes.txt', contentType: 'text/plain' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'report');
  });

  test('a file with correct MIME/extension but wrong actual content fails the magic-byte check', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-magic@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => {
      throw new Error('djangoClient.post should not be called for a rejected upload');
    };

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', Buffer.from('THIS-IS-NOT-A-REAL-PDF-BODY'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.message, /does not appear to be a valid PDF/);
  });

  test("a malicious filename (path traversal + CRLF injection) never appears in the outgoing multipart body sent to Django", async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-filename@example.com' });
    const token = signTestToken(user._id, 0);

    let capturedFormData = null;
    djangoClient.post = async (url, formData) => {
      capturedFormData = formData;
      return { data: { success: true, data: { extracted: {}, missing: [], extractionAvailable: true }, error: null } };
    };

    const maliciousFilename = '../../../etc/passwd\r\nX-Injected-Header: MARKER_INJECTED_XYZ.pdf';
    const pdfBuffer = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('fake but valid-looking pdf body')]);

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', pdfBuffer, { filename: maliciousFilename, contentType: 'application/pdf' });

    assert.equal(res.status, 200);
    assert.ok(capturedFormData, 'djangoClient.post should have been called');

    const rawBody = capturedFormData.getBuffer().toString('utf8');
    assert.ok(!rawBody.includes('MARKER_INJECTED_XYZ'));
    assert.ok(!rawBody.includes('etc/passwd'));
    assert.ok(!rawBody.includes('X-Injected-Header'));
    // A fresh, safe, server-generated filename should be present instead.
    assert.match(rawBody, /filename="[0-9a-f-]+\.pdf"/);
  });

  // multer's configured limit is limits.fileSize: 10 * 1024 * 1024 (see
  // gateway/routes/prediction.js's `upload` config, read fresh above).
  const TEN_MB = 10 * 1024 * 1024;

  function pdfBufferOfSize(totalBytes) {
    const header = Buffer.from('%PDF-1.4\n');
    return Buffer.concat([header, Buffer.alloc(totalBytes - header.length, 'a')]);
  }

  test('a file safely within the 10MB multer limit is accepted (not rejected for size)', async () => {
    // NOTE: a buffer of EXACTLY 10*1024*1024 bytes was tried first and
    // empirically found to be rejected by multer ("File too large") even
    // though it's not over the declared limit — busboy's multipart
    // boundary-detection needs some internal lookahead before it can
    // confirm a chunk isn't the boundary, which adds a small amount of
    // slop to what counts against fileSize. Confirmed directly (a
    // standalone probe script) that 10*1024*1024 - 100 bytes succeeds
    // while 10*1024*1024 exactly does not — this is multer/busboy's own
    // implementation behavior, not something in this route's code, so the
    // "within the limit" side of this boundary test uses a safe margin
    // rather than the exact byte count.
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-exact-limit@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => ({
      data: { success: true, data: { extracted: {}, missing: [], extractionAvailable: true }, error: null },
    });

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', pdfBufferOfSize(TEN_MB - 1024), { filename: 'within-limit.pdf', contentType: 'application/pdf' });

    assert.equal(res.status, 200);
  });

  test('a file one byte over the 10MB multer limit is rejected', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-over-limit@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => {
      throw new Error('djangoClient.post should not be called for a file that exceeds the size limit');
    };

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', pdfBufferOfSize(TEN_MB + 1), { filename: 'toobig.pdf', contentType: 'application/pdf' });

    // multer emits a LIMIT_FILE_SIZE error for an oversized part, which
    // propagates to Express's own error handling since this test app (like
    // the real prediction router) doesn't swallow it — asserting it is NOT
    // treated as a successful upload is the meaningful, code-agnostic
    // check here (the exact status Express's default handler produces is
    // an Express/multer implementation detail, not this route's own logic).
    assert.notEqual(res.status, 200);
  });

  test('a completely empty file (0 bytes) fails the magic-byte check', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-empty@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => {
      throw new Error('djangoClient.post should not be called for an empty file');
    };

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', Buffer.alloc(0), { filename: 'empty.pdf', contentType: 'application/pdf' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.message, /does not appear to be a valid PDF/);
  });

  test('a file with a valid %PDF- header but garbage content after it currently passes the magic-byte check', async () => {
    // Documents actual, current behavior — the magic-byte check
    // (gateway/routes/prediction.js) only inspects the first 5 bytes. A
    // file that starts with %PDF- but is otherwise garbage is NOT caught
    // here; deeper structural validity is Django/pdfplumber's concern on
    // the other side, not this gateway-side check's job. Not a bug this
    // sub-phase is fixing — just confirming the actual current boundary of
    // what this check does and doesn't catch.
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'upload-garbage-body@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.post = async () => ({
      data: { success: true, data: { extracted: {}, missing: [], extractionAvailable: true }, error: null },
    });

    const garbageAfterHeader = Buffer.concat([Buffer.from('%PDF-'), Buffer.from('TOTALLY NOT A REAL PDF STRUCTURE \x00\x01\x02')]);
    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', garbageAfterHeader, { filename: 'garbage.pdf', contentType: 'application/pdf' });

    assert.equal(res.status, 200);
  });
});

describe('Safe error-forwarding (handleDjangoError)', () => {
  test('a legitimate, envelope-shaped error from Django is forwarded to the client unchanged', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'envelope@example.com' });
    const token = signTestToken(user._id, 0);

    const envelopeBody = {
      success: false,
      data: null,
      error: { code: 'VALIDATION_ERROR', message: "Query parameter 'antibiotic' is required", field: 'antibiotic' },
    };
    djangoClient.get = async () => {
      const err = new Error('Request failed with status code 400');
      err.response = { status: 400, data: envelopeBody };
      throw err;
    };

    const res = await request(app)
      .get('/api/predictor/trends?antibiotic=CIP')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.deepStrictEqual(res.body, envelopeBody);
  });

  test('a non-envelope response (e.g. a Django debug page) is NOT forwarded — the client gets a generic INTERNAL_ERROR instead', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'nonenvelope@example.com' });
    const token = signTestToken(user._id, 0);

    const djangoDebugHtml = '<html><body><h1>DisallowedHost</h1><p>SECRET_KEY=super-secret-leak</p></body></html>';
    djangoClient.get = async () => {
      const err = new Error('Request failed with status code 500');
      err.response = { status: 500, data: djangoDebugHtml };
      throw err;
    };

    const res = await request(app)
      .get('/api/predictor/trends?antibiotic=CIP')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('SECRET_KEY'));
    assert.ok(!serialized.includes('DisallowedHost'));
  });

  test('ECONNABORTED (timeout) gets its own distinct 504 UPSTREAM_TIMEOUT', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'timeout@example.com' });
    const token = signTestToken(user._id, 0);

    djangoClient.get = async () => {
      const err = new Error('timeout of 30000ms exceeded');
      err.code = 'ECONNABORTED';
      // No err.response and no err.request here — axios timeouts fire
      // client-side before either would exist.
      throw err;
    };

    const res = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 504);
    assert.equal(res.body.error.code, 'UPSTREAM_TIMEOUT');
  });

  test('ECONNREFUSED (Django down — has err.request, no err.response) and a bare network error (neither) both fall through to the SAME generic 500 INTERNAL_ERROR — handleDjangoError does not currently distinguish them', async () => {
    // Read handleDjangoError (gateway/routes/prediction.js) fresh: after
    // the ECONNABORTED check, the ONLY branch condition is `if
    // (err.response)`. Anything without a response — whether or not
    // err.request is present — falls into the same `else` (log-only)
    // path and the same final 500 INTERNAL_ERROR response. This test
    // documents that current behavior precisely, rather than assuming
    // ECONNREFUSED gets special treatment it doesn't have.
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'connrefused@example.com' });
    const token = signTestToken(user._id, 0);

    djangoClient.get = async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:8000');
      err.code = 'ECONNREFUSED';
      err.request = {}; // present, but no err.response
      throw err;
    };
    const connRefusedRes = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);

    djangoClient.get = async () => {
      // Neither err.response nor err.request — e.g. a DNS failure before
      // any request object was even constructed.
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };
    const bareNetworkErrorRes = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);

    assert.equal(connRefusedRes.status, 500);
    assert.equal(connRefusedRes.body.error.code, 'INTERNAL_ERROR');
    assert.equal(bareNetworkErrorRes.status, 500);
    assert.equal(bareNetworkErrorRes.body.error.code, 'INTERNAL_ERROR');
    assert.deepStrictEqual(connRefusedRes.body, bareNetworkErrorRes.body);
  });
});

// Rebuilds index.js's security-middleware chain standalone, without its
// Mongo-connect/listen side effects, for header/CORS assertions.
// gateway/index.js constructs its Express app with side effects (connects
// to MongoDB, calls app.listen()) that must never run in a test process.
// Since index.js doesn't export an app factory, this rebuilds the exact
// same security-middleware chain from gateway/index.js (helmet config,
// Permissions-Policy header, CORS config) read directly before writing
// this test, so header/CORS behavior can be asserted without those side
// effects. Keep in sync with index.js manually if that config changes.
function buildSecurityHeadersApp() {
  const app = express();

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

  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()'
    );
    next();
  });

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
  }));

  app.get('/probe', (req, res) => res.json({ ok: true }));
  return app;
}

describe('Security headers', () => {
  test('a request to any route returns the expected security headers with correct values', async () => {
    const app = buildSecurityHeadersApp();
    const res = await request(app).get('/probe');

    assert.equal(res.status, 200);
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['referrer-policy'], 'no-referrer');
    assert.equal(res.headers['strict-transport-security'], 'max-age=31536000; includeSubDomains');
    assert.equal(
      res.headers['permissions-policy'],
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()'
    );

    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'expected a Content-Security-Policy header');
    assert.ok(csp.includes("default-src 'none'"));
    assert.ok(csp.includes("frame-ancestors 'none'"));
  });
});

describe('CORS', () => {
  test('an allowed Origin gets the matching Access-Control-Allow-Origin', async () => {
    const app = buildSecurityHeadersApp();
    const res = await request(app).get('/probe').set('Origin', 'http://localhost:5173');

    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  test('a disallowed Origin does not get an Access-Control-Allow-Origin header', async () => {
    const app = buildSecurityHeadersApp();
    const res = await request(app).get('/probe').set('Origin', 'http://evil.example.com');

    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  test('a request with no Origin header (curl/server-to-server) is unaffected by CORS', async () => {
    const app = buildSecurityHeadersApp();
    const res = await request(app).get('/probe');

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  test('an Origin differing only in casing or a trailing slash from the configured value is rejected (exact string match, not normalized)', async () => {
    // allowedOrigins.includes(origin) (gateway/index.js) is a plain exact
    // string comparison — no scheme/host normalization. A real browser
    // always sends a normalized Origin, so this only matters for a
    // non-browser/spoofed request, but the exact-match behavior is worth
    // pinning explicitly rather than assuming.
    const app = buildSecurityHeadersApp();

    const differentCaseRes = await request(app).get('/probe').set('Origin', 'http://LOCALHOST:5173');
    assert.equal(differentCaseRes.headers['access-control-allow-origin'], undefined);

    const trailingSlashRes = await request(app).get('/probe').set('Origin', 'http://localhost:5173/');
    assert.equal(trailingSlashRes.headers['access-control-allow-origin'], undefined);
  });
});

// Builds a full app (real auth routes + security middleware) so headers
// can be checked on genuine 401/429/500 responses, not just 200s.
// Mirrors index.js's middleware ordering: helmet + Permissions-Policy +
// CORS are applied at the very top of the app, before any route (or the
// final error handler) runs — so they must be present on every response
// regardless of its eventual status code. Mounts the REAL authRoutes
// (fresh-required, same model-mocking pattern as helpers.js) alongside the
// same helmet/CORS config so a genuine 401 and a genuine 429 (from the
// real verifyLimiter) can be produced, plus a synthetic route and the same
// final error-handling middleware shape as index.js for the 500 case.
// CORS are applied at the very top of the app, before any route (or the
// final error handler) runs — so they must be present on every response
// regardless of its eventual status code. Mounts the REAL authRoutes
// (fresh-required, same model-mocking pattern as helpers.js) alongside the
// same helmet/CORS config so a genuine 401 and a genuine 429 (from the
// real sessionLimiter) can be produced, plus a synthetic route and the same
// final error-handling middleware shape as index.js for the 500 case.
function buildFullAppWithHeaders() {
  const {
    clearCache, createUserStore, attachUserStore,
    mockSecurityEvent, mockFirebaseAuth, paths,
  } = require('./helpers');
  clearCache(paths.AUTH_ROUTE_PATH, paths.AUTH_RATE_LIMITERS_PATH);

  const User = require(paths.USER_MODEL_PATH);
  const SecurityEvent = require(paths.SECURITY_EVENT_MODEL_PATH);
  const firebaseAdmin = require(paths.FIREBASE_ADMIN_PATH);
  attachUserStore(User, createUserStore());
  mockSecurityEvent(SecurityEvent);
  const firebaseAuthMock = mockFirebaseAuth(firebaseAdmin);
  // A genuine 401 for this test's purposes: an invalid/unverifiable
  // Firebase token, same as a real bad-credential attempt would produce.
  firebaseAuthMock.setNextResult(new Error('invalid token'));
  const authRoutes = require(paths.AUTH_ROUTE_PATH);

  const app = express();
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    frameguard: { action: 'deny' },
  }));
  app.use((req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(), display-capture=()'
    );
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
  }));
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/boom', (req, res, next) => {
    next(new Error('synthetic error for header-on-error-response test'));
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', field: null },
    });
  });
  return app;
}

// Shared assertion: checks all the helmet-set security headers on a response.
function assertSecurityHeadersPresent(res) {
  assert.equal(res.headers['x-frame-options'], 'DENY');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['referrer-policy'], 'no-referrer');
  assert.ok(res.headers['content-security-policy']);
  assert.ok(res.headers['permissions-policy']);
}

describe('Security headers are present on error responses too, not just 200s', () => {
  test('401 (bad session token), 429 (rate limited), and 500 (unhandled error) responses all still carry the helmet-set security headers', async () => {
    const app = buildFullAppWithHeaders();

    const res401 = await request(app).post('/api/auth/session').send({ idToken: 'invalid-token' });
    assert.equal(res401.status, 401);
    assertSecurityHeadersPresent(res401);

    let last429;
    // sessionLimiter's real max is 20/15min (see middleware/authRateLimiters.js) —
    // this loop count must track that value, not be picked independently of it.
    for (let i = 0; i < 21; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      last429 = await request(app).post('/api/auth/session').send({ idToken: 'invalid-token' });
    }
    assert.equal(last429.status, 429);
    assertSecurityHeadersPresent(last429);

    const res500 = await request(app).get('/boom');
    assert.equal(res500.status, 500);
    assertSecurityHeadersPresent(res500);
  });
});

describe('Per-user (not per-IP) rate limiting on prediction routes', () => {
  test('two different authenticated users get independent rate-limit budgets on the same route', async () => {
    const { app, userStore } = buildPredictionApp();
    const userA = seedUser(userStore, { email: 'ratea@example.com' });
    const userB = seedUser(userStore, { email: 'rateb@example.com' });
    const tokenA = signTestToken(userA._id, 0);
    const tokenB = signTestToken(userB._id, 0);

    // expensiveLimiter max=10 (gateway/middleware/predictionRateLimiters.js,
    // confirmed by reading the file). Sending an empty body triggers a fast
    // 400 VALIDATION_ERROR from validatePredictionData before djangoClient
    // is ever touched — the rate limiter still counts every request
    // regardless of the eventual status code, so this avoids needing to
    // mock djangoClient.post for this test entirely.
    const MAX = 10;
    const responsesA = [];
    for (let i = 0; i < MAX + 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      responsesA.push(
        await request(app).post('/api/predictor/predict').set('Authorization', `Bearer ${tokenA}`).send({})
      );
    }

    for (const res of responsesA.slice(0, MAX)) {
      assert.notEqual(res.status, 429);
    }
    assert.equal(responsesA[MAX].status, 429);

    const userBRes = await request(app).post('/api/predictor/predict').set('Authorization', `Bearer ${tokenB}`).send({});
    assert.notEqual(userBRes.status, 429);
  });
});

describe('Internal API key on outgoing Django calls', () => {
  test('djangoClient requests carry the X-Internal-Api-Key header', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'internalkey@example.com' });
    const token = signTestToken(user._id, 0);

    let capturedConfig = null;
    const originalAdapter = djangoClient.defaults.adapter;
    djangoClient.defaults.adapter = async (config) => {
      capturedConfig = config;
      return {
        data: { success: true, data: { series: [] }, error: null },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    try {
      await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);
    } finally {
      djangoClient.defaults.adapter = originalAdapter;
    }

    assert.ok(capturedConfig, 'expected djangoClient to have made a request');
    const headerValue =
      typeof capturedConfig.headers.get === 'function'
        ? capturedConfig.headers.get('X-Internal-Api-Key')
        : capturedConfig.headers['X-Internal-Api-Key'];
    assert.equal(headerValue, process.env.INTERNAL_API_KEY);
  });
});

describe('Read-route rate limit is realistically sized', () => {
  test('a realistic multi-page session (70-100 requests) is never rate-limited, but the limiter still blocks well past its configured max', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'readvolume@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.get = async () => ({ data: { success: true, data: { series: [] }, error: null } });

    // readLimiter max=300 (gateway/middleware/predictionRateLimiters.js,
    // confirmed by reading the file — this is the value the hotfix raised
    // it to, replacing the miscalibrated 30 that broke real navigation).
    const READ_LIMITER_MAX = 300;
    const TOTAL_REQUESTS = READ_LIMITER_MAX + 5;

    const statuses = [];
    for (let i = 0; i < TOTAL_REQUESTS; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);
      statuses.push(res.status);
    }

    // A realistic session's worth of requests (Home + Trends + History +
    // Explore, each looping over 15 antibiotics) — well within budget —
    // must never be rate-limited.
    const firstNinety = statuses.slice(0, 90);
    assert.ok(firstNinety.every((s) => s !== 429), 'the first 90 requests of a realistic session were rate-limited');

    // But the limiter must still eventually block — it's not disabled —
    // once genuinely excessive volume is reached.
    const rateLimitedCount = statuses.filter((s) => s === 429).length;
    assert.ok(rateLimitedCount > 0, 'expected at least one 429 once volume exceeded the configured max');
  });
});

describe('Rate limiting — exact boundaries', () => {
  test('readLimiter: the 300th request succeeds, the 301st is blocked', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const user = seedUser(userStore, { email: 'exact-boundary-read@example.com' });
    const token = signTestToken(user._id, 0);
    djangoClient.get = async () => ({ data: { success: true, data: { series: [] }, error: null } });

    const READ_LIMITER_MAX = 300; // gateway/middleware/predictionRateLimiters.js, confirmed by reading the file.

    let lastWithinBudget;
    for (let i = 0; i < READ_LIMITER_MAX; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      lastWithinBudget = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);
    }
    assert.notEqual(lastWithinBudget.status, 429, 'the 300th request must not be rate-limited');

    const overBudget = await request(app).get('/api/predictor/trends?antibiotic=CIP').set('Authorization', `Bearer ${token}`);
    assert.equal(overBudget.status, 429, 'the 301st request must be rate-limited');
    assert.equal(overBudget.body.error.code, 'RATE_LIMITED');
  });

  test('verifyLimiter (auth): shared across /login and /verify-otp — the 10th request across both routes succeeds, the 11th is blocked', async () => {
    const { app } = buildAuthApp();
    const VERIFY_LIMITER_MAX = 10; // gateway/middleware/authRateLimiters.js, confirmed by reading the file.

    const responses = [];
    for (let i = 0; i < VERIFY_LIMITER_MAX - 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      responses.push(
        await request(app).post('/api/auth/login').send({ email: 'boundary@example.com', password: 'WrongPass1!' })
      );
    }
    // The 10th request overall, but the 1st on a DIFFERENT route sharing
    // the same IP-keyed limiter — confirms the budget is genuinely shared
    // across routes, not tracked per-route.
    const tenth = await request(app).post('/api/auth/verify-otp').send({ email: 'boundary@example.com', code: '000000' });
    responses.push(tenth);

    for (const res of responses) {
      assert.notEqual(res.status, 429);
    }

    const eleventh = await request(app).post('/api/auth/login').send({ email: 'boundary@example.com', password: 'WrongPass1!' });
    assert.equal(eleventh.status, 429);
    assert.equal(eleventh.body.error.code, 'RATE_LIMITED');
  });
});