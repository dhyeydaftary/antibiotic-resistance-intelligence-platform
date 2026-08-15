'use strict';

// Shared test scaffolding for the gateway test suite.
//
// Mocking strategy (matches the pattern battle-tested throughout the actual
// hardening pass's manual verification):
//   - An in-memory Map-based store stands in for MongoDB. Mongoose model
//     static methods (findOne/findById/create) are reassigned directly on
//     the required model object, so any route file that requires the same
//     model (same require.cache entry) sees the mocks too.
//   - Route files and their rate-limiter middleware are re-required fresh
//     per test group (their require.cache entries are deleted first), so
//     one test group's rate-limiter usage can never bleed into another's.
//     Model files are deliberately NOT cache-busted — we want every fresh
//     route require to keep seeing the same mocked model object.

require('dotenv').config();

// Points config/firebaseAdmin.js's require(serviceAccountPath) at a fake,
// safe-to-commit fixture (tests/fixtures/) instead of a real key -- must
// be set before ANYTHING first requires that module (it calls
// initializeApp()/cert() at load time), so this sits here, before every
// other require in this file. initializeApp()/cert() only store the
// value; they don't validate it cryptographically until an actual
// network call is made, which never happens here -- verifyIdToken is
// mocked separately, below.
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = require('path').join(__dirname, 'fixtures', 'fake-firebase-service-account.json');

const express = require('express');
const jwt = require('jsonwebtoken');

const USER_MODEL_PATH = require.resolve('../models/User');
const SECURITY_EVENT_MODEL_PATH = require.resolve('../models/SecurityEvent');
const PREDICTION_HISTORY_MODEL_PATH = require.resolve('../models/PredictionHistory');
const AUTH_ROUTE_PATH = require.resolve('../routes/auth');
const PREDICTION_ROUTE_PATH = require.resolve('../routes/prediction');
const AUTH_RATE_LIMITERS_PATH = require.resolve('../middleware/authRateLimiters');
const PREDICTION_RATE_LIMITERS_PATH = require.resolve('../middleware/predictionRateLimiters');
const VERIFY_TOKEN_PATH = require.resolve('../middleware/verifyToken');
const DJANGO_CLIENT_PATH = require.resolve('../utils/djangoClient');
const EMAIL_UTIL_PATH = require.resolve('../utils/emailUtil');
const FIREBASE_ADMIN_PATH = require.resolve('../config/firebaseAdmin');

// Deletes require.cache entries so the next require() re-evaluates fresh.
function clearCache(...resolvedPaths) {
  for (const p of resolvedPaths) {
    delete require.cache[p];
  }
}

let idCounter = 0;
// Generates a fresh, unique fake Mongo ObjectId string for test fixtures.
function nextId() {
  idCounter += 1;
  return String(idCounter).padStart(24, '0');
}

// Builds an in-memory mock of the User model's Mongo collection.
// In-memory Map-based stand-in for MongoDB. Documents are plain objects
// held by reference in the Map, so a route that mutates a field and calls
// .save() has that mutation visible on the very next find() — this is what
// makes it possible to catch a route that forgets to persist a change,
// rather than a mock that always hands back fresh state regardless of what
// the route actually did.
function createUserStore() {
  const byId = new Map();

  // Attaches a mock .save() method that writes the doc back into the Map.
  function withSave(doc) {
    if (!doc.save) {
      doc.save = async function save() {
        byId.set(String(doc._id), doc);
        return doc;
      };
    }
    return doc;
  }

  // Fills in a fresh User document's default field values, matching the
  // real schema (models/User.js) -- password/OTP/lockout fields are gone
  // post-Firebase-migration; firebaseUid is the real identity anchor now.
  function withDefaults(fields) {
    return {
      _id: nextId(),
      firebaseUid: `fb-${nextId()}`,
      tokenVersion: 0,
      hasReceivedWelcomeEmail: false,
      ...fields,
    };
  }

  return {
    byId,
    // Test-only helper: insert a document directly, bypassing /signup.
    seed(fields) {
      const doc = withSave(withDefaults(fields));
      byId.set(doc._id, doc);
      return doc;
    },
    async findOne(query = {}) {
      if (query.email !== undefined) {
        for (const doc of byId.values()) {
          if (doc.email === query.email) return withSave(doc);
        }
        return null;
      }
      if (query.firebaseUid !== undefined) {
        for (const doc of byId.values()) {
          if (doc.firebaseUid === query.firebaseUid) return withSave(doc);
        }
        return null;
      }
      return null;
    },
    async findById(id) {
      const doc = byId.get(String(id));
      return doc ? withSave(doc) : null;
    },
    async create(fields) {
      const doc = withSave(withDefaults(fields));
      byId.set(doc._id, doc);
      return doc;
    },
  };
}

