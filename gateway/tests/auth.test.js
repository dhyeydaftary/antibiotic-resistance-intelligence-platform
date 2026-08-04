'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcrypt');

const { buildAuthApp, signTestToken } = require('./helpers');
const { hashOtp, getOtpExpiry } = require('../utils/otpUtil');

const VALID_PASSWORD = 'Str0ng!Pass';

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

describe('POST /api/auth/signup', () => {
  test('rejects a weak password with VALIDATION_ERROR', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).post('/api/auth/signup').send({
      name: 'New User',
      email: 'weak@example.com',
      password: 'weak',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'password');
  });

  test('rejects missing required fields', async () => {
    const { app } = buildAuthApp();
    const res = await request(app).post('/api/auth/signup').send({
      email: 'missing@example.com',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('a valid signup succeeds and issues an OTP', async () => {
    const { app, userStore, emails } = buildAuthApp();
    const res = await request(app).post('/api/auth/signup').send({
      name: 'New User',
      email: 'newuser@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'newuser@example.com');

    assert.equal(emails.otpEmails.length, 1);
    assert.equal(emails.otpEmails[0].to, 'newuser@example.com');
    assert.equal(emails.otpEmails[0].purpose, 'verify');
    assert.match(emails.otpEmails[0].code, /^\d{6}$/);

    const stored = [...userStore.byId.values()].find((u) => u.email === 'newuser@example.com');
    assert.ok(stored);
    assert.equal(stored.isVerified, false);
  });

  test('an email that already exists AND is already verified is rejected with VALIDATION_ERROR', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'already-verified@example.com' });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Someone Else',
      email: 'already-verified@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'email');
    assert.match(res.body.error.message, /already exists/);
  });

  test('an email that exists but is NOT verified is reused rather than blocked — new OTP issued, name/password updated', async () => {
    const { app, userStore, emails } = buildAuthApp();
    const original = userStore.seed({
      name: 'Original Name',
      email: 'unverified-retry@example.com',
      passwordHash: await bcrypt.hash('OldPassw0rd!', 10),
      isVerified: false,
      otpAttempts: 3, // simulates a prior, partially-used attempt budget
    });
    const originalId = original._id;

    const res = await request(app).post('/api/auth/signup').send({
      name: 'New Name',
      email: 'unverified-retry@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);

    // Reused, not duplicated — same document, same _id.
    const matches = [...userStore.byId.values()].filter((u) => u.email === 'unverified-retry@example.com');
    assert.equal(matches.length, 1);
    assert.equal(matches[0]._id, originalId);
    assert.equal(matches[0].name, 'New Name');
    assert.equal(matches[0].otpAttempts, 0); // fresh code -> fresh attempt budget
    assert.equal(emails.otpEmails.length, 1);
  });

  test('a password exactly at the minimum length boundary passes; one character short fails', async () => {
    const { app: appTooShort } = buildAuthApp();
    // 7 characters, satisfies every other rule (upper/lower/number/special)
    // so only the length rule is exercised.
    const tooShortRes = await request(appTooShort).post('/api/auth/signup').send({
      name: 'Boundary User',
      email: 'boundary-short@example.com',
      password: 'Str0ng!',
    });
    assert.equal(tooShortRes.status, 400);
    assert.equal(tooShortRes.body.error.code, 'VALIDATION_ERROR');
    assert.match(tooShortRes.body.error.message, /at least 8 characters/);

    const { app: appExact } = buildAuthApp();
    // Exactly 8 characters.
    const exactRes = await request(appExact).post('/api/auth/signup').send({
      name: 'Boundary User',
      email: 'boundary-exact@example.com',
      password: 'Str0ng!A',
    });
    assert.equal(exactRes.status, 201);
    assert.equal(exactRes.body.success, true);
  });
});

describe('POST /api/auth/login', () => {
  test('correct credentials succeed and return a token', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'good@example.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: 'good@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'good@example.com');
  });

  test('wrong password and a nonexistent email return byte-identical 401 AUTH_ERROR responses', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'exists@example.com' });

    const wrongPasswordRes = await request(app).post('/api/auth/login').send({
      email: 'exists@example.com',
      password: 'TotallyWrong1!',
    });
    const nonexistentRes = await request(app).post('/api/auth/login').send({
      email: 'doesnotexist@example.com',
      password: 'TotallyWrong1!',
    });

    assert.equal(wrongPasswordRes.status, 401);
    assert.equal(nonexistentRes.status, 401);
    assert.deepStrictEqual(wrongPasswordRes.body, nonexistentRes.body);
    assert.equal(wrongPasswordRes.body.error.code, 'AUTH_ERROR');
  });

  test('5 wrong-password attempts locks the account; the 6th attempt (even with the correct password) is rejected with the same AUTH_ERROR shape', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'lockout@example.com' });

    let lastRes;
    for (let i = 0; i < 5; i += 1) {
      lastRes = await request(app).post('/api/auth/login').send({
        email: 'lockout@example.com',
        password: 'WrongPass1!',
      });
      assert.equal(lastRes.status, 401);
      assert.equal(lastRes.body.error.code, 'AUTH_ERROR');
    }

    const stored = [...userStore.byId.values()].find((u) => u.email === 'lockout@example.com');
    assert.equal(stored.loginAttempts, 5);
    assert.ok(stored.loginLockedUntil instanceof Date && stored.loginLockedUntil > new Date());

    const sixthRes = await request(app).post('/api/auth/login').send({
      email: 'lockout@example.com',
      password: VALID_PASSWORD, // correct password — still must be rejected
    });
    assert.equal(sixthRes.status, 401);
    assert.deepStrictEqual(sixthRes.body, {
      success: false,
      data: null,
      error: { code: 'AUTH_ERROR', message: 'Invalid email or password', field: null },
    });
  });

  test('after the lockout window passes, the correct password succeeds again and loginAttempts/loginLockedUntil reset', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'unlock@example.com' });

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({
        email: 'unlock@example.com',
        password: 'WrongPass1!',
      });
    }
    const stored = [...userStore.byId.values()].find((u) => u.email === 'unlock@example.com');
    assert.ok(stored.loginLockedUntil > new Date());

    // Simulate the 15-minute lockout window having already passed, rather
    // than waiting on a real clock.
    stored.loginLockedUntil = new Date(Date.now() - 1000);

    const res = await request(app).post('/api/auth/login').send({
      email: 'unlock@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(stored.loginAttempts, 0);
    assert.equal(stored.loginLockedUntil, null);
  });

  test('a successful login before hitting the lockout threshold resets loginAttempts to 0, and this reset persists across a subsequent request', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'persist@example.com' });
    const stored = [...userStore.byId.values()].find((u) => u.email === 'persist@example.com');

    // One failed attempt.
    await request(app).post('/api/auth/login').send({
      email: 'persist@example.com',
      password: 'WrongPass1!',
    });
    assert.equal(stored.loginAttempts, 1);

    // Then a successful login — should reset the counter, and that reset
    // must actually be persisted (not just reflected in this response).
    const successRes = await request(app).post('/api/auth/login').send({
      email: 'persist@example.com',
      password: VALID_PASSWORD,
    });
    assert.equal(successRes.status, 200);
    assert.equal(stored.loginAttempts, 0);

    // A subsequent, independent request re-reads the same persisted state
    // (not a value cached from the previous response) — one more failed
    // attempt here must count as attempt #1, not #2, proving the earlier
    // reset actually stuck.
    await request(app).post('/api/auth/login').send({
      email: 'persist@example.com',
      password: 'WrongPass1!',
    });
    assert.equal(stored.loginAttempts, 1);
  });

  test('verifyLimiter trips after its configured max on /login', async () => {
    const { app } = buildAuthApp();
    // express-rate-limit@8's default `max` for verifyLimiter is 10
    // (gateway/middleware/authRateLimiters.js) — confirmed by reading the
    // file before writing this assertion.
    const MAX = 10;
    const responses = [];
    for (let i = 0; i < MAX + 1; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      responses.push(
        await request(app).post('/api/auth/login').send({
          email: 'ratelimit@example.com',
          password: 'WrongPass1!',
        })
      );
    }

    const withinBudget = responses.slice(0, MAX);
    const overBudget = responses[MAX];

    for (const res of withinBudget) {
      assert.notEqual(res.status, 429);
    }
    assert.equal(overBudget.status, 429);
    assert.equal(overBudget.body.error.code, 'RATE_LIMITED');
  });

  test('login is case-sensitive on email — different casing than stored behaves like a nonexistent account', async () => {
    // auth.js does `User.findOne({ email })` with no normalization
    // anywhere in the codebase (signup doesn't lowercase either), and the
    // in-memory store mirrors that with a strict `===` match — so a
    // differently-cased email must be indistinguishable from "no such
    // account", not a distinct error.
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'casing@example.com' });

    const differentCaseRes = await request(app).post('/api/auth/login').send({
      email: 'CASING@example.com',
      password: VALID_PASSWORD,
    });
    const nonexistentRes = await request(app).post('/api/auth/login').send({
      email: 'truly-nonexistent@example.com',
      password: VALID_PASSWORD,
    });

    assert.equal(differentCaseRes.status, 401);
    assert.deepStrictEqual(differentCaseRes.body, nonexistentRes.body);
  });

  test('leading/trailing whitespace in the email is not trimmed — behaves like a nonexistent account', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'whitespace@example.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: '  whitespace@example.com  ',
      password: VALID_PASSWORD,
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('whitespace inside an otherwise-correct password is not trimmed — treated as a wrong password', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'pw-whitespace@example.com' });

    const res = await request(app).post('/api/auth/login').send({
      email: 'pw-whitespace@example.com',
      password: `  ${VALID_PASSWORD}  `,
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'AUTH_ERROR');
  });

  test('an empty-string password and a missing password field hit the identical VALIDATION_ERROR branch', async () => {
    const { app: appMissing } = buildAuthApp();
    const missingRes = await request(appMissing).post('/api/auth/login').send({
      email: 'whatever@example.com',
    });

    const { app: appEmpty } = buildAuthApp();
    const emptyRes = await request(appEmpty).post('/api/auth/login').send({
      email: 'whatever@example.com',
      password: '',
    });

    assert.equal(missingRes.status, 400);
    assert.equal(emptyRes.status, 400);
    assert.deepStrictEqual(missingRes.body, emptyRes.body);
    assert.equal(missingRes.body.error.code, 'VALIDATION_ERROR');
  });

  test('boundary: the 4th failed attempt does not lock the account — the correct password on the 4th/5th request still succeeds', async () => {
    const { app, userStore } = buildAuthApp();
    await seedVerifiedUser(userStore, { email: 'fourth-attempt@example.com' });

    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/api/auth/login').send({
        email: 'fourth-attempt@example.com',
        password: 'WrongPass1!',
      });
      assert.equal(res.status, 401);
    }

    const stored = [...userStore.byId.values()].find((u) => u.email === 'fourth-attempt@example.com');
    assert.equal(stored.loginAttempts, 4);
    assert.equal(stored.loginLockedUntil, null);

    // The 5th request, with the CORRECT password, must still succeed —
    // loginAttempts (4) is below MAX_LOGIN_ATTEMPTS (5), so the account
    // was never locked.
    const res = await request(app).post('/api/auth/login').send({
      email: 'fourth-attempt@example.com',
      password: VALID_PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.equal(stored.loginAttempts, 0);
  });
});

