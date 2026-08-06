import React from 'react';
import Panel from '../app/Panel';

// Loading placeholder shown on HistoryPage while getHistory() resolves —
// mirrors the shape of stats + filter bar + list so there's no layout shift.
const HistorySkeleton = () => {
  return (
    <div className="animate-pulse">
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Panel key={i} className="p-4">
            <div className="h-3 w-16 rounded bg-panel-raised" />
            <div className="mt-2 h-6 w-12 rounded bg-panel-raised" />
          </Panel>
        ))}
      </div>

      <div className="mb-6 h-12 w-full rounded-[14px] bg-canvas-alt" />

      <Panel className="overflow-hidden">
        <div className="border-b border-panel-border px-5 py-3">
          <div className="h-3 w-full max-w-md rounded bg-panel-raised" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-panel-border px-5 py-3.5 last:border-b-0">
            <div className="h-4 w-20 rounded bg-panel-raised" />
            <div className="h-4 flex-1 rounded bg-panel-raised" />
            <div className="h-4 w-16 rounded bg-panel-raised" />
            <div className="h-5 w-20 rounded-full bg-panel-raised" />
          </div>
        ))}
      </Panel>
    </div>
  );
};

export default HistorySkeleton;