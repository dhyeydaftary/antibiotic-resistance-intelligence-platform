import { motion } from 'framer-motion';
import ResearchSection from './ResearchSection';

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
    }),
};

// Real output — pulled from catboost_CIP.pkl on dataset row 0
const EXAMPLE = {
    antibiotic: 'Ciprofloxacin (CIP)',
    result: 'Susceptible',
    confidence: 0.7421,
    patientContext:
        '37-year-old patient, Escherichia coli infection, no diabetes or hypertension — row 0 from training dataset, not a live patient.',
    features: [
        { label: 'Infection frequency', value: 1.5318, impact: 'Leans Susceptible' },
        { label: 'Organism: E. coli', value: 0.6856, impact: 'Leans Susceptible' },
        { label: 'Year of visit', value: 0.6202, impact: 'Leans Susceptible' },
        { label: 'Month of visit', value: -0.1486, impact: 'Leans Resistant' },
        { label: 'Hypertension status', value: -0.1426, impact: 'Leans Resistant' },
    ],
};

const MAX_ABS = Math.max(...EXAMPLE.features.map((f) => Math.abs(f.value)));

function ShapBar({ index, label, value, impact }) {
    const isPositive = value > 0;
    const widthPct = (Math.abs(value) / MAX_ABS) * 100;

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            custom={index}
            variants={fadeUp}
            className="flex flex-col sm:flex-row sm:items-center gap-2 py-2.5 border-b border-panel-border/60 last:border-0"
        >
            <div className="w-full sm:w-44 shrink-0">
                <span className="font-display text-[13.5px] font-semibold text-onpanel-ink">
                    {label}
                </span>
                <span className="block font-mono text-[10.5px] text-onpanel-faint">
                    {impact}
                </span>
            </div>

            <div className="relative h-5 flex-1">
                <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-panel-border" />
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${widthPct}%` }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${
                        isPositive ? 'left-1/2 bg-accent-blue shadow-[0_0_8px_rgba(0,113,227,0.4)]' : 'right-1/2 bg-onpanel-muted'
                    }`}
                    style={{ maxWidth: '50%' }}
                />
            </div>

            <span className="w-16 shrink-0 text-right font-mono text-[12px] font-semibold text-onpanel-ink">
                {isPositive ? '+' : ''}
                {value.toFixed(2)}
            </span>
        </motion.div>
    );
}

export default function AboutExplainability() {
    return (
        <ResearchSection
            id="explainability"
            testId="about-explainability-section"
            kicker="Explainability &amp; Responsible AI"
            title="Why every prediction comes with a reason."
            maxWidth="max-w-4xl"
        >
            <div className="space-y-6">
                <div className="space-y-3 font-sans text-[15.5px] leading-[1.7] text-page-muted">
                    <p>
                        Every model exposes CatBoost's native SHAP support — no external library required — attributing each prediction to the features that actually drove it. Alongside that, a calibrated confidence score comes straight from the model's predicted class probability.
                    </p>
                    <p className="rounded-[14px] border-l-2 border-accent-blue bg-canvas-alt p-4 font-medium text-page-ink border border-canvas-hairline">
                        <strong className="font-semibold text-page-ink">SHAP explains the model's reasoning, not clinical causality.</strong>{' '}
                        A feature contributing to a prediction means the model weighted it heavily — not that it caused the resistance pattern in reality.
                    </p>
                </div>

                {/* Worked SHAP Feature Attribution Sketch Card */}
                <div className="rounded-[20px] border border-panel-border bg-panel p-6 shadow-panel-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-panel-border pb-3">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                            WORKED FEATURE ATTRIBUTION SKETCH
                        </span>
                        <span className="font-mono text-[11px] text-onpanel-faint">
                            {EXAMPLE.antibiotic} · {(EXAMPLE.confidence * 100).toFixed(1)}% CONFIDENCE
                        </span>
                    </div>

                    <p className="mt-3 font-sans text-[12.5px] text-onpanel-muted bg-panel-raised p-3 rounded-xl border border-panel-border">
                        <strong className="text-onpanel-ink">Patient Context:</strong> {EXAMPLE.patientContext}
                    </p>

                    <div className="mt-4">
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-onpanel-faint mb-2">
                            <span>Feature Label</span>
                            <span className="hidden sm:inline">Impact Direction</span>
                            <span>SHAP Weight</span>
                        </div>
                        {EXAMPLE.features.map((f, i) => (
                            <ShapBar key={f.label} index={i} label={f.label} value={f.value} impact={f.impact} />
                        ))}
                    </div>

                    <p className="mt-4 font-sans text-[12px] text-onpanel-faint">
                        * Feature weights generated via CatBoost TreeSHAP for Ciprofloxacin prediction evaluation.
                    </p>
                </div>
            </div>
        </ResearchSection>
    );
}