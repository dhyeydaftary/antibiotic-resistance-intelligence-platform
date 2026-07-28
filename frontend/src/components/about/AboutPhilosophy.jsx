import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function AboutPhilosophy() {
    return (
        <section
            id="philosophy"
            data-testid="about-philosophy-section"
            className="bg-canvas px-6 py-28 sm:py-36"
        >
            <div className="mx-auto max-w-2xl text-center">
                <motion.span
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={0}
                    variants={fadeUp}
                    className="mb-8 inline-block font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint"
                >
                    Our philosophy
                </motion.span>

                <motion.blockquote
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                >
                    <p className="font-serif text-[34px] font-medium italic leading-[1.25] tracking-[-0.01em] text-page-ink sm:text-[42px]">
                        Evidence before confidence.
                    </p>
                </motion.blockquote>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mx-auto mt-8 max-w-md font-sans text-[16px] leading-[1.65] text-page-muted"
                >
                    A model that cannot explain itself has not earned the right to be
                    trusted — even when it's right.
                </motion.p>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={3}
                    variants={fadeUp}
                    className="mx-auto mt-6 max-w-md font-sans text-[14px] leading-[1.6] text-page-faint"
                >
                    Every prediction on this platform ships with a confidence score and
                    a SHAP-based explanation — not just a label.
                </motion.p>
            </div>
        </section>
    );
}