describe('POST /api/auth/verify-otp', () => {
  async function seedUnverifiedUserWithOtp(userStore, code, overrides = {}) {
    const otpHash = await hashOtp(code);
    return userStore.seed({
      name: 'Pending User',
      email: overrides.email || 'pending@example.com',
      passwordHash: await bcrypt.hash(VALID_PASSWORD, 10),
      isVerified: false,
      otp: otpHash,
      otpExpiry: getOtpExpiry(),
      otpAttempts: 0,
      ...overrides,
    });
  }

  test('correct code succeeds', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '123456', { email: 'verify-ok@example.com' });

    const res = await request(app).post('/api/auth/verify-otp').send({
      email: 'verify-ok@example.com',
      code: '123456',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);

    const stored = [...userStore.byId.values()].find((u) => u.email === 'verify-ok@example.com');
    assert.equal(stored.isVerified, true);
  });

  test('wrong code increments the attempt counter', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '123456', { email: 'verify-wrong@example.com' });

    const res = await request(app).post('/api/auth/verify-otp').send({
      email: 'verify-wrong@example.com',
      code: '999999',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'OTP_INCORRECT');

    const stored = [...userStore.byId.values()].find((u) => u.email === 'verify-wrong@example.com');
    assert.equal(stored.otpAttempts, 1);
  });

  test('5 wrong attempts locks it out (OTP_LOCKED)', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '123456', { email: 'verify-lock@example.com' });

    for (let i = 0; i < 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/api/auth/verify-otp').send({
        email: 'verify-lock@example.com',
        code: '999999',
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'OTP_INCORRECT');
    }

    // The account is now locked — a 6th attempt (right or wrong code, it
    // doesn't matter) must be rejected as OTP_LOCKED before the code is
    // even compared.
    const sixthRes = await request(app).post('/api/auth/verify-otp').send({
      email: 'verify-lock@example.com',
      code: '123456',
    });
    assert.equal(sixthRes.status, 429);
    assert.equal(sixthRes.body.error.code, 'OTP_LOCKED');
  });

  test('a verify-otp attempt against a nonexistent email returns the same response shape as a wrong-code attempt against a real account', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '123456', { email: 'real-account@example.com' });

    const realAccountWrongCode = await request(app).post('/api/auth/verify-otp').send({
      email: 'real-account@example.com',
      code: '000000',
    });
    const nonexistentAccount = await request(app).post('/api/auth/verify-otp').send({
      email: 'no-such-account@example.com',
      code: '000000',
    });

    assert.equal(realAccountWrongCode.status, nonexistentAccount.status);
    assert.deepStrictEqual(realAccountWrongCode.body, nonexistentAccount.body);
  });

  test('a code submitted just before OTP_TTL_MINUTES expiry succeeds; just after, it is rejected as OTP_EXPIRED', async () => {
    // otpUtil.js's isExpired() is `new Date() > new Date(expiryDate)` — a
    // plain Date comparison against "now". Using a several-second margin
    // on either side of "now" (rather than exactly 1ms) exercises the same
    // boundary without introducing flakiness from test-execution timing.
    const { app: appBefore, userStore: storeBefore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(storeBefore, '111111', {
      email: 'ttl-not-yet-expired@example.com',
      otpExpiry: new Date(Date.now() + 5000),
    });
    const beforeRes = await request(appBefore).post('/api/auth/verify-otp').send({
      email: 'ttl-not-yet-expired@example.com',
      code: '111111',
    });
    assert.equal(beforeRes.status, 200);

    const { app: appAfter, userStore: storeAfter } = buildAuthApp();
    await seedUnverifiedUserWithOtp(storeAfter, '222222', {
      email: 'ttl-already-expired@example.com',
      otpExpiry: new Date(Date.now() - 5000),
    });
    const afterRes = await request(appAfter).post('/api/auth/verify-otp').send({
      email: 'ttl-already-expired@example.com',
      code: '222222',
    });
    assert.equal(afterRes.status, 400);
    assert.equal(afterRes.body.error.code, 'OTP_EXPIRED');
  });

  test('a malformed code (wrong length / non-numeric) is handled the same as a well-formed-but-wrong code — no separate format validation exists', async () => {
    // auth.js's own presence/type check is only `!code || typeof code !==
    // 'string'` — no length or digit-format check. A malformed code still
    // reaches compareOtp() and is rejected via the ordinary
    // wrong-code/attempt-counter path, not a distinct validation error.
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '123456', { email: 'malformed-code@example.com' });

    const shortCodeRes = await request(app).post('/api/auth/verify-otp').send({
      email: 'malformed-code@example.com',
      code: '123', // too short
    });
    assert.equal(shortCodeRes.status, 400);
    assert.equal(shortCodeRes.body.error.code, 'OTP_INCORRECT');

    const nonNumericRes = await request(app).post('/api/auth/verify-otp').send({
      email: 'malformed-code@example.com',
      code: 'abcdef', // non-numeric
    });
    assert.equal(nonNumericRes.status, 400);
    assert.equal(nonNumericRes.body.error.code, 'OTP_INCORRECT');

    const stored = [...userStore.byId.values()].find((u) => u.email === 'malformed-code@example.com');
    assert.equal(stored.otpAttempts, 2, 'both malformed attempts should still count against the attempt budget');
  });

  test('a code cannot be reused after it has already been successfully consumed', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUnverifiedUserWithOtp(userStore, '654321', { email: 'reuse-code@example.com' });

    const firstRes = await request(app).post('/api/auth/verify-otp').send({
      email: 'reuse-code@example.com',
      code: '654321',
    });
    assert.equal(firstRes.status, 200);

    const stored = [...userStore.byId.values()].find((u) => u.email === 'reuse-code@example.com');
    assert.equal(stored.otp, null); // cleared on success, per auth.js

    // Re-submitting the SAME code again — the account is now verified, so
    // this hits the ALREADY_VERIFIED branch before the (now-null) code is
    // ever compared again.
    const secondRes = await request(app).post('/api/auth/verify-otp').send({
      email: 'reuse-code@example.com',
      code: '654321',
    });
    assert.equal(secondRes.status, 400);
    assert.equal(secondRes.body.error.code, 'ALREADY_VERIFIED');
  });
});

describe('Password reset flow', () => {
  async function seedUserWithResetCode(userStore, code, overrides = {}) {
    const resetHash = await hashOtp(code);
    return userStore.seed({
      name: 'Reset User',
      email: overrides.email || 'reset@example.com',
      passwordHash: await bcrypt.hash(VALID_PASSWORD, 10),
      isVerified: true,
      resetToken: resetHash,
      resetTokenExpiry: getOtpExpiry(),
      resetAttempts: 0,
      ...overrides,
    });
  }

  test('/forgot-password: nonexistent-email response is indistinguishable from a real account', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUserWithResetCode(userStore, '123456', { email: 'has-account@example.com' });

    const realAccountRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'has-account@example.com',
    });
    const nonexistentRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'no-account@example.com',
    });

    assert.equal(realAccountRes.status, nonexistentRes.status);
    assert.deepStrictEqual(
      { ...realAccountRes.body, data: null },
      { ...nonexistentRes.body, data: null }
    );
    assert.equal(realAccountRes.body.success, true);
  });

  test('/verify-reset-otp: nonexistent-email response is indistinguishable from a wrong-code attempt against a real account', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUserWithResetCode(userStore, '123456', { email: 'real-reset@example.com' });

    const realAccountWrongCode = await request(app).post('/api/auth/verify-reset-otp').send({
      email: 'real-reset@example.com',
      code: '000000',
    });
    const nonexistentAccount = await request(app).post('/api/auth/verify-reset-otp').send({
      email: 'no-reset-account@example.com',
      code: '000000',
    });

    assert.equal(realAccountWrongCode.status, nonexistentAccount.status);
    assert.deepStrictEqual(realAccountWrongCode.body, nonexistentAccount.body);
  });

  test('/reset-password: nonexistent-email response is indistinguishable from a wrong-code attempt against a real account', async () => {
    const { app, userStore } = buildAuthApp();
    await seedUserWithResetCode(userStore, '123456', { email: 'real-reset-2@example.com' });

    const realAccountWrongCode = await request(app).post('/api/auth/reset-password').send({
      email: 'real-reset-2@example.com',
      code: '000000',
      password: 'NewStr0ng!Pass',
    });
    const nonexistentAccount = await request(app).post('/api/auth/reset-password').send({
      email: 'no-reset-account-2@example.com',
      code: '000000',
      password: 'NewStr0ng!Pass',
    });

    assert.equal(realAccountWrongCode.status, nonexistentAccount.status);
    assert.deepStrictEqual(realAccountWrongCode.body, nonexistentAccount.body);
  });

  test('a successful reset bumps tokenVersion and invalidates a token issued before the reset', async () => {
    const { app, userStore } = buildAuthApp();
    const stored = await seedUserWithResetCode(userStore, '123456', { email: 'bump@example.com' });

    const preResetToken = signTestToken(stored._id, stored.tokenVersion);
    const preCheck = await request(app).get('/protected').set('Authorization', `Bearer ${preResetToken}`);
    assert.equal(preCheck.status, 200);

    const originalTokenVersion = stored.tokenVersion;

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      email: 'bump@example.com',
      code: '123456',
      password: 'NewStr0ng!Pass',
    });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.success, true);
    assert.equal(stored.tokenVersion, originalTokenVersion + 1);

    const postResetCheck = await request(app).get('/protected').set('Authorization', `Bearer ${preResetToken}`);
    assert.equal(postResetCheck.status, 401);
    assert.equal(postResetCheck.body.error.code, 'AUTH_ERROR');
  });
});
