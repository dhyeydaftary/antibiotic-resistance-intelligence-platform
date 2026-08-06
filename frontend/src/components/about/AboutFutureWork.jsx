import { motion } from 'framer-motion';
import ResearchSection from './ResearchSection';
import EditorialQuote from './EditorialQuote';

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
        num: '01',
        title: 'Expanding dataset scope',
        body: 'Broader dataset integration was considered, including MIMIC-IV, and not pursued due to access restrictions. Any future expansion would need the same conceptual/statistical integration approach used here — multi-source clinical datasets cannot be row-level joined the way this platform\'s single-source data can.',
    },
    {
        num: '02',
        title: 'Further validation before real-world use',
        body: 'If this work were ever extended toward real-world relevance, it would require independent clinical validation, prospective evaluation against live AST results, and review by qualified clinicians — none of which has happened here.',
    },
    {
        num: '03',
        title: 'Deeper explainability tooling',
        body: 'Richer SHAP visualizations, per-patient explanation exports, and comparison views across antibiotics are natural extensions of the explainability work already in place.',
    },
];

// About page Act VII: honest future-work directions + closing quote.
export default function AboutFutureWork() {
    return (
        <ResearchSection
            id="future-work"
            testId="about-future-work-section"
            kicker="Future work"
            title="Where this could go, carefully."
            subtitle="Future scope framed as evaluation and validation, not an ambitious roadmap."
            maxWidth="max-w-4xl"
            noBorder={true}
        >
            <div className="space-y-12">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {DIRECTIONS.map((d, i) => (
                        <motion.div
                            key={d.title}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            custom={i}
                            variants={fadeUp}
                            className="rounded-[20px] border border-panel-border bg-panel p-6 shadow-panel-md flex flex-col justify-between"
                        >
                            <div>
                                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                                    DIRECTION {d.num}
                                </span>
                                <h3 className="mt-2 font-display text-[17px] font-semibold text-onpanel-ink">
                                    {d.title}
                                </h3>
                                <p className="mt-2 font-sans text-[13.5px] leading-[1.6] text-onpanel-muted">
                                    {d.body}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Final Closing Philosophy Quote */}
                <div className="border-t border-canvas-hairline pt-10">
                    <EditorialQuote
                        quote="We'd rather be right about what we don't know than confident about what we can't prove."
                        kicker="Closing Philosophy"
                    />
                </div>
            </div>
        </ResearchSection>
    );
}