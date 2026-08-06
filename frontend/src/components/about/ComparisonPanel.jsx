import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Side-by-side "capable of" vs. "not capable of" split panel — the
// actual rendering used by AboutTrustBoundary.
export default function ComparisonPanel({ capabilities, boundaries, takeaway }) {
    return (
        <div className="space-y-6">
            {/* Split Screen Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Capabilities Side (Dark Panel #1D1D1F) */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={0}
                    variants={fadeUp}
                    className="flex flex-col justify-between rounded-[20px] border border-panel-border bg-panel p-6 sm:p-8 shadow-panel-md"
                >
                    <div>
                        <div className="mb-6 flex items-center justify-between border-b border-panel-border pb-3">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                                CAPABLE OF
                            </span>
                            <span className="font-mono text-[10px] text-onpanel-faint">05 Capabilities</span>
                        </div>

                        <ul className="space-y-4">
                            {capabilities.map((cap) => (
                                <li key={cap.title || cap} className="flex items-start gap-3.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/15 border border-accent-blue/30 text-accent-blue font-mono text-[11px] font-bold">
                                        ✓
                                    </span>
                                    <div>
                                        <h4 className="font-display text-[15px] font-semibold text-onpanel-ink">
                                            {cap.title || cap}
                                        </h4>
                                        {cap.desc && (
                                            <p className="mt-0.5 font-sans text-[13px] leading-[1.5] text-onpanel-muted">
                                                {cap.desc}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* Boundaries Side (Dark Panel Raised #2C2C2E) */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={1}
                    variants={fadeUp}
                    className="flex flex-col justify-between rounded-[20px] border border-panel-border bg-panel-raised p-6 sm:p-8 shadow-panel-md"
                >
                    <div>
                        <div className="mb-6 flex items-center justify-between border-b border-panel-border pb-3">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-onpanel-muted">
                                NOT CAPABLE OF
                            </span>
                            <span className="font-mono text-[10px] text-onpanel-faint">05 Boundaries</span>
                        </div>

                        <ul className="space-y-4">
                            {boundaries.map((bound) => (
                                <li key={bound.title || bound} className="flex items-start gap-3.5">
                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel border border-panel-border text-onpanel-faint font-mono text-[11px] font-bold">
                                        –
                                    </span>
                                    <div>
                                        <h4 className="font-display text-[15px] font-semibold text-onpanel-ink">
                                            {bound.title || bound}
                                        </h4>
                                        {bound.desc && (
                                            <p className="mt-0.5 font-sans text-[13px] leading-[1.5] text-onpanel-muted">
                                                {bound.desc}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </div>

            {/* Takeaway Notice */}
            {takeaway && (
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={2}
                    variants={fadeUp}
                    className="rounded-[16px] border border-panel-border bg-panel p-5 text-center shadow-panel-sm"
                >
                    <p className="font-sans text-[14.5px] font-medium leading-[1.5] text-onpanel-ink">
                        <strong className="font-semibold text-accent-blue">Takeaway:</strong> {takeaway}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
