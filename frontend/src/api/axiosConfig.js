// ===================================================================
// Single shared axios instance for every API call in the app — every
// file under api/ imports this rather than calling axios directly.
// Two interceptors do all the cross-cutting auth work so individual API
// functions never touch tokens themselves: the request interceptor
// attaches the bearer token, the response interceptor detects a 401 and
// triggers a global logout via a handler AuthContext registers at
// mount (setAuthErrorHandler) — this file doesn't import AuthContext
// directly (would be a circular import, since AuthContext imports this
// file), so the callback is injected instead.
//
// Talks to: gateway/index.js (baseURL), every api/*.js module, and
// context/AuthContext.jsx (registers the 401 handler).
// ===================================================================
import axios from 'axios';

const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: GATEWAY_BASE_URL,
});

// Attaches the bearer token (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  // "Remember me" logins are stored in localStorage; sessions without it
  // are stored in sessionStorage (cleared when the tab closes). Check both,
  // matching AuthContext's getStoredToken() logic exactly — otherwise a
  // remembered session silently sends no Authorization header at all.
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onAuthError = null;

// Lets AuthContext inject its logout+redirect logic here without this
// module importing AuthContext (which would create a circular import).
export function setAuthErrorHandler(handler) {
  onAuthError = handler;
}

// Detects a 401 on any response and triggers the registered auth-error
// handler (global logout), then re-throws so the caller's own catch still runs.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onAuthError) {
      onAuthError();
    }
    return Promise.reject(error);
  }
);

export default api;