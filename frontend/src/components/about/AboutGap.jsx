import { motion } from 'framer-motion';
import ResearchSection from './ResearchSection';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

// About page Act I (cont.): explains the diagnostic-timeline "gap"
// (empirical treatment window before lab AST results) this project targets.
export default function AboutGap() {
    return (
        <ResearchSection
            id="the-gap"
            testId="about-gap-section"
            kicker="The gap we're exploring"
            title="Between infection and answer, there's a window."
            maxWidth="max-w-4xl"
            className="pt-20 pb-20 sm:pt-28 sm:pb-28"
        >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                {/* Left prose column */}
                <div className="lg:col-span-7">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                        custom={0}
                        variants={fadeUp}
                        className="space-y-4 font-sans text-[15px] leading-[1.7] text-page-muted"
                    >
                        <p>
                            Antibiotic susceptibility testing (AST) is the clinical gold standard for knowing which antibiotics will work against a given infection. It's also not instant — culturing an organism and testing it against a panel of antibiotics takes time. In that window, treatment decisions are often made empirically, before lab-confirmed results are available.
                        </p>
                        <p className="rounded-[14px] border-l-2 border-accent-blue bg-canvas-alt p-4 font-medium text-page-ink border border-canvas-hairline">
                            AMR-Insight explores a narrow, answerable question inside that gap:{' '}
                            <span className="text-accent-blue font-semibold">
                                can patterns in historical resistance data offer a statistically grounded signal during that window?
                            </span>{' '}
                            Not whether AI can replace AST — a much smaller, more honest question than that.
                        </p>
                    </motion.div>
                </div>

                {/* Right visual infographic panel */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    custom={1}
                    variants={fadeUp}
                    className="lg:col-span-5"
                >
                    <div className="rounded-[20px] border border-panel-border bg-panel p-6 shadow-panel-md">
                        <div className="flex items-center justify-between border-b border-panel-border pb-3">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                                DIAGNOSTIC TIMELINE GAP
                            </span>
                            <span className="font-mono text-[10px] text-onpanel-faint">HOURS vs SIGNAL</span>
                        </div>

                        {/* Timeline Graphic */}
                        <div className="mt-5 space-y-5">
                            {/* Stage 1: Empirical Window */}
                            <div className="relative pl-5 border-l-2 border-amber-500/70 pb-1">
                                <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-amber-500" />
                                <div className="flex items-center justify-between font-mono text-[11.5px]">
                                    <span className="font-semibold text-onpanel-ink">0 – 24 Hours</span>
                                    <span className="text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-500/30">Empirical Window</span>
                                </div>
                                <p className="mt-1 font-sans text-[12.5px] leading-[1.5] text-onpanel-muted">
                                    Initial treatment choices made before lab results. <strong className="text-onpanel-ink">AMR-Insight operates here.</strong>
                                </p>
                            </div>

                            {/* Stage 2: Laboratory AST Window */}
                            <div className="relative pl-5 border-l-2 border-accent-blue/50">
                                <div className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full bg-accent-blue" />
                                <div className="flex items-center justify-between font-mono text-[11.5px]">
                                    <span className="font-semibold text-onpanel-ink">24 – 72 Hours</span>
                                    <span className="text-accent-blue bg-accent-blue/15 px-1.5 py-0.5 rounded text-[10px] font-medium border border-accent-blue/30">Lab AST Gold Standard</span>
                                </div>
                                <p className="mt-1 font-sans text-[12.5px] leading-[1.5] text-onpanel-muted">
                                    Full culture and laboratory AST confirmation. Definitive clinical result.
                                </p>
                            </div>
                        </div>

                        {/* Stat pill */}
                        <div className="mt-5 flex items-center justify-between rounded-xl bg-panel-raised p-3 border border-panel-border font-mono text-[11.5px]">
                            <span className="text-onpanel-muted">Target Window</span>
                            <span className="font-bold text-accent-blue">24–72 hrs early signal</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </ResearchSection>
    );
}