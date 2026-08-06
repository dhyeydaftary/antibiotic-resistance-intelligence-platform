import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Panel from '../app/Panel';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
};

/**
 * Shared shell for Terms & Conditions / Privacy Policy (Stepped, Looping Section Navigator).
 *
 * sections: [{ id, number, heading, clauses: [string, ...] }]
 * definitions: [{ term, meaning }]  -- rendered as its own numbered "0. Definitions" section
 */
export default function LegalDocument({ kicker, title, effectiveDate, intro, definitions, sections, disclaimer }) {
    const allSections = [
        { id: 'definitions', number: '0', heading: 'Definitions', clauses: [] },
        ...sections,
    ];

    const [activeIndex, setActiveIndex] = useState(0);
    const reduceMotion = useReducedMotion();
    const panelRef = useRef(null);
    const isLockedRef = useRef(false);
    const touchStartYRef = useRef(0);

    const total = allSections.length;

    // Always reset active section to 0 (Definitions) & scroll window to top whenever opening or switching legal pages
    useEffect(() => {
        setActiveIndex(0);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [title]);

    // Sets the active section (wrapping around at both ends), with an
    // optional 550ms input lock so a fast scroll/swipe can't skip
    // multiple sections in one gesture.
    // Centralized index navigator with modulo looping
    const goToIndex = useCallback((newIndex, forceLock = true) => {
        if (forceLock && isLockedRef.current) return;
        const normalized = ((newIndex % total) + total) % total;
        setActiveIndex(normalized);
        if (forceLock) {
            isLockedRef.current = true;
            setTimeout(() => {
                isLockedRef.current = false;
            }, 550);
        }
    }, [total]);

    // Intercepts mouse-wheel scroll over the document panel and steps
    // through sections one at a time, instead of scrolling the page.
    // Wheel event handler on document panel (intercepts scroll over panel & steps through sections)
    useEffect(() => {
        const panelEl = panelRef.current;
        if (!panelEl) return;

        const handleWheel = (e) => {
            e.preventDefault();
            if (isLockedRef.current) return;
            if (Math.abs(e.deltaY) < 12) return;

            if (e.deltaY > 0) {
                goToIndex(activeIndex + 1, true);
            } else if (e.deltaY < 0) {
                goToIndex(activeIndex - 1, true);
            }
        };

        panelEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            panelEl.removeEventListener('wheel', handleWheel);
        };
    }, [activeIndex, goToIndex]);

    // Records the touch start Y position, to compute swipe distance on touchend.
    const handleTouchStart = (e) => {
        if (e.touches && e.touches.length > 0) {
            touchStartYRef.current = e.touches[0].clientY;
        }
    };

    // Advances/retreats a section on a vertical swipe past a 40px threshold.
    const handleTouchEnd = (e) => {
        if (isLockedRef.current) return;
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchStartYRef.current - touchEndY;

        if (Math.abs(deltaY) > 40) {
            if (deltaY > 0) {
                // Swiped UP -> advance to next section
                goToIndex(activeIndex + 1, true);
            } else {
                // Swiped DOWN -> previous section
                goToIndex(activeIndex - 1, true);
            }
        }
    };

    const activeItem = allSections[activeIndex] || allSections[0];

    return (
        <div>
            {/* Header */}
            <section className="px-6 pt-8 pb-8 sm:pt-12 sm:pb-10">
                <div className="mx-auto max-w-5xl">
                    <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-4 flex items-center gap-3">
                        <span className="h-px w-6 bg-canvas-hairline" />
                        <span className="font-mono text-mono-label uppercase tracking-[0.08em] text-page-faint">{kicker}</span>
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

                    {intro && (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            custom={3}
                            variants={fadeUp}
                            className="mt-5 max-w-2xl rounded-[14px] border border-panel-border bg-panel px-5 py-4"
                        >
                            <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-accent-blue">
                                Scope &amp; Context
                            </span>
                            <p className="font-sans text-[13.5px] leading-[1.6] text-onpanel-muted">
                                {intro}
                            </p>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* Main Content Area */}
            <div className="mx-auto max-w-5xl px-6 pb-16">
                {/* Mobile Tab Strip (< lg breakpoint) */}
                <nav aria-label="Sections Mobile" className="mb-6 flex overflow-x-auto gap-2 pb-3 border-b border-canvas-hairline lg:hidden no-scrollbar">
                    {allSections.map((s, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => goToIndex(idx, false)}
                                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${
                                    isActive
                                        ? 'bg-panel text-onpanel-ink border border-panel-border shadow-sm'
                                        : 'text-page-muted hover:text-page-ink'
                                }`}
                            >
                                <span className="mr-1.5 font-mono text-[11px] text-accent-blue">{s.number}</span>
                                {s.heading}
                            </button>
                        );
                    })}
                </nav>

                <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
                    {/* Desktop Vertical Sidebar (lg breakpoint) */}
                    <nav aria-label="Sections Desktop" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                        <ul className="space-y-0.5 border-l border-canvas-hairline pl-4">
                            {allSections.map((s, idx) => {
                                const isActive = idx === activeIndex;
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
                                            onClick={() => goToIndex(idx, false)}
                                            className={`block w-full py-1.5 text-left font-sans text-[13.5px] transition-colors ${
                                                isActive ? 'font-semibold text-page-ink' : 'text-page-muted hover:text-page-ink'
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

                    {/* Document Panel - Single Active Section with snug card bounds */}
                    <Panel
                        ref={panelRef}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        className="min-w-0 p-8 sm:p-10 select-none"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                                transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {activeItem.id === 'definitions' ? (
                                    <section id="definitions">
                                        <h2 className="flex items-baseline gap-2.5 font-display text-[20px] font-semibold text-onpanel-ink">
                                            <span className="font-mono text-[13px] font-normal text-accent-blue">0</span>
                                            Definitions
                                        </h2>
                                        <dl className="mt-4 space-y-3 border-t border-panel-border pt-4">
                                            {definitions.map((d) => (
                                                <div key={d.term} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                                                    <dt className="shrink-0 font-sans text-[14px] font-semibold text-onpanel-ink sm:w-40">
                                                        &ldquo;{d.term}&rdquo;
                                                    </dt>
                                                    <dd className="font-sans text-[14px] leading-[1.6] text-onpanel-muted">
                                                        {d.meaning}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </section>
                                ) : (
                                    <section id={activeItem.id}>
                                        <h2 className="flex items-baseline gap-2.5 font-display text-[20px] font-semibold text-onpanel-ink">
                                            <span className="font-mono text-[13px] font-normal text-accent-blue">{activeItem.number}</span>
                                            {activeItem.heading}
                                        </h2>
                                        <div className="mt-4 space-y-3 border-t border-panel-border pt-4">
                                            {activeItem.clauses.map((clause, ci) => (
                                                <p key={ci} className="flex gap-3 font-sans text-[14px] leading-[1.7] text-onpanel-muted">
                                                    <span className="shrink-0 font-mono text-[12px] text-onpanel-faint">
                                                        {activeItem.number}.{ci + 1}
                                                    </span>
                                                    <span>{clause}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Step / Dot Indicators at Bottom of Panel */}
                        <div className="mt-8 flex items-center justify-center gap-2 border-t border-panel-border pt-5">
                            {allSections.map((s, idx) => {
                                const isActive = idx === activeIndex;
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => goToIndex(idx, false)}
                                        aria-label={`Go to section ${s.number}: ${s.heading}`}
                                        className={`h-1.5 transition-all duration-300 rounded-full ${
                                            isActive ? 'w-5 bg-accent-blue' : 'w-1.5 bg-panel-border hover:bg-onpanel-muted'
                                        }`}
                                    />
                                );
                            })}
                        </div>
                    </Panel>
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