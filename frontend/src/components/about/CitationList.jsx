// Real, verifiable academic citations backing the platform's claims
// (WHO AWaRe, the SHAP paper, the CatBoost paper, and the Kaggle dataset).
const REFERENCES = [
    {
        num: '01',
        citation: 'World Health Organization. AWaRe classification of antibiotics for evaluation and monitoring of use, 2023.',
        url: 'https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.04',
        venue: 'WHO Technical Guidance',
    },
    {
        num: '02',
        citation: 'Lundberg, S. M. & Lee, S.-I. "A Unified Approach to Interpreting Model Predictions." Advances in Neural Information Processing Systems 30 (NeurIPS 2017).',
        url: 'https://arxiv.org/abs/1705.07874',
        venue: 'NeurIPS 2017',
    },
    {
        num: '03',
        citation: 'Prokhorenkova, L., Gusev, G., Vorobev, A., Dorogush, A. V. & Gulin, A. "CatBoost: Unbiased Boosting with Categorical Features." Advances in Neural Information Processing Systems 31 (NeurIPS 2018).',
        url: 'https://arxiv.org/abs/1706.09516',
        venue: 'NeurIPS 2018',
    },
    {
        num: '04',
        citation: 'Imadeddine Hosni, A. "Multi-Resistance Antibiotic Susceptibility." Kaggle Dataset Repository.',
        url: 'https://www.kaggle.com/datasets/adilimadeddinehosni/multi-resistance-antibiotic-susceptibility',
        venue: 'Kaggle Dataset',
    },
];

// Renders REFERENCES as a linked citation card grid, used in AboutBackMatter.
export default function CitationList() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {REFERENCES.map((ref) => (
                <div
                    key={ref.num}
                    className="group flex flex-col justify-between rounded-[18px] border border-canvas-hairline bg-white p-5 shadow-sm transition-all hover:border-accent-blue/40 hover:shadow-md"
                >
                    <div className="flex items-start gap-3">
                        <span className="shrink-0 font-mono text-[11px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                            [{ref.num}]
                        </span>
                        <div className="flex-1">
                            <a
                                href={ref.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-sans text-[13.5px] leading-[1.5] text-page-ink font-medium hover:text-accent-blue transition-colors"
                            >
                                {ref.citation}
                            </a>
                        </div>
                    </div>
                    <div className="mt-3 border-t border-canvas-hairline/60 pt-2 flex items-center justify-between font-mono text-[10.5px] text-page-faint">
                        <span>Venue: {ref.venue}</span>
                        <span className="text-accent-blue group-hover:underline">View Source ↗</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
