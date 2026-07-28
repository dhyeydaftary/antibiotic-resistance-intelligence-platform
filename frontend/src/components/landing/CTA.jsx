import { motion } from 'framer-motion';
import MagneticButton from './MagneticButton';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function CTA() {
  return (
    <section id="cta" data-testid="cta-section" className="bg-canvas-alt px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={0}
          variants={fadeUp}
          className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[52px]"
        >
          Explore one case.
          <br />
          Understand fifteen predictions.
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={1}
          variants={fadeUp}
          className="mx-auto mt-5 max-w-lg font-sans text-[16px] leading-[1.65] text-page-muted"
        >
          AMR-Insight is free for students and academic researchers. Sign in, run a
          prediction, and browse the underlying dataset — no clinical claims, no
          hospital paperwork.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={2}
          variants={fadeUp}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton testId="cta-try-prediction" variant="primary" to="/predict">
            Try a prediction
          </MagneticButton>
          <MagneticButton testId="cta-explore-research" variant="ghost" to="/about">
            Explore the research
          </MagneticButton>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={3}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-page-faint"
        >
          <span>Free for research</span>
          <span className="text-canvas-hairline">·</span>
          <span>No PHI required</span>
          <span className="text-canvas-hairline">·</span>
          <span>10,710-record dataset</span>
        </motion.div>
      </div>
    </section>
  );
}