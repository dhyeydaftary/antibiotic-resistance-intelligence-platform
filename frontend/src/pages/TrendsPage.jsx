import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendsSkeleton } from '../components/common/Skeletons';
import { TrendingUp, TrendingDown, Minus, Activity, Calendar, Flame, ArrowUp, Sparkles } from 'lucide-react';
import { getTrends } from '../api/trendsApi';
import { getDatasetStats } from '../api/datasetApi';
import { ORGANISM_OPTIONS, ANTIBIOTICS } from '../constants/domainData';
import usePageTitle from '../hooks/usePageTitle';
import Panel from '../components/app/Panel';
import ExplainTrendDrawer from '../components/trends/ExplainTrendDrawer';
import ResearchPapersPanel from '../components/trends/ResearchPapersPanel';
import ScrollReveal from '../components/home/ScrollReveal';

import { AreaChart } from '../components/charts/area-chart';
import { Area } from '../components/charts/area';
import { LineChart } from '../components/charts/line-chart';
import { Line } from '../components/charts/line';
import { Grid } from '../components/charts/grid';
import { XAxis } from '../components/charts/x-axis';
import { ChartTooltip } from '../components/charts/tooltip';
import { curveLinear } from '@visx/curve';
import { ChartLegendHoverProvider } from '../components/charts/chart-legend-hover';

// ===================================================================
// Route: /trends (ProtectedRoute-gated). Four independent data sources
// fetched in parallel, each with its own loading state:
//   1. Hero chart — getTrends(antibiotic, organism, wardType), refetches
//      whenever any filter changes.
//   2. Overview — getTrends() for ALL 15 antibiotics x 'all' organisms
//      (Promise.all, fetched once on mount) — powers the AWaRe-tier
//      averages, "steepest rising" callout, and the full resistance
//      landscape list. This is the "~15 requests per page visit" cost
//      gateway/middleware/predictionRateLimiters.js's readLimiter
//      comment references.
//   3. Dataset stats — getDatasetStats(), for the context strip and to
//      discover which ward types actually exist in the data (populates
//      the ward filter dropdown dynamically).
//   4. Organism overlay — getTrends(antibiotic, org) for the top 4
//      organisms by record count, refetched when the antibiotic changes,
//      merged into one multi-series dataset for the comparison chart.
//
// Renders via the custom charts/ library (AreaChart/LineChart) — see
// components/charts/ for the underlying primitives. ExplainTrendDrawer
// and ResearchPapersPanel are separate lazy-opened/scrolled-to panels
// that fetch their own data independently.
// ===================================================================
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

const ORGANISM_LINE_COLORS = ['#0071E3', '#30B0C7', '#5E5CE6', '#FF9F0A'];

const TIER_TONE = {
  Access: { text: 'text-susceptible', bg: 'bg-susceptible/15', bar: 'bg-susceptible' },
  Watch: { text: 'text-intermediate', bg: 'bg-intermediate/15', bar: 'bg-intermediate' },
  Reserve: { text: 'text-resistant', bg: 'bg-resistant/15', bar: 'bg-resistant' },
};

