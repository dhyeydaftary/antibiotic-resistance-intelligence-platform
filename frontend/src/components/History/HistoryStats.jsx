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

  // Icon components with line-art style
  const FlaskIcon = () => (
    <svg className="w-5 h-5 text-ink/30 group-hover:text-ink/50 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9.5M10 4l.5 9.5M14 4l-.5 9.5M12 20c-1.5 0-3-.5-3-2.5V4h6v13.5c0 2-1.5 2.5-3 2.5z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-5 h-5 text-ink/30 group-hover:text-ink/50 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const GaugeIcon = () => (
    <svg className="w-5 h-5 text-ink/30 group-hover:text-ink/50 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v4m-4-2h8" />
    </svg>
  );

  const CapsuleIcon = () => (
    <svg className="w-5 h-5 text-ink/30 group-hover:text-ink/50 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a2 2 0 01-2 2H7a2 2 0 01-2-2m14 0v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 11h6" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-5 h-5 text-ink/30 group-hover:text-ink/50 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const statCards = [
    {
      label: 'Total Predictions',
      value: counts.total,
      trend: '+8%',
      trendUp: true,
      icon: FlaskIcon,
    },
    {
      label: 'This Week',
      value: counts.thisWeek,
      trend: '+3',
      trendUp: true,
      icon: CalendarIcon,
    },
    {
      label: 'Avg Resistance',
      value: `${counts.avgResistance}%`,
      trend: '+2%',
      trendUp: false,
      icon: GaugeIcon,
    },
    {
      label: 'Most Frequent',
      value: stats.mostFrequentAntibiotic || '—',
      icon: CapsuleIcon,
    },
    {
      label: 'Last Prediction',
      value: stats.lastPrediction || 'No predictions yet',
      icon: ClockIcon,
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
      {statCards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div
            key={index}
            className="bg-paper border border-hairline rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 transition-all duration-200 hover:border-ink-soft group"
          >
            <div className="flex items-start gap-3">
              {/* 🔵 Circular Icon Badge */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-full border border-hairline bg-ink/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 group-hover:border-ink-faint">
                  <IconComponent />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] tracking-wider uppercase text-ink-faint group-hover:text-ink-muted transition-colors duration-200">
                  {card.label}
                </p>
                <p className="font-serif text-xl sm:text-2xl font-medium text-ink mt-0.5 truncate">
                  {card.value}
                </p>
                {card.trend && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[10px] font-mono tracking-wider ${card.trendUp ? 'text-success' : 'text-destructive'}`}>
                      {card.trend}
                    </span>
                    <svg 
                      className={`w-2.5 h-2.5 ${card.trendUp ? 'text-success' : 'text-destructive'}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.trendUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HistoryStats;