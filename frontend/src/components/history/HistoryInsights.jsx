import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FlaskConical, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Panel from '../app/Panel';

// Three-card "quick insights" strip above the history list: overall R/S/I
// mix, most-frequent antibiotic, and week-over-week resistance trend.
// Precomputed server-side now (gateway/routes/prediction.js's GET
// /history/aggregates, via a single $facet pipeline over the user's
// ENTIRE history) — this component just renders whatever HistoryPage.jsx
// hands it, it doesn't compute anything itself. Expects:
// { resistanceRate, susceptibilityRate, intermediateRate,
//   mostCommonAntibiotic, mostCommonAntibioticPct, trendChange, recentCount }.
const HistoryInsights = ({ insights }) => {
  if (!insights) return null;

  const outcomeLabel = insights.resistanceRate > 40 ? 'Resistant' : insights.susceptibilityRate > 40 ? 'Susceptible' : 'Intermediate';
  const TrendIcon = insights.trendChange > 0 ? TrendingUp : insights.trendChange < 0 ? TrendingDown : Minus;
  const trendColor = insights.trendChange > 0 ? 'text-resistant' : insights.trendChange < 0 ? 'text-susceptible' : 'text-onpanel-muted';

  const cardVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.05 } }),
  };

  return (
    <Panel className="mb-6 border-accent-indigo/25 p-5">
      <div className="mb-4 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent-indigo">
        <Sparkles size={13} /> Quick insights
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants} className="rounded-[14px] bg-panel-raised p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">Most common outcome</div>
          <div className="mt-1 font-display text-[22px] font-semibold text-onpanel-ink">{outcomeLabel}</div>
          <div className="mt-1 font-mono text-[11px] text-onpanel-muted">
            {insights.resistanceRate}% R · {insights.susceptibilityRate}% S · {insights.intermediateRate}% I
          </div>
          <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-panel-border">
            <div className="h-full bg-resistant" style={{ width: `${insights.resistanceRate}%` }} />
            <div className="h-full bg-intermediate" style={{ width: `${insights.intermediateRate}%` }} />
            <div className="h-full bg-susceptible" style={{ width: `${insights.susceptibilityRate}%` }} />
          </div>
        </motion.div>

        <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants} className="rounded-[14px] bg-panel-raised p-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">
            <FlaskConical size={11} /> Most frequent antibiotic
          </div>
          <div className="mt-1 truncate font-display text-[22px] font-semibold text-onpanel-ink">{insights.mostCommonAntibiotic}</div>
          <div className="mt-1 font-mono text-[11px] text-onpanel-muted">{insights.mostCommonAntibioticPct}% of predictions</div>
        </motion.div>

        <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants} className="rounded-[14px] bg-panel-raised p-4">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">
            <TrendIcon size={11} /> Resistance trend
          </div>
          <div className={`mt-1 font-display text-[22px] font-semibold ${trendColor}`}>{Math.abs(insights.trendChange)}%</div>
          <div className="mt-1 font-mono text-[11px] text-onpanel-muted">{insights.recentCount} predictions this week</div>
        </motion.div>
      </div>
    </Panel>
  );
};

export default HistoryInsights;