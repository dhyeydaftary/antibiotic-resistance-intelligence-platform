import axios from 'axios';

const DJANGO_BASE_URL = 'http://127.0.0.1:8000/api/predictor';

export async function getTrends(antibiotic, organism = 'all') {
  const response = await axios.get(`${DJANGO_BASE_URL}/trends/`, {
    params: { antibiotic, organism },
  });
  return response.data;
}