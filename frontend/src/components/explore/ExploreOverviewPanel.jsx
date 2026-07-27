import { Database, Rows3, FlaskConical, CalendarRange } from 'lucide-react';
import Panel from '../app/Panel';
import { useCountUp } from '../../hooks/useCountUp';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex-1 px-5 py-4 first:pl-0 last:pr-0">
      <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </div>
      <p className="font-display text-h2 text-onpanel-ink">{value}</p>
      {hint && <p className="mt-0.5 font-sans text-caption text-onpanel-muted">{hint}</p>}
    </div>
  );
}

/**
 * stats: the real, unmodified response from GET /predictor/dataset-stats —
 * { totalRows, totalColumns, antibioticTargets, dateRange: {start,end},
 *   organismDistribution: [{organism, count}] }
 */
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
        <Stat icon={Rows3} label="Total Samples" value={Math.round(totalRows).toLocaleString()} hint={`${stats.totalColumns} columns`} />
        <Stat icon={Database} label="Organisms Tracked" value={Math.round(organismCount)} hint="Distinct species" />
        <Stat icon={FlaskConical} label="Antibiotics Tested" value={Math.round(antibioticTargets)} hint="WHO AWaRe aligned" />
        <Stat
          icon={CalendarRange}
          label="Date Range"
          value={stats.dateRange?.start ? stats.dateRange.start.slice(0, 4) : '\u2014'}
          hint={stats.dateRange?.end ? `to ${stats.dateRange.end.slice(0, 4)}` : undefined}
        />
      </div>
    </Panel>
  );
}

export default ExploreOverviewPanel;
