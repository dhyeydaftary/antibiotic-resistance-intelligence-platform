import React, { useState } from 'react';

const HistoryDetails = ({ prediction, onView, onDownloadPdf, onDownloadCsv, onDownloadJson }) => {
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
          text: 'text-resistant',
          bg: 'bg-resistant/10',
          border: 'border-resistant/30',
          dot: 'bg-resistant',
          label: 'Resistant'
        };
      case 'S':
        return {
          text: 'text-susceptible',
          bg: 'bg-susceptible/10',
          border: 'border-susceptible/30',
          dot: 'bg-susceptible',
          label: 'Susceptible'
        };
      case 'I':
        return {
          text: 'text-intermediate',
          bg: 'bg-intermediate/10',
          border: 'border-intermediate/30',
          dot: 'bg-intermediate',
          label: 'Intermediate'
        };
      default:
        return {
          text: 'text-ink-muted',
          bg: 'bg-ink/5',
          border: 'border-hairline',
          dot: 'bg-ink-faint',
          label: result
        };
    }
  };

  const styles = getResultStyles(prediction.result);

  // Real backend data doesn't have inputValues/explanation like the old mock —
  // adapt to the actual shape: inputData (raw form fields) and aiInsights (LLM-free summary).
  const inputEntries = Object.entries(prediction.inputData || {}).filter(
    ([key]) => key !== 'organism'
  );

  const explanation =
    prediction.aiInsights?.plainEnglishExplanation ||
    (prediction.shapExplanation?.[0]
      ? `The strongest factor influencing this ${styles.label.toLowerCase()} prediction was ${prediction.shapExplanation[0].feature.replace(/_/g, ' ')}.`
      : 'No AI-generated explanation available for this record.');

  return (
    <div className="py-1">
      {/* Result summary bar */}
      <div className={`flex items-center gap-4 p-3 rounded-lg ${styles.bg} border ${styles.border} mb-4`}>
        <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
        <span className={`font-sans font-semibold ${styles.text}`}>
          Result: {styles.label}
        </span>
        <span className="text-ink-faint">|</span>
        <span className="font-sans text-sm text-ink-muted">
          Confidence: {prediction.confidence}%
        </span>
        <span className="text-ink-faint">|</span>
        <span className="font-mono text-xs text-ink-muted">
          {prediction.id}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Input Values */}
        <div>
          <h4 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-2.5">
            Input Values
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {inputEntries.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-sans text-sm text-ink mt-0.5">
                  {String(value)}
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
                {formatDate(prediction.date)}
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] tracking-wider uppercase text-ink-faint block">
                Confidence Level
              </span>
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-[120px] h-1.5 bg-hairline rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${styles.dot} transition-all duration-700`}
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
      <div className="mt-4 pt-4 border-t border-hairline">
        <h4 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-2">
          AI Explanation
        </h4>
        <p className={`font-sans text-sm text-ink-muted leading-relaxed ${!showFullExplanation && explanation.length > 200 ? 'line-clamp-3' : ''}`}>
          {explanation}
        </p>
        {explanation.length > 200 && (
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

      {/* Actions: view full report, download */}
      <div className="mt-4 pt-4 border-t border-hairline flex flex-wrap items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onView?.(prediction); }}
          className="px-3 py-1.5 rounded-lg bg-ink text-paper font-sans text-xs font-medium hover:bg-ink-soft transition-colors"
        >
          View full report →
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownloadPdf?.(prediction); }}
          className="px-3 py-1.5 rounded-lg border border-hairline font-mono text-xs text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          PDF
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownloadCsv?.(prediction); }}
          className="px-3 py-1.5 rounded-lg border border-hairline font-mono text-xs text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          CSV
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownloadJson?.(prediction); }}
          className="px-3 py-1.5 rounded-lg border border-hairline font-mono text-xs text-ink-muted hover:text-ink hover:border-ink/30 transition-colors"
        >
          JSON
        </button>
      </div>
    </div>
  );
};

export default HistoryDetails;