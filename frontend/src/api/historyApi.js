// Backs HistoryPage — fetches this user's saved predictions.
// Filtering/sorting/pagination are all server-side query params now
// (gateway/routes/prediction.js's GET /history) — this file just builds
// the query string, it doesn't do any of that work itself.
import api from './axiosConfig';

// Maps HistoryPage's filter-state shape ({ status, ... }) onto the query
// param names GET /history actually reads ({ result, ... }).
function buildHistoryParams({ page, limit, filters = {}, sort } = {}) {
  const params = new URLSearchParams();

  if (page) params.set('page', page);
  if (limit) params.set('limit', limit);
  if (sort) params.set('sort', sort);

  if (filters.organism && filters.organism !== 'All') params.set('organism', filters.organism);
  if (filters.antibiotic && filters.antibiotic !== 'All') params.set('antibiotic', filters.antibiotic);
  if (filters.status && filters.status !== 'All') params.set('result', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.search) params.set('search', filters.search);

  return params;
}

// Fetches one page of the current user's prediction history, filtered/
// sorted/paginated server-side. Response shape:
// { history, page, limit, total, totalPages }.
export async function getHistory({ page, limit, filters, sort } = {}) {
  const params = buildHistoryParams({ page, limit, filters, sort });
  const response = await api.get(`/predictor/history?${params.toString()}`);
  return response.data;
}

// Fetches all-time aggregate stats for the current user — the stats tile,
// the quick-insights strip, and both filter-dropdowns' option lists/hover-
// preview stats. Always unfiltered/all-time, regardless of the active
// list filters — see gateway/routes/prediction.js's GET
// /history/aggregates for why.
export async function getHistoryAggregates() {
  const response = await api.get('/predictor/history/aggregates');
  return response.data;
}
