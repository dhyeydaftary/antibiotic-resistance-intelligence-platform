// frontend/src/components/explore/ExploreOverviewPanel.jsx

import { Database, Rows3, FlaskConical, CalendarRange } from 'lucide-react';
import Panel from '../app/Panel';
import { useCountUp } from '../../hooks/useCountUp';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

function ExploreOverviewPanel({ stats }) {
  const totalRows = useCountUp(stats.totalRows);
  const organismCount = useCountUp(stats.organismDistribution?.length || 0);
  const antibioticTargets = useCountUp(stats.antibioticTargets);

  return (
    <Panel className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Dataset Overview
      </div>
      <h2 className="font-display text-h3 text-onpanel-ink">What's inside the training data</h2>

      <div className="mt-5 flex flex-col divide-y divide-panel-border sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex-1 px-5 py-4 first:pl-0 last:pr-0">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            <Rows3 className="h-3.5 w-3.5" strokeWidth={2} />
            Total Samples
          </div>
          <p className="font-display text-h2 text-onpanel-ink">{Math.round(totalRows).toLocaleString()}</p>
          <p className="mt-0.5 font-sans text-caption text-onpanel-muted">{stats.totalColumns} columns</p>
        </div>

        <div className="flex-1 px-5 py-4 first:pl-0 last:pr-0">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            <Database className="h-3.5 w-3.5" strokeWidth={2} />
            Organisms Tracked
          </div>
          <p className="font-display text-h2 text-onpanel-ink">{Math.round(organismCount)}</p>
          <p className="mt-0.5 font-sans text-caption text-onpanel-muted">Distinct species</p>
        </div>

        <div className="flex-1 px-5 py-4 first:pl-0 last:pr-0">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            <FlaskConical className="h-3.5 w-3.5" strokeWidth={2} />
            Antibiotics Tested
          </div>
          <p className="font-display text-h2 text-onpanel-ink">{Math.round(antibioticTargets)}</p>
          <p className="mt-0.5 font-sans text-caption text-onpanel-muted">WHO AWaRe aligned</p>
        </div>

        <div className="flex-1 px-5 py-4 first:pl-0 last:pr-0">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            <CalendarRange className="h-3.5 w-3.5" strokeWidth={2} />
            Date Range
          </div>
          <p className="font-display text-h2 text-onpanel-ink">{stats.dateRange?.start ? stats.dateRange.start.slice(0, 4) : '\u2014'}</p>
          <p className="mt-0.5 font-sans text-caption text-onpanel-muted">{stats.dateRange?.end ? `to ${stats.dateRange.end.slice(0, 4)}` : undefined}</p>
        </div>
      </div>
    </Panel>
  );
}

export default ExploreOverviewPanel;