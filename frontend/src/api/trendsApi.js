import api from './axiosConfig';

export async function getTrends(antibiotic, organism = 'all') {
  const response = await api.get('/predictor/trends', {
    params: { antibiotic, organism },
  });
  return response.data;
}

export async function getTrendExplanation(antibiotic, organism = 'all') {
  const response = await api.get('/predictor/explain-trend', {
    params: { antibiotic, organism },
  });
  return response.data;
}