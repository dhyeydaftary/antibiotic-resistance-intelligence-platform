import React from 'react';

// UNUSED — grep confirms no file imports HistoryRow. An earlier flat
// table-row design superseded by HistoryTable.jsx/HistoryTimeline.jsx.
// Kept for reference; not wired into HistoryPage's render tree.
const HistoryRow = ({ prediction, isExpanded, onToggle }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'R': return 'text-resistant';
      case 'S': return 'text-susceptible';
      case 'I': return 'text-intermediate';
      default: return 'text-ink-muted';
    }
  };

  const getResultBg = (result) => {
    switch (result) {
      case 'R': return 'bg-resistant/10';
      case 'S': return 'bg-susceptible/10';
      case 'I': return 'bg-intermediate/10';
      default: return 'bg-paper';
    }
  };

  const getResultLabel = (result) => {
    switch (result) {
      case 'R': return 'Resistant';
      case 'S': return 'Susceptible';
      case 'I': return 'Intermediate';
      default: return result;
    }
  };

  return (
    <div 
      className="group cursor-pointer transition-colors duration-200 hover:bg-paper/50"
      onClick={onToggle}
    >
      <div className="px-4 sm:px-5 py-4">
        {/* Desktop View */}
        <div className="hidden lg:grid grid-cols-12 gap-3 items-center">
          {/* Expand Arrow */}
          <div className="col-span-1 flex items-center justify-start">
            <svg 
              className={`w-4 h-4 text-ink-faint transition-transform duration-300 ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Prediction ID */}
          <div className="col-span-3">
            <p className="font-mono text-xs text-ink font-medium">
              {prediction.id}
            </p>
          </div>

          {/* Organism */}
          <div className="col-span-2 text-center">
            <p className="font-sans text-sm text-ink">
              {prediction.organism}
            </p>
          </div>

          {/* Antibiotic */}
          <div className="col-span-2 text-center">
            <p className="font-sans text-sm text-ink-muted">
              {prediction.antibiotic}
            </p>
          </div>

          {/* Confidence */}
          <div className="col-span-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <div className="w-12 h-1 bg-hairline rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal rounded-full transition-all duration-500"
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
              <span className="font-sans text-xs font-medium text-ink-muted min-w-[36px]">
                {prediction.confidence}%
              </span>
            </div>
          </div>

          {/* Result */}
          <div className="col-span-2 text-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${getResultBg(prediction.result)} ${getResultColor(prediction.result)}`}>
              {getResultLabel(prediction.result)}
            </span>
          </div>

          {/* Date/Time */}
          <div className="col-span-1 text-right">
            <div className="flex flex-col items-end">
              <span className="font-sans text-sm text-ink-muted">
                {formatTime(prediction.date)}
              </span>
              <span className="font-sans text-xs text-ink-faint">
                {formatDate(prediction.date)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet View */}
        <div className="lg:hidden flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <svg 
                className={`w-4 h-4 text-ink-faint transition-transform duration-300 flex-shrink-0 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-ink font-medium truncate">
                  {prediction.id}
                </p>
              </div>
              
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-sans text-xs font-medium flex-shrink-0 ${getResultBg(prediction.result)} ${getResultColor(prediction.result)}`}>
                {getResultLabel(prediction.result)}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-7">
            <span className="font-sans text-sm text-ink">
              {prediction.organism}
            </span>
            <span className="font-sans text-sm text-ink-muted">
              {prediction.antibiotic}
            </span>
            <span className="font-sans text-xs font-medium text-ink-muted">
              {prediction.confidence}% confidence
            </span>
            <span className="font-sans text-xs text-ink-faint">
              {formatDate(prediction.date)} at {formatTime(prediction.date)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryRow;