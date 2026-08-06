import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthErrorHandler } from '../api/axiosConfig';
import { getMe } from '../api/authApi';
import { useEffect } from 'react';

const AuthContext = createContext(null);

// "Remember me" checked -> localStorage (persists across browser restarts).
// Unchecked -> sessionStorage (cleared when the tab closes), same as before.
// On load we don't know which one was used, so check both — localStorage
// first, since a remembered session should win if somehow both are set.
function getStoredToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getStoredUser() {
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  // True only when a stored token actually exists — a guest with no token
  // has nothing to check, so this is false (and protected routes/guest
  // routes never wait) from the very first render.
  const [isCheckingSession, setIsCheckingSession] = useState(() => !!getStoredToken());
  const navigate = useNavigate();

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

  function clearAuth() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  function logout() {
    clearAuth();
    navigate('/login');
  }

  const value = {
    token,
    user,
    isAuthenticated: !!token,
    isCheckingSession,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}