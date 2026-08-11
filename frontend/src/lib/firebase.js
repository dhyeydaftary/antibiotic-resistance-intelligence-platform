// ===================================================================
// Firebase client SDK initialization. Per ADR-0005, Firebase is this
// app's identity provider -- every sign-in method (password, Google,
// GitHub) goes through this SDK directly on the frontend. The resulting
// ID token is then exchanged, once, for the Gateway's own session token
// via api/authApi.js's exchangeFirebaseSession -- this module never talks
// to the Gateway itself.
//
// Config values are all public-safe (not secrets -- see the .env.local
// comment below); real access control lives in Firebase's own console
// settings and the Gateway's server-side token verification, not in
// keeping this config hidden.
// ===================================================================
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    GithubAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();