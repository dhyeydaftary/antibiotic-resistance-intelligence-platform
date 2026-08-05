import { motion } from 'framer-motion';
import ResearchSection from './ResearchSection';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

const AUDIENCES = [
    {
        label: 'Students',
        target: 'Computer Science & Biomedical Science',
        body: 'Learning how AMR patterns emerge in data, and how applied machine learning models are built, explained, and evaluated.',
    },
    {
        label: 'Researchers',
        target: 'AMR Data Science & ML Engineers',
        body: 'Exploring resistance trends across the dataset and experimenting with explainability techniques on real model output.',
    },
    {
        label: 'Educators',
        target: 'Health Informatics & AI Faculty',
        body: 'Teaching WHO AWaRe classification and responsible AI practice in a healthcare-adjacent context.',
    },
];

export default function AboutAudience() {
    return (
        <ResearchSection
            id="who-its-for"
            testId="about-audience-section"
            kicker="Who this is for"
            title="Built for study, not for treatment decisions."
            maxWidth="max-w-4xl"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    {AUDIENCES.map((a, i) => (
                        <motion.div
                            key={a.label}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            custom={i}
                            variants={fadeUp}
                            className="rounded-[20px] border border-canvas-hairline bg-canvas-alt p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent-blue/50 flex flex-col justify-between"
                        >
                            <div>
                                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                                    {a.target}
                                </span>
                                <h3 className="mt-2.5 font-display text-[18px] font-semibold text-page-ink">
                                    {a.label}
                                </h3>
                                <p className="mt-2.5 font-sans text-[13.5px] leading-[1.6] text-page-muted">
                                    {a.body}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="rounded-xl border border-canvas-hairline bg-canvas-alt p-4 text-center font-sans text-[13px] text-page-muted">
                    <strong className="font-semibold text-page-ink">Explicitly not for:</strong> Clinicians, patients, or caregivers making real-world medical decisions.
                </div>
            </div>
        </ResearchSection>
    );
}