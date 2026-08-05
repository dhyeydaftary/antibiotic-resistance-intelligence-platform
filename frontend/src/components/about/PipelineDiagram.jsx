import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
    {
        id: 'dataset',
        num: '01',
        label: 'Dataset',
        metric: '10,710 Records',
        note: '2020–2025 Kaggle dataset',
        detail: '10,710 records spanning 2020–2025, sourced from a public Kaggle dataset (Multi-Resistance Antibiotic Susceptibility) — non-clinical research data.',
        specs: [
            { label: 'Source', value: 'Kaggle Public AMR Data' },
            { label: 'Time Window', value: '2020 – 2025' },
            { label: 'Record Count', value: '10,710 tabular rows' },
            { label: 'Data Type', value: 'De-identified research data' },
        ],
    },
    {
        id: 'preprocessing',
        num: '02',
        label: 'Preprocessing',
        metric: 'Feature Engineering',
        note: 'Encoding & cleaning',
        detail: 'Cleaning, target & frequency encoding, and feature engineering prepare organism, patient demographics, and antibiotic interaction features.',
        specs: [
            { label: 'Encoding', value: 'Target & Frequency Encoding' },
            { label: 'Missingness', value: 'Checked & verified' },
            { label: 'Data Leakage', value: 'Zero leakage guarantee' },
            { label: 'Grouping', value: 'Organism & demographic bins' },
        ],
    },
    {
        id: 'models',
        num: '03',
        label: '15 CatBoost Models',
        metric: 'Per-Antibiotic',
        note: '15 classifiers',
        detail: 'One independent CatBoost classifier trained per antibiotic. No shared bias or cascading assumptions between antibiotic predictions.',
        specs: [
            { label: 'Architecture', value: 'Gradient Boosted Decision Trees' },
            { label: 'Model Count', value: '15 CatBoost classifiers' },
            { label: 'Independence', value: 'Isolated per-antibiotic training' },
            { label: 'Tuning', value: 'Hyper-parameter optimized' },
        ],
    },
    {
        id: 'shap',
        num: '04',
        label: 'SHAP Explainability',
        metric: 'TreeSHAP',
        note: 'Feature attribution',
        detail: "CatBoost's native SHAP (SHapley Additive exPlanations) support attributes each prediction to the specific features that actually drove it.",
        specs: [
            { label: 'Attribution Engine', value: 'Native CatBoost TreeSHAP' },
            { label: 'Output Type', value: 'Exact feature weights' },
            { label: 'Auditability', value: 'Transparent feature contributions' },
            { label: 'Causality', value: 'Model reasoning (non-clinical)' },
        ],
    },
    {
        id: 'prediction',
        num: '05',
        label: 'Prediction + Confidence',
        metric: 'R / S / I Category',
        note: 'Calibrated score',
        detail: 'Resistant, Susceptible, or Intermediate classification — paired with a calibrated confidence score straight from predict_proba().',
        specs: [
            { label: 'Classification', value: 'Resistant / Susceptible / Intermediate' },
            { label: 'Confidence Score', value: 'Calibrated predict_proba()' },
            { label: 'Stewardship', value: 'WHO AWaRe Group Mapping' },
            { label: 'Export', value: 'Exportable JSON / PDF report' },
        ],
    },
];

export default function PipelineDiagram() {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeStage = STAGES[activeIndex];

    return (
        <div className="rounded-[24px] border border-panel-border bg-panel p-6 sm:p-8 shadow-panel-md overflow-hidden">
            {/* Top Pipeline Stage Tab Strip */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 border-b border-panel-border pb-6">
                {STAGES.map((stage, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <button
                            key={stage.id}
                            type="button"
                            onClick={() => setActiveIndex(i)}
                            className={`group relative flex flex-col justify-between rounded-xl p-4 text-left transition-all ${
                                isActive
                                    ? 'bg-panel-raised border border-accent-blue/50 shadow-sm'
                                    : 'hover:bg-panel-raised/40 border border-transparent'
                            }`}
                        >
                            {/* Step Number & Glowing Active Indicator Dot */}
                            <div className="flex items-center justify-between">
                                <span className={`font-mono text-[10.5px] font-bold tracking-wider ${isActive ? 'text-accent-blue' : 'text-onpanel-faint'}`}>
                                    STAGE {stage.num}
                                </span>
                                {isActive && (
                                    <span className="h-2 w-2 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(0,113,227,0.8)]" />
                                )}
                            </div>

                            {/* Stage Label & Metric */}
                            <div className="mt-3">
                                <h4 className="font-display text-[14.5px] font-semibold text-onpanel-ink leading-tight">
                                    {stage.label}
                                </h4>
                                <p className="mt-1 font-mono text-[11px] text-onpanel-muted truncate">
                                    {stage.metric}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Stage Detail Content Area */}
            <div className="pt-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="space-y-5"
                    >
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-panel-border pb-4">
                            <div>
                                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                                    STAGE {activeStage.num} ARCHITECTURE · {activeStage.label}
                                </span>
                                <h3 className="mt-1 font-display text-[22px] font-semibold text-onpanel-ink">
                                    {activeStage.metric}
                                </h3>
                            </div>
                            <span className="font-mono text-[11px] text-onpanel-faint bg-panel-raised px-3 py-1 rounded-full border border-panel-border">
                                Step {activeIndex + 1} of 5
                            </span>
                        </div>

                        {/* Description */}
                        <p className="font-sans text-[15.5px] leading-[1.65] text-onpanel-ink">
                            {activeStage.detail}
                        </p>

                        {/* Key Specs 2x2 Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {activeStage.specs.map((spec) => (
                                <div
                                    key={spec.label}
                                    className="flex items-center justify-between rounded-xl bg-panel-raised px-4 py-3 border border-panel-border"
                                >
                                    <span className="font-sans text-[13px] text-onpanel-muted">{spec.label}</span>
                                    <span className="font-mono text-[12px] font-semibold text-onpanel-ink">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
