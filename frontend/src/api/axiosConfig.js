import axios from 'axios';

const GATEWAY_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: GATEWAY_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onAuthError = null;

export function setAuthErrorHandler(handler) {
  onAuthError = handler;
}

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