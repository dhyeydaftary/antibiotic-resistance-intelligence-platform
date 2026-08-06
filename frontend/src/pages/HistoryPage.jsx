import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/historyApi';
import { downloadPdf, downloadCsv, downloadJson } from '../utils/reportGenerator';
import usePageTitle from '../hooks/usePageTitle';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryStats from '../components/history/HistoryStats';
import HistoryInsights from '../components/history/HistoryInsights';
import HistoryFilterBar from '../components/history/HistoryFilterBar';
import HistoryTimeline from '../components/history/HistoryTimeline';
import HistoryTable from '../components/history/HistoryTable';
import EmptyHistory from '../components/history/EmptyHistory';
import HistorySkeleton from '../components/history/HistorySkeleton';
import ScrollReveal from '../components/home/ScrollReveal';

// ===================================================================
// Route: /history (ProtectedRoute-gated). Fetches ALL of the user's
// saved predictions once via getHistory() (unfiltered, unpaginated —
// gateway/routes/prediction.js's GET /history DOES support server-side
// query filters, but this page doesn't use them) and does every
// filter/sort/paginate/stat-aggregation step client-side over the full
// in-memory list. Renders as either a timeline or a table
// (HistoryTimeline / HistoryTable), switchable via viewMode.
//
// Talks to: api/historyApi.js (fetch), utils/reportGenerator.js
// (per-record PDF/CSV/JSON export, reused from PredictionResultPage),
// components/history/* (all the panels below).
// ===================================================================
const DEFAULT_FILTERS = {
  search: '', status: 'All', dateFrom: '', dateTo: '', antibiotic: 'All', organism: 'All', sort: 'newest',
};

// Derives per-record display fields (R/S/I counts, avg confidence) from
// a raw history API record.
function summarizeRecord(record) {
  const preds = record.predictions || [];
  const counts = preds.reduce((acc, p) => ({ ...acc, [p.result]: (acc[p.result] || 0) + 1 }), {});
  const avgConfidence = preds.length ? preds.reduce((sum, p) => sum + (p.confidence || 0), 0) / preds.length : 0;
  return {
    id: record._id,
    date: record.createdAt,
    organism: record.inputData?.organism || 'Unknown',
    predictions: preds,
    aiInsights: record.aiInsights,
    inputData: record.inputData,
    resistantCount: counts.R || 0,
    susceptibleCount: counts.S || 0,
    intermediateCount: counts.I || 0,
    total: preds.length,
    avgConfidence,
  };
}

// Reshapes a summarized record back into the {_id, createdAt, ...} shape
// utils/reportGenerator.js expects for export.
function buildReportItem(record) {
  return { _id: record.id, createdAt: record.date, inputData: record.inputData, predictions: record.predictions, aiInsights: record.aiInsights };
}

