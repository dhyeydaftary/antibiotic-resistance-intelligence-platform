import ResearchSection from './ResearchSection';
import PipelineDiagram from './PipelineDiagram';

// About page Act IV (methodology): wraps PipelineDiagram in the shared
// ResearchSection layout.
export default function AboutPipeline() {
    return (
        <ResearchSection
            id="methodology"
            testId="about-pipeline-section"
            kicker="How it was built"
            title="From data to prediction."
            subtitle="A five-stage pipeline, each stage visible. Select any stage to inspect its methodology."
            maxWidth="max-w-4xl"
        >
            <PipelineDiagram />
        </ResearchSection>
    );
}