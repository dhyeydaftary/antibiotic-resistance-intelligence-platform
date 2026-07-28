import { Cpu, Database, ShieldAlert, Users } from 'lucide-react';
import AboutOpening from '../components/about/AboutOpening';
import AboutGap from '../components/about/AboutGap';
import AboutPhilosophy from '../components/about/AboutPhilosophy';
import AboutCapabilityList from '../components/about/AboutCapabilityList';
import AboutBoundaryList from '../components/about/AboutBoundaryList';
import AboutPipeline from '../components/about/AboutPipeline';
import AboutExplainability from '../components/about/AboutExplainability';

function InfoCard({ icon: Icon, label, id, children }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-[16px] border border-canvas-hairline bg-canvas-alt p-5">
      <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-page-faint">
        <Icon size={13} /> {label}
      </div>
      <div className="font-sans text-[14px] leading-[1.6] text-page-muted">{children}</div>
    </div>
  );
}

function AboutPage() {
  return (
    <div>
      <AboutOpening />
      <AboutGap />
      <AboutPhilosophy />
      <AboutCapabilityList />
      <AboutBoundaryList />
      <AboutPipeline />
      <AboutExplainability />

      {/* TODO(about-redesign): everything below is the legacy compact layout.
          Will be replaced section-by-section per the redesign plan (Sections 2-13). */}
      <div className="px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard icon={Cpu} label="Methodology" id="methodology">
              15 independent CatBoost classifiers, one per antibiotic, trained on
              patient and organism features. Explainability via CatBoost's native
              SHAP (TreeSHAP) support. Confidence scores from each model's predicted
              class probability.
            </InfoCard>

            <InfoCard icon={Database} label="Dataset" id="dataset">
              Public Kaggle AMR dataset — 10,710 records, 15 antibiotic targets,
              2020–2025. Categorization follows WHO AWaRe (Access / Watch / Reserve)
              antibiotic classification.
            </InfoCard>

            <InfoCard icon={Users} label="Team">
              Built by a 3-person team as a combined Full Stack Development and
              Python/FCSP semester project.
            </InfoCard>

            <InfoCard icon={ShieldAlert} label="Scope">
              Single user type, no clinical authentication tiers. Built for
              learning and demonstration, not deployment in a healthcare setting.
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;