import { BacteriumMark } from "./BacteriumMark";

export const AuthLayout = ({ children, sideLabel = "SECURE ACCESS" }) => {
  return (
    <div
      className="min-h-screen w-full grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
      data-testid="auth-layout"
    >
      {/* Left — editorial column */}
      <aside className="relative hidden lg:flex flex-col justify-between border-r hairline p-12 xl:p-16 bg-paper">

        <div className="max-w-lg">
          <p className="font-mono-label text-ink-muted mb-8">
            RESEARCH · V0.9 &nbsp;·&nbsp; WHO AWaRe / GLASS aligned
          </p>
          <h1 className="font-serif-display text-5xl xl:text-6xl leading-[1.02] text-ink">
            A single{" "}
            <em className="italic text-ink-soft">bacterium</em>{" "}
            can outpace <br /> an entire{" "}
            <em className="italic text-ink-soft">
              antibiotic era.
            </em>
          </h1>
          <p className="mt-8 text-[15px] leading-relaxed text-ink-muted max-w-md">
            AI-powered antibiotic resistance intelligence. Predict susceptibility
            across 15 antibiotics from a validated public dataset, trained with
            CatBoost, aligned with WHO reference systems.
          </p>

          <div className="mt-10">
            <BacteriumMark className="w-64 h-24 text-ink-soft" />
          </div>
        </div>

        <div className="flex items-center justify-between font-mono-label text-ink-muted">
          <span>10,710 RECORDS · 15 ANTIBIOTICS · 2020–2025</span>
          <span>{sideLabel}</span>
        </div>
      </aside>

      {/* Right — form column */}
      <main className="relative flex flex-col min-h-screen">

        <div className="flex-1 flex items-start sm:items-center justify-center px-6 sm:px-10 py-10 sm:py-14">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <footer className="px-6 sm:px-10 py-6 border-t hairline flex flex-wrap items-center justify-between gap-3 font-mono-label text-ink-muted">
          <span>© AMR-INSIGHT · EDUCATIONAL USE</span>
          <span>NOT A CLINICAL DEVICE</span>
        </footer>
      </main>
    </div>
  );
};