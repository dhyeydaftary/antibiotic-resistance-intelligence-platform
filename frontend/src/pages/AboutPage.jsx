import { Cpu, Database, ShieldAlert, Users } from 'lucide-react';

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
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
          About the platform
        </div>
        <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[48px]">
          AMR-Insight
        </h1>
        <p className="mt-4 max-w-xl font-sans text-[16px] leading-[1.6] text-page-muted">
          A research and education platform that predicts antibiotic resistance
          (Resistant / Susceptible / Intermediate) across 15 antibiotics, aligned
          with WHO AWaRe classification.
        </p>

        <div className="my-8 flex items-start gap-2 rounded-[14px] border border-intermediate/30 bg-intermediate/[0.06] p-4">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-intermediate" />
          <p className="font-sans text-[13px] leading-[1.55] text-page-muted">
            This is a student project built for academic purposes and is <span className="font-semibold text-page-ink">not intended for real clinical decision-making</span>.
            Predictions are based on a public Kaggle dataset, not live hospital lab feeds, and should
            never substitute for laboratory-based antibiotic susceptibility testing.
          </p>
        </div>

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
  );
}

export default AboutPage;