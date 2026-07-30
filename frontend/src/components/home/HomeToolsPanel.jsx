import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowUp, Building2, Microscope, TestTubes, ChevronRight, MessageSquare, LineChart, FileEdit, Sparkles } from 'lucide-react';
import Panel from '../app/Panel';
import { getTrends } from '../../api/trendsApi';
import { ANTIBIOTICS } from '../../constants/domainData';

const JOURNEY_STEPS = [
  { icon: MessageSquare, label: 'Input' },
  { icon: LineChart, label: 'Analyze' },
  { icon: FileEdit, label: 'Result' },
  { icon: Sparkles, label: 'Insights' },
];

/**
 * Replaces the old AI Memory + AI Notebook (both filler) with:
 * 1. Rising Resistance Alert — the fastest-rising antibiotic, reusing the
 *    same overviewStats logic from TrendsPage.
 * 2. Prediction Journey — unchanged, nice visual guide.
 * 3. Dataset Coverage — quick stats about ward, organism, and specimen coverage.
 */
function HomeToolsPanel({ datasetStats }) {
  const [overviewStats, setOverviewStats] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  // Fetch latest rate + delta for all 15 antibiotics (same as Trends page)
  useEffect(() => {
    setLoadingTrends(true);
    Promise.all(
      ANTIBIOTICS.map((a) =>
        getTrends(a.code, 'all')
          .then((result) => {
            const s = result.data.series || [];
            if (s.length === 0) return null;
            const latest = Math.round(s[s.length - 1].resistanceRate * 1000) / 10;
            const first = Math.round(s[0].resistanceRate * 1000) / 10;
            return { code: a.code, latest, delta: Math.round((latest - first) * 10) / 10 };
          })
          .catch(() => null)
      )
    ).then((results) => {
      setOverviewStats(results.filter(Boolean));
      setLoadingTrends(false);
    });
  }, []);

  const risingTrend = useMemo(() => {
    if (overviewStats.length === 0) return null;
    const sorted = [...overviewStats].sort((a, b) => b.delta - a.delta);
    return { top: sorted[0], runnersUp: sorted.slice(1, 3) };
  }, [overviewStats]);

  const wardCount = datasetStats?.wardTypeDistribution?.length || 0;
  const specimenCount = datasetStats?.specimenSourceDistribution?.length || 0;
  const organismCount = datasetStats?.organismDistribution?.length || 0;

  return (
    <Panel className="p-6 transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg">
      <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {/* Rising Resistance Alert */}
        <div className="sm:pr-6">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-[18px] w-[18px] text-resistant" strokeWidth={1.75} />
            <h3 className="font-display text-h4 text-onpanel-ink">Rising Resistance</h3>
          </div>

          {loadingTrends ? (
            <div className="h-20 animate-pulse rounded-[10px] bg-panel-raised" />
          ) : risingTrend ? (
            <>
              <div className="rounded-[10px] bg-resistant/10 p-3">
                <div className="font-display text-[18px] font-semibold text-onpanel-ink">
                  {risingTrend.top.code}
                </div>
                <div className="mt-0.5 flex items-center gap-1 font-mono text-[12px] font-medium text-resistant">
                  <ArrowUp size={12} /> +{risingTrend.top.delta}% over period
                </div>
              </div>
              {risingTrend.runnersUp.length > 0 && (
                <div className="mt-2 space-y-1">
                  {risingTrend.runnersUp.map((r) => (
                    <div key={r.code} className="flex items-center justify-between font-mono text-[12px]">
                      <span className="text-onpanel-muted">{r.code}</span>
                      <span className={r.delta > 0 ? 'text-resistant' : 'text-susceptible'}>
                        {r.delta > 0 ? '+' : ''}{r.delta}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                to="/trends"
                className="mt-3 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
              >
                View trends
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <p className="font-sans text-small text-onpanel-faint">No trend data available.</p>
          )}
        </div>

        {/* Prediction Journey — unchanged */}
        <div className="pt-5 sm:px-6 sm:pt-0">
          <h3 className="mb-6 font-display text-h4 text-onpanel-ink">Prediction journey</h3>
          <div className="relative flex items-start justify-between">
            <div className="absolute left-[9%] right-[9%] top-[9px] h-px bg-panel-border" aria-hidden="true" />
            {JOURNEY_STEPS.map((step) => (
              <div key={step.label} className="relative z-10 flex flex-col items-center bg-panel px-1 text-center">
                <step.icon className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-onpanel-muted">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Dataset Coverage */}
        <div className="pt-5 sm:pl-6 sm:pt-0">
          <h3 className="mb-3 font-display text-h4 text-onpanel-ink">Dataset coverage</h3>
          <p className="mb-4 font-sans text-small text-onpanel-muted">
            What the model was trained on
          </p>

          <div className="space-y-3">
            {organismCount > 0 && (
              <div className="flex items-center gap-2.5">
                <Microscope className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                <span className="font-sans text-small text-onpanel-ink">
                  <span className="font-medium">{organismCount}</span> organisms tracked
                </span>
              </div>
            )}
            {wardCount > 0 && (
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                <span className="font-sans text-small text-onpanel-ink">
                  <span className="font-medium">{wardCount}</span> ward types
                </span>
              </div>
            )}
            {specimenCount > 0 && (
              <div className="flex items-center gap-2.5">
                <TestTubes className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                <span className="font-sans text-small text-onpanel-ink">
                  <span className="font-medium">{specimenCount}</span> specimen sources
                </span>
              </div>
            )}
          </div>

          <Link
            to="/explore"
            className="mt-4 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            Explore the dataset
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export default HomeToolsPanel;
