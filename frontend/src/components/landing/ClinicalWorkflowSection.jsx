import { motion } from 'framer-motion';
import { ArrowRight, ArrowDown, CircleCheck } from 'lucide-react';

const TRUNK_STEPS = ['Patient arrives', 'Sample collected', 'Culture grows (18–48 hrs)', 'Organism identified'];

const MECHANICS = [
    {
        n: '01',
        kicker: 'Input',
        title: 'Organism + patient context.',
        body: 'Select the organism and provide patient context — age, gender, diabetes and hypertension status, prior hospitalization, and infection frequency. No PHI, no hospital integration.',
        tags: ['organism', 'age', 'diabetes', 'hospital_before'],
    },
    {
        n: '02',
        kicker: 'Inference',
        title: 'Fifteen models, in parallel.',
        body: 'Each antibiotic has its own CatBoost model, trained independently on the same dataset. All fifteen run simultaneously — no cascading, no shared bias between antibiotics.',
        tags: ['CatBoost', 'n_models = 15', 'parallel_inference'],
    },
    {
        n: '03',
        kicker: 'Prediction',
        title: 'Susceptibility across the panel.',
        body: 'Results return as Resistant / Susceptible / Intermediate for each antibiotic, with a confidence score and SHAP explainability, contextualized against WHO AWaRe classification.',
        tags: ['R / S / I', 'SHAP', 'AWaRe tiers'],
    },
];

const STATS = [
    { value: '1.14M+', label: 'Deaths directly caused by AMR in 2021', source: 'The Lancet, 2024' },
    { value: '4.71M+', label: 'Deaths where AMR played a role, 2021', source: 'The Lancet, 2024' },
    { value: '39M+', label: 'Projected deaths from AMR, 2025–2050', source: 'GRAM Project / The Lancet, 2024' },
];

const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

