import React, { useEffect, useState } from 'react';
import { FlaskConical, CalendarDays, Gauge, Clock } from 'lucide-react';
import Panel from '../app/Panel';

// The 4-tile stat row at the top of HistoryPage — total/this-week/avg-
// resistance/last-prediction, each with its own ease-out count-up animation.
const HistoryStats = ({ stats }) => {
  const [counts, setCounts] = useState({ total: 0, thisWeek: 0, avgResistance: 0 });

  // Animates each stat from 0 to its target value on mount/stats change
  // (same easing curve as hooks/useCountUp.js, inlined here rather than reused).
  useEffect(() => {
    const duration = 700;
    const start = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCounts({
        total: Math.round(stats.total * ease),
        thisWeek: Math.round(stats.thisWeek * ease),
        avgResistance: Math.round(stats.avgResistance * ease),
      });
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [stats.total, stats.thisWeek, stats.avgResistance]);

  const cards = [
    { label: 'Total predictions', value: counts.total, icon: FlaskConical },
    { label: 'This week', value: counts.thisWeek, icon: CalendarDays },
    { label: 'Avg resistance', value: `${counts.avgResistance}%`, icon: Gauge },
    { label: 'Last prediction', value: stats.lastPrediction || '—', icon: Clock },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Panel key={card.label} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-onpanel-faint">{card.label}</p>
                <p className="mt-1 font-display text-[24px] font-semibold text-onpanel-ink sm:text-[28px]">{card.value}</p>
              </div>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-teal/15">
                <Icon size={14} className="text-accent-teal" />
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
};

export default HistoryStats;