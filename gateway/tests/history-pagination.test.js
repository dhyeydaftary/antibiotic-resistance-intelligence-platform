'use strict';

// Tests for the History Pagination + Server-Side Aggregates work:
//   - avgConfidence computed and persisted by POST /predict
//   - GET /history/aggregates (the all-time $facet endpoint)
//   - GET /history's new sort/page/limit params
//
// The $facet pipeline itself (real Mongo aggregation semantics) is
// verified manually against a local MongoDB instance, not here — these
// tests instead cover what's actually reachable and correctness-critical
// in an in-memory unit test: the route's request parsing (page/limit/sort
// clamping and allow-listing), its response-shaping of whatever
// PredictionHistory.aggregate() returns (percentage rounding, most-common
// selection, the empty-history defaults), and real skip/limit/sort
// mechanics against seeded in-memory records — same "assert on what the
// route built/did" convention as the rest of this suite (see
// security-regressions.test.js's findCalls assertions).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

const { buildPredictionApp, signTestToken } = require('./helpers');

// Seeds a fixture user and issues a matching test token for authed requests.
function seedAuthedUser(userStore, overrides = {}) {
  const user = userStore.seed({ email: overrides.email || 'history-pagination@example.com', tokenVersion: 0, ...overrides });
  return { user, token: signTestToken(user._id, 0) };
}

// Seeds `count` records directly into the mock's in-memory store (bypassing
// PredictionHistory.create), with a distinguishable createdAt (index 0 =
// newest) and a monotonically increasing avgConfidence (index 0 = lowest),
// so sort-order assertions can identify which record landed first by index.
function seedRecords(history, count, userId) {
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    history.records.push({
      _id: `rec-${i}`,
      userId,
      createdAt: new Date(now - i * 1000),
      inputData: { organism: 'Escherichia coli' },
      predictions: [{ antibiotic: 'CIP', result: 'S', confidence: 0.9 }],
      avgConfidence: 0.5 + i * 0.01,
    });
  }
}

