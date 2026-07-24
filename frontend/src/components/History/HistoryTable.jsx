import React, { useState } from 'react';

const HistoryTable = ({
  predictions,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
  onRowClick,
  onDownloadPdf,
  onDownloadCsv,
  onDownloadJson,
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-paper border border-hairline rounded-xl py-12 px-4 text-center">
        <p className="font-sans text-ink-muted">
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

  const getResultColor = (result) => {
    switch (result) {
      case 'R': return 'text-destructive';
      case 'S': return 'text-teal';
      case 'I': return 'text-intermediate';
      default: return 'text-ink-muted';
    }
  };

  const getResultDotColor = (result) => {
    switch (result) {
      case 'R': return 'bg-destructive';
      case 'S': return 'bg-teal';
      case 'I': return 'bg-intermediate';
      default: return 'bg-ink-faint';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'Completed': return 'bg-success';
      case 'Pending': return 'bg-intermediate';
      case 'Failed': return 'bg-destructive';
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
      <div className="bg-paper border border-hairline rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-5 py-3 border-b border-hairline bg-paper/50">
          <div className="w-[50px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint text-center">#</div>
          <div className="w-[120px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint">Date & Time</div>
          <div className="w-[130px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint">Sample ID</div>
          <div className="flex-1 min-w-[100px] font-mono text-[10px] tracking-wider uppercase text-ink-faint">Organism</div>
          <div className="flex-1 min-w-[100px] font-mono text-[10px] tracking-wider uppercase text-ink-faint">Antibiotic</div>
          <div className="w-[100px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint text-center">Result</div>
          <div className="w-[120px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint text-center">Confidence</div>
          <div className="w-[100px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint text-right">Status</div>
          <div className="w-[130px] flex-shrink-0 font-mono text-[10px] tracking-wider uppercase text-ink-faint text-right">Report</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-hairline/50">
          {predictions.map((prediction, index) => {
            return (
              <div
                key={prediction.id}
                className="flex items-center px-5 py-3 min-h-[56px] hover:bg-ink/5 transition-colors duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredRow(prediction.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onRowClick?.(prediction)}
              >
                <div className="w-[50px] flex-shrink-0 text-center font-sans text-sm text-ink/40">
                  {startIndex + index + 1}
                </div>

                <div className="w-[120px] flex-shrink-0">
                  <div className="font-sans text-xs text-ink">{formatDate(prediction.date)}</div>
                  <div className="font-mono text-[10px] text-ink/40">{formatTime(prediction.date)}</div>
                </div>

                <div className="w-[130px] flex-shrink-0">
                  <span className="font-mono text-xs text-ink font-medium truncate block">
                    {prediction.id}
                  </span>
                </div>

                <div className="flex-1 min-w-[100px]">
                  <span className="font-serif italic text-sm text-ink truncate block">
                    {prediction.organism}
                  </span>
                </div>

                <div className="flex-1 min-w-[100px]">
                  <span className="font-sans text-sm text-ink/60 truncate block">
                    {prediction.antibiotic}
                  </span>
                </div>

                <div className="w-[100px] flex-shrink-0 flex justify-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-sans text-xs font-medium ${getResultColor(prediction.result)} border border-hairline`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getResultDotColor(prediction.result)}`} />
                    {getResultLabel(prediction.result)}
                  </span>
                </div>

                <div className="w-[120px] flex-shrink-0 flex items-center justify-center gap-2">
                  <div className="w-16 h-1 bg-hairline rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getResultDotColor(prediction.result)} opacity-70`}
                      style={{ width: `${prediction.confidence}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-ink/40 min-w-[36px]">
                    {prediction.confidence}%
                  </span>
                </div>

                <div className="w-[100px] flex-shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(prediction.status)}`} />
                    <span className="font-sans text-xs text-ink/40">
                      {prediction.status || 'Completed'}
                    </span>
                  </div>
                </div>

                <div className="w-[130px] flex-shrink-0 flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownloadPdf?.(prediction); }}
                    className="px-1.5 py-1 rounded-md font-mono text-[10px] text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors"
                    title="Download PDF"
                  >
                    PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownloadCsv?.(prediction); }}
                    className="px-1.5 py-1 rounded-md font-mono text-[10px] text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors"
                    title="Download CSV"
                  >
                    CSV
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownloadJson?.(prediction); }}
                    className="px-1.5 py-1 rounded-md font-mono text-[10px] text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors"
                    title="Download JSON"
                  >
                    JSON
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