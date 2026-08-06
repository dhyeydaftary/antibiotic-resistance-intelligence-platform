import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import MagneticButton from './MagneticButton';
import { RadarChart } from '../charts/radar-chart';
import { RadarGrid } from '../charts/radar-grid';
import { RadarAxis } from '../charts/radar-axis';
import { RadarLabels } from '../charts/radar-labels';
import { RadarArea } from '../charts/radar-area';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Real data, not decorative -- resistance rate for all 15 antibiotics
// against Klebsiella pneumoniae specifically (n=702, a real dataset
// subset, not synthetic-only), computed as R / total per antibiotic
// column filtered to that organism. K. pneumoniae chosen because it's
// already this app's recurring real example elsewhere (the mock lab
// report used throughout onboarding/demo flows). Re-derive by filtering
// the dataset to Organism == 'Klebsiella pneumoniae' and repeating the
// same (col == 'R').sum() / len(col) computation per antibiotic column.
const KP_METRICS = [
  { key: 'ctxCro', label: 'CTX/CRO' },
  { key: 'amxAmp', label: 'AMX/AMP' },
  { key: 'fox', label: 'FOX' },
  { key: 'amc', label: 'AMC' },
  { key: 'ipm', label: 'IPM' },
  { key: 'cz', label: 'CZ' },
  { key: 'an', label: 'AN' },
  { key: 'gen', label: 'GEN' },
  { key: 'cip', label: 'CIP' },
  { key: 'c', label: 'C' },
  { key: 'furanes', label: 'Furanes' },
  { key: 'ofx', label: 'ofx' },
  { key: 'cotrim', label: 'Co-trim.' },
  { key: 'colistine', label: 'colistine' },
  { key: 'acideNalid', label: 'Acide nalid.' },
];

const KP_RADAR_DATA = [
  {
    label: 'Klebsiella pneumoniae',
    color: '#0071E3',
    values: {
      ctxCro: 59.7, amxAmp: 57.4, fox: 56.8, amc: 56.7, ipm: 55.6, cz: 54.6,
      an: 29.1, gen: 28.8, cip: 7.8, c: 7.0, furanes: 6.6, ofx: 6.1,
      cotrim: 5.1, colistine: 4.8, acideNalid: 4.6,
    },
  },
];

// Radar-chart preview of real Klebsiella pneumoniae resistance rates
// across all 15 antibiotics (see KP_RADAR_DATA comment for provenance).
function PreviewCard() {
  return (
    <motion.div
      custom={3}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="mx-auto mt-16 w-full max-w-4xl rounded-[24px] border border-panel-border bg-panel p-8 shadow-panel-lg sm:p-10"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
          <Activity size={13} className="text-accent-blue" /> Resistance profile &middot; Klebsiella pneumoniae, all 15 antibiotics
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-resistant/40" />
          <span className="h-2 w-2 rounded-full bg-intermediate/40" />
          <span className="h-2 w-2 rounded-full bg-susceptible/40" />
        </div>
      </div>
      <div className="mx-auto aspect-square w-full max-w-[560px] py-2">
        <RadarChart data={KP_RADAR_DATA} metrics={KP_METRICS} margin={64} className="h-full w-full">
          <RadarGrid />
          <RadarAxis />
          <RadarLabels fontSize={10} />
          {KP_RADAR_DATA.map((item, index) => (
            <RadarArea key={item.label} index={index} />
          ))}
        </RadarChart>
      </div>
    </motion.div>
  );
}

// Landing page's above-the-fold section: headline, CTAs, and the real-data radar preview.
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