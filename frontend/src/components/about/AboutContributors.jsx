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

const CONTRIBUTORS = [
    {
        name: 'Dhyey Daftary',
        area: 'ML Backend & Gateway\nArchitecture',
        body: 'Owns the ML pipeline and gateway architecture end to end — model training, prediction API, auth system, and database design.',
    },
    {
        name: 'Urva Shah',
        area: 'Frontend Lead & Interface\nDesign',
        body: "Owns the frontend architecture and user experience — page structure, gateway integration, and the platform's overall design direction.",
    },
    {
        name: 'Ansh Patel',
        area: 'Frontend Styling &\nSecurity Hardening',
        body: 'Contributed across the stack — UI components and command palette on the frontend, plus backend security hardening.',
    },
];

export default function AboutContributors() {
    return (
        <ResearchSection
            id="contributors"
            testId="about-contributors-section"
            kicker="Contributors"
            title="Who built this."
            subtitle="A 3-person team — Full Stack Development + Python/FCSP university semester project."
            maxWidth="max-w-4xl"
        >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {CONTRIBUTORS.map((c, i) => (
                    <motion.div
                        key={c.name}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        custom={i}
                        variants={fadeUp}
                        className="rounded-[20px] border border-panel-border bg-panel p-6 shadow-panel-md transition-all hover:-translate-y-1 hover:border-accent-blue/50 flex flex-col justify-between"
                    >
                        <div>
                            <span className="block min-h-[28px] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-blue whitespace-pre-line">
                                {c.area}
                            </span>
                            <h3 className="mt-2 font-display text-[18px] font-semibold text-onpanel-ink">
                                {c.name}
                            </h3>
                            <p className="mt-2.5 font-sans text-[13.5px] leading-[1.6] text-onpanel-muted">
                                {c.body}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </ResearchSection>
    );
}