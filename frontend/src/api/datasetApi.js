// Backs DatasetExplorerPage's overview panels.
import api from './axiosConfig';

// Fetches summary statistics about the training dataset (row/column
// counts, organism/ward/specimen distributions, comorbidity prevalence).
export async function getDatasetStats() {
  const response = await api.get('/predictor/dataset-stats');
  return response.data;
}