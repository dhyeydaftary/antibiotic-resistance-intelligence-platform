import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

export default function ResearchSection({
    id,
    testId,
    kicker,
    title,
    subtitle,
    children,
    className = '',
    maxWidth = 'max-w-4xl',
    noBorder = false,
}) {
    return (
        <section
            id={id}
            data-testid={testId}
            className={`relative bg-canvas px-6 py-14 sm:py-20 ${!noBorder ? 'border-b border-canvas-hairline' : ''} ${className}`}
        >
            <div className={`mx-auto ${maxWidth}`}>
                {(kicker || title || subtitle) && (
                    <div className="mb-10">
                        {kicker && (
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={0}
                                variants={fadeUp}
                                className="mb-3 flex items-center gap-2.5"
                            >
                                <span className="h-px w-5 bg-accent-blue" />
                                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-blue">
                                    {kicker}
                                </span>
                            </motion.div>
                        )}

                        {title && (
                            <motion.h2
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={1}
                                variants={fadeUp}
                                className="font-display text-[28px] font-semibold leading-[1.18] tracking-[-0.018em] text-page-ink sm:text-[36px]"
                            >
                                {title}
                            </motion.h2>
                        )}

                        {subtitle && (
                            <motion.p
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: '-60px' }}
                                custom={2}
                                variants={fadeUp}
                                className="mt-3 max-w-2xl font-sans text-[15px] leading-[1.6] text-page-muted sm:text-[17px]"
                            >
                                {subtitle}
                            </motion.p>
                        )}
                    </div>
                )}

                {children}
            </div>
        </section>
    );
}
