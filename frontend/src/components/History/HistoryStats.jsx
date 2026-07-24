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

  // 14px line icons - no circle background
  const FlaskIcon = () => (
    <svg className="w-[14px] h-[14px] text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 9.5M10 4l.5 9.5M14 4l-.5 9.5M12 20c-1.5 0-3-.5-3-2.5V4h6v13.5c0 2-1.5 2.5-3 2.5z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="w-[14px] h-[14px] text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const GaugeIcon = () => (
    <svg className="w-[14px] h-[14px] text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2v4m0 4v4m8-6h-4M8 12H4m12 6.36l-2.83-2.83M8.83 17.53l-2.83 2.83M18 12a6 6 0 11-12 0 6 6 0 0112 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v2h2" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-[14px] h-[14px] text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const statItems = [
    {
      label: 'Total Predictions',
      value: counts.total,
      delta: '+8%',
      icon: FlaskIcon,
    },
    {
      label: 'This Week',
      value: counts.thisWeek,
      delta: '+3',
      icon: CalendarIcon,
    },
    {
      label: 'Avg Resistance',
      value: `${counts.avgResistance}%`,
      delta: '+2%',
      icon: GaugeIcon,
    },
    {
      label: 'Last Prediction',
      value: stats.lastPrediction || 'No predictions yet',
      icon: ClockIcon,
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6 py-6 border-b border-hairline mb-8">
      {statItems.map((item, index) => {
        const IconComponent = item.icon;
        const hasDelta = item.delta !== undefined;

        return (
          <div key={index} className="relative">
            {/* Vertical divider between columns (except last) */}
            {index > 0 && (
              <div className="hidden sm:block absolute -left-3 top-0 bottom-0 w-px bg-hairline" />
            )}
            
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-faint">
                  {item.label}
                </span>
                <div className="mt-2 font-serif text-[48px] font-light text-ink leading-none tabular-nums">
                  {item.value}
                </div>
                {hasDelta && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="font-mono text-xs text-ink-soft">
                      ↑ {item.delta}
                    </span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      vs last week
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1 flex-shrink-0">
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