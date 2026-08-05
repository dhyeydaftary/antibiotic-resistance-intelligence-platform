import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
};

const HEADER_OFFSET = 96;

/**
 * Shared shell for Terms & Conditions / Privacy Policy.
 *
 * sections: [{ id, number, heading, clauses: [string, ...] }]
 * definitions: [{ term, meaning }]  -- rendered as its own numbered "0. Definitions" section
 */
export default function LegalDocument({ kicker, title, effectiveDate, intro, definitions, sections, disclaimer }) {
    const [active, setActive] = useState(sections[0]?.id);
    const refs = useRef({});
    const reduceMotion = useReducedMotion();

    const allSections = [
        { id: 'definitions', number: '0', heading: 'Definitions', clauses: [] },
        ...sections,
    ];

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting);
                if (visible.length === 0) return;
                const topmost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
                setActive(topmost.target.id);
            },
            { rootMargin: `-${HEADER_OFFSET + 8}px 0px -65% 0px`, threshold: 0 }
        );
        Object.values(refs.current).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const scrollTo = useCallback((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [reduceMotion]);

    return (
        <div className="bg-canvas-alt">
            {/* Header */}
            <section className="px-6 pt-8 pb-8 sm:pt-12 sm:pb-10">
                <div className="mx-auto max-w-5xl">
                    <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-4 flex items-center gap-3">
                        <span className="h-px w-6 bg-canvas-hairline" />
                        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-page-faint">{kicker}</span>
                    </motion.div>

                    <motion.h1
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        variants={fadeUp}
                        className="font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[44px]"
                    >
                        {title}
                    </motion.h1>

                    <motion.div
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        variants={fadeUp}
                        className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-page-faint"
                    >
                        <span>Effective {effectiveDate}</span>
                        <span className="text-canvas-hairline">·</span>
                        <span>v1.0</span>
                    </motion.div>

                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        variants={fadeUp}
                        className="mt-5 max-w-2xl rounded-[14px] border-l-2 border-intermediate/50 bg-canvas-alt px-5 py-4 font-sans text-[13.5px] leading-[1.6] text-page-muted"
                    >
                        {intro}
                    </motion.p>
                </div>
            </section>

            {/* Body: sticky TOC + document card */}
            <div className="mx-auto max-w-5xl px-6 pb-16">
                <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
                    <nav aria-label="Sections" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                        <ul className="space-y-0.5 border-l border-canvas-hairline pl-4">
                            {allSections.map((s) => {
                                const isActive = s.id === active;
                                return (
                                    <li key={s.id} className="relative">
                                        {isActive && (
                                            <motion.span
                                                layoutId="legal-active-indicator"
                                                transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 }}
                                                className="absolute -left-4 top-0 h-full w-[2px] bg-accent-blue"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => scrollTo(s.id)}
                                            className={`block w-full py-1.5 text-left font-sans text-[13.5px] transition-colors ${isActive ? 'font-semibold text-page-ink' : 'text-page-muted hover:text-page-ink'
                                                }`}
                                        >
                                            <span className="mr-1.5 font-mono text-[11px] text-page-faint">{s.number}</span>
                                            {s.heading}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Document surface -- a real "paper" card, not text on the flat page */}
                    <div className="min-w-0 rounded-[24px] border border-canvas-hairline bg-white p-8 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(20,20,25,0.04),0_20px_40px_-24px_rgba(20,20,25,0.14)] sm:p-12">
                        <section id="definitions" ref={(el) => { refs.current.definitions = el; }} className="scroll-mt-24">
                            <h2 className="flex items-baseline gap-2.5 font-display text-[20px] font-semibold text-page-ink">
                                <span className="font-mono text-[13px] font-normal text-accent-blue">0</span>
                                Definitions
                            </h2>
                            <dl className="mt-4 space-y-3 border-t border-canvas-hairline pt-4">
                                {definitions.map((d) => (
                                    <div key={d.term} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                                        <dt className="shrink-0 font-sans text-[14px] font-semibold text-page-ink sm:w-40">&ldquo;{d.term}&rdquo;</dt>
                                        <dd className="font-sans text-[14px] leading-[1.6] text-page-muted">{d.meaning}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>

                        {sections.map((s, si) => (
                            <section
                                key={s.id}
                                id={s.id}
                                ref={(el) => { refs.current[s.id] = el; }}
                                className={`scroll-mt-24 ${si === 0 ? 'mt-10 border-t border-canvas-hairline pt-8' : 'mt-8 border-t border-canvas-hairline pt-8'}`}
                            >
                                <h2 className="flex items-baseline gap-2.5 font-display text-[20px] font-semibold text-page-ink">
                                    <span className="font-mono text-[13px] font-normal text-accent-blue">{s.number}</span>
                                    {s.heading}
                                </h2>
                                <div className="mt-4 space-y-3">
                                    {s.clauses.map((clause, ci) => (
                                        <p key={ci} className="flex gap-3 font-sans text-[14px] leading-[1.7] text-page-muted">
                                            <span className="shrink-0 font-mono text-[12px] text-page-faint">{s.number}.{ci + 1}</span>
                                            <span>{clause}</span>
                                        </p>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>

                {disclaimer && (
                    <motion.p
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        custom={0}
                        variants={fadeUp}
                        className="mx-auto mt-6 max-w-5xl font-mono text-[11px] uppercase tracking-wider text-page-faint lg:pl-[248px]"
                    >
                        {disclaimer}
                    </motion.p>
                )}
            </div>
        </div>
    );
}