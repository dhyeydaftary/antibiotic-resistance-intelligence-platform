import ResearchSection from './ResearchSection';
import TrustBoundaryPanel from './TrustBoundaryPanel';

const CLAIMS = [
    { label: 'Calibrated Confidence', text: 'Every prediction ships with a calibrated predict_proba() confidence score.' },
    { label: 'SHAP Explanation', text: 'Per-prediction feature attribution explains the model reasoning.' },
    { label: 'AWaRe Grouping', text: 'Classified according to WHO AWaRe stewardship framework.' },
    { label: 'Transparent Limits', text: 'Boundaries stated directly alongside capabilities.' },
];

export default function AboutPhilosophy() {
    return (
        <ResearchSection
            id="philosophy"
            testId="about-philosophy-section"
            kicker="Our philosophy"
            maxWidth="max-w-4xl"
        >
            <TrustBoundaryPanel
                quote="Evidence before confidence."
                subtext="A model that cannot explain itself has not earned the right to be trusted — even when it's right."
                claims={CLAIMS}
            />
        </ResearchSection>
    );
}