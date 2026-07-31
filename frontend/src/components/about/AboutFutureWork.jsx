import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

const DIRECTIONS = [
    {
        title: 'Expanding dataset scope',
        body: 'Broader dataset integration was considered, including MIMIC-IV, and not pursued due to access restrictions. Any future expansion would need the same conceptual/statistical integration approach used here — multi-source clinical datasets cannot be row-level joined the way this platform\'s single-source data can.',
    },
    {
        title: 'Further validation before any real-world use',
        body: 'If this work were ever extended toward real-world relevance, it would require independent clinical validation, prospective evaluation against live AST results, and review by qualified clinicians — none of which has happened here.',
    },
    {
        title: 'Deeper explainability tooling',
        body: 'Richer SHAP visualizations, per-patient explanation exports, and comparison views across antibiotics are natural extensions of the explainability work already in place.',
    },
];

export default function AboutFutureWork() {
    return (
        <section
            id="future-work"
            data-testid="about-future-work-section"
            className="bg-canvas px-6 py-12 sm:py-14"
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
                        Future work
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
                    Where this could go, carefully.
                </motion.h2>

                <div className="mt-10 space-y-8">
                    {DIRECTIONS.map((d, i) => (
                        <motion.div
                            key={d.title}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={i + 2}
                            variants={fadeUp}
                            className="border-l-2 border-canvas-hairline pl-5"
                        >
                            <h3 className="font-display text-[15px] font-semibold text-page-ink">
                                {d.title}
                            </h3>
                            <p className="mt-1.5 max-w-xl font-sans text-[14px] leading-[1.65] text-page-muted">
                                {d.body}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Closing philosophy */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={DIRECTIONS.length + 2}
                    variants={fadeUp}
                    className="mt-16 border-t border-canvas-hairline pt-12 text-center"
                >
                    <p className="mx-auto max-w-md font-display text-[22px] font-semibold leading-[1.35] tracking-[-0.015em] text-page-ink sm:text-[26px]">
                        We'd rather be right about what we don't know than confident
                        about what we can't prove.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}