import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function AboutGap() {
    return (
        <section
            id="the-gap"
            data-testid="about-gap-section"
            className="bg-canvas px-6 py-12 sm:py-14"
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
                        The gap we're exploring
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
                    Between infection and answer, there's a window.
                </motion.h2>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mt-6 space-y-4 font-sans text-[15px] leading-[1.7] text-page-muted"
                >
                    <p>
                        Antibiotic susceptibility testing (AST) is the clinical gold
                        standard for knowing which antibiotics will work against a given
                        infection. It's also not instant — culturing an organism and
                        testing it against a panel of antibiotics takes time. In that
                        window, treatment decisions are often made empirically, before
                        lab-confirmed results are available.
                    </p>
                    <p>
                        AMR-Insight explores a narrow, answerable question inside that
                        gap:{' '}
                        <span className="font-medium text-page-ink">
                            can patterns in historical resistance data offer a
                            statistically grounded signal during that window?
                        </span>{' '}
                        Not whether AI can replace AST — a much smaller, more honest
                        question than that.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}