// Wires a mock store's methods onto the real User model object.
function attachUserStore(User, store) {
  User.findOne = store.findOne;
  User.findById = store.findById;
  User.create = store.create;
}

// Replaces SecurityEvent.create with an in-memory recorder for assertions.
function mockSecurityEvent(SecurityEvent) {
  const events = [];
  SecurityEvent.create = async (fields) => {
    events.push(fields);
    return fields;
  };
  return events;
}

// Replaces PredictionHistory.find/.countDocuments/.aggregate/.create with
// in-memory mocks. Captures every filter object passed to
// PredictionHistory.find() and .countDocuments(), so tests can assert on
// the actual Mongo query the route built rather than just the HTTP
// response — deliberately does NOT apply `query` as a real filter (matches
// the existing convention throughout this suite: filter-building
// correctness is tested via `findCalls`/`countCalls` assertions, not by
// the mock re-interpreting Mongo query syntax).
//
// PredictionHistory.find()'s return value is a chainable, thenable stand-in
// for a real Mongoose Query — .sort()/.skip()/.limit() can be called in any
// combination (the route always uses all three together) and the chain
// resolves to `records`, sorted/sliced according to whatever was chained.
function mockPredictionHistory(PredictionHistory) {
  const findCalls = [];
  const countCalls = [];
  const aggregateCalls = [];
  const records = [];
  let aggregateResult = [];

  function buildFindQuery(query) {
    findCalls.push(query);
    let sortSpec = null;
    let skipN = 0;
    let limitN = null;
    const chain = {
      sort(spec) { sortSpec = spec; return chain; },
      skip(n) { skipN = n; return chain; },
      limit(n) { limitN = n; return chain; },
      then(resolve, reject) {
        try {
          let result = records.slice();
          if (sortSpec) {
            const [field, dir] = Object.entries(sortSpec)[0];
            result.sort((a, b) => {
              if (a[field] === b[field]) return 0;
              return (a[field] > b[field] ? 1 : -1) * dir;
            });
          }
          if (skipN) result = result.slice(skipN);
          if (limitN != null) result = result.slice(0, limitN);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
    };
    return chain;
  }

  PredictionHistory.find = (query) => buildFindQuery(query);

  PredictionHistory.countDocuments = async (query) => {
    countCalls.push(query);
    return records.length;
  };

  // Tests exercising GET /history/aggregates set the raw $facet-shaped
  // result via setAggregateResult() before requesting — this mock doesn't
  // interpret the pipeline itself (that's exactly what "manually verify
  // against local Mongo" in the task covers); it only lets tests control
  // what the route receives back, to test the route's response-shaping
  // logic (defaults, percentage rounding, the empty-history case).
  PredictionHistory.aggregate = async (pipeline) => {
    aggregateCalls.push(pipeline);
    return aggregateResult;
  };

  PredictionHistory.create = async (fields) => {
    const doc = { _id: nextId(), createdAt: new Date(), ...fields };
    records.push(doc);
    return doc;
  };

  return {
    findCalls,
    countCalls,
    aggregateCalls,
    records,
    setAggregateResult(result) { aggregateResult = result; },
  };
}

// Replaces sendWelcomeEmail with an in-memory recorder. sendOtpEmail is
// gone from utils/emailUtil.js post-Firebase-migration -- OTP delivery is
// Firebase's own responsibility now, not this app's code.
function mockEmailUtil(emailUtil) {
  const welcomeEmails = [];
  emailUtil.sendWelcomeEmail = async (to, name) => {
    welcomeEmails.push({ to, name });
    return { success: true, id: 'test-welcome-id' };
  };
  return { welcomeEmails };
}

// Replaces config/firebaseAdmin.js's exported auth.verifyIdToken with a
// controllable mock. Call .setNextResult() before each request this test
// makes -- either a decoded-claims object (success) or an Error instance
// (verification failure, e.g. expired/invalid/malformed token).
function mockFirebaseAuth(firebaseAdmin) {
  let nextResult = null;
  firebaseAdmin.auth.verifyIdToken = async () => {
    if (nextResult instanceof Error) throw nextResult;
    return nextResult;
  };
  return {
    setNextResult(result) {
      nextResult = result;
    },
  };
}

// Builds a self-contained test Express app for the auth routes, with
// fresh mocked models, a mocked Firebase Admin verifyIdToken, and fresh
// rate limiters.
// firebaseAdmin.js is deliberately NOT cache-busted (like the model
// files) -- its initializeApp() guard (if (!getApps().length)) means a
// second, cache-busted require would just skip re-initializing anyway;
// re-mocking its already-shared .auth.verifyIdToken per call is enough.
function buildAuthApp() {
  clearCache(AUTH_ROUTE_PATH, AUTH_RATE_LIMITERS_PATH);

  const User = require(USER_MODEL_PATH);
  const SecurityEvent = require(SECURITY_EVENT_MODEL_PATH);
  const emailUtil = require(EMAIL_UTIL_PATH);
  const firebaseAdmin = require(FIREBASE_ADMIN_PATH);

  const userStore = createUserStore();
  attachUserStore(User, userStore);
  const events = mockSecurityEvent(SecurityEvent);
  const emails = mockEmailUtil(emailUtil);
  const firebaseAuthMock = mockFirebaseAuth(firebaseAdmin);

  const authRoutes = require(AUTH_ROUTE_PATH);
  const verifyToken = require(VERIFY_TOKEN_PATH);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  // Debug-only stub route, backed by the real verifyToken middleware and
  // the same User store this app instance just attached — lets tests check
  // whether a given token is (still) accepted after an auth action like
  // /logout-everywhere, without needing to spin up a second app (which
  // would attach a second, disconnected store to the same shared User
  // model object).
  app.get('/protected', verifyToken, (req, res) => {
    res.status(200).json({ success: true, data: { userId: req.userId }, error: null });
  });

  return { app, userStore, User, events, emails, firebaseAuthMock };
}

// Builds a self-contained test Express app for the prediction routes,
// with fresh mocked models and rate limiters.
// Builds a fresh Express app mounting routes/prediction.js, same
// fresh-require-cache treatment for the route and its rate limiters.
function buildPredictionApp() {
  // djangoClient is a singleton axios instance (utils/djangoClient.js) —
  // its cache entry is cleared here too, not just the route/limiter, so
  // each fresh prediction app gets its own pristine instance. Without
  // this, a test that reassigns djangoClient.get/.post (e.g. to simulate
  // a Django error) would permanently leak that override into every
  // later test in the same process, since prediction.js would otherwise
  // keep resolving the same shared, already-mutated object.
  clearCache(PREDICTION_ROUTE_PATH, PREDICTION_RATE_LIMITERS_PATH, DJANGO_CLIENT_PATH);

  const User = require(USER_MODEL_PATH);
  const PredictionHistory = require(PREDICTION_HISTORY_MODEL_PATH);
  const djangoClient = require(DJANGO_CLIENT_PATH);

  const userStore = createUserStore();
  attachUserStore(User, userStore);
  const history = mockPredictionHistory(PredictionHistory);

  const predictionRoutes = require(PREDICTION_ROUTE_PATH);
  const app = express();
  app.use(express.json());
  app.use('/api/predictor', predictionRoutes);

  return { app, userStore, User, djangoClient, PredictionHistory, history };
}

// Builds a minimal test app for exercising verifyToken in isolation.
// Minimal app exercising the real verifyToken middleware in isolation,
// against a throwaway stub route.
function buildVerifyTokenApp() {
  const User = require(USER_MODEL_PATH);
  const userStore = createUserStore();
  attachUserStore(User, userStore);

  const verifyToken = require(VERIFY_TOKEN_PATH);
  const app = express();
  app.use(express.json());
  app.get('/protected', verifyToken, (req, res) => {
    res.status(200).json({ success: true, data: { userId: req.userId }, error: null });
  });

  return { app, userStore, User };
}

// Signs a JWT for use as a test fixture, bypassing the real /login flow.
function signTestToken(userId, tokenVersion = 0, options = {}) {
  return jwt.sign({ userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: options.expiresIn || '24h',
  });
}

module.exports = {
  clearCache,
  nextId,
  createUserStore,
  attachUserStore,
  mockSecurityEvent,
  mockPredictionHistory,
  mockEmailUtil,
  mockFirebaseAuth,
  buildAuthApp,
  buildPredictionApp,
  buildVerifyTokenApp,
  signTestToken,
  paths: {
    USER_MODEL_PATH,
    SECURITY_EVENT_MODEL_PATH,
    PREDICTION_HISTORY_MODEL_PATH,
    AUTH_ROUTE_PATH,
    PREDICTION_ROUTE_PATH,
    AUTH_RATE_LIMITERS_PATH,
    PREDICTION_RATE_LIMITERS_PATH,
    VERIFY_TOKEN_PATH,
    DJANGO_CLIENT_PATH,
    EMAIL_UTIL_PATH,
    FIREBASE_ADMIN_PATH,
  },
};