import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, ShieldAlert } from 'lucide-react';

const FOUNDATIONS = ['CatBoost', 'SHAP', 'WHO AWaRe', 'Explainable AI', 'Transparent ML'];

export default function Footer({ lenisRef }) {
  const handleAnchorClick = (e, href) => {
    e.preventDefault();
    if (lenisRef?.current) {
      lenisRef.current.scrollTo(href, { duration: 1.2, offset: -80 });
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer data-testid="site-footer" className="border-t border-canvas-hairline bg-canvas pb-10 pt-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-14">
        {/* Closing statement — the last landing spot for the recurring motif */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-accent-blue">
            Evidence before confidence.
          </span>
          <p className="mt-4 font-display text-[22px] font-medium leading-[1.5] text-page-ink sm:text-[26px]">
            Built for students.
            <br />
            Designed for researchers.
            <br />
            Grounded in transparency.
          </p>
        </motion.div>

        {/* Scientific identity — one clear sentence on what this is */}
        <p className="mx-auto mt-6 max-w-md border-b border-canvas-hairline pb-14 text-center font-sans text-[13px] italic leading-[1.6] text-page-faint">
          Machine learning for antimicrobial susceptibility prediction using
          explainable AI and evidence-based workflows.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/10">
                <Target size={16} className="text-accent-blue" strokeWidth={2.2} />
              </div>
              <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-page-ink">
                AMR-Insight
              </span>
            </div>
            <p className="mt-5 max-w-md font-sans text-[13px] leading-[1.65] text-page-muted">
              A research and education platform. Predictions are contextualized
              against WHO AWaRe classification for pedagogical use only.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-page-faint">
              Platform
            </div>
            <ul className="space-y-2.5 font-sans text-[13px]">
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="#how" onClick={(e) => handleAnchorClick(e, "#how")} data-testid="footer-how">How it works</a></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="#capabilities" onClick={(e) => handleAnchorClick(e, "#capabilities")} data-testid="footer-models">Models</a></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="#dataset" onClick={(e) => handleAnchorClick(e, "#dataset")} data-testid="footer-transparency">Transparency</a></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="#cta" onClick={(e) => handleAnchorClick(e, "#cta")} data-testid="footer-try">Try a prediction</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-page-faint">
              Research
            </div>
            <ul className="space-y-2.5 font-sans text-[13px]">
              <li><Link className="text-page-muted transition-colors hover:text-page-ink" to="/about" data-testid="footer-about">About</Link></li>
              <li><Link className="text-page-muted transition-colors hover:text-page-ink" to="/about#methodology" data-testid="footer-methodology">Methodology</Link></li>
              <li><Link className="text-page-muted transition-colors hover:text-page-ink" to="/about#dataset" data-testid="footer-dataset">Dataset</Link></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="#manifesto" onClick={(e) => handleAnchorClick(e, "#manifesto")} data-testid="footer-manifesto">Manifesto</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-page-faint">
              Resources
            </div>
            <ul className="space-y-2.5 font-sans text-[13px]">
              <li className="flex items-center gap-2 text-page-faint" data-testid="footer-glossary">
                Glossary
                <span className="rounded-full bg-canvas-alt px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-page-faint">Soon</span>
              </li>
              <li className="flex items-center gap-2 text-page-faint" data-testid="footer-documentation">
                Documentation
                <span className="rounded-full bg-canvas-alt px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-page-faint">Soon</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-page-faint">
              Contact
            </div>
            <ul className="space-y-2.5 font-sans text-[13px]">
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="mailto:research@amr-insight.org" data-testid="footer-email">research@amr-insight.org</a></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="mailto:research@amr-insight.org?subject=AMR-Insight%20Feedback" data-testid="footer-feedback">Feedback</a></li>
              <li><a className="text-page-muted transition-colors hover:text-page-ink" href="https://github.com/dhyeydaftary/antibiotic-resistance-intelligence-platform" target="_blank" rel="noopener noreferrer" data-testid="footer-github">GitHub</a></li>
            </ul>
          </div>
        </div>

        {/* Research foundations — understated text row, no logos */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-canvas-hairline pt-8 font-mono text-[11px] text-page-faint">
          <span className="uppercase tracking-[0.15em] text-page-faint">Built with</span>
          {FOUNDATIONS.map((f, i) => (
            <span key={f} className="flex items-center gap-3">
              {i > 0 && <span className="text-canvas-hairline">·</span>}
              {f}
            </span>
          ))}
        </div>

        {/* Educational disclaimer — its own block, not buried in a paragraph */}
        <div className="mt-8 flex items-start gap-3 rounded-[14px] border-l-2 border-intermediate/50 bg-canvas-alt px-5 py-4">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-intermediate" />
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-page-ink">
              Educational Disclaimer
            </div>
            <p className="mt-1.5 font-sans text-[12px] leading-[1.6] text-page-muted">
              AMR-Insight is intended for research and educational purposes only. It is
              not a medical device and should not be used for clinical diagnosis,
              treatment, or patient care. Predictions are provided to support learning,
              transparency, and responsible AI exploration.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-canvas-hairline pt-6 md:flex-row md:items-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-page-faint">
            © 2026 AMR-Insight · Research &amp; Education platform · Version 1.0 · Updated July 2026
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-page-faint">
            Evidence before confidence.
          </div>
        </div>
      </div>
    </footer>
  );
}