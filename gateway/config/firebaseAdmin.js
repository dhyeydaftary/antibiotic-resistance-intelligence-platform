const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, '..', 'firebase-service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(require(serviceAccountPath)),
    });
}

module.exports = { auth: getAuth() };