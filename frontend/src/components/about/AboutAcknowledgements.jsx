import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

const GROUPS = [
    {
        label: 'Data',
        body: 'The Kaggle AMR dataset and its original contributors.',
    },
    {
        label: 'Standards',
        body: "WHO's AWaRe antibiotic classification framework.",
    },
    {
        label: 'Open-source foundations',
        body: 'CatBoost and SHAP for modeling and explainability; Django and React for the platform itself — and the broader open-source ecosystem this project was built on.',
    },
    {
        label: 'Context',
        body: 'Developed as part of a university coursework project spanning Full Stack Development and Python/FCSP.',
    },
];

export default function AboutAcknowledgements() {
    return (
        <section
            id="acknowledgements"
            data-testid="about-acknowledgements-section"
            className="bg-canvas px-6 py-16 sm:py-20"
        >
            <div className="mx-auto max-w-2xl">
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
                        Acknowledgements
                    </span>
                </motion.div>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="max-w-md font-sans text-[13px] italic leading-[1.6] text-page-faint"
                >
                    AMR-Insight builds on public data, published research, and
                    open-source tools — not on original data collection.
                </motion.p>

                <dl className="mt-8 space-y-5">
                    {GROUPS.map((g, i) => (
                        <motion.div
                            key={g.label}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            custom={i + 2}
                            variants={fadeUp}
                            className="flex flex-col gap-1 sm:flex-row sm:gap-6"
                        >
                            <dt className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-page-faint sm:w-40">
                                {g.label}
                            </dt>
                            <dd className="font-sans text-[13px] leading-[1.6] text-page-muted">
                                {g.body}
                            </dd>
                        </motion.div>
                    ))}
                </dl>
            </div>
        </section>
    );
}