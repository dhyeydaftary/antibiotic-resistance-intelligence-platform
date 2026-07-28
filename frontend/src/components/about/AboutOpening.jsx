import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function AboutOpening() {
    return (
        <section
            id="opening"
            data-testid="about-opening-section"
            className="bg-canvas px-6 pt-10 pb-16 sm:pt-14 sm:pb-20"
        >
            <div className="mx-auto max-w-3xl">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    variants={fadeUp}
                    className="mb-4 flex items-center gap-3"
                >
                    <span className="h-px w-6 bg-canvas-hairline" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">
                        Research &amp; education platform
                    </span>
                </motion.div>

                <motion.h1
                    initial="hidden"
                    animate="visible"
                    custom={1}
                    variants={fadeUp}
                    className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[48px]"
                >
                    About AMR-Insight
                </motion.h1>

                <motion.p
                    initial="hidden"
                    animate="visible"
                    custom={2}
                    variants={fadeUp}
                    className="mt-5 max-w-xl font-sans text-[16px] leading-[1.6] text-page-muted"
                >
                    A research and education platform for exploring antibiotic
                    resistance patterns — built to be transparent about what it knows,
                    and honest about what it doesn't.
                </motion.p>

                <motion.p
                    initial="hidden"
                    animate="visible"
                    custom={3}
                    variants={fadeUp}
                    className="mt-3 font-sans text-[14px] italic leading-[1.5] text-page-faint"
                >
                    Not a diagnostic tool. Not a substitute for laboratory testing.
                </motion.p>
            </div>
        </section>
    );
}