// ===================================================================
// The two calls backing the core prediction flow. Consumed by
// PredictionInputPage: getPrediction submits the patient form to the
// ML pipeline (gateway -> Django predict_resistance() + Gemini
// insights); extractReportFromPDF auto-fills the form from an uploaded
// lab report. Neither normalizes errors like authApi.js does — callers
// handle raw axios rejections directly (see PredictionInputPage's
// try/catch).
// ===================================================================
import api from './axiosConfig';

// Submits patient data and returns predictions + AI insights for all
// 15 antibiotics.
export async function getPrediction(patientData) {
  const response = await api.post('/predictor/predict', patientData);
  return response.data;
}

// Uploads a lab-report PDF for LLM-based field extraction (form auto-fill).
export async function extractReportFromPDF(file) {
  const formData = new FormData();
  formData.append('report', file);

  // No Content-Type override needed — axios detects the FormData body and
  // sets the correct multipart boundary automatically, since axiosConfig.js
  // doesn't set a conflicting default Content-Type on the instance.
  const response = await api.post('/predictor/extract-report', formData);
  return response.data;
}