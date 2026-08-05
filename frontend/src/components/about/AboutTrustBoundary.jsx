import ResearchSection from './ResearchSection';
import ComparisonPanel from './ComparisonPanel';

const CAPABILITIES = [
    { title: 'Multi-Antibiotic Modeling', desc: 'Predicts Resistant / Susceptible / Intermediate across 15 antibiotics from patterns in historical data.' },
    { title: 'Calibrated Confidence', desc: 'Reports a calibrated confidence score for every prediction.' },
    { title: 'SHAP Feature Attribution', desc: 'Explains each prediction with SHAP-based feature attribution.' },
    { title: 'WHO AWaRe Category', desc: 'Classifies antibiotics by WHO AWaRe category (Access / Watch / Reserve).' },
    { title: 'Dataset Trend Mining', desc: 'Surfaces resistance trends across the underlying dataset.' },
];

const BOUNDARIES = [
    { title: 'Not a Medical Device', desc: 'Is not a medical device and has not undergone clinical validation.' },
    { title: 'Does Not Replace AST', desc: 'Does not replace antibiotic susceptibility testing (AST).' },
    { title: 'No Treatment Decisions', desc: 'Does not make treatment decisions or recommend specific antibiotics for patient care.' },
    { title: 'Static Research Data', desc: 'Is not trained on live clinical or patient-identified data.' },
    { title: 'Not for Clinical Use', desc: 'Should not be used by clinicians, patients, or caregivers to guide real-world treatment.' },
];

export default function AboutTrustBoundary() {
    return (
        <ResearchSection
            id="trust-boundaries"
            testId="about-trust-boundary-section"
            kicker="Boundaries &amp; Scope"
            title="Capabilities on one side. Boundaries on the other."
            subtitle="We present what this platform can do directly alongside what it cannot. Symmetry forces clarity."
            maxWidth="max-w-4xl"
        >
            <ComparisonPanel
                capabilities={CAPABILITIES}
                boundaries={BOUNDARIES}
            />
        </ResearchSection>
    );
}
