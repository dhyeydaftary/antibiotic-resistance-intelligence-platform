// ===================================================================
// Global auth state — the single source of truth for token/user/session-
// validity, consumed via useAuth() by ProtectedRoute, GuestRoute, Navbar,
// and every page that needs the current user or a login/logout action.
// Mounted once in main.jsx, inside BrowserRouter (needs useNavigate) and
// wrapping App.
//
// Three responsibilities: (1) persist the token/user to localStorage or
// sessionStorage depending on "remember me", (2) on mount, re-validate a
// stored token against the gateway's /auth/me (a token existing locally
// doesn't mean it's still valid server-side), and (3) on mount, check for
// a pending Google/GitHub signInWithRedirect result -- LoginPage/SignupPage
// only start the redirect; this is where it's completed, since the whole
// page reloads and neither of those components can be relied on to still
// be mounted when the browser returns. Also registers this context's
// clearAuth+redirect as axiosConfig.js's global 401 handler, so ANY API
// call that comes back unauthorized anywhere in the app logs the user out
// consistently, not just this file's own calls.
//
// Talks to: api/axiosConfig.js (setAuthErrorHandler), api/authApi.js
// (getMe), lib/firebase.js (auth), utils/completeSocialSignIn.js,
// routes/ProtectedRoute.jsx + routes/GuestRoute.jsx (both read
// isAuthenticated/isCheckingSession from here; GuestRoute also reads
// isCheckingRedirect, since a redirect can only ever land back on an
// auth page).
// ===================================================================
import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { setAuthErrorHandler } from '../api/axiosConfig';
import { getMe } from '../api/authApi';
import { completeSocialSignIn, socialErrorMessage } from '../utils/completeSocialSignIn';
import { useEffect } from 'react';

const AuthContext = createContext(null);

// Reads the persisted auth token, checking both storage locations.
// "Remember me" checked -> localStorage (persists across browser restarts).
// Unchecked -> sessionStorage (cleared when the tab closes), same as before.
// On load we don't know which one was used, so check both — localStorage
// first, since a remembered session should win if somehow both are set.
function getStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

// Reads and parses the persisted user object, checking both storage locations.
function getStoredUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

// Provides token/user/session state and login/logout actions to the whole
// app via useAuth(). Wraps App in main.jsx.
export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  // True only when a stored token actually exists — a guest with no token
  // has nothing to check, so this is false (and protected routes/guest
  // routes never wait) from the very first render.
  const [isCheckingSession, setIsCheckingSession] = useState(() => !!getStoredToken());
  // Unconditionally true on first render, unlike isCheckingSession above --
  // a fresh signInWithRedirect return has no stored token yet to key off
  // of, so there's no cheap way to know in advance whether this mount is
  // the one completing a pending redirect. getRedirectResult resolves
  // near-instantly when there isn't one (no network round trip), so this
  // costs guests essentially nothing in the common case.
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const navigate = useNavigate();

  // Registers this context's own logout+redirect as axiosConfig's global
  // 401 handler, so any API call anywhere in the app that gets rejected
  // for bad auth triggers the same cleanup.
  useEffect(() => {
    setAuthErrorHandler(() => {
      clearAuth();
      navigate('/login');
    });
  }, [navigate]);

  // Mount-only session-validity check: a token in storage only proves a
  // token was issued at some point, not that it still resolves to a real,
  // current user server-side (deleted account, password reset elsewhere,
  // logout-everywhere). Runs once at app load, not on every navigation.
  useEffect(() => {
    // isCheckingSession's lazy initializer above already computed this as
    // false when there's no token, so there's nothing to flip here.
    if (!token) return;

    let cancelled = false;

    getMe().then((result) => {
      if (cancelled) return;
      // On failure (401), axiosConfig's response interceptor has already
      // invoked onAuthError() -> clearAuth() + redirect to /login by the
      // time this callback runs — no second cleanup path needed here.
      if (result.ok) {
        setUser(result.user);
      }
      setIsCheckingSession(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount-only check for a pending Google/GitHub signInWithRedirect result.
  // Resolves to a real credential only on the one page load that's actually
  // returning from the provider; null on every other load (the common
  // case). LoginPage/SignupPage's onSocialSignIn only starts the redirect
  // (see their own comments) -- this is the one place that finishes it,
  // regardless of which of those two pages started it.
  useEffect(() => {
    let cancelled = false;

    getRedirectResult(auth)
      .then((cred) => {
        if (cancelled || !cred) return;
        return completeSocialSignIn(cred, { authLogin: login, navigate });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(socialErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsCheckingRedirect(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persists a fresh token/user to the storage matching "remember me", and
  // updates in-memory state. Called by LoginPage/SignupPage on success.
  function login(newToken, newUser, remember = false) {
    // Clear both storages first so a previous session in the *other* store
    // (e.g. switching from "remembered" to "not remembered" on a later
    // login) can't leave stale duplicate data behind.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', newToken);
    storage.setItem('user', JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }

  // Wipes both storages and resets in-memory auth state, without navigating.
  function clearAuth() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  // User-initiated logout: clears auth state and redirects to /login.
  function logout() {
    clearAuth();
    navigate('/login');
  }

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isCheckingSession,
    isCheckingRedirect,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for consuming AuthContext; throws if called outside AuthProvider.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}