// frontend/src/components/explore/AnimatedStat.jsx

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function AnimatedStat({ icon: Icon, label, value, hint, pulse = false }) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulse) {
      const interval = setInterval(() => {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 1000);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [pulse]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex-1 px-5 py-4 first:pl-0 last:pr-0"
    >
      <div className="mb-2 flex items-center gap-1.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {label}
      </div>
      <motion.p
        className={`font-display text-h2 text-onpanel-ink ${pulse ? 'relative' : ''}`}
        animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {value}
        {pulse && (
          <span className="absolute -right-4 top-0 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-blue opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-blue" />
          </span>
        )}
      </motion.p>
      {hint && <p className="mt-0.5 font-sans text-caption text-onpanel-muted">{hint}</p>}
    </motion.div>
  );
}

export default AnimatedStat;