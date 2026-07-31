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
        name: 'Dhyey Daftary',
        area: 'ML Backend & Gateway',
        body: 'Built the Django/CatBoost prediction backend (15 per-antibiotic models, SHAP explainability) and the Node/Express/MongoDB gateway (auth, history, email).',
    },
    {
        name: 'Urva Shah',
        area: 'Frontend Lead',
        body: 'Owns the React/Vite frontend — design system, page architecture, and the interface across Predict, History, Trends, and this About page.',
    },
    {
        name: 'Ansh Patel',
        area: 'Frontend Styling',
        body: 'Supporting Urva on frontend styling and design implementation across the platform.',
    },
];

export default function AboutContributors() {
    return (
        <section
            id="contributors"
            data-testid="about-contributors-section"
            className="bg-canvas px-6 py-12 sm:py-14"
        >
            <div className="mx-auto max-w-3xl">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={0}
                    variants={fadeUp}
                    className="mb-2 flex items-center gap-3"
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
                    className="mb-1 max-w-lg font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.015em] text-page-ink sm:text-[32px]"
                >
                    Who built this.
                </motion.h2>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mb-8 mt-2 max-w-xl font-sans text-[14px] leading-[1.6] text-page-faint"
                >
                    A 3-person team — Full Stack Development + Python/FCSP university semester project.
                </motion.p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {CONTRIBUTORS.map((c, i) => (
                        <motion.div
                            key={c.name}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={i + 3}
                            variants={fadeUp}
                            className="group"
                        >
                            <div className="flex h-full flex-col rounded-[22px] border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent-blue/50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                                {/* Avatar Badge */}
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-accent-blue/30 bg-accent-blue/15 font-display text-[15px] font-bold text-accent-blue transition-transform duration-300 group-hover:scale-105">
                                    {c.name.charAt(0)}
                                </div>
                                {/* Name */}
                                <h3 className="font-display text-[16px] font-semibold text-white">
                                    {c.name}
                                </h3>
                                {/* Role */}
                                <p className="mt-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-accent-blue">
                                    {c.area}
                                </p>
                                {/* Body */}
                                <p className="mt-3 font-sans text-[13.5px] leading-[1.65] text-neutral-300">
                                    {c.body}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}