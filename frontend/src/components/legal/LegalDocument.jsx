import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
    }),
};

/**
 * Shared shell for Terms & Conditions / Privacy Policy: a single,
 * continuously flowing document -- no sidebar, no tabs, no accordion.
 * Hierarchy is carried by type alone: a large, tight-tracked title;
 * section headers sized and weighted well above body copy, with a
 * small accent-colored number for a wayfinding cue; loose-leaded body
 * paragraphs sized for sustained reading. Spacing scales with
 * Tailwind's rem-based utilities throughout, not fixed pixel values.
 *
 * sections: [{ id, number, heading, clauses: [string, ...] }]
 * definitions: [{ term, meaning }] -- rendered as its own "0. Definitions" section
 */
export default function LegalDocument({ kicker, title, effectiveDate, intro, definitions, sections, disclaimer }) {
    return (
        <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
            <header>
                <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-4 flex items-center gap-3">
                    <span className="h-px w-6 bg-canvas-hairline" />
                    <span className="font-mono text-mono-label uppercase text-page-faint">{kicker}</span>
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
                    className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-mono-label uppercase text-page-faint"
                >
                    <span>Effective {effectiveDate}</span>
                    <span className="text-canvas-hairline">·</span>
                    <span>v1.0</span>
                </motion.div>

                {intro && (
                    <motion.p
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        variants={fadeUp}
                        className="mt-8 text-body-lg text-page-muted"
                    >
                        {intro}
                    </motion.p>
                )}
            </header>

            <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
                {definitions?.length > 0 && (
                    <section aria-labelledby="definitions-heading">
                        <h2 id="definitions-heading" className="flex items-baseline gap-3 font-display text-h2 text-page-ink">
                            <span className="font-mono text-body text-accent-blue">0</span>
                            Definitions
                        </h2>
                        <dl className="mt-6 space-y-5 border-t border-canvas-hairline pt-6">
                            {definitions.map((d) => (
                                <div key={d.term} className="sm:flex sm:gap-6">
                                    <dt className="text-[16px] font-semibold leading-[1.5] text-page-ink sm:w-48 sm:shrink-0">
                                        &ldquo;{d.term}&rdquo;
                                    </dt>
                                    <dd className="mt-1.5 text-body-lg text-page-muted sm:mt-0">
                                        {d.meaning}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}

                {sections.map((s) => (
                    <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`}>
                        <h2 id={`${s.id}-heading`} className="flex items-baseline gap-3 font-display text-h2 text-page-ink">
                            <span className="font-mono text-body text-accent-blue">{s.number}</span>
                            {s.heading}
                        </h2>
                        <div className="mt-6 space-y-4 border-t border-canvas-hairline pt-6">
                            {s.clauses.map((clause, ci) => (
                                <p key={ci} className="text-body-lg text-page-muted">
                                    {clause}
                                </p>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {disclaimer && (
                <p className="mt-16 border-t border-canvas-hairline pt-8 font-mono text-mono-label uppercase text-page-faint sm:mt-20">
                    {disclaimer}
                </p>
            )}
        </article>
    );
}
