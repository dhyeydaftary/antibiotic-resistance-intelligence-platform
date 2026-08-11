'use strict';

// Tests for the SecurityEvent audit trail — gateway/models/SecurityEvent.js
// and every recordSecurityEvent(...) call site in gateway/routes/auth.js,
// both read in full before writing this file. Two things are checked for
// every event below: (1) the correct eventType/email/userId is written for
// the flow that triggered it, and (2) the written object never contains a
// Firebase ID token, the Gateway's own issued JWT, or any other secret —
// a hard security invariant for this write-only audit collection.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { buildAuthApp, signTestToken } = require('./helpers');

// Asserts a recorded SecurityEvent has exactly the expected shape/values.
// SecurityEvent.js's schema declares exactly these four fields — asserted
// exhaustively (not just spot-checked) so an accidental future field
// addition (e.g. someone adding the raw idToken to a recordSecurityEvent
// call) would fail this shape check even before the secret-content check
// below gets a chance to catch it.
function assertEventShape(event, expected) {
  assert.deepStrictEqual(Object.keys(event).sort(), ['email', 'eventType', 'ip', 'userId']);
  assert.equal(event.eventType, expected.eventType);
  assert.equal(event.email, expected.email);
  if ('userId' in expected) {
    assert.equal(event.userId, expected.userId);
  }
}

// Asserts a serialized event contains none of the given secret values.
// Checks every field's value against every known secret in scope for the
// triggering flow — not a spot-check of one field, a scan of the entire
// serialized event for every secret string that existed anywhere in the
// test's setup or response.
function assertNoSecretsLeaked(event, secrets) {
  const serialized = JSON.stringify(event);
  for (const secret of secrets) {
    if (secret === undefined || secret === null || secret === '') continue;
    assert.ok(
      !serialized.includes(secret),
      `SecurityEvent leaked a secret value: ${JSON.stringify(secret)} found in ${serialized}`
    );
  }
}

function fbClaims(overrides = {}) {
  return {
    uid: 'fb-uid-1',
    email: 'newuser@example.com',
    name: 'New User',
    email_verified: true,
    ...overrides,
  };
}

describe('SecurityEvent audit trail', () => {
  test('SESSION_SUCCESS is recorded for a brand-new account, with the newly-created user\'s real id, and leaks no secrets', async () => {
    const { app, events, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims());
    const idToken = 'the-firebase-id-token';

    const res = await request(app).post('/api/auth/session').send({ idToken });

    assert.equal(res.status, 200);
    const event = events.find((e) => e.eventType === 'SESSION_SUCCESS');
    assertEventShape(event, { eventType: 'SESSION_SUCCESS', email: 'newuser@example.com', userId: res.body.data.user.id });
    assertNoSecretsLeaked(event, [idToken, res.body.data.token]);
  });

  test('SESSION_SUCCESS is recorded for an existing account logging back in, with its real id (not a new one), and leaks no secrets', async () => {
    const { app, userStore, events, firebaseAuthMock } = buildAuthApp();
    const existing = userStore.seed({ email: 'existing@example.com', firebaseUid: 'fb-existing' });
    firebaseAuthMock.setNextResult(fbClaims({ uid: 'fb-existing', email: 'existing@example.com' }));
    const idToken = 'another-firebase-id-token';

    const res = await request(app).post('/api/auth/session').send({ idToken });

    assert.equal(res.status, 200);
    const event = events.find((e) => e.eventType === 'SESSION_SUCCESS');
    assertEventShape(event, { eventType: 'SESSION_SUCCESS', email: 'existing@example.com', userId: existing._id });
    assertNoSecretsLeaked(event, [idToken, res.body.data.token]);
  });

  test('SESSION_FAILURE is recorded with email/userId both null when Firebase token verification itself fails (no claims were ever decoded), and leaks no secrets', async () => {
    const { app, events, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(new Error('Firebase ID token has expired'));
    const idToken = 'a-bad-or-expired-token';

    const res = await request(app).post('/api/auth/session').send({ idToken });

    assert.equal(res.status, 401);
    const event = events.find((e) => e.eventType === 'SESSION_FAILURE');
    assertEventShape(event, { eventType: 'SESSION_FAILURE', email: null, userId: null });
    assertNoSecretsLeaked(event, [idToken]);
  });

  test('SESSION_FAILURE for an unverified email records the real email (claims WERE decoded, just not trusted) but still userId: null, and leaks no secrets', async () => {
    const { app, events, firebaseAuthMock } = buildAuthApp();
    firebaseAuthMock.setNextResult(fbClaims({ email: 'unverified@example.com', email_verified: false }));
    const idToken = 'token-for-an-unverified-account';

    const res = await request(app).post('/api/auth/session').send({ idToken });

    assert.equal(res.status, 401);
    const event = events.find((e) => e.eventType === 'SESSION_FAILURE');
    assertEventShape(event, { eventType: 'SESSION_FAILURE', email: 'unverified@example.com', userId: null });
    assertNoSecretsLeaked(event, [idToken]);
  });

  test('LOGOUT_EVERYWHERE is recorded on success, with the real user id, and leaks no secrets (not the JWT used to authenticate the request)', async () => {
    const { app, userStore, events } = buildAuthApp();
    const user = userStore.seed({ email: 'logout@example.com', firebaseUid: 'fb-logout', tokenVersion: 0 });
    const token = signTestToken(user._id, 0);

    const res = await request(app).post('/api/auth/logout-everywhere').set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    const event = events.find((e) => e.eventType === 'LOGOUT_EVERYWHERE');
    assertEventShape(event, { eventType: 'LOGOUT_EVERYWHERE', email: 'logout@example.com', userId: user._id });
    assertNoSecretsLeaked(event, [token]);
  });

  test('no SecurityEvent at all is written for a purely structural rejection (missing idToken) -- nothing happened worth auditing', async () => {
    const { app, events } = buildAuthApp();
    const res = await request(app).post('/api/auth/session').send({});
    assert.equal(res.status, 400);
    assert.equal(events.length, 0);
  });
});