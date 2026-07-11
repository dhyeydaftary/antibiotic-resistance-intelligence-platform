import axios from 'axios';

const GATEWAY_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: GATEWAY_BASE_URL,
});

export default api;