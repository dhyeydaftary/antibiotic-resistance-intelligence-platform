// Backs HistoryPage — fetches this user's saved predictions.
// Filtering (organism/antibiotic/date/confidence/search) is done
// client-side over the full list, not via query params here.
import api from './axiosConfig';

// Fetches the full prediction history for the current user.
export async function getHistory() {
  const response = await api.get('/predictor/history');
  return response.data;
}