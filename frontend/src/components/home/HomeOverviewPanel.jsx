import { Activity, Calendar, ShieldCheck, Target } from 'lucide-react';
import { curveLinear } from '@visx/curve';
import Panel from '../app/Panel';
import { useCountUp } from '../../hooks/useCountUp';
import { AreaChart } from '../charts/area-chart';
import { Area } from '../charts/area';
import { Grid } from '../charts/grid';
import { XAxis } from '../charts/x-axis';
import { ChartTooltip } from '../charts/tooltip';

const RESULT_LABELS = { R: 'Resistant', S: 'Susceptible', I: 'Intermediate' };
const RESULT_TEXT = { R: 'text-resistant', S: 'text-susceptible', I: 'text-intermediate' };

const CHART_VARS = {
  '--chart-background': '#1D1D1F',
  '--chart-foreground': '#F5F5F7',
  '--chart-foreground-muted': '#98989D',
  '--chart-line-primary': '#0071E3',
  '--chart-line-secondary': '#98989D',
  '--chart-crosshair': '#0071E3',
  '--chart-grid': '#3A3A3C',
  '--border': '#3A3A3C',
};

// One labeled stat cell in the overview row (icon, big value, small hint).
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

// Personal activity summary: 4 stat cells (from HomePage's computeStats)
// plus an 8-day predictions-per-day area chart (from buildDailySeries).
function HomeOverviewPanel({ stats, dailySeries, datasetStats }) {
  const total = useCountUp(stats.total);
  const thisWeek = useCountUp(stats.thisWeek);
  const avgConfidence = useCountUp(stats.avgConfidence);
  const resultLabel = RESULT_LABELS[stats.mostCommonResult] || '\u2014';
  const resultTone = RESULT_TEXT[stats.mostCommonResult] || 'text-onpanel-ink';

  return (
    <Panel className="p-6 transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg">
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
          <div className="chart-on-dark" style={CHART_VARS}>
            <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-onpanel-faint">
              PREDICTIONS PER DAY
            </div>
            <AreaChart data={dailySeries} xDataKey="date" aspectRatio="5 / 1.6" margin={{ top: 10, right: 10, bottom: 24, left: 10 }}>
              <Grid horizontal />
              <Area dataKey="total" stroke="#0071E3" fill="#0071E3" fillOpacity={0.15} strokeWidth={2} curve={curveLinear} />
              <XAxis />
              <ChartTooltip />
            </AreaChart>
          </div>
        ) : (
          <p className="font-sans text-small text-onpanel-faint">No predictions yet this week.</p>
        )}
      </div>
    </Panel>
  );
}

export default HomeOverviewPanel;