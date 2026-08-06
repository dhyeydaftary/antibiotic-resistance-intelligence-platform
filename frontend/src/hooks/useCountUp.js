// Ease-out count-up animation hook, used for stat tiles (history counts,
// dataset totals) so numbers animate in rather than snapping to value.
import { useEffect, useState } from 'react';

/**
 * Animates a number counting up from 0 to `target` whenever `target` changes.
 * Same easing curve already used in components/History/HistoryStats.jsx.
 */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const numericTarget = Number(target) || 0;
    const startTime = Date.now();

    let frame;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(numericTarget * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
