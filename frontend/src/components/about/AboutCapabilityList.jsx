import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Shared row primitive — reused by Section 5 (AboutBoundaryList) to keep the
// can/cannot pair visually mirrored. Keep this in sync if either list's
// spacing or type scale changes.
export function CapabilityRow({ index, children, tone = 'positive' }) {
    const markClass =
        tone === 'positive'
            ? 'border-accent-blue/30 bg-accent-blue/[0.08] text-accent-blue'
            : 'border-canvas-hairline bg-canvas-alt text-page-faint';

    return (
        <motion.li
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            custom={index}
            variants={fadeUp}
            className="flex items-start gap-3 py-4"
        >
            <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${markClass}`}
                aria-hidden="true"
            >
                {tone === 'positive' ? '✓' : '–'}
            </span>
            <span className="font-sans text-[15px] leading-[1.6] text-page-muted">
                {children}
            </span>
        </motion.li>
    );
}

const CAPABILITIES = [
    'Predicts Resistant / Susceptible / Intermediate across 15 antibiotics from patterns in historical data',
    'Reports a calibrated confidence score for every prediction',
    'Explains each prediction with SHAP-based feature attribution',
    'Classifies antibiotics by WHO AWaRe category (Access / Watch / Reserve)',
    'Surfaces resistance trends across the underlying dataset',
];

export default function AboutCapabilityList() {
    return (
        <section
            id="what-it-is"
            data-testid="about-capability-section"
            className="bg-canvas px-6 pt-12 sm:pt-14"
        >
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
                        What AMR-Insight does
                    </span>
                </motion.div>

                <motion.h2
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="max-w-lg font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.015em] text-page-ink sm:text-[32px]"
                >
                    Capabilities, grounded in evidence.
                </motion.h2>

                <ul className="mt-8 divide-y divide-canvas-hairline border-t border-canvas-hairline">
                    {CAPABILITIES.map((item, i) => (
                        <CapabilityRow key={item} index={i + 2} tone="positive">
                            {item}
                        </CapabilityRow>
                    ))}
                </ul>
            </div>
        </section>
    );
}