import api from './axiosConfig';

export async function getDatasetStats() {
  const response = await api.get('/predictor/dataset-stats');
  return response.data;
}