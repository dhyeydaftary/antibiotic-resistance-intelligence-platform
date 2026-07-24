import React, { useState } from 'react';

const HistoryHeader = ({ 
  onRefresh, 
  onExport, 
  onNewAnalysis,
  viewMode, 
  onViewModeChange 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="mb-10">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-faint">
          Archive · 2026
        </span>
        <span className="text-ink-faint/30">|</span>
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-ink-faint/50">
          Research Ledger
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div>
          <h1 className="font-serif text-[44px] font-light text-ink tracking-[-0.02em] leading-none">
            Analysis History
          </h1>
          <p className="font-sans text-ink-muted mt-3 text-sm leading-relaxed max-w-[60ch]">
            Review past AMR predictions and export results. Each record captures 
            resistance profiles, confidence scores, and clinical context.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {/* New Analysis - Primary filled button */}
          <button
            onClick={onNewAnalysis}
            className="font-sans text-sm bg-ink text-paper px-4 py-2 rounded-lg hover:bg-ink/90 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            New Analysis
          </button>

          {/* View Toggle - Segmented control */}
          <div className="flex items-center p-0.5 border border-hairline rounded-lg bg-paper">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`px-3 py-1.5 font-sans text-xs rounded-md transition-all duration-200 ${
                viewMode === 'timeline'
                  ? 'bg-paper text-ink ring-1 ring-hairline'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`px-3 py-1.5 font-sans text-xs rounded-md transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-paper text-ink ring-1 ring-hairline'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              Table
            </button>
          </div>

          {/* Refresh - Ghost icon button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="font-sans text-sm text-ink-soft hover:text-ink transition-all duration-200 px-3 py-2 rounded-lg hover:border hover:border-hairline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-1.5">
              <svg 
                className={`w-4 h-4 transition-transform duration-500 ${
                  isRefreshing ? 'rotate-360' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </span>
          </button>
          
          {/* Export - Ghost icon button */}
          <button
            onClick={onExport}
            className="font-sans text-sm text-ink-soft hover:text-ink transition-all duration-200 px-3 py-2 rounded-lg hover:border hover:border-hairline"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </span>
          </button>
        </div>
      </div>

      {/* Hairline divider */}
      <div className="w-full h-px bg-hairline mt-8" />
    </div>
  );
};

export default HistoryHeader;