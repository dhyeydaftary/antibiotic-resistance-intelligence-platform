import React, { useState } from 'react';
import HistoryTimelineEvent from './HistoryTimelineEvent';

const HistoryTimeline = ({ predictions, onView, onDownloadPdf, onDownloadCsv, onDownloadJson }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!predictions || !predictions.length) {
    return (
      <div className="bg-paper border border-hairline rounded-xl py-12 px-4 text-center">
        <p className="font-sans text-ink-muted">
          No predictions match your current filters.
        </p>
      </div>
    );
  }

  const groupedPredictions = predictions.reduce((groups, prediction) => {
    const date = new Date(prediction.date);
    const dateKey = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(prediction);
    return groups;
  }, {});

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const dateKeys = Object.keys(groupedPredictions);

  return (
    <div className="relative mb-8 pl-8">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-hairline/60" />

      {dateKeys.map((dateKey) => (
        <div key={dateKey} className="relative mb-10 last:mb-0">
          <div className="relative flex items-center gap-3 mb-4">
            <div className="absolute left-[-21px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-teal ring-4 ring-paper z-10" />
            <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-ink-soft ml-6">
              {dateKey}
            </span>
            <span className="font-mono text-[11px] text-ink-faint">
              · {groupedPredictions[dateKey].length} prediction{groupedPredictions[dateKey].length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1">
            {groupedPredictions[dateKey].map((prediction, index) => (
              <HistoryTimelineEvent
                key={prediction.id}
                prediction={prediction}
                isExpanded={expandedId === prediction.id}
                onToggle={() => toggleExpand(prediction.id)}
                index={index}
                onView={onView}
                onDownloadPdf={onDownloadPdf}
                onDownloadCsv={onDownloadCsv}
                onDownloadJson={onDownloadJson}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryTimeline;