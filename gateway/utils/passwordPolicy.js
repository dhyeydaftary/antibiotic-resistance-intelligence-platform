/**
 * Server-side password policy — intentionally mirrors the rule set in
 * frontend/src/utils/validators.js (PASSWORD_RULES) so both layers agree.
 * The frontend rules exist for UX (real-time checklist); this file is the
 * actual enforcement boundary, since any client can call the API directly.
 */

const PASSWORD_RULES = [
    { key: 'length', message: 'Password must be at least 8 characters', test: (v) => v.length >= 8 },
    { key: 'upper', message: 'Password must contain an uppercase letter', test: (v) => /[A-Z]/.test(v) },
    { key: 'lower', message: 'Password must contain a lowercase letter', test: (v) => /[a-z]/.test(v) },
    { key: 'number', message: 'Password must contain a number', test: (v) => /[0-9]/.test(v) },
    { key: 'special', message: 'Password must contain a special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/**
 * Validates a password against the policy.
 * Returns { valid: true } or { valid: false, message } with the message
 * for the first unmet rule (matches the order shown in the frontend checklist).
 */
function validatePassword(password) {
    if (typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }
    for (const rule of PASSWORD_RULES) {
        if (!rule.test(password)) {
            return { valid: false, message: rule.message };
        }
    }
    return { valid: true, message: null };
}

module.exports = { validatePassword, PASSWORD_RULES };