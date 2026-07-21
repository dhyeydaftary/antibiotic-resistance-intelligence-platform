export default function Footer() {
  return (
    <footer
      data-testid="site-footer"
      className="relative bg-paper border-t border-hairline pt-16 pb-10"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5">
            <div className="flex items-center gap-3">
              <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden>
                <circle cx="20" cy="20" r="18" stroke="#12141A" strokeWidth="1.2" />
                <circle cx="20" cy="20" r="10" stroke="#2C7A6B" strokeWidth="1.2" />
                <circle cx="20" cy="20" r="3" fill="#12141A" />
              </svg>
              <div>
                <div className="font-serif text-lg text-ink">AMR-Insight</div>
                <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-ink/50 mt-0.5">
                  Antibiotic Resistance Intelligence · Research build
                </div>
              </div>
            </div>
            <p className="mt-6 font-sans text-sm text-ink/60 max-w-md leading-relaxed">
              A research and education platform. Not intended for clinical
              decision-making or patient care. Predictions are contextualised against
              WHO AWaRe classification for pedagogical use only.
            </p>
          </div>
          <div className="col-span-6 md:col-span-2 md:col-start-7">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-4">
              Platform
            </div>
            <ul className="space-y-2 font-sans text-sm">
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#how" data-testid="footer-how">How it works</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#trends" data-testid="footer-trends">Trends</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#dataset" data-testid="footer-dataset">Dataset</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#cta" data-testid="footer-try">Try a prediction</a></li>
            </ul>
          </div>
          <div className="col-span-6 md:col-span-2">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-4">
              Research
            </div>
            <ul className="space-y-2 font-sans text-sm">
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#context" data-testid="footer-context">Context</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#manifesto" data-testid="footer-manifesto">Manifesto</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#dataset" data-testid="footer-open-data">Open data</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#" data-testid="footer-paper">Method paper</a></li>
            </ul>
          </div>
          <div className="col-span-12 md:col-span-2">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50 mb-4">
              Contact
            </div>
            <ul className="space-y-2 font-sans text-sm">
              <li><a className="text-ink/80 hover:text-ink link-underline" href="mailto:research@amr-insight.org" data-testid="footer-email">research@amr-insight.org</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="https://github.com/dhyeydaftary/antibiotic-resistance-intelligence-platform" data-testid="footer-github">GitHub</a></li>
              <li><a className="text-ink/80 hover:text-ink link-underline" href="#" data-testid="footer-changelog">Changelog</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-hairline flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50">
            © 2026 AMR-Insight · Research & Education platform
          </div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50">
            Aligned with WHO AWaRe · GLASS · Not for clinical use
          </div>
        </div>
      </div>
    </footer>
  );
}
