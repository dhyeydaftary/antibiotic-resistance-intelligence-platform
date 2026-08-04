'use strict';

// Tests for the SecurityEvent audit trail — gateway/models/SecurityEvent.js
// and every recordSecurityEvent(...) call site in gateway/routes/auth.js,
// both read in full before writing this file. Two things are checked for
// every event below: (1) the correct eventType/email/userId is written for
// the flow that triggered it, and (2) the written object never contains a
// password, password hash, OTP code, reset code, or JWT — a hard security
// invariant for this write-only audit collection (see SecurityEvent.js's
// own comment: "never store passwords, password hashes, tokens, OTP codes,
// or reset codes here").

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { buildAuthApp, signTestToken } = require('./helpers');
const { hashOtp, getOtpExpiry } = require('../utils/otpUtil');

const VALID_PASSWORD = 'Str0ng!Pass';

// SecurityEvent.js's schema declares exactly these four fields — asserted
// exhaustively (not just spot-checked) so an accidental future field
// addition (e.g. someone adding `passwordHash` to a recordSecurityEvent
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

async function seedVerifiedUser(userStore, overrides = {}) {
  const passwordHash = await bcrypt.hash(overrides.password || VALID_PASSWORD, 10);
  return userStore.seed({
    name: 'Test User',
    email: overrides.email || 'user@example.com',
    passwordHash,
    isVerified: true,
    hasReceivedWelcomeEmail: true,
    ...overrides,
  });
}

