import React, { useMemo } from 'react';

const HistoryInsights = ({ predictions }) => {
  const insights = useMemo(() => {
    if (!predictions.length) return null;

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
      recentResistance,
      previousResistance,
      trendChange,
      recentCount: recent.length
    };
  }, [predictions]);

  if (!insights) return null;

  return (
    <div className="mt-8 pt-6 border-t border-hairline animate-fadeInUp" style={{ animationDelay: '300ms' }}>
      <h3 className="font-mono text-[10px] tracking-wider uppercase text-ink-faint mb-4">
        Quick Insights
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Most Common Outcome */}
        <div className="bg-paper border border-hairline rounded-xl px-4 py-3.5 transition-all duration-200 hover:border-ink-soft">
          <p className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
            Most Common Outcome
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`font-serif text-2xl font-medium ${
              insights.resistanceRate > 40 ? 'text-resistant' : 
              insights.susceptibilityRate > 40 ? 'text-susceptible' : 'text-intermediate'
            }`}>
              {insights.resistanceRate > 40 ? 'Resistant' : 
               insights.susceptibilityRate > 40 ? 'Susceptible' : 'Intermediate'}
            </span>
            <span className="font-sans text-sm text-ink-muted">
              ({insights.resistanceRate}% R, {insights.susceptibilityRate}% S, {insights.intermediateRate}% I)
            </span>
          </div>
        </div>

        {/* Most Frequent Antibiotic */}
        <div className="bg-paper border border-hairline rounded-xl px-4 py-3.5 transition-all duration-200 hover:border-ink-soft">
          <p className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
            Most Frequent Antibiotic
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="font-serif text-2xl font-medium text-ink">
              {insights.mostCommonAntibiotic}
            </span>
            <span className="font-sans text-sm text-ink-muted">
              ({Math.round((predictions.filter(p => p.antibiotic === insights.mostCommonAntibiotic).length / predictions.length) * 100)}% of predictions)
            </span>
          </div>
        </div>

        {/* Resistance Trend */}
        <div className="bg-paper border border-hairline rounded-xl px-4 py-3.5 transition-all duration-200 hover:border-ink-soft">
          <p className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
            Resistance Trend
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`font-serif text-2xl font-medium ${
              insights.trendChange > 5 ? 'text-resistant' : 
              insights.trendChange < -5 ? 'text-susceptible' : 'text-intermediate'
            }`}>
              {insights.trendChange > 0 ? '↑' : insights.trendChange < 0 ? '↓' : '→'} {Math.abs(insights.trendChange)}%
            </span>
            <span className="font-sans text-sm text-ink-muted">
              {insights.recentCount} predictions this week
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-hairline rounded-full overflow-hidden">
            <div className="h-full bg-resistant rounded-full transition-all duration-700" style={{ width: `${Math.min(insights.resistanceRate, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryInsights;