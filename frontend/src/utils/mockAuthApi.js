// TEMPORARY mock auth API — standing in for the real gateway until backend OTP/verification
// endpoints exist. Replace every function here with real calls to ../api/authApi.js once the
// backend is ready. Do not build new features against this file long-term.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const _attempts = { count: 0, lastAt: 0 };

export async function signup({ name, email, password }) {
  await wait(900);
  if (!name || !email || !password) {
    return { ok: false, error: "field", message: "Missing required fields" };
  }
  if (email.toLowerCase() === "taken@example.com") {
    return {
      ok: false,
      field: "email",
      error: "email_exists",
      message: "An account with this email already exists",
    };
  }
  return { ok: true, email };
}

export async function login({ email, password }) {
  await wait(850);
  const now = Date.now();
  if (now - _attempts.lastAt > 30_000) _attempts.count = 0;

  if (_attempts.count >= 5) {
    return {
      ok: false,
      error: "rate_limited",
      message: "Too many attempts, please try again shortly",
    };
  }

  const knownAccounts = {
    "demo@example.com": "Password1!",
    "unverified@example.com": "Password1!",
  };

  const key = email.toLowerCase();
  if (!(key in knownAccounts)) {
    _attempts.count += 1;
    _attempts.lastAt = now;
    return {
      ok: false,
      field: "email",
      error: "email_not_found",
      message: "Email not found",
    };
  }
  if (knownAccounts[key] !== password) {
    _attempts.count += 1;
    _attempts.lastAt = now;
    return {
      ok: false,
      field: "password",
      error: "wrong_password",
      message: "Incorrect password",
    };
  }
  if (key === "unverified@example.com") {
    return {
      ok: false,
      error: "not_verified",
      message: "Account not verified — please verify your email",
      email: key,
    };
  }
  _attempts.count = 0;
  return { ok: true, token: "mock.jwt.token", email };
}

export async function verifyOtp({ email, code }) {
  await wait(700);
  if (code === "000000") {
    return { ok: false, error: "expired", message: "Code has expired" };
  }
  if (code === "123456") {
    return { ok: true, token: "mock.jwt.token", email };
  }
  return { ok: false, error: "incorrect", message: "Incorrect code" };
}

export async function resendOtp({ email }) {
  await wait(600);
  return { ok: true, email };
}

export async function forgotPassword({ email }) {
  await wait(800);
  if (email.toLowerCase() === "unknown@example.com") {
    return {
      ok: false,
      field: "email",
      error: "email_not_found",
      message: "No account matches that email",
    };
  }
  return { ok: true, email };
}

export async function resetPassword({ email, code, password }) {
  await wait(900);
  if (!email || !code || !password) {
    return { ok: false, error: "field", message: "Missing fields" };
  }
  return { ok: true };
}
