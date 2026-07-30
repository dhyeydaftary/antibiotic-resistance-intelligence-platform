import api from './axiosConfig';

export async function getPrediction(patientData) {
  const response = await api.post('/predictor/predict', patientData);
  return response.data;
}

export async function extractReportFromPDF(file) {
  const formData = new FormData();
  formData.append('report', file);

  // No Content-Type override needed — axios detects the FormData body and
  // sets the correct multipart boundary automatically, since axiosConfig.js
  // doesn't set a conflicting default Content-Type on the instance.
  const response = await api.post('/predictor/extract-report', formData);
  return response.data;
}