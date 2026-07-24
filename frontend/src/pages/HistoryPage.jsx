import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../api/historyApi';
import { downloadPdf, downloadCsv, downloadJson } from '../utils/reportGenerator';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryStats from '../components/history/HistoryStats';
import HistoryFilters from '../components/history/HistoryFilters';
import HistoryTimeline from '../components/history/HistoryTimeline';
import HistoryTable from '../components/history/HistoryTable';
import HistoryInsights from '../components/history/HistoryInsights';
import EmptyHistory from '../components/history/EmptyHistory';
import HistorySkeleton from '../components/history/HistorySkeleton';

function flattenRecord(record) {
  const organism = record.inputData?.organism || 'Unknown';
  const date = record.createdAt;

  return (record.predictions || []).map((p) => ({
    id: `${record._id}-${p.antibiotic}`,
    recordId: record._id,
    date,
    organism,
    antibiotic: p.antibiotic,
    result: p.result,
    confidence: Math.round((p.confidence || 0) * 100),
    status: 'Completed',
    awarClass: p.awareCategory,
    shapExplanation: p.shapExplanation,
    aiInsights: record.aiInsights,
    inputData: record.inputData,
    predictions: record.predictions,
  }));
}

function buildReportItem(prediction) {
  return {
    _id: prediction.recordId,
    createdAt: prediction.date,
    inputData: prediction.inputData,
    predictions: prediction.predictions,
    aiInsights: prediction.aiInsights,
  };
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rawRecords, setRawRecords] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [filteredPredictions, setFilteredPredictions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    avgResistance: 0,
    lastPrediction: 'No predictions yet'
  });
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    dateRange: 'All',
    antibiotic: 'All',
    organism: 'All',
    sort: 'newest'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('timeline');
  const itemsPerPage = 10;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getHistory();
      const records = result?.data?.history || [];
      const flattened = records.flatMap(flattenRecord);

      setRawRecords(records);
      setPredictions(flattened);
      setFilteredPredictions(flattened);
      calculateStats(records, flattened);
    } catch (err) {
      console.error('Failed to load history:', err);
      setRawRecords([]);
      setPredictions([]);
      setFilteredPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const calculateStats = (records, flattened) => {
    if (!records.length) {
      setStats({
        total: 0,
        thisWeek: 0,
        avgResistance: 0,
        lastPrediction: 'No predictions yet'
      });
      return;
    }

    const total = records.length;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = records.filter((r) => new Date(r.createdAt) >= weekAgo).length;

    const resistantCount = flattened.filter((p) => p.result === 'R').length;
    const avgResistance = flattened.length
      ? (resistantCount / flattened.length) * 100
      : 0;

    const sorted = [...records].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const lastDate = new Date(sorted[0].createdAt);
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    let lastLabel;
    if (diffDays === 0) {
      lastLabel = 'Today';
    } else if (diffDays === 1) {
      lastLabel = 'Yesterday';
    } else if (diffDays > 1 && diffDays < 7) {
      lastLabel = `${diffDays} days ago`;
    } else {
      lastLabel = lastDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    setStats({
      total,
      thisWeek,
      avgResistance: Math.round(avgResistance),
      lastPrediction: lastLabel
    });
  };

  useEffect(() => {
    let filtered = [...predictions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.id.toLowerCase().includes(searchLower) ||
        item.organism.toLowerCase().includes(searchLower) ||
        item.antibiotic.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status !== 'All') {
      filtered = filtered.filter(item => item.result === filters.status);
    }

    if (filters.antibiotic !== 'All') {
      filtered = filtered.filter(item => item.antibiotic === filters.antibiotic);
    }

    if (filters.organism !== 'All') {
      filtered = filtered.filter(item => item.organism === filters.organism);
    }

    if (filters.dateRange !== 'All') {
      const days = parseInt(filters.dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(item => new Date(item.date) >= cutoff);
    }

    switch (filters.sort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'confidence-high':
        filtered.sort((a, b) => b.confidence - a.confidence);
        break;
      case 'confidence-low':
        filtered.sort((a, b) => a.confidence - b.confidence);
        break;
      default:
        break;
    }

    setFilteredPredictions(filtered);
    setCurrentPage(1);
  }, [filters, predictions]);

  const handleExport = () => {
    const dataToExport = filteredPredictions;

    if (dataToExport.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Prediction ID',
      'Date',
      'Organism',
      'Antibiotic',
      'Result',
      'Confidence (%)',
      'WHO AWaRe Class'
    ];

    const rows = dataToExport.map(p => [
      p.id,
      new Date(p.date).toLocaleString(),
      p.organism,
      p.antibiotic,
      p.result === 'R' ? 'Resistant' : p.result === 'S' ? 'Susceptible' : 'Intermediate',
      p.confidence,
      p.awarClass || 'Access'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `predictions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const handleNewPrediction = () => {
    navigate('/predict');
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // --- Restored actions: view full result page, per-record downloads ---
  const handleViewRecord = useCallback((item) => {
    navigate('/predict/result/live', {
      state: {
        prediction: {
          predictions: item.predictions,
          aiInsights: item.aiInsights,
        },
        inputData: item.inputData,
      },
    });
  }, [navigate]);

  const handleDownloadPdf = useCallback((item) => downloadPdf(buildReportItem(item)), []);
  const handleDownloadCsv = useCallback((item) => downloadCsv(buildReportItem(item)), []);
  const handleDownloadJson = useCallback((item) => downloadJson(buildReportItem(item)), []);

  const antibioticOptions = ['All', ...new Set(predictions.map(p => p.antibiotic))];
  const organismOptions = ['All', ...new Set(predictions.map(p => p.organism))];

  const pageStart = (currentPage - 1) * itemsPerPage;
  const pageEnd = pageStart + itemsPerPage;
  const paginatedPredictions = filteredPredictions.slice(pageStart, pageEnd);

  return (
    <div
      className="min-h-screen w-full px-4 sm:px-6 lg:px-8 py-6"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(138,141,147,0.25) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundColor: '#F7F5F0'
      }}
    >
      <div className="max-w-7xl mx-auto">
        <HistoryHeader
          onRefresh={handleRefresh}
          onExport={handleExport}
          onNewAnalysis={handleNewPrediction}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {loading ? (
          <HistorySkeleton />
        ) : rawRecords.length === 0 ? (
          <EmptyHistory onNewPrediction={handleNewPrediction} />
        ) : (
          <>
            <HistoryStats stats={stats} />

            <HistoryFilters
              filters={filters}
              onFilterChange={setFilters}
              antibioticOptions={antibioticOptions}
              organismOptions={organismOptions}
              totalResults={filteredPredictions.length}
            />

            {viewMode === 'timeline' ? (
              <HistoryTimeline
                predictions={paginatedPredictions}
                onView={handleViewRecord}
                onDownloadPdf={handleDownloadPdf}
                onDownloadCsv={handleDownloadCsv}
                onDownloadJson={handleDownloadJson}
              />
            ) : (
              <HistoryTable
                predictions={paginatedPredictions}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredPredictions.length}
                onPageChange={setCurrentPage}
                onRowClick={handleViewRecord}
                onDownloadPdf={handleDownloadPdf}
                onDownloadCsv={handleDownloadCsv}
                onDownloadJson={handleDownloadJson}
              />
            )}

            <HistoryInsights predictions={filteredPredictions} />
          </>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;