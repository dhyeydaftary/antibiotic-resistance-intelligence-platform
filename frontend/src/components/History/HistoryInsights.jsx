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

    const antibioticCount = {};
    predictions.forEach(p => {
      antibioticCount[p.antibiotic] = (antibioticCount[p.antibiotic] || 0) + 1;
    });
    const mostCommonAntibiotic = Object.keys(antibioticCount).reduce((a, b) => 
      antibioticCount[a] > antibioticCount[b] ? a : b
    );
    const mostCommonAntibioticPercentage = Math.round((antibioticCount[mostCommonAntibiotic] / total) * 100);

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
      resistanceRate,
      susceptibilityRate,
      intermediateRate,
      mostCommonAntibiotic,
      mostCommonAntibioticPercentage,
      trendChange,
      recentCount: recent.length,
    };
  }, [predictions]);

  if (!insights) return null;

  const cardVariants = {
    hidden: { opacity: 0, y: 8 },
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
        {/* Most Common Outcome */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Most Common Outcome
            </span>
          </div>
          
          <div className="mt-2">
            <span className="font-serif text-xl sm:text-2xl font-light text-ink">
              {insights.resistanceRate > 40 ? 'Resistant' : 
               insights.susceptibilityRate > 40 ? 'Susceptible' : 'Intermediate'}
            </span>
          </div>
          
          <div className="mt-1 font-mono text-[11px] text-ink-soft">
            {insights.resistanceRate}% R · {insights.susceptibilityRate}% S · {insights.intermediateRate}% I
          </div>
          
          <div className="mt-2.5 w-full h-1 rounded-full overflow-hidden bg-hairline/30">
            <div className="flex h-full w-full">
              <motion.div
                custom={insights.resistanceRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-destructive/70"
                style={{ width: `${insights.resistanceRate}%` }}
                aria-hidden="true"
              />
              <motion.div
                custom={insights.intermediateRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-intermediate/70"
                style={{ width: `${insights.intermediateRate}%` }}
                aria-hidden="true"
              />
              <motion.div
                custom={insights.susceptibilityRate}
                variants={barVariants}
                initial="hidden"
                animate="visible"
                className="h-full bg-teal/70"
                style={{ width: `${insights.susceptibilityRate}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        </motion.div>

        {/* Most Frequent Antibiotic */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Most Frequent Antibiotic
            </span>
          </div>
          
          <div className="mt-2">
            <span className="font-serif text-xl sm:text-2xl font-light text-ink">
              {insights.mostCommonAntibiotic}
            </span>
          </div>
          
          <div className="mt-1 font-mono text-[11px] text-ink-soft">
            {insights.mostCommonAntibioticPercentage}% of predictions
          </div>
        </motion.div>

        {/* Resistance Trend */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-paper border border-hairline rounded-lg px-5 py-4"
        >
          <div className="flex items-start justify-between">
            <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
              Resistance Trend
            </span>
          </div>
          
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`font-serif text-xl sm:text-2xl font-light ${
              insights.trendChange > 0 ? 'text-destructive' : 
              insights.trendChange < 0 ? 'text-success' : 'text-ink'
            }`}>
              {insights.trendChange > 0 ? '↑' : insights.trendChange < 0 ? '↓' : '→'}
            </span>
            <span className="font-serif text-xl sm:text-2xl font-light text-ink">
              {Math.abs(insights.trendChange)}%
            </span>
          </div>
          
          <div className="mt-1 font-mono text-[11px] text-ink-soft">
            {insights.recentCount} predictions this week
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HistoryInsights;