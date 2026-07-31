import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

const STAGES = [
    {
        label: 'Dataset',
        detail:
            '10,710 records spanning 2020–2025, sourced from a public Kaggle dataset — not live patient data.',
    },
    {
        label: 'Preprocessing',
        detail:
            'Cleaning, encoding, and feature engineering prepare organism and antibiotic features for training.',
    },
    {
        label: '15 CatBoost Models',
        detail:
            'One independent classifier per antibiotic. No shared bias or cascading assumptions between predictions.',
    },
    {
        label: 'SHAP Explainability',
        detail:
            "CatBoost's native SHAP support attributes each prediction to the features that actually drove it.",
    },
    {
        label: 'Prediction + Confidence',
        detail:
            'Resistant, Susceptible, or Intermediate — paired with a calibrated confidence score from predict_proba().',
    },
];

export default function AboutPipeline() {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <section
            id="how-it-was-built"
            data-testid="about-pipeline-section"
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
                        How it was built
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
                    From data to prediction.
                </motion.h2>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mt-3 max-w-md font-sans text-[13px] leading-[1.6] text-page-faint"
                >
                    A five-stage pipeline, each stage visible. Tap a stage to see how it works.
                </motion.p>

                {/* Pipeline row */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={3}
                    variants={fadeUp}
                    className="relative mt-12"
                >
                    {/* Connecting line — desktop only */}
                    <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-canvas-hairline sm:block">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                            style={{ transformOrigin: 'left' }}
                            className="h-px w-full bg-accent-blue/40"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                        {STAGES.map((stage, i) => {
                            const isActive = i === activeIndex;
                            return (
                                <button
                                    key={stage.label}
                                    type="button"
                                    onClick={() => setActiveIndex(i)}
                                    aria-pressed={isActive}
                                    className="group relative z-10 flex flex-1 items-center gap-3 rounded-[12px] p-2 text-left transition-colors sm:flex-col sm:items-center sm:gap-2 sm:text-center"
                                >
                                    <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-[13px] font-semibold transition-colors ${isActive
                                                ? 'border-accent-blue bg-accent-blue text-white'
                                                : 'border-canvas-hairline bg-canvas text-page-faint group-hover:border-accent-blue/40 group-hover:text-accent-blue'
                                            }`}
                                    >
                                        {i + 1}
                                    </span>
                                    <span
                                        className={`font-sans text-[13px] font-medium leading-[1.3] transition-colors sm:max-w-[92px] ${isActive ? 'text-page-ink' : 'text-page-muted'
                                            }`}
                                    >
                                        {stage.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Detail panel */}
                <div className="mt-8 min-h-[92px] rounded-[22px] border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={activeIndex}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="font-sans text-[14px] leading-[1.65] text-neutral-300"
                        >
                            <span className="mr-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent-blue">
                                {String(activeIndex + 1).padStart(2, '0')} · {STAGES[activeIndex].label}
                            </span>
                            <br className="sm:hidden" />
                            {STAGES[activeIndex].detail}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}