import React, { useState } from 'react';

const HistoryTable = ({
  predictions,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onDelete
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-paper border border-ink/10 rounded-xl py-12 px-4 text-center">
        <p className="font-sans text-ink/40">
          No predictions match your current filters.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 2) {
        end = 4;
      }
      if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push('...');
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const getResultLabel = (result) => {
    switch (result) {
      case 'R': return 'Resistant';
      case 'S': return 'Susceptible';
      case 'I': return 'Intermediate';
      default: return result;
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-500';
      case 'Pending': return 'bg-amber-500';
      case 'Failed': return 'bg-red-400';
      default: return 'bg-ink/30';
    }
  };

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

  return (
    <div className="mb-8">
      <div className="bg-paper border border-ink/10 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-ink/10 bg-paper/50">
          <div className="col-span-1 font-mono text-[10px] tracking-wider uppercase text-ink/30">
            #
          </div>
          <div className="col-span-2 font-mono text-[10px] tracking-wider uppercase text-ink/30">
            Date & Time
          </div>
          <div className="col-span-2 font-mono text-[10px] tracking-wider uppercase text-ink/30">
            Sample ID
          </div>
          <div className="col-span-2 font-mono text-[10px] tracking-wider uppercase text-ink/30">
            Organism
          </div>
          <div className="col-span-2 font-mono text-[10px] tracking-wider uppercase text-ink/30">
            Antibiotic
          </div>
          <div className="col-span-1 font-mono text-[10px] tracking-wider uppercase text-ink/30 text-center">
            Result
          </div>
          <div className="col-span-1 font-mono text-[10px] tracking-wider uppercase text-ink/30 text-center">
            Confidence
          </div>
          <div className="col-span-1 font-mono text-[10px] tracking-wider uppercase text-ink/30 text-right">
            Status
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-ink/5">
          {predictions.map((prediction, index) => {
            const isHovered = hoveredRow === prediction.id;
            
            return (
              <div 
                key={prediction.id}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center transition-all duration-150 hover:bg-ink/5"
                onMouseEnter={() => setHoveredRow(prediction.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <div className="col-span-1 text-center font-sans text-sm text-ink/40">
                  {startIndex + index + 1}
                </div>
                <div className="col-span-2">
                  <div className="font-sans text-xs text-ink">
                    {formatDate(prediction.date)}
                  </div>
                  <div className="font-mono text-[10px] text-ink/40">
                    {formatTime(prediction.date)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="font-mono text-xs text-ink font-medium">
                    {prediction.id}
                  </span>
                </div>
                <div className="col-span-2 font-sans text-sm text-ink">
                  {prediction.organism}
                </div>
                <div className="col-span-2 font-sans text-sm text-ink/60">
                  {prediction.antibiotic}
                </div>
                <div className="col-span-1 text-center">
                  <span className={`font-sans text-xs font-medium px-2 py-0.5 rounded-full bg-ink/5 ${
                    prediction.result === 'R' ? 'text-ink/80' : 
                    prediction.result === 'S' ? 'text-emerald-600' : 
                    'text-amber-600'
                  }`}>
                    {getResultLabel(prediction.result)}
                  </span>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-12 h-1 bg-ink/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-ink/40 rounded-full transition-all duration-700"
                        style={{ width: `${prediction.confidence}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-ink/40">
                      {prediction.confidence}%
                    </span>
                  </div>
                </div>
                <div className="col-span-1 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(prediction.status)}`} />
                    <span className="font-sans text-xs text-ink/40">
                      {prediction.status || 'Completed'}
                    </span>
                  </div>
                </div>

                {/* Actions - fade in on hover */}
                <div className={`absolute right-4 flex items-center gap-1 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <button
                    className="p-1.5 rounded-lg hover:bg-ink/5 transition-colors duration-200 text-ink/30 hover:text-ink/60"
                    aria-label="View details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-ink/5 transition-colors duration-200 text-ink/30 hover:text-ink/60"
                    aria-label="Download PDF"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(prediction.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-200 text-ink/20 hover:text-red-400"
                    aria-label="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <p className="font-sans text-sm text-ink/40">
            Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} predictions
          </p>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 font-sans text-sm rounded-lg transition-all duration-200 ${
                currentPage === 1
                  ? 'text-ink/20 cursor-not-allowed'
                  : 'text-ink/40 hover:text-ink hover:bg-ink/5'
              }`}
            >
              Previous
            </button>

            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {page === '...' ? (
                  <span className="px-2 text-ink/20">…</span>
                ) : (
                  <button
                    onClick={() => onPageChange(page)}
                    className={`px-3.5 py-1.5 font-sans text-sm rounded-lg transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-ink/10 text-ink font-medium'
                        : 'text-ink/40 hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    {page}
                  </button>
                )}
              </React.Fragment>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 font-sans text-sm rounded-lg transition-all duration-200 ${
                currentPage === totalPages
                  ? 'text-ink/20 cursor-not-allowed'
                  : 'text-ink/40 hover:text-ink hover:bg-ink/5'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;