// Converts a "YYYY-MM" period string from the trends API into a Date
// (chart x-axis needs real Date values, not strings).
function parsePeriod(period) {
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

// Custom-arrow native <select> used for the antibiotic/organism/ward filters.
function NativeSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 cursor-pointer appearance-none rounded-[10px] border border-panel-border bg-panel-raised px-3.5 pr-9 font-sans text-[13px] font-medium text-onpanel-ink outline-none transition-colors hover:border-onpanel-faint focus:border-accent-blue"
      style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2398989D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// One of the 4 top-row stat tiles (current/peak rate, change, data points).
function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-onpanel-faint">{label}</p>
          <p className={`mt-1 font-display text-[24px] font-semibold sm:text-[28px] ${tone.text}`}>{value}</p>
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tone.bg}`}>
          <Icon size={14} className={tone.text} />
        </div>
      </div>
    </Panel>
  );
}

// Trends dashboard: hero time-series, organism comparison, AWaRe-tier
// averages, rising-trend callout, full resistance landscape, and research papers.
function TrendsPage() {
  usePageTitle('Trends');
  
  const [antibiotic, setAntibiotic] = useState('CIP');
  const [organism, setOrganism] = useState('all');
  const [wardType, setWardType] = useState('all');
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [overviewSeries, setOverviewSeries] = useState({});
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [datasetStats, setDatasetStats] = useState(null);
  const [datasetStatsError, setDatasetStatsError] = useState(null);
  const [wardTypeOptions, setWardTypeOptions] = useState([{ value: 'all', label: 'All wards' }]);

  const [organismOverlay, setOrganismOverlay] = useState([]);
  const [organismOverlayLoading, setOrganismOverlayLoading] = useState(true);
  const [hoveredOrganismIndex, setHoveredOrganismIndex] = useState(null);

  // Hero chart data
  useEffect(() => {
    setLoading(true);
    setError(null);
    getTrends(antibiotic, organism, wardType)
      .then((result) => setSeries(result.data.series))
      .catch((err) => {
        setError('Failed to load trend data.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [antibiotic, organism, wardType]);

  // Overview data (all 15 antibiotics, all organisms) — used for tier comparison, rising trend, top/bottom lists
  useEffect(() => {
    setOverviewLoading(true);
    Promise.all(
      ANTIBIOTICS.map((a) =>
        getTrends(a.code, 'all')
          .then((result) => ({ code: a.code, series: result.data.series }))
          .catch(() => ({ code: a.code, series: [] }))
      )
    ).then((results) => {
      const map = {};
      results.forEach((r) => { map[r.code] = r.series; });
      setOverviewSeries(map);
      setOverviewLoading(false);
    });
  }, []);

  // Dataset context strip + ward type options
  useEffect(() => {
    setDatasetStatsError(null);
    getDatasetStats()
      .then((result) => {
        setDatasetStats(result.data);
        if (result.data.wardTypeDistribution?.length) {
          setWardTypeOptions([
            { value: 'all', label: 'All wards' },
            ...result.data.wardTypeDistribution.map((w) => ({ value: w.wardType, label: w.wardType })),
          ]);
        }
      })
      .catch((err) => {
        setDatasetStatsError('Failed to load dataset overview.');
        console.error('Failed to load dataset stats:', err);
      });
  }, []);

  // Top organisms by record count, from dataset-stats (already sorted by backend)
  const topOrganisms = useMemo(() => {
    if (!datasetStats?.organismDistribution) return [];
    return datasetStats.organismDistribution
      .filter((o) => o.organism !== 'Unknown')
      .slice(0, 4)
      .map((o) => o.organism);
  }, [datasetStats]);

  // Organism overlay: fetch selected antibiotic across top organisms, merge into one dataset
  const [validOrganisms, setValidOrganisms] = useState([]);

  useEffect(() => {
    if (topOrganisms.length === 0) return;
    setOrganismOverlayLoading(true);
    Promise.all(
      topOrganisms.map((org) =>
        getTrends(antibiotic, org)
          .then((result) => ({ organism: org, series: result.data.series }))
          .catch(() => ({ organism: org, series: [] }))
      )
    ).then((results) => {
      // Drop organisms with too few data points — sparse series cause wild curve overshoot
      const usable = results.filter((r) => r.series.length >= 6);

      const byPeriod = new Map();
      usable.forEach(({ organism: org, series: s }) => {
        s.forEach((d) => {
          if (!byPeriod.has(d.period)) byPeriod.set(d.period, { period: d.period, date: parsePeriod(d.period) });
          byPeriod.get(d.period)[org] = Math.round(d.resistanceRate * 1000) / 10;
        });
      });

      const orgNames = usable.map((r) => r.organism);
      const merged = Array.from(byPeriod.values())
        .map((point) => {
          // Ensure every point has every organism key explicitly, even if missing —
          // inconsistent object shapes across data points seem to break the chart's
          // reveal/entrance animation for multi-series data.
          const complete = { ...point };
          orgNames.forEach((org) => {
            if (!(org in complete)) complete[org] = null;
          });
          return complete;
        })
        .sort((a, b) => a.date - b.date);
      setOrganismOverlay(merged);
      setValidOrganisms(usable.map((r) => r.organism));
      setOrganismOverlayLoading(false);
    });
  }, [antibiotic, topOrganisms]);

  // Converts the raw hero series into {date, rate} points for the chart.
  const chartData = useMemo(
    () => series.map((d) => ({ date: parsePeriod(d.period), rate: Math.round(d.resistanceRate * 1000) / 10 })),
    [series]
  );

  // Derives the 4 hero stat-card values (latest/peak/delta/point count)
  // from the hero chart's own series.
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const latest = chartData[chartData.length - 1].rate;
    const first = chartData[0].rate;
    const peak = Math.max(...chartData.map((d) => d.rate));
    const delta = Math.round((latest - first) * 10) / 10;
    return { latest, peak, delta, points: chartData.length };
  }, [chartData]);

  // Derived overview stats: latest rate + delta per antibiotic
  const overviewStats = useMemo(() => {
    return ANTIBIOTICS.map((a) => {
      const s = overviewSeries[a.code] || [];
      if (s.length === 0) return null;
      const latest = Math.round(s[s.length - 1].resistanceRate * 1000) / 10;
      const first = Math.round(s[0].resistanceRate * 1000) / 10;
      return { code: a.code, aware: a.aware, latest, delta: Math.round((latest - first) * 10) / 10 };
    }).filter(Boolean);
  }, [overviewSeries]);

  // Averages each antibiotic's latest rate by WHO AWaRe tier.
  const tierAverages = useMemo(() => {
    const tiers = { Access: [], Watch: [], Reserve: [] };
    overviewStats.forEach((s) => { if (tiers[s.aware]) tiers[s.aware].push(s.latest); });
    return Object.entries(tiers).map(([tier, values]) => ({
      tier,
      avg: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0,
      count: values.length,
    }));
  }, [overviewStats]);

  // Finds the antibiotic with the largest positive resistance-rate delta
  // (the "steepest rising trend" callout) plus its two runners-up.
  const risingTrend = useMemo(() => {
    if (overviewStats.length === 0) return null;
    const sorted = [...overviewStats].sort((a, b) => b.delta - a.delta);
    return { top: sorted[0], runnersUp: sorted.slice(1, 3) };
  }, [overviewStats]);



  const organismOptions = [{ value: 'all', label: 'All organisms' }, ...ORGANISM_OPTIONS.map((o) => ({ value: o, label: o }))];
  const antibioticOptions = ANTIBIOTICS.map((a) => ({ value: a.code, label: a.code }));

  const TrendIcon = !stats ? Minus : stats.delta > 0 ? TrendingUp : stats.delta < 0 ? TrendingDown : Minus;
  const trendColor = !stats ? 'text-onpanel-muted' : stats.delta > 0 ? 'text-resistant' : stats.delta < 0 ? 'text-susceptible' : 'text-onpanel-muted';

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
            Resistance trends
          </div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[48px]">
            Trends
          </h1>
          <p className="mt-3 max-w-lg font-sans text-[16px] leading-[1.55] text-page-muted">
            Track resistance rates over time across the dataset, filtered by antibiotic and organism.
          </p>
        </div>

        {/* Dataset context strip */}
        {datasetStatsError && (
          <div className="mb-6 rounded-[12px] border border-resistant/30 bg-resistant/5 px-4 py-3 font-sans text-[13px] text-resistant">
            {datasetStatsError}
          </div>
        )}
        {datasetStats && (
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-canvas-hairline py-4 font-mono text-[12px] text-page-muted">
            <span><span className="text-page-ink font-medium">{datasetStats.totalRows?.toLocaleString()}</span> records</span>
            <span className="text-canvas-hairline">·</span>
            <span><span className="text-page-ink font-medium">{datasetStats.antibioticTargets}</span> antibiotics tracked</span>
            <span className="text-canvas-hairline">·</span>
            <span>{datasetStats.dateRange?.start} → {datasetStats.dateRange?.end}</span>
            {datasetStats.wardTypeDistribution?.length > 0 && (
              <>
                <span className="text-canvas-hairline">·</span>
                <span><span className="text-page-ink font-medium">{datasetStats.wardTypeDistribution.length}</span> ward types</span>
              </>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[16px] border border-panel-border bg-panel p-3">
          <div>
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-onpanel-faint">Antibiotic</span>
            <NativeSelect value={antibiotic} onChange={setAntibiotic} options={antibioticOptions} />
          </div>
          <div>
            <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-onpanel-faint">Organism</span>
            <NativeSelect value={organism} onChange={setOrganism} options={organismOptions} />
          </div>
          {wardTypeOptions.length > 1 && (
            <div>
              <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-onpanel-faint">Ward</span>
              <NativeSelect value={wardType} onChange={setWardType} options={wardTypeOptions} />
            </div>
          )}
        </div>

        {/* Stat cards */}
        <ScrollReveal index={0}>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Current rate" value={stats ? `${stats.latest}%` : '—'} icon={Activity} tone={{ text: 'text-onpanel-ink', bg: 'bg-accent-blue/15' }} />
            <StatCard label="Peak rate" value={stats ? `${stats.peak}%` : '—'} icon={TrendingUp} tone={{ text: 'text-resistant', bg: 'bg-resistant/15' }} />
            <StatCard label="Change (period)" value={stats ? `${stats.delta > 0 ? '+' : ''}${stats.delta}%` : '—'} icon={TrendIcon} tone={{ text: trendColor, bg: 'bg-accent-teal/15' }} />
            <StatCard label="Data points" value={stats ? stats.points : '—'} icon={Calendar} tone={{ text: 'text-onpanel-ink', bg: 'bg-accent-indigo/15' }} />
          </div>
        </ScrollReveal>

        {/* Hero chart */}
        <ScrollReveal index={1}>
          <Panel className="mb-6 p-6 chart-on-dark" style={CHART_VARS}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                  Resistance rate over time
                </div>
                <div className="mt-0.5 font-display text-[18px] font-semibold text-onpanel-ink">
                  {antibiotic} {organism !== 'all' && `· ${organism}`}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 rounded-full border border-onpanel-faint/30 bg-panel-raised px-3 py-1.5 font-mono text-[11px] font-medium text-onpanel-ink transition-colors hover:border-accent-blue hover:text-accent-blue"
              >
                <Sparkles size={12} /> Explain Trend
              </button>
            </div>

            {loading ? (
              <TrendsSkeleton />
            ) : error ? (
              <div className="flex h-64 items-center justify-center font-sans text-[14px] text-onpanel-faint">{error}</div>
            ) : chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center font-sans text-[14px] text-onpanel-faint">
                No data available for this combination.
              </div>
            ) : (
              <AreaChart data={chartData} aspectRatio="16 / 6">
                <Grid horizontal />
                <Area dataKey="rate" stroke="#0071E3" fill="#0071E3" fillOpacity={0.15} strokeWidth={2} curve={curveLinear} />
                <XAxis />
                <ChartTooltip />
              </AreaChart>
            )}
          </Panel>
        </ScrollReveal>

        {/* Organism comparison overlay */}
        <ScrollReveal index={2}>
          <Panel className="mb-6 p-6 chart-on-dark" style={CHART_VARS}>
            <div className="mb-5">
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                Organism comparison
              </div>
              <div className="mt-0.5 font-display text-[18px] font-semibold text-onpanel-ink">
                {antibiotic} across top organisms
              </div>
            </div>

            {organismOverlayLoading || organismOverlay.length === 0 ? (
              <TrendsSkeleton />
            ) : (
              <ChartLegendHoverProvider hoveredIndex={hoveredOrganismIndex} onHoverChange={setHoveredOrganismIndex}>
                <LineChart data={organismOverlay} aspectRatio="16 / 5" animationDuration={0}>
                  <Grid horizontal />
                  {validOrganisms.map((org, i) => (
                    <Line key={org} dataKey={org} stroke={ORGANISM_LINE_COLORS[i]} strokeWidth={2} curve={curveLinear} fadeEdges={false} />
                  ))}
                  <XAxis />
                  <ChartTooltip />
                </LineChart>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {validOrganisms.map((org, i) => (
                    <div
                      key={org}
                      onMouseEnter={() => setHoveredOrganismIndex(i)}
                      onMouseLeave={() => setHoveredOrganismIndex(null)}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[11px] text-onpanel-muted transition-colors hover:bg-panel-raised"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ORGANISM_LINE_COLORS[i] }} />
                      {org}
                    </div>
                  ))}
                </div>
              </ChartLegendHoverProvider>
            )}
          </Panel>
        </ScrollReveal>

        {/* AWaRe tier comparison + Rising trend callout */}
        <ScrollReveal index={3}>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Panel className="p-5 lg:col-span-3">
              <div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                Avg resistance by WHO AWaRe tier
              </div>
              {overviewLoading ? (
                <div className="h-24 animate-pulse rounded-[10px] bg-panel-raised" />
              ) : (
                <div className="space-y-3">
                  {tierAverages.map((t) => (
                    <div key={t.tier}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className={`font-mono text-[12px] font-medium ${TIER_TONE[t.tier].text}`}>{t.tier}</span>
                        <span className="font-mono text-[12px] text-onpanel-muted">{t.avg}% · {t.count} antibiotics</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-panel-border">
                        <motion.div
                          className={`h-full rounded-full ${TIER_TONE[t.tier].bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${t.avg}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="p-5 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                <Flame size={13} className="text-resistant" /> Steepest rising trend
              </div>
              {overviewLoading || !risingTrend ? (
                <div className="h-24 animate-pulse rounded-[10px] bg-panel-raised" />
              ) : (
                <>
                  <div className="rounded-[12px] bg-resistant/10 p-3">
                    <div className="font-display text-[20px] font-semibold text-onpanel-ink">{risingTrend.top.code}</div>
                    <div className="mt-0.5 flex items-center gap-1 font-mono text-[12px] font-medium text-resistant">
                      <ArrowUp size={12} /> +{risingTrend.top.delta}% over period
                    </div>
                  </div>
                  {risingTrend.runnersUp.length > 0 && (
                    <div className="mt-3 space-y-1.5">
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
                </>
              )}
            </Panel>
          </div>
        </ScrollReveal>

        {/* Resistance landscape — all antibiotics at a glance */}
        <ScrollReveal index={4}>
          <Panel className="p-5">
            <div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
              Resistance landscape — all antibiotics
            </div>
            {overviewLoading ? (
              <div className="h-40 animate-pulse rounded-[10px] bg-panel-raised" />
            ) : (
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {[...overviewStats]
                  .sort((a, b) => b.latest - a.latest)
                  .map((s) => {
                    const tierDot =
                      s.aware === 'Reserve'
                        ? 'bg-onpanel-faint'
                        : s.aware === 'Watch'
                        ? 'bg-onpanel-muted'
                        : 'bg-accent-blue';
                    return (
                      <div
                        key={s.code}
                        className="flex items-center gap-3 border-b border-panel-border py-2.5 last:border-b-0"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${tierDot}`}
                          title={s.aware}
                        />
                        <span className="w-24 shrink-0 truncate font-mono text-[13px] font-medium text-onpanel-ink">
                          {s.code}
                        </span>
                        <div className="flex-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-border">
                            <div
                              className="h-full rounded-full bg-accent-blue transition-all duration-500"
                              style={{ width: `${Math.min(s.latest, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-12 shrink-0 text-right font-mono text-[13px] font-semibold text-onpanel-ink">
                          {s.latest}%
                        </span>
                        <span
                          className={`w-14 shrink-0 text-right font-mono text-[11px] font-medium ${
                            s.delta > 0
                              ? 'text-resistant'
                              : s.delta < 0
                              ? 'text-susceptible'
                              : 'text-onpanel-faint'
                          }`}
                        >
                          {s.delta > 0 ? '+' : ''}
                          {s.delta}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Panel>
        </ScrollReveal>

        <ScrollReveal index={5}>
          <div className="mt-6">
            <ResearchPapersPanel antibiotic={antibiotic} organism={organism} />
          </div>
        </ScrollReveal>

        <ExplainTrendDrawer
          antibiotic={antibiotic}
          organism={organism}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </div>
    </div>
  );
}

export default TrendsPage;