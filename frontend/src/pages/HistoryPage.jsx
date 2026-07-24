import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HistoryHeader from '../components/history/HistoryHeader';
import HistoryStats from '../components/history/HistoryStats';
import HistoryFilters from '../components/history/HistoryFilters';
import HistoryTimeline from '../components/history/HistoryTimeline';
import HistoryTable from '../components/history/HistoryTable';
import HistoryInsights from '../components/history/HistoryInsights';
import EmptyHistory from '../components/history/EmptyHistory';
import HistorySkeleton from '../components/history/HistorySkeleton';

const mockPredictions = [
  {
    id: 'PRED-2026-07-23-001',
    date: '2026-07-23T14:32:00Z',
    organism: 'E. coli',
    antibiotic: 'Ciprofloxacin',
    result: 'R',
    confidence: 94.2,
    inputValues: {
      age: 45,
      sex: 'Female',
      specimen: 'Urine',
      hospital: 'City General',
      priorAntibiotics: 'Yes'
    },
    explanation: 'High confidence prediction based on resistance patterns observed in similar clinical cases.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-23T14:32:00Z',
    awarClass: 'Watch'
  },
  {
    id: 'PRED-2026-07-23-002',
    date: '2026-07-23T11:15:00Z',
    organism: 'S. aureus',
    antibiotic: 'Vancomycin',
    result: 'S',
    confidence: 98.7,
    inputValues: {
      age: 62,
      sex: 'Male',
      specimen: 'Blood',
      hospital: 'Memorial Medical',
      priorAntibiotics: 'No'
    },
    explanation: 'Strong susceptibility predicted. No resistance markers detected.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-23T11:15:00Z',
    awarClass: 'Watch'
  },
  {
    id: 'PRED-2026-07-22-008',
    date: '2026-07-22T08:03:00Z',
    organism: 'K. pneumoniae',
    antibiotic: 'Amoxicillin',
    result: 'I',
    confidence: 76.1,
    inputValues: {
      age: 34,
      sex: 'Female',
      specimen: 'Sputum',
      hospital: 'University Hospital',
      priorAntibiotics: 'Yes'
    },
    explanation: 'Intermediate resistance predicted. Further testing recommended.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-22T08:03:00Z',
    awarClass: 'Access'
  },
  {
    id: 'PRED-2026-07-21-042',
    date: '2026-07-21T16:45:00Z',
    organism: 'P. aeruginosa',
    antibiotic: 'Meropenem',
    result: 'S',
    confidence: 91.5,
    inputValues: {
      age: 55,
      sex: 'Male',
      specimen: 'Wound',
      hospital: 'Regional Medical',
      priorAntibiotics: 'No'
    },
    explanation: 'Susceptible. Carbapenem susceptibility confirmed.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-21T16:45:00Z',
    awarClass: 'Watch'
  },
  {
    id: 'PRED-2026-07-21-023',
    date: '2026-07-21T11:20:00Z',
    organism: 'E. coli',
    antibiotic: 'Gentamicin',
    result: 'R',
    confidence: 88.9,
    inputValues: {
      age: 71,
      sex: 'Female',
      specimen: 'Urine',
      hospital: 'City General',
      priorAntibiotics: 'Yes'
    },
    explanation: 'Resistance predicted. Aminoglycoside resistance genes detected.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-21T11:20:00Z',
    awarClass: 'Access'
  },
  {
    id: 'PRED-2026-07-20-056',
    date: '2026-07-20T13:55:00Z',
    organism: 'S. pneumoniae',
    antibiotic: 'Penicillin',
    result: 'I',
    confidence: 82.3,
    inputValues: {
      age: 28,
      sex: 'Male',
      specimen: 'CSF',
      hospital: 'Neurology Center',
      priorAntibiotics: 'No'
    },
    explanation: 'Intermediate susceptibility. Possible resistance mechanisms developing.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-20T13:55:00Z',
    awarClass: 'Access'
  },
  {
    id: 'PRED-2026-07-20-031',
    date: '2026-07-20T10:10:00Z',
    organism: 'K. pneumoniae',
    antibiotic: 'Ceftriaxone',
    result: 'R',
    confidence: 96.4,
    inputValues: {
      age: 49,
      sex: 'Female',
      specimen: 'Blood',
      hospital: 'University Hospital',
      priorAntibiotics: 'Yes'
    },
    explanation: 'High confidence resistance prediction. ESBL-producing strain suspected.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-20T10:10:00Z',
    awarClass: 'Watch'
  },
  {
    id: 'PRED-2026-07-19-089',
    date: '2026-07-19T18:30:00Z',
    organism: 'E. coli',
    antibiotic: 'Trimethoprim',
    result: 'S',
    confidence: 93.8,
    inputValues: {
      age: 39,
      sex: 'Male',
      specimen: 'Urine',
      hospital: 'Community Clinic',
      priorAntibiotics: 'No'
    },
    explanation: 'Susceptible. No resistance markers detected.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-19T18:30:00Z',
    awarClass: 'Access'
  },
  {
    id: 'PRED-2026-07-19-015',
    date: '2026-07-19T07:45:00Z',
    organism: 'S. aureus',
    antibiotic: 'Erythromycin',
    result: 'R',
    confidence: 85.7,
    inputValues: {
      age: 58,
      sex: 'Female',
      specimen: 'Sputum',
      hospital: 'Memorial Medical',
      priorAntibiotics: 'Yes'
    },
    explanation: 'Resistance predicted. Macrolide resistance genes identified.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-19T07:45:00Z',
    awarClass: 'Access'
  },
  {
    id: 'PRED-2026-07-18-124',
    date: '2026-07-18T14:20:00Z',
    organism: 'P. aeruginosa',
    antibiotic: 'Ciprofloxacin',
    result: 'I',
    confidence: 79.4,
    inputValues: {
      age: 67,
      sex: 'Male',
      specimen: 'Wound',
      hospital: 'City General',
      priorAntibiotics: 'Yes'
    },
    explanation: 'Intermediate susceptibility. Further testing recommended.',
    modelVersion: 'CatBoost v2.3',
    timestamp: '2026-07-18T14:20:00Z',
    awarClass: 'Watch'
  }
];

const HistoryPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1200));
        setPredictions(mockPredictions);
        setFilteredPredictions(mockPredictions);
        calculateStats(mockPredictions);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const calculateStats = (data) => {
    if (!data.length) {
      setStats({
        total: 0,
        thisWeek: 0,
        avgResistance: 0,
        lastPrediction: 'No predictions yet'
      });
      return;
    }

    const total = data.length;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = data.filter(item => new Date(item.date) >= weekAgo).length;

    const resistanceCount = data.filter(item => item.result === 'R').length;
    const avgResistance = (resistanceCount / total) * 100;

    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = new Date(sorted[0].date);
    const now2 = new Date();
    let lastLabel;
    
    const diffDays = Math.floor((now2 - lastDate) / (1000 * 60 * 60 * 24));
    
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
      'Model Version',
      'WHO AWaRe Class'
    ];

    const rows = dataToExport.map(p => [
      p.id,
      new Date(p.date).toLocaleString(),
      p.organism,
      p.antibiotic,
      p.result === 'R' ? 'Resistant' : p.result === 'S' ? 'Susceptible' : 'Intermediate',
      p.confidence,
      p.modelVersion || 'CatBoost v2.3',
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
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setPredictions([...mockPredictions]);
      calculateStats(mockPredictions);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleNewPrediction = () => {
    navigate('/predict');
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const antibioticOptions = ['All', ...new Set(predictions.map(p => p.antibiotic))];
  const organismOptions = ['All', ...new Set(predictions.map(p => p.organism))];

  const pageStart = (currentPage - 1) * itemsPerPage;
  const pageEnd = pageStart + itemsPerPage;
  const paginatedPredictions = filteredPredictions.slice(pageStart, pageEnd);

  return (
    <div className="min-h-screen bg-paper px-4 sm:px-6 lg:px-8 py-6">
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
        ) : predictions.length === 0 ? (
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
              <HistoryTimeline predictions={paginatedPredictions} />
            ) : (
              <HistoryTable 
                predictions={paginatedPredictions}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredPredictions.length}
                onPageChange={setCurrentPage}
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