describe('POST /api/predictor/predict — avgConfidence write-path', () => {
  test('avgConfidence is computed as the mean of predictions[].confidence and persisted', async () => {
    const { app, userStore, djangoClient, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.post = async () => ({
      data: {
        data: {
          predictions: [
            { antibiotic: 'CIP', result: 'S', confidence: 0.9 },
            { antibiotic: 'GEN', result: 'R', confidence: 0.7 },
            { antibiotic: 'AN', result: 'I', confidence: 0.5 },
          ],
          aiInsights: { summary: 'test' },
          modelVersion: 'v-test',
        },
      },
    });

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send({
        age: 45, gender: 'Male', diabetes: false, hypertension: false,
        hospital_before: false, infection_freq: 1.0, year: 2024, month: 6,
        organism: 'Escherichia coli',
      });

    assert.equal(res.status, 200);
    assert.equal(history.records.length, 1);
    assert.ok(Math.abs(history.records[0].avgConfidence - 0.7) < 1e-9);
  });

  test('avgConfidence falls back to 0 (not NaN) when predictions is empty', async () => {
    const { app, userStore, djangoClient, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.post = async () => ({
      data: { data: { predictions: [], aiInsights: null, modelVersion: 'v-test' } },
    });

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send({
        age: 45, gender: 'Male', diabetes: false, hypertension: false,
        hospital_before: false, infection_freq: 1.0, year: 2024, month: 6,
        organism: 'Escherichia coli',
      });

    assert.equal(res.status, 200);
    assert.equal(history.records[0].avgConfidence, 0);
  });
});

describe('GET /api/predictor/history/aggregates', () => {
  test('requires a valid token', async () => {
    const { app } = buildPredictionApp();
    const res = await request(app).get('/api/predictor/history/aggregates');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('is scoped to the authenticated user via an ObjectId $match, ignoring any query params (always all-time)', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    history.setAggregateResult([{
      totals: [], recentRecords: [], recentResistant: [], previousResistant: [],
      lastRecord: [], resultBreakdown: [], antibioticStats: [], organismStats: [],
    }]);

    const res = await request(app)
      .get('/api/predictor/history/aggregates?organism=Klebsiella+pneumoniae&antibiotic=CIP')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(history.aggregateCalls.length, 1);
    const matchStage = history.aggregateCalls[0][0].$match;
    assert.ok(matchStage.userId instanceof mongoose.Types.ObjectId);
    assert.equal(matchStage.userId.toString(), user._id);
    // No filter-shaped keys leak into the pipeline — the endpoint takes no
    // filter params at all.
    assert.deepStrictEqual(Object.keys(matchStage), ['userId']);
  });

  test('empty-history case returns zeroed/empty values, not an error', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    history.setAggregateResult([{
      totals: [], recentRecords: [], recentResistant: [], previousResistant: [],
      lastRecord: [], resultBreakdown: [], antibioticStats: [], organismStats: [],
    }]);

    const res = await request(app)
      .get('/api/predictor/history/aggregates')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body.data, {
      total: 0,
      thisWeek: 0,
      avgResistance: 0,
      lastPredictionDate: null,
      mostCommonAntibiotic: null,
      mostCommonAntibioticPct: 0,
      trendChange: 0,
      susceptibilityRate: 0,
      intermediateRate: 0,
      antibioticStats: {},
      organismStats: {},
      antibioticOptions: [],
      organismOptions: [],
    });
  });

  test('shapes a populated $facet result into the documented response — rounding, most-common selection, trend calc', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const lastDate = new Date('2026-08-01T12:00:00.000Z');

    history.setAggregateResult([{
      totals: [{ count: 10 }],
      recentRecords: [{ count: 3 }],
      recentResistant: [{ count: 4 }],
      previousResistant: [{ count: 2 }],
      lastRecord: [{ createdAt: lastDate }],
      resultBreakdown: [
        { _id: 'R', count: 20 },
        { _id: 'S', count: 15 },
        { _id: 'I', count: 5 },
      ],
      antibioticStats: [
        { _id: 'CIP', count: 10, resistant: 5, confidenceSum: 8.5 },
        { _id: 'GEN', count: 30, resistant: 10, confidenceSum: 21 },
      ],
      organismStats: [
        { _id: 'Escherichia coli', count: 7, resistant: 12, total: 30 },
        { _id: 'Klebsiella pneumoniae', count: 3, resistant: 8, total: 10 },
      ],
    }]);

    const res = await request(app)
      .get('/api/predictor/history/aggregates')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body.data, {
      total: 10,
      thisWeek: 3,
      avgResistance: 50, // 20/40
      lastPredictionDate: lastDate.toISOString(),
      mostCommonAntibiotic: 'GEN', // 30 > 10
      mostCommonAntibioticPct: 75, // 30/40
      trendChange: 100, // (4-2)/2 * 100
      susceptibilityRate: 38, // 15/40 = 37.5 -> 38
      intermediateRate: 13, // 5/40 = 12.5 -> 13
      antibioticStats: {
        CIP: { count: 10, resistantPct: 50, avgConfidence: 85 },
        GEN: { count: 30, resistantPct: 33, avgConfidence: 70 },
      },
      organismStats: {
        'Escherichia coli': { count: 7, resistantPct: 40 },
        'Klebsiella pneumoniae': { count: 3, resistantPct: 80 },
      },
      antibioticOptions: ['CIP', 'GEN'],
      organismOptions: ['Escherichia coli', 'Klebsiella pneumoniae'],
    });
  });

  test('trendChange is 0 (not Infinity/NaN) when the previous week had zero resistant predictions', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    history.setAggregateResult([{
      totals: [{ count: 1 }], recentRecords: [{ count: 1 }],
      recentResistant: [{ count: 5 }], previousResistant: [],
      lastRecord: [], resultBreakdown: [], antibioticStats: [], organismStats: [],
    }]);

    const res = await request(app)
      .get('/api/predictor/history/aggregates')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.trendChange, 0);
  });
});

