import React, { useState } from 'react';
import HistoryTimelineEvent from './HistoryTimelineEvent';

const HistoryTimeline = ({ predictions }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!predictions.length) {
    return (
      <div className="bg-paper border border-hairline rounded-xl py-12 px-4 text-center">
        <p className="font-sans text-ink-muted">
          No predictions match your current filters.
        </p>
      </div>
    );
  }

  // Group predictions by date
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
    <div className="mb-8 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-hairline" />
        
        {dateKeys.map((dateKey, dateIndex) => (
          <div key={dateKey} className="mb-6 last:mb-0">
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-[30px] h-[30px] rounded-full bg-paper border-2 border-hairline flex items-center justify-center z-10 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-teal" />
              </div>
              <span className="font-mono text-xs tracking-wider uppercase text-ink-muted">
                {dateKey}
              </span>
              <span className="text-ink-faint text-xs font-sans">
                {groupedPredictions[dateKey].length} prediction{groupedPredictions[dateKey].length > 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Events for this date */}
            <div className="ml-[46px] space-y-3">
              {groupedPredictions[dateKey].map((prediction, index) => (
                <HistoryTimelineEvent
                  key={prediction.id}
                  prediction={prediction}
                  isExpanded={expandedId === prediction.id}
                  onToggle={() => toggleExpand(prediction.id)}
                  index={index}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryTimeline;