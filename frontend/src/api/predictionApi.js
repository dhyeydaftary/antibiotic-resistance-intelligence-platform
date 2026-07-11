import api from './axiosConfig';

export async function getPrediction(patientData) {
  const response = await api.post('/predictor/predict', patientData);
  return response.data;
}