// "How it works" landing section: traditional-AST-vs-AMR-Insight
// timeline fork, where-this-fits explainer (addresses the "isn't
// organism-as-input data leakage?" question head-on), supporting
// mortality stats, and the 3-step input/inference/prediction mechanics
// cards. Static editorial content — no data fetching.
export default function ClinicalWorkflowSection() {
    return (
        <section id="how" data-testid="how-it-works-section" className="bg-canvas px-6 py-24 sm:py-32">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}
                    custom={0} variants={fadeUp} className="mb-4 flex items-center gap-3"
                >
                    <span className="h-px w-6 bg-canvas-hairline" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
                        How it works
                    </span>
                </motion.div>

                <motion.h2
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}
                    custom={1} variants={fadeUp}
                    className="max-w-2xl font-display text-[32px] font-semibold leading-[1.15] tracking-[-0.015em] text-page-ink sm:text-[42px]"
                >
                    Two paths from the same organism.
                </motion.h2>

                <motion.p
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}
                    custom={2} variants={fadeUp}
                    className="mt-5 max-w-xl font-sans text-[15px] leading-[1.7] text-page-muted"
                >
                    Traditional workflows and AMR-Insight begin at the exact same point — organism
                    identification. From there, the two paths diverge.
                </motion.p>

                {/* Shared trunk */}
                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                    custom={3} variants={fadeUp}
                    className="mt-12 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-0"
                >
                    {TRUNK_STEPS.map((step, i) => (
                        <div key={step} className="flex flex-col items-center gap-2 sm:flex-row">
                            <div className="rounded-full border border-canvas-hairline bg-canvas-alt px-4 py-2 font-mono text-[12px] font-medium text-page-ink">
                                {step}
                            </div>
                            {i < TRUNK_STEPS.length - 1 && (
                                <>
                                    <ArrowDown size={14} className="text-page-faint sm:hidden" />
                                    <ArrowRight size={14} className="mx-2 hidden text-page-faint sm:block" />
                                </>
                            )}
                        </div>
                    ))}
                </motion.div>

                {/* Fork */}
                <div className="relative mt-2 flex justify-center">
                    <ArrowDown size={16} className="my-2 text-page-faint" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                        custom={4} variants={fadeUp}
                        className="rounded-[18px] border border-canvas-hairline bg-canvas-alt p-6"
                    >
                        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-page-faint">
                            Traditional path
                        </div>
                        <div className="mt-3 font-display text-[18px] font-semibold text-page-ink">
                            Antibiotic Susceptibility Testing
                        </div>
                        <div className="mt-1 font-mono text-[13px] text-page-muted">18–24 hours</div>
                        <div className="mt-4 border-t border-canvas-hairline pt-4 font-sans text-[13px] leading-[1.6] text-page-muted">
                            Manual, sequential testing against each antibiotic. Gold standard — but the
                            clinician waits for results before confirming the right drug.
                        </div>
                    </motion.div>

                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                        custom={5} variants={fadeUp}
                        className="rounded-[18px] border-2 border-accent-blue/40 bg-canvas-alt p-6 shadow-panel-sm"
                    >
                        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-accent-blue">
                            AMR-Insight
                        </div>
                        <div className="mt-3 font-display text-[18px] font-semibold text-page-ink">
                            15 independent CatBoost models
                        </div>
                        <div className="mt-1 font-mono text-[13px] text-accent-blue">Seconds</div>
                        <div className="mt-4 border-t border-canvas-hairline pt-4 font-sans text-[13px] leading-[1.6] text-page-muted">
                            Parallel estimate across the antibiotic panel, with SHAP explainability and
                            WHO AWaRe context — while lab-based testing is still running.
                        </div>
                    </motion.div>
                </div>

                {/* Your AI fits here */}
                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                    custom={6} variants={fadeUp}
                    className="mt-8 rounded-[18px] border border-accent-blue/25 bg-accent-blue/[0.04] p-6"
                >
                    <div className="flex items-center gap-2 font-display text-[17px] font-semibold text-page-ink">
                        <CircleCheck size={18} className="text-accent-blue" />
                        Where AMR-Insight fits
                    </div>
                    <p className="mt-3 font-sans text-[14px] leading-[1.7] text-page-muted">
                        AMR-Insight begins <span className="font-medium text-page-ink">after</span> organism
                        identification — the same point traditional AST begins. It does not replace culture,
                        microbiology, or organism identification. It provides an early estimate for research
                        and educational purposes while laboratory-based testing is still in progress — never
                        a substitute for it.
                    </p>
                    <p className="mt-3 font-sans text-[13px] leading-[1.6] text-page-faint">
                        Because organism identification always happens before susceptibility results in real
                        clinical workflows, using organism as a model input reflects genuine data availability
                        at prediction time — not a shortcut or data leakage.
                    </p>
                </motion.div>

                {/* Supporting stats — moved below the story, not the opener */}
                <motion.div
                    initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                    custom={7} variants={fadeUp}
                    className="mt-14 grid grid-cols-1 gap-4 border-t border-canvas-hairline pt-10 sm:grid-cols-3"
                >
                    {STATS.map((s) => (
                        <div key={s.label}>
                            <div className="font-display text-[26px] font-bold leading-none text-page-ink">{s.value}</div>
                            <p className="mt-2 font-sans text-[12px] leading-[1.5] text-page-muted">{s.label}</p>
                            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-page-faint">
                                Source: {s.source}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* Mechanics — now the "how" of the pipeline just introduced */}
                <div className="mt-20">
                    <motion.h3
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }}
                        custom={0} variants={fadeUp}
                        className="max-w-xl font-display text-[24px] font-semibold leading-[1.2] tracking-[-0.01em] text-page-ink"
                    >
                        Exactly how each prediction assembles.
                    </motion.h3>

                    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        {MECHANICS.map((s, i) => (
                            <motion.div
                                key={s.n}
                                initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
                                custom={i + 1} variants={fadeUp}
                                className="rounded-[20px] border border-canvas-hairline bg-canvas-alt p-7"
                            >
                                <div className="flex items-baseline justify-between">
                                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-accent-blue">
                                        {s.kicker}
                                    </span>
                                    <span className="font-display text-[20px] font-semibold text-page-faint">{s.n}</span>
                                </div>
                                <h4 className="mt-4 font-display text-[19px] font-semibold leading-[1.3] text-page-ink">
                                    {s.title}
                                </h4>
                                <p className="mt-3 font-sans text-[14px] leading-[1.6] text-page-muted">{s.body}</p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {s.tags.map((t) => (
                                        <span key={t} className="rounded-full border border-canvas-hairline px-2.5 py-1 font-mono text-[11px] text-page-muted">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}