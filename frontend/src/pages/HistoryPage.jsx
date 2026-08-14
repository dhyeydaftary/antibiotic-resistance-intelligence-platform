import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, getHistoryAggregates } from '../api/historyApi';
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
// Route: /history (ProtectedRoute-gated). Two independent server-side
// data sources, not one client-side blob:
//   - getHistoryAggregates() — fetched once on mount. All-time stats
//     tile, quick-insights strip, and both filter-dropdowns' option
//     lists/hover-preview stats, computed server-side by a single $facet
//     pipeline (gateway/routes/prediction.js) — deliberately unaffected
//     by the active list filters, so the stats tile doesn't appear to
//     "shrink" just because the list underneath it is filtered.
//   - getHistory({ page, limit, filters, sort }) — refetched whenever
//     filters/sort/currentPage change. One page of the actual rendered
//     list, filtered/sorted/paginated server-side (gateway/routes/
//     prediction.js's GET /history).
// Renders as either a timeline or a table (HistoryTimeline / HistoryTable),
// switchable via viewMode.
//
// Talks to: api/historyApi.js (both fetches), utils/reportGenerator.js
// (per-record PDF/CSV/JSON export, reused from PredictionResultPage),
// components/history/* (all the panels below).
// ===================================================================
const DEFAULT_FILTERS = {
  search: '', status: 'All', dateFrom: '', dateTo: '', antibiotic: 'All', organism: 'All', sort: 'newest',
};
const EMPTY_PAGE = { history: [], page: 1, limit: 8, total: 0, totalPages: 0 };

