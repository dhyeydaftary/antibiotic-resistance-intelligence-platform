import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Verified citation details, including the Kaggle dataset source.
const REFERENCES = [
    {
        citation:
            "World Health Organization. AWaRe classification of antibiotics for evaluation and monitoring of use, 2023.",
        url: 'https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.04',
    },
    {
        citation:
            'Lundberg, S. M. & Lee, S.-I. "A Unified Approach to Interpreting Model Predictions." Advances in Neural Information Processing Systems 30 (NeurIPS 2017).',
        url: 'https://arxiv.org/abs/1705.07874',
    },
    {
        citation:
            'Prokhorenkova, L., Gusev, G., Vorobev, A., Dorogush, A. V. & Gulin, A. "CatBoost: Unbiased Boosting with Categorical Features." Advances in Neural Information Processing Systems 31 (NeurIPS 2018).',
        url: 'https://arxiv.org/abs/1706.09516',
    },
    {
        citation: 'Imadeddine Hosni, A. "Multi-Resistance Antibiotic Susceptibility." Kaggle.',
        url: 'https://www.kaggle.com/datasets/adilimadeddinehosni/multi-resistance-antibiotic-susceptibility',
    },
];

export default function AboutReferences() {
    return (
        <section
            id="references"
            data-testid="about-references-section"
            className="bg-canvas px-6 py-10 sm:py-12"
        >
            <div className="mx-auto max-w-2xl">
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
                        References
                    </span>
                </motion.div>

                <motion.p
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="max-w-md font-sans text-[13px] italic leading-[1.6] text-page-faint"
                >
                    The literature and documentation this platform draws on.
                </motion.p>

                <ol className="mt-7 space-y-4">
                    {REFERENCES.map((ref, i) => (
                        <motion.li
                            key={ref.citation}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: '-60px' }}
                            custom={i + 2}
                            variants={fadeUp}
                            className="flex gap-3 font-sans text-[13px] leading-[1.6] text-page-muted"
                        >
                            <span className="shrink-0 font-mono text-[12px] text-page-faint">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            {ref.url ? (
                                <a
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group inline-flex items-start gap-1 hover:text-accent-blue"
                                >
                                    <span className="underline decoration-canvas-hairline underline-offset-2 group-hover:decoration-accent-blue">
                                        {ref.citation}
                                    </span>
                                    <ArrowUpRight size={12} className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                                </a>
                            ) : (
                                <span>{ref.citation}</span>
                            )}
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    );
}