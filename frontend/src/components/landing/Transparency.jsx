import { motion } from 'framer-motion';
import { Database, ShieldCheck, BookOpen, AlertTriangle, ExternalLink } from 'lucide-react';

// Only real, verifiable sources — no fabricated live integrations.
// URLs verified: WHO's actual live AWaRe classification tool (not a static
// PDF), the real Kaggle dataset this platform is trained on, and PubMed
// itself, since the platform's literature search queries it live.
const DATA_SOURCES = [
  {
    icon: Database,
    title: 'Kaggle AMR Dataset',
    body: '10,710 antimicrobial susceptibility records, 2020–2025. A static public research dataset — not a live hospital feed.',
    href: 'https://www.kaggle.com/datasets/adilimadeddinehosni/multi-resistance-antibiotic-susceptibility',
  },
  {
    icon: ShieldCheck,
    title: 'WHO AWaRe Framework',
    body: 'The Access / Watch / Reserve classification standard we apply to every antibiotic — a framework, not a live data source.',
    href: 'https://aware.essentialmeds.org/groups',
  },
  {
    icon: BookOpen,
    title: 'PubMed Literature Search',
    body: 'Real-time search via the NCBI E-utilities API, surfacing peer-reviewed papers relevant to your antibiotic and organism selection.',
    href: 'https://pubmed.ncbi.nlm.nih.gov/',
  },
];

const SPECS = [
  { k: 'Records', v: '10,710' },
  { k: 'Time range', v: '2020 – 2025' },
  { k: 'Antibiotics modeled', v: '15' },
  { k: 'Model family', v: 'CatBoost (independent model per antibiotic)' },
  { k: 'Classification', v: 'WHO AWaRe · Access / Watch / Reserve' },
  { k: 'Built for', v: 'Students · researchers · educators' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Transparency() {
  return (
    <section id="dataset" data-testid="transparency-section" className="bg-panel px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={0}
          variants={fadeUp}
          className="mb-4 flex items-center gap-3"
        >
          <span className="h-px w-6 bg-panel-border" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-onpanel-faint">
            Evidence before confidence.
          </span>
        </motion.div>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={1}
          variants={fadeUp}
          className="max-w-2xl font-display text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-onpanel-ink sm:text-[42px]"
        >
          A public dataset, openly acknowledged.
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={2}
          variants={fadeUp}
          className="mt-5 max-w-2xl font-sans text-[15px] leading-[1.7] text-onpanel-muted"
        >
          We publish exactly what this platform runs on, its limits, and what it's
          not — because a model is only as honest as its data.
        </motion.p>

        {/* Real data sources — each links out to the actual source, so the
            'Evidence before confidence' claim is something you can click and
            verify, not just read. */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {DATA_SOURCES.map((s, i) => (
            <motion.a
              key={s.title}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={i + 3}
              variants={fadeUp}
              className="group block rounded-[18px] border border-panel-border bg-panel-raised p-6 transition-colors hover:border-accent-blue/40"
            >
              <div className="flex items-start justify-between">
                <s.icon size={18} className="text-accent-blue" />
                <ExternalLink size={14} className="text-onpanel-faint transition-colors group-hover:text-accent-blue" />
              </div>
              <h3 className="mt-3 font-display text-[15px] font-semibold text-onpanel-ink">
                {s.title}
              </h3>
              <p className="mt-2 font-sans text-[13px] leading-[1.55] text-onpanel-muted">
                {s.body}
              </p>
            </motion.a>
          ))}
        </div>

        {/* Dataset spec table */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          custom={6}
          variants={fadeUp}
          className="mt-14 border-t border-panel-border"
        >
          {SPECS.map((s) => (
            <div key={s.k} className="grid grid-cols-12 items-baseline gap-4 border-b border-panel-border py-4">
              <div className="col-span-4 font-mono text-[11px] uppercase tracking-[0.15em] text-onpanel-faint sm:col-span-3">
                {s.k}
              </div>
              <div className="col-span-8 font-sans text-[15px] text-onpanel-ink sm:col-span-9">
                {s.v}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Explainability */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          custom={7}
          variants={fadeUp}
          className="mt-10 max-w-2xl"
        >
          <p className="font-sans text-[14px] leading-[1.7] text-onpanel-muted">
            Every prediction ships with <span className="font-medium text-onpanel-ink">SHAP-based feature importance</span> —
            computed natively by CatBoost — so you can see exactly which factors
            drove each result, not just the result itself.
          </p>
        </motion.div>

        {/* Medical disclaimer — deliberately prominent, not buried */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          custom={8}
          variants={fadeUp}
          className="mt-10 flex items-start gap-3 rounded-[16px] border border-intermediate/30 bg-intermediate/[0.08] p-5"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-intermediate" />
          <p className="font-sans text-[13px] leading-[1.6] text-onpanel-ink">
            <span className="font-semibold">Not for clinical use.</span> AMR-Insight is a
            student research and education project. Predictions are based on a public
            Kaggle dataset, not live hospital lab feeds, and should never substitute for
            laboratory-based antibiotic susceptibility testing or professional medical
            judgment.
          </p>
        </motion.div>
      </div>
    </section>
  );
}