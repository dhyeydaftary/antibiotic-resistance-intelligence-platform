// ===================================================================
// Auth-related API calls. Per ADR-0005, Firebase (client SDK) now owns
// authentication directly -- this file's only real job is exchanging a
// verified Firebase ID token for the Gateway's own session token, plus
// the session-validity check. Consumed by LoginPage, SignupPage (both via
// firebase.js directly for the actual authentication step), and
// AuthContext (getMe).
// ===================================================================
import api from './axiosConfig';

// Converts an axios error into this module's uniform { ok: false, ... } shape.
function normalizeError(err, fallbackMessage = 'Something went wrong. Please try again.') {
  const errBody = err?.response?.data?.error;
  if (!errBody) {
    return { ok: false, message: fallbackMessage };
  }
  return {
    ok: false,
    field: errBody.field || undefined,
    code: errBody.code,
    message: errBody.message || fallbackMessage,
  };
}

// Exchanges a Firebase ID token (already obtained via the Firebase client
// SDK -- password, Google, or GitHub, all produce the same token shape)
// for the Gateway's own session token. This is the single entry point
// for authentication on the Gateway side, regardless of which Firebase
// provider was used on the frontend.
export async function exchangeFirebaseSession({ idToken }) {
  try {
    const response = await api.post('/auth/session', { idToken });
    const { data } = response.data;
    return { ok: true, token: data.token, user: data.user, email: data.user.email };
  } catch (err) {
    return normalizeError(err, 'Sign-in failed. Please try again.');
  }
}

// Session-validity check — confirms a stored token still resolves to a
// real, current user on the gateway (distinct from a fresh sign-in).
// Used once at app mount, not on every navigation. Unchanged by the
// Firebase migration -- this checks the Gateway's own token, not Firebase's.
export async function getMe() {
  try {
    const response = await api.get('/auth/me');
    const { data } = response.data;
    return { ok: true, user: data.user };
  } catch (err) {
    return normalizeError(err);
  }
}