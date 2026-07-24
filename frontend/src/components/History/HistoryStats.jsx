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

  const statCards = [
    {
      label: 'Total Predictions',
      value: counts.total,
      trend: '+8%',
      trendUp: true,
      icon: (
        <svg className="w-5 h-5 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      )
    },
    {
      label: 'This Week',
      value: counts.thisWeek,
      trend: '+3',
      trendUp: true,
      icon: (
        <svg className="w-5 h-5 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Avg Resistance',
      value: `${counts.avgResistance}%`,
      trend: '+2%',
      trendUp: false,
      icon: (
        <svg className="w-5 h-5 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      label: 'Last Prediction',
      value: stats.lastPrediction || 'No predictions yet',
      icon: (
        <svg className="w-5 h-5 text-ink/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {statCards.map((card, index) => (
        <div
          key={index}
          className="bg-paper border border-ink/10 rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 transition-all duration-200 hover:border-ink/20 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] tracking-wider uppercase text-ink/30 group-hover:text-ink/50 transition-colors duration-200">
                {card.label}
              </p>
              <p className="font-serif text-xl sm:text-2xl font-medium text-ink mt-1 truncate">
                {card.value}
              </p>
              {card.trend && (
                <div className="flex items-center gap-1 mt-1">
                  <span className={`text-[10px] font-mono tracking-wider ${card.trendUp ? 'text-emerald-500' : 'text-ink/30'}`}>
                    {card.trend}
                  </span>
                  <svg 
                    className={`w-2.5 h-2.5 ${card.trendUp ? 'text-emerald-500' : 'text-ink/20'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.trendUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-2 flex-shrink-0 mt-0.5 text-ink/20 group-hover:text-ink/30 transition-colors duration-200">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryStats;