import { motion } from 'framer-motion';
import { CapabilityRow } from './AboutCapabilityList';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

const BOUNDARIES = [
    'Is not a medical device and has not undergone clinical validation',
    'Does not replace antibiotic susceptibility testing (AST)',
    'Does not make treatment decisions or recommend specific antibiotics for patient care',
    'Is not trained on live clinical or patient-identified data',
    'Should not be used by clinicians, patients, or caregivers to guide real-world treatment',
];

export default function AboutBoundaryList() {
    return (
        <section
            id="what-it-is-not"
            data-testid="about-boundary-section"
            className="bg-canvas-alt px-6 pb-20 sm:pb-24"
        >
            <div className="mx-auto max-w-3xl">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={0}
                    variants={fadeUp}
                    className="mb-4 mt-14 flex items-center gap-3 sm:mt-16"
                >
                    <span className="h-px w-6 bg-canvas-hairline" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
                        What AMR-Insight doesn't do
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
                    Boundaries, stated plainly.
                </motion.h2>

                <ul className="mt-8 divide-y divide-canvas-hairline border-t border-canvas-hairline">
                    {BOUNDARIES.map((item, i) => (
                        <CapabilityRow key={item} index={i + 2} tone="negative">
                            {item}
                        </CapabilityRow>
                    ))}
                </ul>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    custom={BOUNDARIES.length + 2}
                    variants={fadeUp}
                    className="mt-10 max-w-xl font-sans text-[17px] font-medium leading-[1.6] text-page-ink"
                >
                    If you take one thing from this page, take this: consult a
                    clinician and a laboratory, not this platform.
                </motion.p>
            </div>
        </section>
    );
}