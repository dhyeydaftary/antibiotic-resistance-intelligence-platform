import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shared page-switcher, used by both HistoryTable and HistoryTimeline.
const HistoryPager = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-center gap-1">
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-full p-1.5 text-page-muted hover:bg-canvas-alt disabled:opacity-30">
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`h-8 w-8 rounded-full font-sans text-[13px] ${currentPage === page ? 'bg-page-ink text-white' : 'text-page-muted hover:bg-canvas-alt'}`}
        >
          {page}
        </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-full p-1.5 text-page-muted hover:bg-canvas-alt disabled:opacity-30">
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default HistoryPager;
