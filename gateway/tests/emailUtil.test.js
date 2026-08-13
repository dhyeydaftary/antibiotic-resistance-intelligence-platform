'use strict';

// Tests for utils/emailUtil.js (sendWelcomeEmail) and utils/emailLayout.js
// (the pure HTML-building functions it composes). sendOtpEmail was removed
// as dead code during this pass -- Firebase owns OTP/email verification
// entirely now (ADR-0005), and nothing in the codebase called it anymore
// (confirmed via a full grep before removing it).
//
// The `resend` package itself is mocked here (not just sendWelcomeEmail),
// so this genuinely exercises emailUtil.js's own real logic -- first-name
// splitting, subject line, and the HTML it hands to Resend -- rather than
// bypassing it the way tests/helpers.js's mockEmailUtil does for other
// test files (which deliberately want to skip past this and not care what
// email content was built).

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mocks the `resend` package itself, before emailUtil.js's own
// `require('resend')` call ever runs, so its `new Resend(...)` picks up
// this mock. Same technique as helpers.js uses for firebase-admin.
const Module = require('module');
const originalRequire = Module.prototype.require;
let nextSendResult = { data: { id: 'test-email-id' }, error: null };
let lastSendCall = null;
Module.prototype.require = function (id) {
    if (id === 'resend') {
        return {
            Resend: class {
                constructor() {
                    this.emails = {
                        send: async (payload) => {
                            lastSendCall = payload;
                            return nextSendResult;
                        },
                    };
                }
            },
        };
    }
    return originalRequire.apply(this, arguments);
};

const { sendWelcomeEmail } = require('../utils/emailUtil');
const { wrapEmail, ctaButton, featureRow, infoBox, divider, BRAND } = require('../utils/emailLayout');

describe('sendWelcomeEmail', () => {
    beforeEach(() => {
        nextSendResult = { data: { id: 'test-email-id' }, error: null };
        lastSendCall = null;
    });

    test('sends from the expected address, to the given recipient, with the welcome subject', async () => {
        const res = await sendWelcomeEmail('newuser@example.com', 'Ada Lovelace');

        assert.equal(res.success, true);
        assert.equal(res.id, 'test-email-id');
        assert.equal(lastSendCall.to, 'newuser@example.com');
        assert.equal(lastSendCall.subject, 'Welcome to AMR-Insight');
        assert.match(lastSendCall.from, /AMR-Insight/);
    });

    test('extracts and greets by first name only, not the full name', async () => {
        await sendWelcomeEmail('a@example.com', 'Ada Lovelace');
        assert.match(lastSendCall.html, /Welcome, Ada\./);
        assert.doesNotMatch(lastSendCall.html, /Welcome, Ada Lovelace\./);
    });

    test('falls back to "there" when name is empty, null, or whitespace-only', async () => {
        for (const badName of ['', null, undefined, '   ']) {
            // eslint-disable-next-line no-await-in-loop
            await sendWelcomeEmail('a@example.com', badName);
            assert.match(lastSendCall.html, /Welcome, there\./, `expected fallback greeting for name=${JSON.stringify(badName)}`);
        }
    });

    test('the CTA link uses FRONTEND_URL when set', async () => {
        const original = process.env.FRONTEND_URL;
        process.env.FRONTEND_URL = 'https://amr-insight.example.com';
        try {
            await sendWelcomeEmail('a@example.com', 'Test');
            assert.match(lastSendCall.html, /href="https:\/\/amr-insight\.example\.com\/predict"/);
        } finally {
            process.env.FRONTEND_URL = original;
        }
    });

    test('falls back to "#" for the CTA link when FRONTEND_URL is unset', async () => {
        const original = process.env.FRONTEND_URL;
        delete process.env.FRONTEND_URL;
        try {
            await sendWelcomeEmail('a@example.com', 'Test');
            assert.match(lastSendCall.html, /href="#\/predict"/);
        } finally {
            if (original !== undefined) process.env.FRONTEND_URL = original;
        }
    });

    test('a Resend API error (result.error set, no exception) is returned as a failure, not thrown', async () => {
        nextSendResult = { data: null, error: { message: 'Resend rejected this request' } };
        const res = await sendWelcomeEmail('a@example.com', 'Test');
        assert.equal(res.success, false);
        assert.deepEqual(res.error, { message: 'Resend rejected this request' });
    });

    test('a thrown exception from the Resend client is caught and returned as a failure, not propagated', async () => {
        const Module2 = require('module');
        const original = Module2.prototype.require;
        Module2.prototype.require = function (id) {
            if (id === 'resend') {
                return { Resend: class { constructor() { this.emails = { send: async () => { throw new Error('network exploded'); } }; } } };
            }
            return original.apply(this, arguments);
        };
        delete require.cache[require.resolve('../utils/emailUtil')];
        const { sendWelcomeEmail: freshSend } = require('../utils/emailUtil');
        Module2.prototype.require = original;

        const res = await freshSend('a@example.com', 'Test');
        assert.equal(res.success, false);
        assert.equal(res.error, 'network exploded');
    });
});

describe('emailLayout building blocks', () => {
    test('wrapEmail embeds the inner HTML and preview text verbatim', () => {
        const html = wrapEmail('<p>REAL_INNER_CONTENT_MARKER</p>', 'A real preview line');
        assert.match(html, /REAL_INNER_CONTENT_MARKER/);
        assert.match(html, /A real preview line/);
        assert.match(html, /<!DOCTYPE html>/);
    });

    test('wrapEmail includes the current year in the footer copyright line', () => {
        const html = wrapEmail('<p>x</p>');
        assert.match(html, new RegExp(`${new Date().getFullYear()} AMR-Insight`));
    });

    test('ctaButton embeds the given label and href', () => {
        const html = ctaButton('Get started', 'https://example.com/go');
        assert.match(html, /Get started/);
        assert.match(html, /href="https:\/\/example\.com\/go"/);
    });

    test('featureRow embeds the given title and description', () => {
        const html = featureRow('Run predictions', 'A description of the feature');
        assert.match(html, /Run predictions/);
        assert.match(html, /A description of the feature/);
    });

    test('divider renders a single styled rule element', () => {
        const html = divider();
        assert.match(html, /height:1px/);
    });

    test('infoBox uses the accent background for tone="accent"', () => {
        const html = infoBox('<p>content</p>', 'accent');
        assert.match(html, new RegExp(BRAND.accentSoft));
    });

    test('infoBox defaults to the neutral panel background when no tone is given', () => {
        const html = infoBox('<p>content</p>');
        assert.match(html, new RegExp(BRAND.panel));
        assert.doesNotMatch(html, new RegExp(BRAND.accentSoft));
    });

    test('infoBox embeds arbitrary inner HTML unescaped, as designed (caller controls the content)', () => {
        const html = infoBox('<strong>bold marker</strong>');
        assert.match(html, /<strong>bold marker<\/strong>/);
    });
});