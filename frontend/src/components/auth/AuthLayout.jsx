import { Target, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Panel from "../app/Panel";

export const AuthLayout = ({ children, sideLabel = "Secure access" }) => {
  return (
    <div
      className="relative min-h-screen w-full bg-canvas"
      data-testid="auth-layout"
    >
      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-page-ink transition-colors hover:text-accent-blue"
        >
          <ArrowLeft size={12} />
          Back to home
        </Link>
      </div>

      {/* One shared background — plain text on the left, the form as the
          only floating card on the right. Not two colored sections. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-16 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        {/* Left — plain text, same background as everything else */}
        <div className="hidden lg:block">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/10">
              <Target size={16} className="text-accent-blue" strokeWidth={2.2} />
            </div>
            <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-page-ink">
              AMR-Insight
            </span>
          </div>

          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-page-faint">
            Evidence before confidence.
          </p>
          <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.015em] text-page-ink xl:text-[46px]">
            One organism.
            <br />
            <span className="text-accent-blue">Fifteen predicted susceptibilities.</span>
          </h1>
          <p className="mt-6 max-w-md font-sans text-[15px] leading-relaxed text-page-muted">
            Fifteen independent CatBoost models estimate antibiotic susceptibility
            from organism and patient context — with SHAP explainability and WHO
            AWaRe alignment, while lab-based testing is still running.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] font-medium text-page-faint">
            <span>10,710 records · 15 antibiotics · 2020–2025</span>
          </div>
        </div>

        {/* Right — the ONLY floating card on the page: the form itself */}
        <Panel className="w-full !rounded-[26px] p-8 !shadow-panel-lg sm:p-10">{children}</Panel>
      </div>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-canvas-hairline px-6 py-6 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-page-faint sm:px-10">
        <span>© AMR-Insight · Educational use</span>
        <span>{sideLabel} · Not a clinical device</span>
      </footer>
    </div>
  );
};