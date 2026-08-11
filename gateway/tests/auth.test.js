'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { buildAuthApp, signTestToken } = require('./helpers');

// A well-formed Firebase decoded-token shape, matching what
// admin.auth().verifyIdToken() actually returns -- used as the default
// "happy path" fixture, overridden per test as needed.
function fbClaims(overrides = {}) {
  return {
    uid: 'fb-uid-1',
    email: 'newuser@example.com',
    name: 'New User',
    email_verified: true,
    ...overrides,
  };
}

describe('POST /api/auth/session', () => {
  test('rejects a missing idToken with VALIDATION_ERROR', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).post('/api/auth/session').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('a brand-new Firebase identity creates a User, issues a session token, and sends a welcome email', async () => {
    const { app, userStore, emails, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims());

    const res = await request(app).post('/api/auth/session').send({ idToken: 'tok' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.token, 'string');
    assert.equal(res.body.data.user.email, 'newuser@example.com');

    const created = [...userStore.byId.values()][0];
    assert.equal(created.firebaseUid, 'fb-uid-1');
    assert.equal(created.hasReceivedWelcomeEmail, true);
    assert.equal(emails.welcomeEmails.length, 1);
    assert.equal(emails.welcomeEmails[0].to, 'newuser@example.com');
  });

  test('the issued token actually authorizes a protected request, with the right userId/tokenVersion', async () => {
    const { app, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims());

    const sessionRes = await request(app).post('/api/auth/session').send({ idToken: 'tok' });
    const token = sessionRes.body.data.token;

    const protectedRes = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    assert.equal(protectedRes.status, 200);
    assert.equal(protectedRes.body.data.userId, sessionRes.body.data.user.id);
  });

  test('an existing Firebase identity (same firebaseUid) is found, not duplicated, and gets no second welcome email', async () => {
    const { app, userStore, emails, firebaseAuthMock } = buildAuthApp();
    userStore.seed({ email: 'existing@example.com', firebaseUid: 'fb-existing', hasReceivedWelcomeEmail: true });
    firebaseAuthMock.setNextResult(fbClaims({ uid: 'fb-existing', email: 'existing@example.com' }));

    const res = await request(app).post('/api/auth/session').send({ idToken: 'tok' });

    assert.equal(res.status, 200);
    assert.equal(userStore.byId.size, 1);
    assert.equal(emails.welcomeEmails.length, 0);
  });

  test('rejects an invalid/expired Firebase token with 401 AUTH_ERROR, no account created', async () => {
    const { app, userStore, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(new Error('Firebase ID token has expired'));

    const res = await request(app).post('/api/auth/session').send({ idToken: 'garbage' });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
    assert.equal(userStore.byId.size, 0);
  });

  test('rejects an unverified email with the distinct EMAIL_NOT_VERIFIED code (not the generic AUTH_ERROR), no account created', async () => {
    const { app, userStore, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims({ email_verified: false }));

    const res = await request(app).post('/api/auth/session').send({ idToken: 'tok' });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'EMAIL_NOT_VERIFIED');
    assert.equal(userStore.byId.size, 0);
  });

  test('rejects a decoded token with no email at all, same as unverified', async () => {
    const { app, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims({ email: undefined }));

    const res = await request(app).post('/api/auth/session').send({ idToken: 'tok' });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  test('an existing account (already has googleId/passwordHash from before this migration is irrelevant here) linking to a NEW Firebase UID for the same email still gets treated as existing by email lookup only if firebaseUid already matches -- this route only matches by firebaseUid, confirming no accidental cross-matching by email', async () => {
    const { app, userStore, firebaseAuthMock } = buildAuthApp();
    userStore.seed({ email: 'shared@example.com', firebaseUid: 'fb-other-account' });
    firebaseAuthMock.setNextResult(fbClaims({ uid: 'fb-new-account', email: 'shared@example.com' }));

    const res = await request(app).post('/api/auth/session').send({ idToken: 'tok' });

    // Real, worth asserting explicitly: since User.email has a unique
    // index in the real schema, this would actually fail at the database
    // layer in production (duplicate email) -- this mock doesn't enforce
    // that constraint, so it documents the *route's own* find-by-uid-only
    // logic distinctly from the DB-level uniqueness guarantee.
    assert.equal(res.status, 200);
    assert.equal(userStore.byId.size, 2);
  });
});

describe('POST /api/auth/logout-everywhere', () => {
  test('requires a valid token', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).post('/api/auth/logout-everywhere');
    assert.equal(res.status, 401);
  });

  test('bumps tokenVersion, invalidating the token that was just used', async () => {
    const { app, userStore } = buildAuthApp();
    const user = userStore.seed({ email: 'a@example.com', firebaseUid: 'fb-a', tokenVersion: 0 });
    const token = signTestToken(user._id, 0);

    const res = await request(app).post('/api/auth/logout-everywhere').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(userStore.byId.get(user._id).tokenVersion, 1);

    // The SAME token (still carrying tokenVersion: 0) must now be rejected.
    const replay = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    assert.equal(replay.status, 401);
  });

  test('a fresh token issued after logout-everywhere works again', async () => {
    const { app, userStore } = buildAuthApp();
    const user = userStore.seed({ email: 'b@example.com', firebaseUid: 'fb-b', tokenVersion: 0 });
    const oldToken = signTestToken(user._id, 0);

    await request(app).post('/api/auth/logout-everywhere').set('Authorization', `Bearer ${oldToken}`);
    const newToken = signTestToken(user._id, 1); // matches the now-bumped tokenVersion

    const res = await request(app).get('/protected').set('Authorization', `Bearer ${newToken}`);
    assert.equal(res.status, 200);
  });

  test('a request with a valid token for a since-deleted account is rejected by verifyToken itself (401), before the route\'s own not-found check ever runs', async () => {
    // Real finding, not a bug: verifyToken.js does its own User.findById()
    // and returns 401 if the user doesn't exist, BEFORE this route's
    // handler runs at all. That means the route's own "if (!user) return
    // 404" branch is currently unreachable via the real request path --
    // confirmed by trying to exercise it here and getting 401 from the
    // middleware instead. Left as defensive code in the route itself
    // (harmless, guards against a future change to verifyToken), but this
    // test asserts what actually happens today, not the unreachable branch.
    const { app } = buildAuthApp();
    const token = signTestToken('000000000000000000000999', 0);
    const res = await request(app).post('/api/auth/logout-everywhere').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  });
});

describe('GET /api/auth/me', () => {
  test('requires a valid token', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('returns the current user for a valid token', async () => {
    const { app, userStore } = buildAuthApp();
    const user = userStore.seed({ name: 'Me', email: 'me@example.com', firebaseUid: 'fb-me', tokenVersion: 0 });
    const token = signTestToken(user._id, 0);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, 'me@example.com');
  });

  test('rejects a token signed with the wrong secret', async () => {
    const { app, userStore } = buildAuthApp();
    const user = userStore.seed({ email: 'x@example.com', firebaseUid: 'fb-x', tokenVersion: 0 });
    const badToken = jwt.sign({ userId: user._id, tokenVersion: 0 }, 'wrong-secret', { expiresIn: '24h' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${badToken}`);
    assert.equal(res.status, 401);
  });
});