import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Real values. AWaRe version confirmed as 2023 — matches the classification
// mapping actually used in predict.py's AWARE_MAP and Section 11's reference.
const METADATA = [
    { label: 'Platform version', value: 'v1.0' },
    { label: 'Dataset coverage', value: '2020–2025' },
    { label: 'Dataset size', value: '10,710 records' },
    { label: 'Antibiotics modeled', value: '15' },
    { label: 'Models', value: '15 per-antibiotic CatBoost classifiers' },
    { label: 'Last model training', value: 'July 2026' },
    { label: 'WHO AWaRe version referenced', value: '2023' },
];

export default function AboutMetadata() {
    return (
        <section
            id="platform-metadata"
            data-testid="about-metadata-section"
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
                        Documentation
                    </span>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="overflow-hidden rounded-[16px] border border-canvas-hairline bg-canvas-alt"
                >
                    <dl>
                        {METADATA.map((item, i) => (
                            <div
                                key={item.label}
                                className={`flex items-center justify-between gap-4 px-5 py-3 sm:px-6 ${i !== METADATA.length - 1 ? 'border-b border-canvas-hairline' : ''
                                    }`}
                            >
                                <dt className="font-sans text-[13px] text-page-muted">{item.label}</dt>
                                <dd className="font-mono text-[13px] text-page-ink">{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                </motion.div>
            </div>
        </section>
    );
}