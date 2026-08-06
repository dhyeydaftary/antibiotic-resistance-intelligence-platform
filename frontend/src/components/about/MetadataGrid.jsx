const METADATA_ITEMS = [
    { label: 'Platform Version', value: 'v1.0.0' },
    { label: 'Dataset Coverage Window', value: '2020 – 2025' },
    { label: 'Dataset Record Count', value: '10,710 tabular rows' },
    { label: 'Antibiotics Modeled', value: '15 antibiotics' },
    { label: 'Model Architecture', value: '15 per-antibiotic CatBoost classifiers' },
    { label: 'Last Model Training Date', value: 'July 2026' },
    { label: 'WHO AWaRe Version', value: '2023 Edition' },
];

// Renders METADATA_ITEMS as a "model card"-style key/value table,
// used in AboutBackMatter.
export default function MetadataGrid() {
    return (
        <div className="flex h-full flex-col justify-between rounded-[20px] border border-canvas-hairline bg-white shadow-sm overflow-hidden">
            <div>
                <div className="border-b border-canvas-hairline bg-canvas-alt px-5 py-3.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-page-ink">
                        Platform Specifications
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2 py-0.5 rounded shrink-0">
                        MODEL CARD
                    </span>
                </div>

                <dl className="divide-y divide-canvas-hairline">
                    {METADATA_ITEMS.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-canvas-alt/50 transition-colors">
                            <dt className="font-sans text-[13px] text-page-muted">{item.label}</dt>
                            <dd className="font-mono text-[12.5px] font-semibold text-page-ink text-right">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </div>
    );
}