// Derives per-record display fields (R/S/I counts, avg confidence) from
// a raw history API record. avgConfidence is read straight off the record
// (persisted server-side at write time — see gateway/models/
// PredictionHistory.js) with a client-side fallback for any record
// written before that field existed.
function summarizeRecord(record) {
  const preds = record.predictions || [];
  const counts = preds.reduce((acc, p) => ({ ...acc, [p.result]: (acc[p.result] || 0) + 1 }), {});
  const avgConfidence = record.avgConfidence ?? (preds.length ? preds.reduce((sum, p) => sum + (p.confidence || 0), 0) / preds.length : 0);
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

  const [aggregates, setAggregates] = useState(null);
  const [aggregatesLoading, setAggregatesLoading] = useState(true);

  const [pageData, setPageData] = useState(EMPTY_PAGE);
  const [listLoading, setListLoading] = useState(true);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('timeline');

  // All-time aggregates: fetched exactly once, on mount — see file header.
  const fetchAggregates = useCallback(async () => {
    setAggregatesLoading(true);
    try {
      const result = await getHistoryAggregates();
      setAggregates(result?.data || null);
    } catch (err) {
      console.error('Failed to load history aggregates:', err);
      setAggregates(null);
    } finally {
      setAggregatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchAggregates(); }, [fetchAggregates]);

  // One page of the rendered list — refetched on every filters/sort/page
  // change. fetchIdRef guards against a race: the filters-change effect
  // below resets currentPage to 1, which means a filter change while not
  // already on page 1 fires this effect twice in quick succession (once
  // for the old page with new filters, once for page 1) — without the
  // guard, whichever response arrives second wins even if it's the
  // stale one.
  const fetchIdRef = useRef(0);
  const fetchHistoryPage = useCallback(async () => {
    const requestId = (fetchIdRef.current += 1);
    setListLoading(true);
    try {
      const result = await getHistory({ page: currentPage, filters, sort: filters.sort });
      if (requestId !== fetchIdRef.current) return;
      setPageData(result?.data || EMPTY_PAGE);
    } catch (err) {
      if (requestId !== fetchIdRef.current) return;
      console.error('Failed to load history:', err);
      setPageData(EMPTY_PAGE);
    } finally {
      if (requestId === fetchIdRef.current) setListLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => { fetchHistoryPage(); }, [fetchHistoryPage]);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const summaries = useMemo(() => pageData.history.map(summarizeRecord), [pageData.history]);

  const stats = useMemo(() => {
    if (!aggregates) return { total: 0, thisWeek: 0, avgResistance: 0, lastPrediction: 'No predictions yet' };
    return {
      total: aggregates.total,
      thisWeek: aggregates.thisWeek,
      avgResistance: aggregates.avgResistance,
      lastPrediction: aggregates.lastPredictionDate ? daysAgoLabel(aggregates.lastPredictionDate) : 'No predictions yet',
    };
  }, [aggregates]);

  // HistoryInsights.jsx's prop shape, mapped from the aggregates response
  // — two of these are deliberately the same number under a different name
  // (resistanceRate/avgResistance, recentCount/thisWeek — see gateway/
  // routes/prediction.js's GET /history/aggregates comment), since the
  // stats tile and the insights strip have always used different names
  // for the same figures.
  const insights = useMemo(() => {
    if (!aggregates) return null;
    return {
      resistanceRate: aggregates.avgResistance,
      susceptibilityRate: aggregates.susceptibilityRate,
      intermediateRate: aggregates.intermediateRate,
      mostCommonAntibiotic: aggregates.mostCommonAntibiotic,
      mostCommonAntibioticPct: aggregates.mostCommonAntibioticPct,
      trendChange: aggregates.trendChange,
      recentCount: aggregates.thisWeek,
    };
  }, [aggregates]);

  const antibioticOptions = useMemo(() => ['All', ...(aggregates?.antibioticOptions || [])], [aggregates]);
  const organismOptions = useMemo(() => ['All', ...(aggregates?.organismOptions || [])], [aggregates]);
  const antibioticStats = aggregates?.antibioticStats || {};
  const organismStats = aggregates?.organismStats || {};

  // Exports the currently-filtered set as one summary CSV (distinct from a
  // per-record export via reportGenerator) — a dedicated fetch at a high
  // limit, independent of on-screen pagination state, not a client-side
  // slice of whatever page happens to be loaded. isExportingRef guards
  // against a double-click firing a second export request mid-flight.
  const isExportingRef = useRef(false);
  const handleExport = async () => {
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    try {
      const result = await getHistory({ page: 1, limit: 5000, filters, sort: filters.sort });
      const records = (result?.data?.history || []).map(summarizeRecord);
      if (records.length === 0) { alert('No data to export.'); return; }

      const headers = ['Date', 'Organism', 'Resistant', 'Susceptible', 'Intermediate', 'Avg Confidence (%)'];
      const rows = records.map((s) => [
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
    } catch (err) {
      console.error('Failed to export history:', err);
      alert('Something went wrong while exporting. Please try again.');
    } finally {
      isExportingRef.current = false;
    }
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

  const actionHandlers = { onView: handleViewRecord, onDownloadPdf: handleDownloadPdf, onDownloadCsv: handleDownloadCsv, onDownloadJson: handleDownloadJson };

  // Whole-page skeleton only for the very first combined load; once
  // aggregates has resolved at least once, filter/page changes only
  // refetch the list below (listLoading), without blanking the stats/
  // insights/filter bar that are already on screen.
  const initialLoading = aggregatesLoading && aggregates === null;
  const isTrulyEmpty = aggregates != null && aggregates.total === 0;

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <HistoryHeader onExport={handleExport} onNewAnalysis={handleNewPrediction} viewMode={viewMode} onViewModeChange={setViewMode} />

        {initialLoading ? (
          <HistorySkeleton />
        ) : isTrulyEmpty ? (
          <ScrollReveal index={4}>
            <EmptyHistory onNewPrediction={handleNewPrediction} />
          </ScrollReveal>
        ) : (
          <>
            <ScrollReveal index={0}>
              <HistoryStats stats={stats} />
            </ScrollReveal>

            <ScrollReveal index={1}>
              <HistoryInsights insights={insights} />
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
                totalResults={pageData.total}
              />
            </ScrollReveal>

            <ScrollReveal index={3}>
              {listLoading && summaries.length === 0 ? (
                <HistorySkeleton />
              ) : viewMode === 'timeline' ? (
                <HistoryTimeline summaries={summaries} currentPage={pageData.page} totalPages={pageData.totalPages} onPageChange={setCurrentPage} {...actionHandlers} />
              ) : (
                <HistoryTable summaries={summaries} currentPage={pageData.page} totalPages={pageData.totalPages} onPageChange={setCurrentPage} {...actionHandlers} />
              )}
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
