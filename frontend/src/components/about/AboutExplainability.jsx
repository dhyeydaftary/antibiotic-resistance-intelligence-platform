import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Real output — pulled from catboost_CIP.pkl on an actual row from
// X_engineered.csv (dataset row 0), via the same get_feature_importance
// call used in predict.py. Not illustrative/mocked values.
const EXAMPLE = {
    antibiotic: 'Ciprofloxacin (CIP)',
    result: 'Susceptible',
    confidence: 0.7421,
    patientContext:
        '37-year-old patient, Escherichia coli infection, no diabetes or hypertension, no prior hospitalization — one row from the training dataset, not a live patient.',
    features: [
        { label: 'Infection frequency', value: 1.5318 },
        { label: 'Organism: E. coli', value: 0.6856 },
        { label: 'Year of visit', value: 0.6202 },
        { label: 'Month of visit', value: -0.1486 },
        { label: 'Hypertension status', value: -0.1426 },
    ],
};

const MAX_ABS = Math.max(...EXAMPLE.features.map((f) => Math.abs(f.value)));

function ShapBar({ index, label, value }) {
    const isPositive = value > 0;
    const widthPct = (Math.abs(value) / MAX_ABS) * 100;

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            custom={index}
            variants={fadeUp}
            className="flex items-center gap-4 py-2.5"
        >
            <span className="w-32 shrink-0 font-sans text-[13px] leading-[1.4] text-page-muted sm:w-40">
                {label}
            </span>
            <div className="relative h-6 flex-1">
                <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-canvas-hairline" />
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${widthPct}%` }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${isPositive ? 'left-1/2 bg-accent-blue/70' : 'right-1/2 bg-page-faint/60'
                        }`}
                    style={{ maxWidth: '50%' }}
                />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[12px] text-page-faint">
                {isPositive ? '+' : ''}
                {value.toFixed(2)}
            </span>
        </motion.div>
    );
}

export default function AboutExplainability() {
    return (
        <section
            id="explainability"
            data-testid="about-explainability-section"
            className="bg-canvas-alt px-6 py-20 sm:py-24"
        >
            <div className="mx-auto max-w-3xl">
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
                        Explainability &amp; responsible AI
                    </span>
                </motion.div>

                <motion.h2
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={1}
                    variants={fadeUp}
                    className="max-w-lg font-display text-[28px] font-semibold leading-[1.2] tracking-[-0.015em] text-page-ink sm:text-[32px]"
                >
                    Why every prediction comes with a reason.
                </motion.h2>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={2}
                    variants={fadeUp}
                    className="mt-5 max-w-xl space-y-3 font-sans text-[15px] leading-[1.7] text-page-muted"
                >
                    <p>
                        Every model exposes CatBoost's native SHAP support — no external
                        library required — attributing each prediction to the features
                        that actually drove it. Alongside that, a calibrated confidence
                        score comes straight from the model's predicted class
                        probability, not a separate estimate bolted on afterward.
                    </p>
                    <p>
                        One distinction worth being precise about:{' '}
                        <span className="font-medium text-page-ink">
                            SHAP explains the model's reasoning, not clinical causality.
                        </span>{' '}
                        A feature contributing to a prediction means the model weighted
                        it heavily — not that it caused the resistance pattern in
                        reality.
                    </p>
                </motion.div>

                {/* Real SHAP example */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-100px' }}
                    custom={3}
                    variants={fadeUp}
                    className="mt-10 rounded-[16px] border border-canvas-hairline bg-canvas p-5 sm:p-7"
                >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-canvas-hairline pb-4">
                        <div>
                            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-page-faint">
                                Example prediction
                            </div>
                            <div className="mt-1 font-display text-[16px] font-semibold text-page-ink">
                                {EXAMPLE.antibiotic} — {EXAMPLE.result}
                            </div>
                        </div>
                        <div className="font-mono text-[13px] text-accent-blue">
                            {(EXAMPLE.confidence * 100).toFixed(1)}% confidence
                        </div>
                    </div>

                    <p className="mt-4 font-sans text-[13px] leading-[1.6] text-page-faint">
                        {EXAMPLE.patientContext}
                    </p>

                    <div className="mt-5">
                        {EXAMPLE.features.map((f, i) => (
                            <ShapBar key={f.label} index={i} label={f.label} value={f.value} />
                        ))}
                    </div>

                    <p className="mt-4 font-sans text-[12px] leading-[1.5] text-page-faint">
                        Example explanation for one prediction, pulled from an actual
                        model run. Feature weights vary by case.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}