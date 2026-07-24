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

  const FlaskIcon = () => (
    <svg className="w-5 h-5 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9.5M10 4l.5 9.5M14 4l-.5 9.5M12 20c-1.5 0-3-.5-3-2.5V4h6v13.5c0 2-1.5 2.5-3 2.5z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-5 h-5 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const GaugeIcon = () => (
    <svg className="w-5 h-5 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v4m0 4v4m8-6h-4M8 12H4m12 6.36l-2.83-2.83M8.83 17.53l-2.83 2.83M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v2h2" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-5 h-5 text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const statCards = [
    {
      label: 'Total Predictions',
      value: counts.total,
      trend: '+8%',
      icon: FlaskIcon,
    },
    {
      label: 'This Week',
      value: counts.thisWeek,
      trend: '+3',
      icon: CalendarIcon,
    },
    {
      label: 'Avg Resistance',
      value: `${counts.avgResistance}%`,
      trend: '+2%',
      icon: GaugeIcon,
    },
    {
      label: 'Last Prediction',
      value: stats.lastPrediction || '—',
      icon: ClockIcon,
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div
            key={index}
            className="bg-paper border border-hairline rounded-xl px-4 py-4 transition-all duration-200 hover:border-ink/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-mono text-[10px] tracking-wider uppercase text-ink-faint">
                  {card.label}
                </p>
                <p className="font-serif text-2xl sm:text-3xl font-light text-ink mt-1">
                  {card.value}
                </p>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-[10px] text-ink-muted">
                      ↑ {card.trend}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      vs last week
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1">
                <IconComponent />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryStats;