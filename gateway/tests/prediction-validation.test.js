'use strict';

// Tests for gateway/utils/predictionValidation.js as exercised through the
// real POST /api/predictor/predict route — read in full before writing
// this file. Covers the required/optional field contract, the numeric
// range and enum/choice checks, and the whitelisting behavior (extra,
// undeclared fields must never reach djangoClient.post or
// PredictionHistory.create).

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { buildPredictionApp, signTestToken } = require('./helpers');

const VALID_PAYLOAD = {
  age: 45,
  gender: 'Male',
  diabetes: false,
  hypertension: false,
  hospital_before: false,
  infection_freq: 1.0,
  year: 2024,
  month: 6,
  organism: 'Escherichia coli',
};

function seedAuthedUser(userStore) {
  const user = userStore.seed({ email: 'predict-validation@example.com', passwordHash: 'x', tokenVersion: 0 });
  return { user, token: signTestToken(user._id, 0) };
}

function mockSuccessfulDjangoPost(djangoClient) {
  const calls = [];
  djangoClient.post = async (url, body) => {
    calls.push({ url, body });
    return {
      data: {
        data: {
          predictions: [{ antibiotic: 'CIP', result: 'S', confidence: 0.9 }],
          aiInsights: { summary: 'test' },
          modelVersion: 'v-test',
        },
      },
    };
  };
  return calls;
}

describe('Gateway-side /predict validation (predictionValidation.js)', () => {
  test('a valid, complete payload passes and reaches djangoClient.post', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const postCalls = mockSuccessfulDjangoPost(djangoClient);

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PAYLOAD);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(postCalls.length, 1);
    assert.deepStrictEqual(postCalls[0].body, VALID_PAYLOAD);
  });

  test('a payload missing a required field is rejected, and djangoClient is never called', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const postCalls = mockSuccessfulDjangoPost(djangoClient);

    const { age, ...missingAge } = VALID_PAYLOAD;
    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send(missingAge);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'age');
    assert.equal(postCalls.length, 0);
  });

  test('a payload with an out-of-range numeric value is rejected, and djangoClient is never called', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const postCalls = mockSuccessfulDjangoPost(djangoClient);

    // age's declared range is 0-120 (predictionValidation.js REQUIRED_FIELDS).
    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PAYLOAD, age: 150 });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'age');
    assert.match(res.body.error.message, /between 0 and 120/);
    assert.equal(postCalls.length, 0);
  });

  test('a payload with an invalid enum/choice value is rejected, and djangoClient is never called', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const postCalls = mockSuccessfulDjangoPost(djangoClient);

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_PAYLOAD, gender: 'Other' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.field, 'gender');
    assert.equal(postCalls.length, 0);
  });

  test('extra, undeclared fields are stripped from what actually gets forwarded to Django and persisted', async () => {
    const { app, userStore, djangoClient, history } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    const postCalls = mockSuccessfulDjangoPost(djangoClient);

    const payloadWithExtras = {
      ...VALID_PAYLOAD,
      ward_type: 'ICU', // a real optional field — should be kept
      isAdmin: true, // undeclared — must be stripped
      role: 'admin', // undeclared, attacker-shaped — must be stripped
      extraNotes: 'this should never reach Django or be persisted',
    };

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send(payloadWithExtras);

    assert.equal(res.status, 200);
    assert.equal(postCalls.length, 1);

    const forwarded = postCalls[0].body;
    const expectedShape = { ...VALID_PAYLOAD, ward_type: 'ICU' };
    assert.deepStrictEqual(forwarded, expectedShape);
    assert.deepStrictEqual(Object.keys(forwarded).sort(), Object.keys(expectedShape).sort());
    assert.ok(!('isAdmin' in forwarded));
    assert.ok(!('extraNotes' in forwarded));
    assert.ok(!('role' in forwarded));

    assert.equal(history.records.length, 1);
    const persisted = history.records[0].inputData;
    assert.deepStrictEqual(persisted, expectedShape);
    assert.ok(!('isAdmin' in persisted));
    assert.ok(!('extraNotes' in persisted));
  });
});