describe('GET /api/predictor/history — pagination', () => {
  test('empty-history case: total 0, totalPages 0, empty history array', async () => {
    const { app, userStore } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);

    const res = await request(app)
      .get('/api/predictor/history')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body.data, { history: [], page: 1, limit: 8, total: 0, totalPages: 0 });
  });

  test('single-page case: fewer records than the default limit — one page, all records returned', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id);

    const res = await request(app)
      .get('/api/predictor/history')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.history.length, 5);
    assert.equal(res.body.data.total, 5);
    assert.equal(res.body.data.totalPages, 1);
    assert.equal(res.body.data.page, 1);
  });

  test('multi-page case: page 1 and page 2 return different, correctly-sliced, non-overlapping records', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 20, user._id); // rec-0 (newest) .. rec-19 (oldest)

    const page1 = await request(app)
      .get('/api/predictor/history?limit=8&page=1')
      .set('Authorization', `Bearer ${token}`);
    const page2 = await request(app)
      .get('/api/predictor/history?limit=8&page=2')
      .set('Authorization', `Bearer ${token}`);
    const page3 = await request(app)
      .get('/api/predictor/history?limit=8&page=3')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(page1.body.data.total, 20);
    assert.equal(page1.body.data.totalPages, 3);
    assert.deepStrictEqual(page1.body.data.history.map((r) => r._id), ['rec-0', 'rec-1', 'rec-2', 'rec-3', 'rec-4', 'rec-5', 'rec-6', 'rec-7']);
    assert.deepStrictEqual(page2.body.data.history.map((r) => r._id), ['rec-8', 'rec-9', 'rec-10', 'rec-11', 'rec-12', 'rec-13', 'rec-14', 'rec-15']);
    // Last page: only the remaining 4 records, not a full 8.
    assert.deepStrictEqual(page3.body.data.history.map((r) => r._id), ['rec-16', 'rec-17', 'rec-18', 'rec-19']);
  });

  test('an unparseable/out-of-range page or limit falls back to the defaults (page 1, limit 8) rather than erroring', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 20, user._id);

    const res = await request(app)
      .get('/api/predictor/history?page=not-a-number&limit=-5')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.page, 1);
    assert.equal(res.body.data.limit, 8);
    assert.equal(res.body.data.history.length, 8);
  });

  test('a limit above the normal range is honored up to the hard ceiling of 5000 (the CSV export case)', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 20, user._id);

    const withinCeiling = await request(app)
      .get('/api/predictor/history?limit=5000')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(withinCeiling.body.data.limit, 5000);
    assert.equal(withinCeiling.body.data.history.length, 20); // all 20, nothing to clamp against

    const aboveCeiling = await request(app)
      .get('/api/predictor/history?limit=999999')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(aboveCeiling.body.data.limit, 5000);
  });

  test('sort=newest (default): records ordered by createdAt descending', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id);

    const res = await request(app)
      .get('/api/predictor/history')
      .set('Authorization', `Bearer ${token}`);

    assert.deepStrictEqual(res.body.data.history.map((r) => r._id), ['rec-0', 'rec-1', 'rec-2', 'rec-3', 'rec-4']);
  });

  test('sort=oldest: records ordered by createdAt ascending', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id);

    const res = await request(app)
      .get('/api/predictor/history?sort=oldest')
      .set('Authorization', `Bearer ${token}`);

    assert.deepStrictEqual(res.body.data.history.map((r) => r._id), ['rec-4', 'rec-3', 'rec-2', 'rec-1', 'rec-0']);
  });

  test('sort=confidence-high: records ordered by avgConfidence descending', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id); // avgConfidence 0.50 .. 0.54, rec-4 highest

    const res = await request(app)
      .get('/api/predictor/history?sort=confidence-high')
      .set('Authorization', `Bearer ${token}`);

    assert.deepStrictEqual(res.body.data.history.map((r) => r._id), ['rec-4', 'rec-3', 'rec-2', 'rec-1', 'rec-0']);
  });

  test('sort=confidence-low: records ordered by avgConfidence ascending', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id);

    const res = await request(app)
      .get('/api/predictor/history?sort=confidence-low')
      .set('Authorization', `Bearer ${token}`);

    assert.deepStrictEqual(res.body.data.history.map((r) => r._id), ['rec-0', 'rec-1', 'rec-2', 'rec-3', 'rec-4']);
  });

  test('an unrecognized sort value falls back to newest, same "unusable value is dropped, not rejected" pattern as every other filter', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { user, token } = seedAuthedUser(userStore);
    seedRecords(history, 5, user._id);

    const res = await request(app)
      .get('/api/predictor/history?sort=not-a-real-sort')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.deepStrictEqual(res.body.data.history.map((r) => r._id), ['rec-0', 'rec-1', 'rec-2', 'rec-3', 'rec-4']);
  });

  test('countDocuments is called with the same query object find() receives, so total reflects the filtered count', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);

    const res = await request(app)
      .get('/api/predictor/history?organism=Escherichia+coli')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(history.countCalls.length, 1);
    assert.deepStrictEqual(history.countCalls[0], history.findCalls[0]);
  });
});
