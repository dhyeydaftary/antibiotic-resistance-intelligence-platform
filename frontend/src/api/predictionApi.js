import axios from 'axios';

const DJANGO_BASE_URL = 'http://127.0.0.1:8000/api/predictor';

export async function getPrediction(patientData) {
  const response = await axios.post(`${DJANGO_BASE_URL}/predict/`, patientData);
  return response.data;
}