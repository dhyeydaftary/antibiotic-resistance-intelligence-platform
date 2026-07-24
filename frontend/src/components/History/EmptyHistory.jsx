import React from 'react';

const EmptyHistory = ({ onNewPrediction }) => {
  return (
    <div className="bg-paper border border-ink/10 rounded-xl py-16 px-4 sm:py-20">
      <div className="max-w-md mx-auto text-center">
        {/* Subtle icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full border border-ink/10 flex items-center justify-center bg-paper">
            <svg className="w-8 h-8 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl text-ink font-light mb-3">
          No analyses yet
        </h2>
        
        <p className="font-sans text-ink/40 text-sm leading-relaxed max-w-sm mx-auto">
          Run your first AMR prediction to see results here. Each prediction 
          will be logged with resistance profiles and confidence scores.
        </p>

        <button
          onClick={onNewPrediction}
          className="mt-8 inline-flex items-center gap-2 font-sans text-sm text-ink/60 hover:text-ink transition-all duration-300 border-b border-ink/20 hover:border-ink/40 pb-1 group"
        >
          Start New Analysis
          <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>

        <div className="mt-10 pt-8 border-t border-ink/5">
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <span className="font-mono text-[10px] tracking-wider uppercase text-ink/20 block">
                Supported Antibiotics
              </span>
              <span className="font-sans text-sm text-ink/30">
                15 across WHO AWaRe classes
              </span>
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-wider uppercase text-ink/20 block">
                ML Models
              </span>
              <span className="font-sans text-sm text-ink/30">
                CatBoost on 10,710 records
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyHistory;