// Backs TrendsPage's three data sources: the resistance-rate time series
// itself, a narrative/statistical explanation of that trend, and related
// PubMed research papers.
import api from './axiosConfig';

// Fetches month-by-month resistance rate for one antibiotic, optionally
// filtered by organism/ward.
export async function getTrends(antibiotic, organism = 'all', wardType = 'all') {
  const response = await api.get('/predictor/trends', {
    params: { antibiotic, organism, ward_type: wardType },
  });
  return response.data;
}

// Fetches a narrative explanation (summary, causes, forecast) of a trend.
export async function getTrendExplanation(antibiotic, organism = 'all') {
  const response = await api.get('/predictor/explain-trend', {
    params: { antibiotic, organism },
  });
  return response.data;
}

// Fetches real PubMed research papers relevant to an antibiotic/organism.
export async function getResearchPapers(antibiotic, organism = 'all') {
  const response = await api.get('/predictor/research-papers', {
    params: { antibiotic, organism },
  });
  return response.data;
}