// Calendar-day diff, not raw millisecond diff — fixes "Today" showing for yesterday's prediction
function daysAgoLabel(dateValue) {
  const now = new Date();
  const target = new Date(dateValue);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// History view: stats, insights, filters, and timeline/table listing of
// every saved prediction.
const HistoryPage = () => {
  usePageTitle('History');
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rawRecords, setRawRecords] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('timeline');
  const itemsPerPage = 8;

  // Loads the full prediction history for this user; failure degrades
  // to an empty list rather than showing an error state.
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHistory();
      setRawRecords(result?.data?.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setRawRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const summaries = useMemo(() => rawRecords.map(summarizeRecord), [rawRecords]);

  // Aggregates top-level stat-tile numbers: total count, predictions in
  // the last 7 days, overall resistance rate, and most-recent-prediction label.
  const stats = useMemo(() => {
    if (!rawRecords.length) return { total: 0, thisWeek: 0, avgResistance: 0, lastPrediction: 'No predictions yet' };

    const total = rawRecords.length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = rawRecords.filter((r) => new Date(r.createdAt) >= weekAgo).length;

    const allPreds = summaries.flatMap((s) => s.predictions);
    const resistantCount = allPreds.filter((p) => p.result === 'R').length;
    const avgResistance = allPreds.length ? (resistantCount / allPreds.length) * 100 : 0;

    const sorted = [...rawRecords].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { total, thisWeek, avgResistance: Math.round(avgResistance), lastPrediction: daysAgoLabel(sorted[0].createdAt) };
  }, [rawRecords, summaries]);

  // Stats per antibiotic/organism, used for hover previews in the filter dropdowns
  const antibioticStats = useMemo(() => {
    const map = {};
    summaries.flatMap((s) => s.predictions).forEach((p) => {
      if (!map[p.antibiotic]) map[p.antibiotic] = { count: 0, resistant: 0, confidenceSum: 0 };
      map[p.antibiotic].count += 1;
      if (p.result === 'R') map[p.antibiotic].resistant += 1;
      map[p.antibiotic].confidenceSum += p.confidence || 0;
    });
    const result = {};
    Object.entries(map).forEach(([key, v]) => {
      result[key] = {
        count: v.count,
        resistantPct: Math.round((v.resistant / v.count) * 100),
        avgConfidence: Math.round((v.confidenceSum / v.count) * 100),
      };
    });
    return result;
  }, [summaries]);

  // Per-organism record count and resistance rate, for filter-dropdown hover previews.
  const organismStats = useMemo(() => {
    const map = {};
    summaries.forEach((s) => {
      if (!map[s.organism]) map[s.organism] = { count: 0, resistant: 0, total: 0 };
      map[s.organism].count += 1;
      map[s.organism].resistant += s.resistantCount;
      map[s.organism].total += s.total;
    });
    const result = {};
    Object.entries(map).forEach(([key, v]) => {
      result[key] = { count: v.count, resistantPct: v.total ? Math.round((v.resistant / v.total) * 100) : 0 };
    });
    return result;
  }, [summaries]);

  // Applies every active filter (organism, date range, antibiotic/status,
  // free-text search) then sorts — the core client-side filtering
  // pipeline this whole page reads from.
  const filteredSummaries = useMemo(() => {
    let filtered = summaries.filter((s) => {
      if (filters.organism !== 'All' && s.organism !== filters.organism) return false;

      if (filters.dateFrom && new Date(s.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(s.date) > to) return false;
      }

      if (filters.antibiotic !== 'All' || filters.status !== 'All') {
        const matches = s.predictions.some((p) => {
          const abxOk = filters.antibiotic === 'All' || p.antibiotic === filters.antibiotic;
          const statusOk = filters.status === 'All' || p.result === filters.status;
          return abxOk && statusOk;
        });
        if (!matches) return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const organismMatch = s.organism.toLowerCase().includes(q);
        const abxMatch = s.predictions.some((p) => p.antibiotic.toLowerCase().includes(q));
        if (!organismMatch && !abxMatch) return false;
      }

      return true;
    });

    switch (filters.sort) {
      case 'newest': filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
      case 'oldest': filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
      case 'confidence-high': filtered.sort((a, b) => b.avgConfidence - a.avgConfidence); break;
      case 'confidence-low': filtered.sort((a, b) => a.avgConfidence - b.avgConfidence); break;
      default: break;
    }

    return filtered;
  }, [summaries, filters]);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Exports every currently-filtered record as one summary CSV (distinct
  // from a per-record export via reportGenerator).
  const handleExport = () => {
    if (filteredSummaries.length === 0) { alert('No data to export.'); return; }
    const headers = ['Date', 'Organism', 'Resistant', 'Susceptible', 'Intermediate', 'Avg Confidence (%)'];
    const rows = filteredSummaries.map((s) => [
      new Date(s.date).toLocaleString(), s.organism, s.resistantCount, s.susceptibleCount, s.intermediateCount, Math.round(s.avgConfidence * 100),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `predictions_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewPrediction = () => navigate('/predict');

  // Re-opens a past record on PredictionResultPage by passing its data
  // through router state, the same way a fresh prediction does.
  const handleViewRecord = useCallback((summary) => {
    navigate('/predict/result/live', {
      state: { prediction: { predictions: summary.predictions, aiInsights: summary.aiInsights }, inputData: summary.inputData },
    });
  }, [navigate]);

  const handleDownloadPdf = useCallback((s) => downloadPdf(buildReportItem(s)), []);
  const handleDownloadCsv = useCallback((s) => downloadCsv(buildReportItem(s)), []);
  const handleDownloadJson = useCallback((s) => downloadJson(buildReportItem(s)), []);

  const antibioticOptions = ['All', ...new Set(summaries.flatMap((s) => s.predictions.map((p) => p.antibiotic)))];
  const organismOptions = ['All', ...new Set(summaries.map((s) => s.organism))];

  const pageStart = (currentPage - 1) * itemsPerPage;
  const paginated = filteredSummaries.slice(pageStart, pageStart + itemsPerPage);
  const totalPages = Math.ceil(filteredSummaries.length / itemsPerPage);

  const actionHandlers = { onView: handleViewRecord, onDownloadPdf: handleDownloadPdf, onDownloadCsv: handleDownloadCsv, onDownloadJson: handleDownloadJson };

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <HistoryHeader onExport={handleExport} onNewAnalysis={handleNewPrediction} viewMode={viewMode} onViewModeChange={setViewMode} />

        {loading ? (
          <HistorySkeleton />
        ) : rawRecords.length === 0 ? (
          <ScrollReveal index={4}>
            <EmptyHistory onNewPrediction={handleNewPrediction} />
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal index={0}>
              <HistoryStats stats={stats} />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <HistoryInsights summaries={summaries} />
            </ScrollReveal>

            <ScrollReveal index={2}>
              <HistoryFilterBar
                filters={filters}
                onFilterChange={setFilters}
                onClear={() => setFilters(DEFAULT_FILTERS)}
                antibioticOptions={antibioticOptions}
                organismOptions={organismOptions}
                antibioticStats={antibioticStats}
                organismStats={organismStats}
                totalResults={filteredSummaries.length}
              />
            </ScrollReveal>

            <ScrollReveal index={3}>
              {viewMode === 'timeline' ? (
                <HistoryTimeline summaries={paginated} {...actionHandlers} />
              ) : (
                <HistoryTable summaries={paginated} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} {...actionHandlers} />
              )}
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;