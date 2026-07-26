import { Activity, Calendar, ShieldCheck, Target } from 'lucide-react';
import Panel from '../app/Panel';
import { useCountUp } from '../../hooks/useCountUp';
import MiniLineChart from './MiniLineChart';

const RESULT_LABELS = { R: 'Resistant', S: 'Susceptible', I: 'Intermediate' };
const RESULT_TEXT = { R: 'text-resistant', S: 'text-susceptible', I: 'text-intermediate' };

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

function HomeOverviewPanel({ stats, dailySeries }) {
  const total = useCountUp(stats.total);
  const thisWeek = useCountUp(stats.thisWeek);
  const avgConfidence = useCountUp(stats.avgConfidence);
  const resultLabel = RESULT_LABELS[stats.mostCommonResult] || '\u2014';
  const resultTone = RESULT_TEXT[stats.mostCommonResult] || 'text-onpanel-ink';

  return (
    <Panel className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg">
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Overview
      </div>
      <h2 className="font-display text-h3 text-onpanel-ink">Your prediction activity</h2>

      <div className="mt-5 flex flex-col divide-y divide-panel-border sm:flex-row sm:divide-x sm:divide-y-0">
        <Stat icon={Activity} label="Total Predictions" value={Math.round(total)} hint="All time" />
        <Stat
          icon={Calendar}
          label="This Week"
          value={Math.round(thisWeek)}
          hint={
            stats.thisWeekTrendPct == null
              ? undefined
              : `${stats.thisWeekTrendPct >= 0 ? '\u2191' : '\u2193'} ${Math.abs(
                  Math.round(stats.thisWeekTrendPct)
                )}% vs last week`
          }
        />
        <Stat
          icon={ShieldCheck}
          label="Most Common Result"
          value={<span className={resultTone}>{resultLabel}</span>}
          hint={`${Math.round(stats.mostCommonResultPct || 0)}% of predictions`}
        />
        <Stat icon={Target} label="Avg Confidence" value={`${avgConfidence.toFixed(1)}%`} hint="High confidence" />
      </div>

      <div className="my-5 h-px bg-panel-border" />

      <div>
        {dailySeries && dailySeries.length > 0 ? (
          <MiniLineChart data={dailySeries} xKey="label" />
        ) : (
          <p className="font-sans text-small text-onpanel-faint">No predictions yet this week.</p>
        )}
      </div>
    </Panel>
  );
}

export default HomeOverviewPanel;