'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { buildVerifyTokenApp, buildAuthApp, buildPredictionApp, signTestToken } = require('./helpers');

describe('verifyToken middleware', () => {
  test('rejects a request with no Authorization header', async () => {
    const { app } = buildVerifyTokenApp();
    const res = await request(app).get('/protected');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects a malformed/invalid JWT', async () => {
    const { app } = buildVerifyTokenApp();
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not-a-valid-jwt');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects an expired JWT', async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'expired@example.com', passwordHash: 'x', tokenVersion: 0 });

    // Construct a token whose iat is already far enough in the past that
    // even a short expiresIn puts exp before now, rather than relying on
    // negative-duration parsing of expiresIn.
    const longAgo = Math.floor(Date.now() / 1000) - 100000;
    const expiredToken = jwt.sign(
      { userId: stored._id, tokenVersion: stored.tokenVersion, iat: longAgo },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expiredToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test("rejects a JWT whose tokenVersion doesn't match the current stored value", async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'revoked@example.com', passwordHash: 'x', tokenVersion: 3 });

    const staleToken = signTestToken(stored._id, 2); // stored is now at tokenVersion 3
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${staleToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('accepts a valid, current token and sets req.userId', async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'valid@example.com', passwordHash: 'x', tokenVersion: 0 });

    const token = signTestToken(stored._id, 0);
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.userId, stored._id);
  });

  test('rejects a valid signature whose tokenVersion is the right value but the wrong TYPE (string vs number)', async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'type-mismatch@example.com', passwordHash: 'x', tokenVersion: 0 });

    // verifyToken.js compares with `!==` (strict), so a stored numeric 0
    // and a token carrying the string "0" must NOT be treated as equal.
    const badTypeToken = jwt.sign(
      { userId: stored._id, tokenVersion: String(stored.tokenVersion) },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${badTypeToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects "Bearer" with no token after it', async () => {
    const { app } = buildVerifyTokenApp();
    const res = await request(app).get('/protected').set('Authorization', 'Bearer');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects a Bearer header with extra internal whitespace', async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'extra-space@example.com', passwordHash: 'x', tokenVersion: 0 });
    const token = signTestToken(stored._id, 0);

    // "Bearer  <token>" (two spaces) — authHeader.split(' ')[1] yields ''
    // (the artifact of the double space), not the real token, so this
    // must fail rather than being tolerantly re-parsed.
    const res = await request(app).get('/protected').set('Authorization', `Bearer  ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects a non-Bearer Authorization scheme', async () => {
    const { app } = buildVerifyTokenApp();
    const res = await request(app).get('/protected').set('Authorization', 'Basic dXNlcjpwYXNz');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
    assert.equal(res.body.error.message, 'No token provided');
  });

  test('rejects a well-formed JWT signed with a completely different secret', async () => {
    const { app, userStore } = buildVerifyTokenApp();
    const stored = userStore.seed({ email: 'wrong-secret@example.com', passwordHash: 'x', tokenVersion: 0 });

    const foreignToken = jwt.sign(
      { userId: stored._id, tokenVersion: stored.tokenVersion },
      'a-completely-different-signing-key',
      { expiresIn: '24h' }
    );

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${foreignToken}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('rejects a cryptographically valid token for a userId that does not exist at all', async () => {
    const { app } = buildVerifyTokenApp();
    // Never seeded into the store — a well-formed but nonexistent ID.
    const token = signTestToken('000000000000000000000999', 0);

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });
});

describe('Object-level authorization on GET /api/predictor/history', () => {
  test("the Mongo filter is always scoped to the authenticated user's own ID, regardless of query parameters", async () => {
    const { app, userStore, history } = buildPredictionApp();
    const owner = userStore.seed({ email: 'owner@example.com', passwordHash: 'x', tokenVersion: 0 });
    const token = signTestToken(owner._id, 0);

    // Attempt to smuggle a different userId in via the query string — the
    // route (gateway/routes/prediction.js) builds `query = { userId:
    // req.userId }` unconditionally and never reads req.query.userId at
    // all, so this must have zero effect on the resulting filter.
    const res = await request(app)
      .get('/api/predictor/history?userId=some-other-attacker-controlled-id')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(history.findCalls.length, 1);
    assert.deepStrictEqual(history.findCalls[0], { userId: owner._id });
  });

  test('the userId scoping holds even with other real filters present in the same request as a spoofed userId-like value', async () => {
    const { app, userStore, history } = buildPredictionApp();
    const owner = userStore.seed({ email: 'owner-multi@example.com', passwordHash: 'x', tokenVersion: 0 });
    const token = signTestToken(owner._id, 0);

    const res = await request(app)
      .get(
        '/api/predictor/history?' +
          'organism=' + encodeURIComponent('Escherichia coli') +
          '&antibiotic=CIP' +
          '&userId=attacker-controlled-id'
      )
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(history.findCalls.length, 1);
    // Real, allow-listed filters (organism/antibiotic) are honored; the
    // spoofed `userId` query param is never read by the route at all —
    // the filter's userId always comes from req.userId, never req.query.
    assert.deepStrictEqual(history.findCalls[0], {
      userId: owner._id,
      'inputData.organism': 'Escherichia coli',
      predictions: { $elemMatch: { antibiotic: 'CIP' } },
    });
  });
});

describe('POST /api/auth/logout-everywhere', () => {
  test('requires a valid token', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).post('/api/auth/logout-everywhere');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('on success, bumps tokenVersion so a token issued before the call is rejected by verifyToken afterward', async () => {
    const { app, userStore } = buildAuthApp();
    const stored = userStore.seed({ email: 'logout-all@example.com', passwordHash: 'x', tokenVersion: 0 });
    const preLogoutToken = signTestToken(stored._id, 0);

    const preCheck = await request(app).get('/protected').set('Authorization', `Bearer ${preLogoutToken}`);
    assert.equal(preCheck.status, 200);

    const logoutRes = await request(app)
      .post('/api/auth/logout-everywhere')
      .set('Authorization', `Bearer ${preLogoutToken}`);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);
    assert.equal(stored.tokenVersion, 1);

    const postLogoutCheck = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${preLogoutToken}`);
    assert.equal(postLogoutCheck.status, 401);
    assert.equal(postLogoutCheck.body.error.code, 'AUTH_ERROR');
  });
});
