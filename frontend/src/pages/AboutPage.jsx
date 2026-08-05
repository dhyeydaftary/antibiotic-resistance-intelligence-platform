import usePageTitle from '../hooks/usePageTitle';
import AboutOpening from '../components/about/AboutOpening';
import AboutGap from '../components/about/AboutGap';
import AboutPhilosophy from '../components/about/AboutPhilosophy';
import AboutCapabilityList from '../components/about/AboutCapabilityList';
import AboutBoundaryList from '../components/about/AboutBoundaryList';
import AboutPipeline from '../components/about/AboutPipeline';
import AboutExplainability from '../components/about/AboutExplainability';
import AboutAudience from '../components/about/AboutAudience';
import AboutContributors from '../components/about/AboutContributors';
import AboutAcknowledgements from '../components/about/AboutAcknowledgements';
import AboutReferences from '../components/about/AboutReferences';
import AboutMetadata from '../components/about/AboutMetadata';
import AboutFutureWork from '../components/about/AboutFutureWork';

/* Thin hairline divider between every section */
function Divider() {
  return <div className="mx-auto max-w-3xl border-b border-canvas-hairline" />;
}

function AboutPage() {
  usePageTitle('About');
  
  return (
    <div className="bg-canvas">
      <AboutOpening />
      <Divider />
      <AboutGap />
      <Divider />
      <AboutPhilosophy />
      <Divider />
      <AboutCapabilityList />
      <AboutBoundaryList />
      <Divider />
      <AboutPipeline />
      <Divider />
      <AboutExplainability />
      <Divider />
      <AboutAudience />
      <Divider />
      <AboutContributors />
      <Divider />
      <AboutAcknowledgements />
      <Divider />
      <AboutFutureWork />
      <Divider />
      <AboutMetadata />
      <Divider />
      <AboutReferences />
    </div>
  );
}

export default AboutPage;