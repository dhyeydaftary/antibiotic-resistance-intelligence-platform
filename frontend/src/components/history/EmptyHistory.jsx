import React from 'react';
import { FlaskConical, ArrowRight } from 'lucide-react';
import Panel from '../app/Panel';
import PrimaryButton from '../app/PrimaryButton';

const EmptyHistory = ({ onNewPrediction }) => {
  return (
    <Panel className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel-raised">
            <FlaskConical size={24} className="text-onpanel-faint" />
          </div>
        </div>

        <h2 className="font-display text-[22px] font-semibold text-onpanel-ink">No records yet</h2>
        <p className="mt-2 font-sans text-[14px] leading-relaxed text-onpanel-muted">
          Predictions will appear here once you run your first analysis.
        </p>

        <div className="mt-6 flex justify-center">
          <PrimaryButton onClick={onNewPrediction} className="gap-1.5">
            Run your first analysis <ArrowRight size={14} />
          </PrimaryButton>
        </div>
      </div>
    </Panel>
  );
};

export default EmptyHistory;