describe('SecurityEvent audit trail', () => {
  test('SIGNUP is recorded with the new user, and leaks no secrets', async () => {
    const { app, userStore, events, emails } = buildAuthApp();

    const res = await request(app).post('/api/auth/signup').send({
      name: 'New User',
      email: 'signup-event@example.com',
      password: VALID_PASSWORD,
    });
    assert.equal(res.status, 201);

    const stored = [...userStore.byId.values()].find((u) => u.email === 'signup-event@example.com');
    const otpCode = emails.otpEmails[0].code;

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'SIGNUP', email: 'signup-event@example.com', userId: stored._id });
    assertNoSecretsLeaked(events[0], [VALID_PASSWORD, stored.passwordHash, otpCode]);
  });

  test('EMAIL_VERIFIED is recorded on a successful OTP verification, and leaks no secrets', async () => {
    const { app, userStore, events } = buildAuthApp();
    const code = '123456';
    const otpHash = await hashOtp(code);
    const seeded = userStore.seed({
      name: 'Pending User',
      email: 'verify-event@example.com',
      passwordHash: await bcrypt.hash(VALID_PASSWORD, 10),
      isVerified: false,
      otp: otpHash,
      otpExpiry: getOtpExpiry(),
      otpAttempts: 0,
    });

    const res = await request(app).post('/api/auth/verify-otp').send({
      email: 'verify-event@example.com',
      code,
    });
    assert.equal(res.status, 200);
    const issuedToken = res.body.data.token;

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'EMAIL_VERIFIED', email: 'verify-event@example.com', userId: seeded._id });
    assertNoSecretsLeaked(events[0], [code, otpHash, seeded.passwordHash, issuedToken]);
  });

  test('LOGIN_SUCCESS is recorded on a successful login, and leaks no secrets', async () => {
    const { app, userStore, events } = buildAuthApp();
    const seeded = await seedVerifiedUser(userStore, { email: 'login-success-event@example.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login-success-event@example.com',
      password: VALID_PASSWORD,
    });
    assert.equal(res.status, 200);
    const issuedToken = res.body.data.token;

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'LOGIN_SUCCESS', email: 'login-success-event@example.com', userId: seeded._id });
    assertNoSecretsLeaked(events[0], [VALID_PASSWORD, seeded.passwordHash, issuedToken]);
  });

  test('LOGIN_FAILURE is recorded for a wrong password against a real account, and leaks no secrets', async () => {
    const { app, userStore, events } = buildAuthApp();
    const seeded = await seedVerifiedUser(userStore, { email: 'login-fail-event@example.com' });
    const wrongPassword = 'TotallyWrong1!';

    const res = await request(app).post('/api/auth/login').send({
      email: 'login-fail-event@example.com',
      password: wrongPassword,
    });
    assert.equal(res.status, 401);

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'LOGIN_FAILURE', email: 'login-fail-event@example.com', userId: seeded._id });
    assertNoSecretsLeaked(events[0], [wrongPassword, VALID_PASSWORD, seeded.passwordHash]);
  });

  test('LOGIN_FAILURE is recorded for a nonexistent email with userId explicitly null, and leaks no secrets', async () => {
    const { app, events } = buildAuthApp();
    const attemptedPassword = 'WhateverPassword1!';

    const res = await request(app).post('/api/auth/login').send({
      email: 'no-such-account@example.com',
      password: attemptedPassword,
    });
    assert.equal(res.status, 401);

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'LOGIN_FAILURE', email: 'no-such-account@example.com' });
    assert.strictEqual(events[0].userId, null);
    assertNoSecretsLeaked(events[0], [attemptedPassword]);
  });

  test('LOGIN_LOCKOUT is recorded both for the attempt that triggers lockout and for a repeat attempt against an already-locked account', async () => {
    const { app, userStore, events } = buildAuthApp();
    const seeded = await seedVerifiedUser(userStore, { email: 'lockout-event@example.com' });
    const wrongPassword = 'WrongPass1!';

    // 4 plain failures.
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await request(app).post('/api/auth/login').send({ email: 'lockout-event@example.com', password: wrongPassword });
    }
    // 5th: crosses MAX_LOGIN_ATTEMPTS, triggers the lockout itself.
    await request(app).post('/api/auth/login').send({ email: 'lockout-event@example.com', password: wrongPassword });
    // 6th: a repeat attempt against an account that's already locked — a
    // distinct code path in auth.js (checked before bcrypt.compare at all).
    await request(app).post('/api/auth/login').send({ email: 'lockout-event@example.com', password: VALID_PASSWORD });

    assert.equal(events.length, 6);
    const eventTypes = events.map((e) => e.eventType);
    assert.deepStrictEqual(eventTypes, [
      'LOGIN_FAILURE',
      'LOGIN_FAILURE',
      'LOGIN_FAILURE',
      'LOGIN_FAILURE',
      'LOGIN_LOCKOUT', // the attempt that crossed the threshold
      'LOGIN_LOCKOUT', // the repeat attempt against the now-locked account
    ]);
    for (const event of events) {
      assertEventShape(event, { eventType: event.eventType, email: 'lockout-event@example.com', userId: seeded._id });
      assertNoSecretsLeaked(event, [wrongPassword, VALID_PASSWORD, seeded.passwordHash]);
    }
  });

  test('PASSWORD_RESET is recorded on a successful reset, and leaks no secrets', async () => {
    const { app, userStore, events } = buildAuthApp();
    const code = '654321';
    const resetHash = await hashOtp(code);
    const newPassword = 'NewStr0ng!Pass';
    const seeded = userStore.seed({
      name: 'Reset User',
      email: 'reset-event@example.com',
      passwordHash: await bcrypt.hash(VALID_PASSWORD, 10),
      isVerified: true,
      resetToken: resetHash,
      resetTokenExpiry: getOtpExpiry(),
      resetAttempts: 0,
    });
    const oldPasswordHash = seeded.passwordHash;

    const res = await request(app).post('/api/auth/reset-password').send({
      email: 'reset-event@example.com',
      code,
      password: newPassword,
    });
    assert.equal(res.status, 200);

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'PASSWORD_RESET', email: 'reset-event@example.com', userId: seeded._id });
    assertNoSecretsLeaked(events[0], [code, resetHash, newPassword, VALID_PASSWORD, oldPasswordHash, seeded.passwordHash]);
  });

  test('LOGOUT_EVERYWHERE is recorded on success, and leaks no secrets', async () => {
    const { app, userStore, events } = buildAuthApp();
    const seeded = userStore.seed({
      email: 'logout-event@example.com',
      passwordHash: await bcrypt.hash(VALID_PASSWORD, 10),
      tokenVersion: 0,
    });
    const token = signTestToken(seeded._id, 0);

    const res = await request(app)
      .post('/api/auth/logout-everywhere')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);

    assert.equal(events.length, 1);
    assertEventShape(events[0], { eventType: 'LOGOUT_EVERYWHERE', email: 'logout-event@example.com', userId: seeded._id });
    assertNoSecretsLeaked(events[0], [token, seeded.passwordHash]);
  });
});
