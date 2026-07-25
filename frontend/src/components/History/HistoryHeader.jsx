import React from 'react';
import { Download, Plus } from 'lucide-react';
import PrimaryButton from '../app/PrimaryButton';

const HistoryHeader = ({ onExport, onNewAnalysis, viewMode, onViewModeChange }) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
            Prediction history
          </div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[48px]">
            History
          </h1>
          <p className="mt-3 max-w-lg font-sans text-[16px] leading-[1.55] text-page-muted">
            Review past AMR predictions and export results.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
          <PrimaryButton onClick={onNewAnalysis} className="gap-1.5">
            <Plus size={15} /> New analysis
          </PrimaryButton>

          <div className="flex items-center gap-0.5 rounded-full border border-canvas-hairline bg-white p-1">
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${viewMode === 'timeline' ? 'bg-panel text-onpanel-ink' : 'text-page-muted hover:text-page-ink'}`}
            >
              Timeline
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${viewMode === 'table' ? 'bg-panel text-onpanel-ink' : 'text-page-muted hover:text-page-ink'}`}
            >
              Table
            </button>
          </div>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-full border border-canvas-hairline bg-white px-3.5 py-2 font-sans text-[13px] font-medium text-page-ink transition-colors hover:bg-canvas-alt"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryHeader;