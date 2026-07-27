import { motion } from 'framer-motion';

const PRINCIPLES = [
  {
    n: 'I',
    title: 'Prediction is a teaching tool.',
    body: 'Built for students and researchers — not clinicians, not hospitals. The point is to see resistance patterns emerge, not to treat.',
  },
  {
    n: 'II',
    title: 'No model inherits another\'s mistakes.',
    body: 'Independence is non-negotiable — when one model is uncertain, the others still speak clearly, with no shared bias or cascading assumptions between them.',
  },
  {
    n: 'III',
    title: 'AWaRe is our grammar.',
    body: 'Access · Watch · Reserve. Every prediction is contextualized against the WHO classification, not shown as a number alone.',
  },
  {
    n: 'IV',
    title: 'The dataset is public.',
    body: 'We surface the dataset and its limits as a research artifact, not a competitive moat. Evidence before confidence — transparency is the entire point.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Manifesto() {
  return (
    <section id="manifesto" data-testid="manifesto-section" className="bg-canvas px-6 py-24 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={0}
          variants={fadeUp}
          className="mb-4 flex items-center gap-3"
        >
          <span className="h-px w-6 bg-canvas-hairline" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
            A brief manifesto
          </span>
        </motion.div>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          custom={1}
          variants={fadeUp}
          className="max-w-lg font-display text-[30px] font-semibold leading-[1.15] tracking-[-0.015em] text-page-ink sm:text-[38px]"
        >
          Four principles we won't compromise on.
        </motion.h2>

        <div className="mt-12 divide-y divide-canvas-hairline border-t border-canvas-hairline">
          {PRINCIPLES.map((p, i) => (
            <motion.div
              key={p.n}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              custom={i + 2}
              variants={fadeUp}
              className="flex flex-col gap-3 py-6 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <div className="flex shrink-0 items-center gap-3 sm:w-40">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 font-display text-[13px] font-semibold text-accent-blue">
                  {p.n}
                </span>
                <h3 className="font-display text-[16px] font-semibold leading-[1.3] text-page-ink sm:hidden">
                  {p.title}
                </h3>
              </div>
              <div className="flex-1">
                <h3 className="hidden font-display text-[16px] font-semibold leading-[1.3] text-page-ink sm:block">
                  {p.title}
                </h3>
                <p className="mt-1 font-sans text-[14px] leading-[1.6] text-page-muted sm:mt-1.5">
                  {p.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}