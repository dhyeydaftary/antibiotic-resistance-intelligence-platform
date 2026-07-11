import api from './axiosConfig';

export async function loginUser(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function signupUser(name, email, password) {
  const response = await api.post('/auth/signup', { name, email, password });
  return response.data;
}