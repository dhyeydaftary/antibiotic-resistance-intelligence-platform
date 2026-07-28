import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import MagneticButton from './MagneticButton';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Purely decorative preview — abstract shape, not a claim about real data.
// Real, verifiable numbers live in the stat strip below the CTAs instead.
function PreviewCard() {
  const bars = [38, 52, 44, 61, 49, 58, 67];
  return (
    <motion.div
      custom={3}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="mx-auto mt-16 w-full max-w-3xl rounded-[24px] border border-panel-border bg-panel p-8 shadow-panel-lg sm:p-10"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
          <Activity size={13} className="text-accent-blue" /> Resistance intelligence
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-resistant/40" />
          <span className="h-2 w-2 rounded-full bg-intermediate/40" />
          <span className="h-2 w-2 rounded-full bg-susceptible/40" />
        </div>
      </div>
      <div className="flex h-40 items-end gap-2.5 sm:h-48">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ duration: 0.8, delay: 0.4 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 rounded-t-[6px] bg-gradient-to-t from-accent-blue/40 to-accent-blue"
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-6 pb-20 pt-32">
      <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="h-px w-6 bg-canvas-hairline" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
            Evidence before confidence.
          </span>
          <span className="h-px w-6 bg-canvas-hairline" />
        </div>
      </motion.div>

      <motion.h1
        custom={1}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="max-w-4xl text-center font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-page-ink sm:text-[64px] lg:text-[80px]"
      >
        One organism.
        <br />
        <span className="text-accent-blue">Fifteen predicted susceptibilities.</span>
      </motion.h1>

      <motion.p
        custom={2}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-6 max-w-xl text-center font-sans text-[17px] leading-[1.6] text-page-muted sm:text-[19px]"
      >
        Enter the organism and patient context. Fifteen independent CatBoost models
        estimate susceptibility across the antibiotic panel — with SHAP explainability
        and WHO AWaRe context — while lab-based testing is still running.
      </motion.p>

      <motion.div
        custom={2.5}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-9 flex flex-wrap items-center justify-center gap-4"
      >
        <MagneticButton testId="hero-try-prediction" variant="primary" to="/predict">
          Try a prediction
        </MagneticButton>
        <MagneticButton testId="hero-explore-research" variant="ghost" to="/about">
          Explore the research
        </MagneticButton>
      </motion.div>

      <motion.div
        custom={3}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[12px] text-page-faint"
      >
        <span><span className="font-medium text-page-ink">10,710</span> records</span>
        <span className="text-canvas-hairline">·</span>
        <span><span className="font-medium text-page-ink">15</span> antibiotics tracked</span>
        <span className="text-canvas-hairline">·</span>
        <span>WHO AWaRe aligned</span>
      </motion.div>

      <PreviewCard />
    </section>
  );
}