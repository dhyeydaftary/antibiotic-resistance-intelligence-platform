import api from './axiosConfig';

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

export async function signup({ name, email, password }) {
  try {
    const response = await api.post('/auth/signup', { name, email, password });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

export async function login({ email, password }) {
  try {
    const response = await api.post('/auth/login', { email, password });
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

export async function resendOtp({ email }) {
  try {
    const response = await api.post('/auth/resend-otp', { email });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

export async function forgotPassword({ email }) {
  try {
    const response = await api.post('/auth/forgot-password', { email });
    const { data } = response.data;
    return { ok: true, email: data.email };
  } catch (err) {
    return normalizeError(err);
  }
}

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

export async function resetPassword({ email, code, password }) {
  try {
    await api.post('/auth/reset-password', { email, code, password });
    return { ok: true };
  } catch (err) {
    return normalizeError(err);
  }
}
