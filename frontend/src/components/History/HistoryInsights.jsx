import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const HistoryInsights = ({ predictions }) => {
  const insights = useMemo(() => {
    if (!predictions || !predictions.length) return null;

    const total = predictions.length;
    const resistance = predictions.filter(p => p.result === 'R').length;
    const susceptible = predictions.filter(p => p.result === 'S').length;
    const intermediate = predictions.filter(p => p.result === 'I').length;

    const resistanceRate = Math.round((resistance / total) * 100);
    const susceptibilityRate = Math.round((susceptible / total) * 100);
    const intermediateRate = Math.round((intermediate / total) * 100);

    // Most common antibiotic
    const antibioticCount = {};
    predictions.forEach(p => {
      antibioticCount[p.antibiotic] = (antibioticCount[p.antibiotic] || 0) + 1;
    });
    const mostCommonAntibiotic = Object.keys(antibioticCount).reduce((a, b) => 
      antibioticCount[a] > antibioticCount[b] ? a : b
    );
    const mostCommonAntibioticPercentage = Math.round((antibioticCount[mostCommonAntibiotic] / total) * 100);

    // Recent trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recent = predictions.filter(p => new Date(p.date) >= sevenDaysAgo);
    const previous = predictions.filter(p => 
      new Date(p.date) >= fourteenDaysAgo && new Date(p.date) < sevenDaysAgo
    );

    const recentResistance = recent.filter(p => p.result === 'R').length;
    const previousResistance = previous.filter(p => p.result === 'R').length;
    const trendChange = previousResistance > 0 
      ? Math.round(((recentResistance - previousResistance) / previousResistance) * 100)
      : 0;

    return {
      total,
      resistance,
      susceptible,
      intermediate,
      resistanceRate,
      susceptibilityRate,
      intermediateRate,
      mostCommonAntibiotic,
      mostCommonAntibioticPercentage,
      recentResistance,
      previousResistance,
      trendChange,
      recentCount: recent.length,
    };
  }, [predictions]);

  if (!insights) return null;

  // ✅ CORRECT ICONS:
  // Most Common Outcome → Donut/Pie segment glyph
  const PieIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v9l6.5 3.25" />
    </svg>
  );

  // Most Frequent Antibiotic → Capsule/Pill glyph (same as timeline rows)
  const CapsuleIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 11h6" />
    </svg>
  );

  // Resistance Trend → Sparkline/Zigzag glyph
  const TrendIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-4 3 3 5-5 4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 8v4h-4" />
    </svg>
  );

  // Get trend arrow and color
  const getTrendArrow = () => {
    if (insights.trendChange === 0 || !insights.trendChange) {
      return { arrow: '→', color: 'text-ink-muted' };
    }
    if (insights.trendChange > 0) {
      return { arrow: '↑', color: 'text-resistant' };
    }
    return { arrow: '↓', color: 'text-success' };
  };

  const trend = getTrendArrow();

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: i * 0.05,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const barVariants = {
    hidden: { width: 0 },
    visible: (width) => ({
      width: `${width}%`,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.2,
      },
    }),
  };

  return (
    <div className="mt-8 pt-6 border-t border-hairline">
      <h3 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-4">
        Quick Insights
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Most Common Outcome */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-soft/40 group"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Most Common Outcome
            </span>
            {/* ✅ Circle: hairline/25 bg, hairline border, 36px */}
            <div className="w-9 h-9 rounded-full border border-hairline bg-hairline/25 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
              <PieIcon />
            </div>
          </div>
          
          <div className="mt-3">
            <span className="font-serif text-xl sm:text-2xl font-medium text-ink">
              {insights.resistanceRate > 40 ? 'Resistant' : 
               insights.susceptibilityRate > 40 ? 'Susceptible' : 'Intermediate'}
            </span>
          </div>
          
          <div className="mt-1 font-sans text-sm text-ink-muted">
            {insights.resistanceRate}% R · {insights.susceptibilityRate}% S · {insights.intermediateRate}% I
          </div>
          
          {/* ✅ Bar: h-1, 65% opacity, no gaps */}
          <div className="mt-2.5 w-full h-1 rounded-full overflow-hidden bg-hairline/30">
            <div className="flex h-full w-full">
              <motion.div
                custom={insights.resistanceRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-resistant/65"
                style={{ width: `${insights.resistanceRate}%` }}
                aria-hidden="true"
              />
              <motion.div
                custom={insights.intermediateRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-intermediate/65"
                style={{ width: `${insights.intermediateRate}%` }}
                aria-hidden="true"
              />
              <motion.div
                custom={insights.susceptibilityRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-susceptible/65"
                style={{ width: `${insights.susceptibilityRate}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </motion.div>

        {/* Card 2: Most Frequent Antibiotic */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-soft/40 group"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Most Frequent Antibiotic
            </span>
            {/* ✅ Circle: hairline/25 bg, hairline border, 36px */}
            <div className="w-9 h-9 rounded-full border border-hairline bg-hairline/25 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
              <CapsuleIcon />
            </div>
          </div>
          
          <div className="mt-3">
            <span className="font-serif text-xl sm:text-2xl font-medium text-ink">
              {insights.mostCommonAntibiotic}
            </span>
          </div>
          
          <div className="mt-1 font-sans text-sm text-ink-muted">
            Used in {insights.mostCommonAntibioticPercentage}% of predictions
          </div>
        </motion.div>

        {/* Card 3: Resistance Trend */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-soft/40 group"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Resistance Trend
            </span>
            {/* ✅ Circle: hairline/25 bg, hairline border, 36px */}
            <div className="w-9 h-9 rounded-full border border-hairline bg-hairline/25 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
              <TrendIcon />
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`font-serif text-xl sm:text-2xl font-medium ${trend.color}`}>
              {trend.arrow}
            </span>
            <span className="font-serif text-xl sm:text-2xl font-medium text-ink">
              {Math.abs(insights.trendChange)}%
            </span>
          </div>
          
          <div className="mt-1 font-sans text-sm text-ink-muted">
            {insights.recentCount} predictions this week
          </div>
          
          {/* ✅ NO BAR - Removed the duplicated 3-segment bar */}
        </motion.div>
      </div>
    </div>
  );
};

export default HistoryInsights;