import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Claim-list card + large pull-quote, side by side — the actual
// rendering used by AboutPhilosophy.
export default function TrustBoundaryPanel({ quote, subtext, claims }) {
    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Spec-Style Claim Boundary Card */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                custom={0}
                variants={fadeUp}
                className="lg:col-span-5"
            >
                <div className="rounded-[20px] border border-panel-border bg-panel p-6 shadow-panel-md">
                    <div className="border-b border-panel-border pb-3">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-onpanel-ink">
                            PRODUCT TRANSLATION SPEC
                        </span>
                    </div>

                    <ul className="mt-4 space-y-3">
                        {claims.map((claim) => (
                            <li key={claim.label} className="flex items-start gap-2.5">
                                <span className="mt-0.5 text-accent-blue font-mono text-[12px] font-bold">•</span>
                                <div className="font-sans text-[13.5px] leading-[1.5] text-onpanel-ink">
                                    <strong className="font-semibold text-onpanel-ink">{claim.label}:</strong> {claim.text}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </motion.div>

            {/* Right Column: Editorial Quote */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                custom={1}
                variants={fadeUp}
                className="lg:col-span-7"
            >
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                    GOVERNING PRINCIPLE
                </span>
                <h3 className="mt-3 font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.018em] text-page-ink sm:text-[36px]">
                    "{quote}"
                </h3>
                <p className="mt-4 font-sans text-[15.5px] leading-[1.65] text-page-muted">
                    {subtext}
                </p>
            </motion.div>
        </div>
    );
}
