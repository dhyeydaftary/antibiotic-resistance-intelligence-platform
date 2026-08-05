import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function EditorialQuote({ quote, subtext, kicker = 'Core Philosophy', className = '' }) {
    return (
        <div className={`py-6 text-center ${className}`}>
            {kicker && (
                <motion.span
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={0}
                    variants={fadeUp}
                    className="mb-4 inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-blue"
                >
                    — {kicker} —
                </motion.span>
            )}

            <motion.blockquote
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                custom={1}
                variants={fadeUp}
                className="mx-auto max-w-3xl"
            >
                <p className="font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.018em] text-page-ink sm:text-[36px]">
                    "{quote}"
                </p>
            </motion.blockquote>

            {subtext && (
                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mx-auto mt-4 max-w-xl font-sans text-[15px] leading-[1.6] text-page-muted sm:text-[16px]"
                >
                    {subtext}
                </motion.p>
            )}
        </div>
    );
}
