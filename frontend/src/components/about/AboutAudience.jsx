import { motion } from 'framer-motion';
import { GraduationCap, Microscope, BookOpen } from 'lucide-react';

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
        icon: GraduationCap,
        label: 'Students',
        body: 'Learning how AMR patterns emerge in data, and how applied ML models are built, explained, and evaluated.',
    },
    {
        icon: Microscope,
        label: 'Researchers',
        body: 'Exploring resistance trends across the dataset and experimenting with explainability techniques on real model output.',
    },
    {
        icon: BookOpen,
        label: 'Educators',
        body: 'Teaching WHO AWaRe classification and responsible AI practice in a healthcare-adjacent context.',
    },
];

export default function AboutAudience() {
    return (
        <section
            id="who-its-for"
            data-testid="about-audience-section"
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
                        Who this is for
                    </span>
                </motion.div>

                <motion.h2
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="mb-8 max-w-lg font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.015em] text-page-ink sm:text-[32px]"
                >
                    Built for study, not for treatment decisions.
                </motion.h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {AUDIENCES.map((a, i) => (
                        <motion.div
                            key={a.label}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-80px' }}
                            custom={i + 2}
                            variants={fadeUp}
                            className="group"
                        >
                            <div className="flex h-full flex-col rounded-[22px] border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-accent-blue/50 hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
                                {/* Icon Badge */}
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-accent-blue/30 bg-accent-blue/15 transition-transform duration-300 group-hover:scale-105">
                                    <a.icon size={18} className="text-accent-blue" strokeWidth={1.8} />
                                </div>
                                <h3 className="font-display text-[16px] font-semibold text-white">
                                    {a.label}
                                </h3>
                                <p className="mt-2 font-sans text-[13.5px] leading-[1.65] text-neutral-300">
                                    {a.body}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    custom={AUDIENCES.length + 2}
                    variants={fadeUp}
                    className="mt-6 font-sans text-[13px] italic leading-[1.6] text-page-faint"
                >
                    Not built for clinicians, patients, or caregivers making real-world treatment decisions.
                </motion.p>
            </div>
        </section>
    );
}