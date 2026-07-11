import api from './axiosConfig';

export async function getHistory() {
  const response = await api.get('/predictor/history');
  return response.data;
}