import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

const HERO_STATS = [
    { label: 'Model Architecture', value: '15 CatBoost Classifiers' },
    { label: 'Dataset Scope', value: '10,710 Tabular Rows' },
    { label: 'Explainability Engine', value: 'Native TreeSHAP' },
    { label: 'Stewardship Standard', value: 'WHO AWaRe 2023' },
];

// About page Act I: hero header, subtitle, and the 4-stat fact bar.
export default function AboutOpening() {
    return (
        <section
            id="opening"
            data-testid="about-opening-section"
            className="bg-canvas px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-canvas-hairline"
        >
            <div className="mx-auto max-w-4xl space-y-10">
                {/* Clean Hero Header */}
                <div>
                    {/* Category Pill Badge */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        variants={fadeUp}
                        className="mb-4"
                    >
                        <span className="inline-flex items-center gap-2 rounded-full bg-accent-blue/10 border border-accent-blue/20 px-3.5 py-1 font-mono text-[11px] font-semibold text-accent-blue uppercase tracking-[0.14em]">
                            <span className="h-1.5 w-1.5 rounded-full bg-accent-blue shadow-[0_0_6px_rgba(0,113,227,0.8)]" />
                            AI Antibiotic Resistance Intelligence
                        </span>
                    </motion.div>

                    {/* Section Title */}
                    <motion.h1
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        variants={fadeUp}
                        className="font-display text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-page-ink sm:text-[42px]"
                    >
                        About AMR-Insight
                    </motion.h1>

                    {/* Lead Subtitle */}
                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        variants={fadeUp}
                        className="mt-4 max-w-2xl font-sans text-[17px] leading-[1.65] text-page-muted sm:text-[20px]"
                    >
                        A research and education platform for exploring antibiotic resistance patterns — built to be transparent about what it knows, and honest about what it doesn't.
                    </motion.p>

                    {/* Research Scope Notice Pill */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        variants={fadeUp}
                        className="mt-6 inline-flex items-center gap-2.5 rounded-xl border border-canvas-hairline bg-canvas-alt px-4 py-2.5 font-sans text-[13px] text-page-muted shadow-sm"
                    >
                        <span className="font-semibold text-page-ink">• Research Scope:</span> Not a diagnostic tool. Not a substitute for laboratory testing.
                    </motion.div>
                </div>

                {/* Horizontal Inline Fact Bar (No Side Box) */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    custom={4}
                    variants={fadeUp}
                    className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2"
                >
                    {HERO_STATS.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-2xl border border-canvas-hairline bg-white p-4 shadow-sm"
                        >
                            <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent-blue">
                                {stat.label}
                            </span>
                            <span className="mt-1.5 block font-display text-[15px] font-semibold text-page-ink">
                                {stat.value}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}