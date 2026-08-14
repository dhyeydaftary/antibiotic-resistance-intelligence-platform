'use strict';

// Targets the 500-error catch blocks in routes/prediction.js that aren't
// exercised by any other test file. gateway/tests/security-regressions.test.js's
// "Safe error-forwarding (handleDjangoError)" describe already covers
// handleDjangoError's own branching (envelope forwarding, timeout,
// ECONNREFUSED/bare-network-error) exhaustively via /trends -- this file
// instead confirms each OTHER route's own try/catch actually wires up to
// handleDjangoError (or, for /history, its own inline 500), one bare
// network error per route, asserting the resulting response shape.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { buildPredictionApp, signTestToken } = require('./helpers');

const VALID_PREDICT_PAYLOAD = {
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

// Seeds a fixture user and issues a matching test token for authed requests.
function seedAuthedUser(userStore, overrides = {}) {
  const user = userStore.seed({ email: overrides.email || 'prediction-error@example.com', tokenVersion: 0, ...overrides });
  return { user, token: signTestToken(user._id, 0) };
}

function assertGeneric500(res, expectedMessage) {
  assert.equal(res.status, 500);
  assert.deepStrictEqual(res.body, {
    success: false,
    data: null,
    error: { code: 'INTERNAL_ERROR', message: expectedMessage, field: null },
  });
}

describe('POST /api/predictor/predict — catch block', () => {
  test('a bare network error from djangoClient.post is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.post = async () => {
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };

    const res = await request(app)
      .post('/api/predictor/predict')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PREDICT_PAYLOAD);

    assertGeneric500(res, 'Something went wrong while generating the prediction.');
  });
});

describe('POST /api/predictor/extract-report — catch block', () => {
  test('a bare network error from djangoClient.post, after the file passes validation, is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.post = async () => {
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };

    const validPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.from('a valid-looking pdf body'),
      Buffer.from('\n%%EOF'),
    ]);

    const res = await request(app)
      .post('/api/predictor/extract-report')
      .set('Authorization', `Bearer ${token}`)
      .attach('report', validPdf, { filename: 'report.pdf', contentType: 'application/pdf' });

    assertGeneric500(res, 'Something went wrong while extracting the report.');
  });
});

describe('GET /api/predictor/dataset-stats — catch block', () => {
  test('a bare network error from djangoClient.get is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.get = async () => {
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };

    const res = await request(app)
      .get('/api/predictor/dataset-stats')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while fetching dataset statistics.');
  });
});

describe('GET /api/predictor/explain-trend — catch block', () => {
  test('a bare network error from djangoClient.get is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.get = async () => {
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };

    const res = await request(app)
      .get('/api/predictor/explain-trend?antibiotic=CIP')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while generating the trend explanation.');
  });
});

describe('GET /api/predictor/research-papers — catch block', () => {
  test('a bare network error from djangoClient.get is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, djangoClient } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    djangoClient.get = async () => {
      throw new Error('getaddrinfo ENOTFOUND django-host');
    };

    const res = await request(app)
      .get('/api/predictor/research-papers?antibiotic=CIP')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while fetching research papers.');
  });
});

describe('GET /api/predictor/history — catch block', () => {
  test('a Mongo error from PredictionHistory.find(...).sort().skip().limit() is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, PredictionHistory } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    // Full chain shape (route calls .sort().skip().limit(), not just
    // .sort()) — the terminal .limit() call is the one that rejects, same
    // as a real Mongoose Query awaited at the end of the chain.
    PredictionHistory.find = () => {
      const chain = {
        sort: () => chain,
        skip: () => chain,
        limit: () => Promise.reject(new Error('Mongo connection lost')),
      };
      return chain;
    };

    const res = await request(app)
      .get('/api/predictor/history')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while fetching prediction history.');
  });

  test('a Mongo error from PredictionHistory.countDocuments() is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, PredictionHistory } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    PredictionHistory.countDocuments = async () => {
      throw new Error('Mongo connection lost');
    };

    const res = await request(app)
      .get('/api/predictor/history')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while fetching prediction history.');
  });
});

describe('GET /api/predictor/history/aggregates — catch block', () => {
  test('a Mongo error from PredictionHistory.aggregate() is caught and returns a generic 500 INTERNAL_ERROR', async () => {
    const { app, userStore, PredictionHistory } = buildPredictionApp();
    const { token } = seedAuthedUser(userStore);
    PredictionHistory.aggregate = async () => {
      throw new Error('Mongo connection lost');
    };

    const res = await request(app)
      .get('/api/predictor/history/aggregates')
      .set('Authorization', `Bearer ${token}`);

    assertGeneric500(res, 'Something went wrong while fetching history statistics.');
  });
});
