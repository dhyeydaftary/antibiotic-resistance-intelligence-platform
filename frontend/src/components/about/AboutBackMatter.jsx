import ResearchSection from './ResearchSection';
import CitationList from './CitationList';
import MetadataGrid from './MetadataGrid';

const ACKNOWLEDGEMENTS = [
    { label: 'Data Provenance', body: 'The Kaggle AMR dataset and its original contributors for open research access.' },
    { label: 'Classification Framework', body: "World Health Organization's AWaRe antibiotic stewardship framework (2023)." },
    { label: 'Open-Source Stack', body: 'CatBoost & SHAP for ML modeling; Django, Node.js, and React for platform architecture.' },
    { label: 'Academic Context', body: 'Developed as a semester project spanning Full Stack Development and Python/FCSP.' },
];

export default function AboutBackMatter() {
    return (
        <ResearchSection
            id="back-matter"
            testId="about-back-matter-section"
            kicker="Appendix &amp; Documentation"
            title="Acknowledgements, References &amp; Platform Details"
            subtitle="Documented according to academic reference standards."
            maxWidth="max-w-4xl"
            className="bg-canvas-alt"
        >
            <div className="space-y-10">
                {/* Top Symmetrical Row: Interchanged — Platform Details Card on Left & Acknowledgements Card on Right */}
                <div id="dataset" className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch scroll-mt-24">
                    {/* Left: Platform Details & Dataset Model Card */}
                    <MetadataGrid />

                    {/* Right: Acknowledgements Card */}
                    <div className="flex h-full flex-col justify-between rounded-[20px] border border-canvas-hairline bg-white shadow-sm overflow-hidden">
                        <div>
                            <div className="border-b border-canvas-hairline bg-canvas-alt px-5 py-3.5 flex items-center justify-between">
                                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-page-ink">
                                    Acknowledgements
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-2 py-0.5 rounded">
                                    CONTRIBUTIONS
                                </span>
                            </div>

                            <dl className="divide-y divide-canvas-hairline">
                                {ACKNOWLEDGEMENTS.map((item) => (
                                    <div key={item.label} className="p-4 hover:bg-canvas-alt/50 transition-colors">
                                        <dt className="font-mono text-[11px] font-semibold text-accent-blue">
                                            {item.label}
                                        </dt>
                                        <dd className="mt-1 font-sans text-[13px] leading-[1.5] text-page-muted">
                                            {item.body}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Scientific References Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-canvas-hairline pb-2">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-blue">
                            SCIENTIFIC REFERENCES
                        </span>
                        <span className="font-mono text-[10px] text-page-faint">
                            04 KEY CITATIONS
                        </span>
                    </div>
                    <CitationList />
                </div>
            </div>
        </ResearchSection>
    );
}
