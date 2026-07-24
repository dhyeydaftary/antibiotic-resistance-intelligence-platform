import React from 'react';

const EmptyHistory = ({ onNewPrediction }) => {
  return (
    <div className="bg-paper border border-hairline rounded-lg py-16 px-4 sm:py-20">
      <div className="max-w-md mx-auto text-center">
        {/* Thin bacteria illustration */}
        <div className="flex justify-center mb-6">
          <svg className="w-16 h-16 text-ink-faint/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="font-serif italic text-2xl text-ink-soft font-light mb-2">
          No records yet.
        </h2>
        
        <p className="font-mono text-[11px] text-ink-faint tracking-[0.08em]">
          Predictions will appear here as an archived ledger.
        </p>

        <button
          onClick={onNewPrediction}
          className="mt-6 inline-flex items-center gap-2 font-sans text-sm text-teal hover:text-teal/80 transition-colors duration-200 border-b border-teal/30 hover:border-teal/60 pb-0.5 group"
        >
          Run your first analysis →
        </button>
      </div>
    </div>
  );
};

export default EmptyHistory;