import React, { useState } from 'react';

const HistoryDetails = ({ prediction }) => {
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getResultStyles = (result) => {
    switch (result) {
      case 'R':
        return {
          text: 'text-red-700',
          bg: 'bg-red-50',
          border: 'border-red-400',
          dot: 'bg-red-500',
          label: 'Resistant'
        };
      case 'S':
        return {
          text: 'text-emerald-700',
          bg: 'bg-emerald-50',
          border: 'border-emerald-400',
          dot: 'bg-emerald-500',
          label: 'Susceptible'
        };
      case 'I':
        return {
          text: 'text-amber-700',
          bg: 'bg-amber-50',
          border: 'border-amber-400',
          dot: 'bg-amber-500',
          label: 'Intermediate'
        };
      default:
        return {
          text: 'text-gray-700',
          bg: 'bg-gray-50',
          border: 'border-gray-400',
          dot: 'bg-gray-500',
          label: result
        };
    }
  };

  const styles = getResultStyles(prediction.result);

  return (
    <div className="bg-paper/30 px-4 sm:px-6 py-5 sm:py-6">
      <div className="max-w-4xl mx-auto">
        {/* Result Summary Bar */}
        <div className={`flex items-center gap-4 p-3 rounded-lg ${styles.bg} border ${styles.border} mb-5`}>
          <div className={`w-3 h-3 rounded-full ${styles.dot}`} />
          <span className={`font-sans font-semibold ${styles.text}`}>
            Result: {styles.label}
          </span>
          <span className="text-ink-faint">|</span>
          <span className="font-sans text-sm text-ink-muted">
            Confidence: {prediction.confidence}%
          </span>
          <span className="text-ink-faint">|</span>
          <span className="font-sans text-sm text-ink-muted">
            ID: {prediction.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Input Values */}
          <div>
            <h4 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-2.5">
              Input Values
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(prediction.inputValues).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="font-sans text-sm text-ink mt-0.5">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Model & Timing */}
          <div>
            <h4 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-2.5">
              Prediction Details
            </h4>
            <div className="space-y-2.5">
              <div>
                <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint block">
                  Model Version
                </span>
                <span className="font-sans text-sm text-ink">
                  {prediction.modelVersion}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint block">
                  WHO AWaRe Class
                </span>
                <span className="font-sans text-sm text-ink">
                  {prediction.awarClass || 'Access'}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint block">
                  Timestamp
                </span>
                <span className="font-sans text-sm text-ink-muted">
                  {formatDate(prediction.timestamp)}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint block">
                  Confidence Level
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-[120px] h-1.5 bg-hairline rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${styles.bg} rounded-full transition-all duration-700`}
                      style={{ width: `${prediction.confidence}%` }}
                    />
                  </div>
                  <span className={`font-sans text-sm font-medium ${styles.text}`}>
                    {prediction.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-5 pt-5 border-t border-hairline">
          <h4 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-2">
            Clinical Explanation
          </h4>
          <p className={`font-sans text-sm text-ink-muted leading-relaxed ${!showFullExplanation && prediction.explanation.length > 200 ? 'line-clamp-3' : ''}`}>
            {prediction.explanation}
          </p>
          {prediction.explanation.length > 200 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFullExplanation(!showFullExplanation);
              }}
              className="font-sans text-sm text-teal hover:text-teal/80 transition-colors duration-200 mt-1.5"
            >
              {showFullExplanation ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Quick Tags */}
        <div className="mt-5 pt-5 border-t border-hairline flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {styles.label}
          </span>
          <span className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {prediction.organism}
          </span>
          <span className="w-px h-4 bg-hairline" />
          <span className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {prediction.antibiotic}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HistoryDetails;
