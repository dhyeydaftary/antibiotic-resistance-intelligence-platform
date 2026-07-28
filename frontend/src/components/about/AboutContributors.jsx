import { motion } from 'framer-motion';

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
        name: 'Dhyey',
        area: 'ML backend & gateway',
        body: 'Built the Django/CatBoost prediction backend (15 per-antibiotic models, SHAP explainability) and the Node/Express/MongoDB gateway (auth, history, email). Originally scaffolded the frontend before handoff.',
    },
    {
        name: 'Urva',
        area: 'Frontend',
        body: 'Owns the React/Vite frontend — design system, page architecture, and the interface across Predict, History, Trends, and this About page.',
    },
    {
        name: 'Ansh',
        area: 'Frontend styling support',
        body: "Supporting Urva on frontend styling.",
    },
];

function Initials({ name }) {
    return (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 font-display text-[13px] font-semibold text-accent-blue">
            {name.charAt(0)}
        </span>
    );
}

export default function AboutContributors() {
    return (
        <section
            id="contributors"
            data-testid="about-contributors-section"
            className="bg-canvas-alt px-6 py-20 sm:py-24"
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
                        Contributors
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
                    Who built this.
                </motion.h2>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mt-3 max-w-xl font-sans text-[14px] leading-[1.6] text-page-faint"
                >
                    AMR-Insight began as a combined Full Stack Development and
                    Python/FCSP university semester project.
                </motion.p>

                <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {CONTRIBUTORS.map((c, i) => (
                        <motion.div
                            key={c.name}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={i + 3}
                            variants={fadeUp}
                            className="rounded-[16px] border border-canvas-hairline bg-canvas p-5"
                        >
                            <Initials name={c.name} />
                            <h3 className="mt-3 font-display text-[15px] font-semibold text-page-ink">
                                {c.name}
                            </h3>
                            <div className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-accent-blue">
                                {c.area}
                            </div>
                            <p className="mt-2.5 font-sans text-[13px] leading-[1.6] text-page-muted">
                                {c.body}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}