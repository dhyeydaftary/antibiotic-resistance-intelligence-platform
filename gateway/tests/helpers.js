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

function clearCache(...resolvedPaths) {
  for (const p of resolvedPaths) {
    delete require.cache[p];
  }
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return String(idCounter).padStart(24, '0');
}

// In-memory Map-based stand-in for MongoDB. Documents are plain objects
// held by reference in the Map, so a route that mutates a field and calls
// .save() has that mutation visible on the very next find() — this is what
// makes it possible to catch a route that forgets to persist a change,
// rather than a mock that always hands back fresh state regardless of what
// the route actually did.
function createUserStore() {
  const byId = new Map();

  function withSave(doc) {
    if (!doc.save) {
      doc.save = async function save() {
        byId.set(String(doc._id), doc);
        return doc;
      };
    }
    return doc;
  }

  function withDefaults(fields) {
    return {
      _id: nextId(),
      tokenVersion: 0,
      loginAttempts: 0,
      loginLockedUntil: null,
      otpAttempts: 0,
      resetAttempts: 0,
      hasReceivedWelcomeEmail: false,
      isVerified: false,
      otp: null,
      otpExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
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

function attachUserStore(User, store) {
  User.findOne = store.findOne;
  User.findById = store.findById;
  User.create = store.create;
}

function mockSecurityEvent(SecurityEvent) {
  const events = [];
  SecurityEvent.create = async (fields) => {
    events.push(fields);
    return fields;
  };
  return events;
}

// Captures every filter object passed to PredictionHistory.find(), so
// tests can assert on the actual Mongo query the route built rather than
// just the HTTP response. .sort() resolves to whatever `results` currently
// holds (empty by default — tests can push into `.records` first).
function mockPredictionHistory(PredictionHistory) {
  const findCalls = [];
  const records = [];
  PredictionHistory.find = (query) => {
    findCalls.push(query);
    return { sort: async () => records.slice() };
  };
  PredictionHistory.create = async (fields) => {
    const doc = { _id: nextId(), createdAt: new Date(), ...fields };
    records.push(doc);
    return doc;
  };
  return { findCalls, records };
}

// Captures OTP/reset codes and welcome-email calls without ever hitting the
// real Resend API.
function mockEmailUtil(emailUtil) {
  const otpEmails = [];
  const welcomeEmails = [];
  emailUtil.sendOtpEmail = async (to, code, purpose) => {
    otpEmails.push({ to, code, purpose });
    return { success: true, id: 'test-email-id' };
  };
  emailUtil.sendWelcomeEmail = async (to, name) => {
    welcomeEmails.push({ to, name });
    return { success: true, id: 'test-welcome-id' };
  };
  return { otpEmails, welcomeEmails };
}

// Builds a fresh Express app mounting routes/auth.js, with a fresh
// require.cache entry for the route file and its rate limiters (so a
// previous test group's rate-limit counters never leak in), and a fresh
// in-memory User/SecurityEvent store attached to the (cache-preserved)
// model objects.
function buildAuthApp() {
  clearCache(AUTH_ROUTE_PATH, AUTH_RATE_LIMITERS_PATH);

  const User = require(USER_MODEL_PATH);
  const SecurityEvent = require(SECURITY_EVENT_MODEL_PATH);
  const emailUtil = require(EMAIL_UTIL_PATH);

  const userStore = createUserStore();
  attachUserStore(User, userStore);
  const events = mockSecurityEvent(SecurityEvent);
  const emails = mockEmailUtil(emailUtil);

  const authRoutes = require(AUTH_ROUTE_PATH);
  const verifyToken = require(VERIFY_TOKEN_PATH);
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  // Debug-only stub route, backed by the real verifyToken middleware and
  // the same User store this app instance just attached — lets tests check
  // whether a given token is (still) accepted after an auth action like
  // /reset-password or /logout-everywhere, without needing to spin up a
  // second app (which would attach a second, disconnected store to the
  // same shared User model object).
  app.get('/protected', verifyToken, (req, res) => {
    res.status(200).json({ success: true, data: { userId: req.userId }, error: null });
  });

  return { app, userStore, User, events, emails };
}

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
  },
};
