// ===================================================================
// Every auth-related API call — signup, login, OTP verify/resend,
// forgot/reset password, session check. Mirrors gateway/routes/auth.js
// endpoint-for-endpoint. Every function returns a uniform { ok, ... }
// shape rather than throwing, so calling pages never need try/catch —
// they just check result.ok. Consumed by LoginPage, SignupPage,
// VerifyEmailPage, ForgotPasswordPage, and AuthContext (getMe).
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

// Creates a pending signup and triggers the verification OTP email.
export async function signup({ name, email, password }) {
  try {
    const response = await api.post('/auth/signup', { name, email, password });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

// Authenticates credentials and returns a token, or a distinct
// not_verified error so the caller can redirect to OTP verification.
export async function login({ email, password, remember = false }) {
  try {
    const response = await api.post('/auth/login', { email, password, remember });
    const { data } = response.data;
    return { ok: true, token: data.token, user: data.user, email: data.user.email };
  } catch (err) {
    const errBody = err?.response?.data?.error;
    if (errBody?.code === 'NOT_VERIFIED') {
      return {
        ok: false,
        error: 'not_verified',
        message: errBody.message,
        email: err.response.data.data?.email,
      };
    }
    return normalizeError(err, 'Invalid email or password');
  }
}

// Verifies the signup OTP; on success the account becomes real and a
// token is issued (auto-login).
export async function verifyOtp({ email, code }) {
  try {
    const response = await api.post('/auth/verify-otp', { email, code });
    const { data } = response.data;
    return { ok: true, token: data.token, user: data.user, email: data.user.email };
  } catch (err) {
    const errBody = err?.response?.data?.error;
    if (errBody?.code === 'OTP_EXPIRED') {
      return { ok: false, error: 'expired', message: errBody.message };
    }
    if (errBody?.code === 'OTP_INCORRECT') {
      return { ok: false, error: 'incorrect', message: errBody.message };
    }
    return normalizeError(err);
  }
}

// Requests a fresh signup OTP for a pending, unverified signup.
export async function resendOtp({ email }) {
  try {
    const response = await api.post('/auth/resend-otp', { email });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

// Requests a password-reset OTP for an existing account.
export async function forgotPassword({ email }) {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

// Read-only check of a password-reset code, for the UI's step transition.
// Distinct from verifyOtp — hits the reset-specific endpoint, since the
// gateway tracks signup-verification codes (otp) and password-reset codes
// (resetToken) as separate fields with separate endpoints.
export async function verifyResetOtp({ email, code }) {
  try {
    await api.post('/auth/verify-reset-otp', { email, code });
    return { ok: true };
  } catch (err) {
    const errBody = err?.response?.data?.error;
    if (errBody?.code === 'OTP_EXPIRED') {
      return { ok: false, error: 'expired', message: errBody.message };
    }
    if (errBody?.code === 'OTP_INCORRECT') {
      return { ok: false, error: 'incorrect', message: errBody.message };
    }
    return normalizeError(err);
  }
}

// Sets a new password after a reset code has been verified.
export async function resetPassword({ email, code, password }) {
  try {
    await api.post('/auth/reset-password', { email, code, password });
    return { ok: true };
  } catch (err) {
    return normalizeError(err);
  }
}

// Session-validity check — confirms a stored token still resolves to a
// real, current user on the gateway (distinct from login, which issues a
// new token). Used once at app mount, not on every navigation.
export async function getMe() {
  try {
    const response = await api.get('/auth/me');
    const { data } = response.data;
    return { ok: true, user: data.user };
  } catch (err) {
    return normalizeError(err);
  }
}
