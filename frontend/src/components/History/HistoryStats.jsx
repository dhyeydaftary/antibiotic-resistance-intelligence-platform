import React, { useEffect, useState } from 'react';

const HistoryStats = ({ stats }) => {
  const [counts, setCounts] = useState({
    total: 0,
    thisWeek: 0,
    avgResistance: 0
  });

  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      setCounts({
        total: Math.round(stats.total * ease),
        thisWeek: Math.round(stats.thisWeek * ease),
        avgResistance: Math.round(stats.avgResistance * ease)
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [stats.total, stats.thisWeek, stats.avgResistance]);

  // ✅ CORRECT ICONS:
  // Total Predictions → Flask/Beaker glyph
  const FlaskIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9.5M10 4l.5 9.5M14 4l-.5 9.5M12 20c-1.5 0-3-.5-3-2.5V4h6v13.5c0 2-1.5 2.5-3 2.5z" />
    </svg>
  );

  // This Week → Calendar glyph
  const CalendarIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  // Avg Resistance → Gauge/Percentage arc glyph
  const GaugeIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v4m0 4v4m8-6h-4M8 12H4m12 6.36l-2.83-2.83M8.83 17.53l-2.83 2.83M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v2h2" />
    </svg>
  );

  // Last Prediction → Clock glyph
  const ClockIcon = () => (
    <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  // ✅ 4 CARDS - "Most Frequent" REMOVED
  const statCards = [
    {
      label: 'Total Predictions',
      value: counts.total,
      trend: '+8%',
      trendUp: true,
      isNeutralTrend: true, // Volume metric - neutral, no color
      icon: FlaskIcon,
    },
    {
      label: 'This Week',
      value: counts.thisWeek,
      trend: '+3',
      trendUp: true,
      isNeutralTrend: true, // Volume metric - neutral, no color
      icon: CalendarIcon,
    },
    {
      label: 'Avg Resistance',
      value: `${counts.avgResistance}%`,
      trend: '+2%',
      trendUp: true,
      isNeutralTrend: false, // Directional metric - color matters
      icon: GaugeIcon,
    },
    {
      label: 'Last Prediction',
      value: stats.lastPrediction || 'No predictions yet',
      icon: ClockIcon,
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {statCards.map((card, index) => {
        const IconComponent = card.icon;
        const hasTrend = card.trend !== undefined;
        
        // ✅ Trend color logic:
        // - Neutral metrics (volume): ink-muted always
        // - Directional metrics (resistance): resistant if going up, success if going down
        let trendColor = 'text-ink-muted';
        let arrowSymbol = '↑';
        
        if (hasTrend) {
          // Determine direction
          const isUp = card.trendUp !== undefined ? card.trendUp : true;
          arrowSymbol = isUp ? '↑' : '↓';
          
          if (card.isNeutralTrend) {
            // Volume metrics: always muted
            trendColor = 'text-ink-muted';
          } else {
            // Directional metrics: color based on direction
            if (isUp) {
              trendColor = 'text-resistant';
            } else {
              trendColor = 'text-success';
            }
          }
        }

        return (
          <div
            key={index}
            className="bg-paper border border-hairline rounded-lg px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-soft/40 group"
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
                {card.label}
              </span>
              {/* ✅ Circle: hairline/25 bg, hairline border, 36px */}
              <div className="w-9 h-9 rounded-full border border-hairline bg-hairline/25 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                <IconComponent />
              </div>
            </div>
            
            <div className="mt-3">
              <span className="font-serif text-xl sm:text-2xl font-medium text-ink">
                {card.value}
              </span>
            </div>
            
            {hasTrend && (
              <div className="mt-1 flex items-center gap-1">
                <span className={`text-xs font-mono tracking-wider ${trendColor}`}>
                  {arrowSymbol} {card.trend}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryStats;