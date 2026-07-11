import { createContext, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthErrorHandler } from '../api/axiosConfig';
import { useEffect } from 'react';

const AuthContext = createContext(null);

function getStoredToken() {
  return sessionStorage.getItem('token');
}

function getStoredUser() {
  const raw = sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();

  useEffect(() => {
    setAuthErrorHandler(() => {
      clearAuth();
      navigate('/login');
    });
  }, [navigate]);

  function login(newToken, newUser) {
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function clearAuth() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
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