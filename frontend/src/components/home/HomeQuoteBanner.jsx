import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { ROTATING_QUOTES } from '../../constants/homeContent';
import dnaDoodle from '../../assets/images/dna-doodle.png';

const ROTATE_SECONDS = 10;

function HomeQuoteBanner() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % ROTATING_QUOTES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, ROTATE_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-canvas-hairline bg-canvas-alt px-6 py-6 sm:px-8">
      <img
        src={dnaDoodle}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-4 h-28 w-28 rotate-[18deg] opacity-40 sm:h-36 sm:w-36"
      />
      <Quote className="relative mt-0.5 h-5 w-5 shrink-0 text-accent-blue" strokeWidth={1.75} />
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative font-sans text-body-lg text-page-ink"
        >
          {ROTATING_QUOTES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default HomeQuoteBanner;
