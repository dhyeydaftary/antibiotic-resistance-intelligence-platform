import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AboutOpening from '../components/about/AboutOpening';
import AboutGap from '../components/about/AboutGap';
import AboutPhilosophy from '../components/about/AboutPhilosophy';
import AboutTrustBoundary from '../components/about/AboutTrustBoundary';
import AboutPipeline from '../components/about/AboutPipeline';
import AboutExplainability from '../components/about/AboutExplainability';
import AboutAudience from '../components/about/AboutAudience';
import AboutContributors from '../components/about/AboutContributors';
import AboutBackMatter from '../components/about/AboutBackMatter';
import AboutFutureWork from '../components/about/AboutFutureWork';

function AboutPage() {
    const location = useLocation();

    useEffect(() => {
        if (location.hash) {
            const targetId = location.hash.replace('#', '');
            const elem = document.getElementById(targetId);
            if (elem) {
                elem.scrollIntoView({ behavior: 'instant', block: 'start' });
            }
        } else {
            // Instant scroll to the very top when navigating to /about without a hash
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
    }, [location]);

    return (
        <div className="bg-canvas min-h-screen text-page-ink selection:bg-accent-blue selection:text-white">
            {/* Act I: Premise (Section 1) & The Gap (Section 2) */}
            <AboutOpening />
            <AboutGap />

            {/* Act II: Philosophy */}
            <AboutPhilosophy />

            {/* Act III: Trust Boundaries (Split-Screen Capability vs Limitation) */}
            <AboutTrustBoundary />

            {/* Act IV: Methodology & Explainability */}
            <AboutPipeline />
            <AboutExplainability />

            {/* Act V: People & Purpose */}
            <AboutAudience />
            <AboutContributors />

            {/* Act VI: Academic Back Matter (Appendix) */}
            <AboutBackMatter />

            {/* Act VII: Future Work & Closing Statement */}
            <AboutFutureWork />
        </div>
    );
}

export default AboutPage;