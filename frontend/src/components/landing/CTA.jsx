import MagneticButton from "./MagneticButton";
import ChapterKicker from "./ChapterKicker";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section
      id="cta"
      data-testid="cta-section"
      className="relative bg-paper py-40 md:py-56 overflow-hidden"
    >
      {/* Faint bacterium outline echo */}
      <svg
        aria-hidden
        viewBox="-200 -200 400 400"
        className="absolute -right-16 -bottom-24 w-[80vw] max-w-[900px] opacity-[0.06] pointer-events-none"
        fill="none"
        stroke="#12141A"
        strokeWidth="0.5"
      >
        <path d="M -140 0 C -140 -55, -80 -80, 0 -80 C 80 -80, 140 -55, 140 0 C 140 55, 80 80, 0 80 C -80 80, -140 55, -140 0 Z" />
        <ellipse cx="0" cy="0" rx="128" ry="72" />
        <ellipse cx="0" cy="0" rx="108" ry="60" />
      </svg>

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8 md:col-start-2">
            <ChapterKicker className="mb-6">Ch. 07 · Try it</ChapterKicker>
            <motion.h2
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-light text-[10vw] md:text-[7vw] lg:text-[7rem] leading-[0.95] tracking-[-0.02em] text-ink text-balance"
            >
              Run one prediction.<br />
              <em className="italic">See fifteen answers.</em>
            </motion.h2>

            <p className="mt-10 font-sans text-lg md:text-xl leading-relaxed text-ink/70 max-w-[620px]">
              AMR-Insight is free for students and academic researchers. Sign in with
              email, run a prediction, and browse the underlying dataset — no clinical
              claims, no hospital paperwork, no fine print.
            </p>

            <div className="mt-12 flex flex-wrap gap-4 items-center">
              <MagneticButton testId="cta-try-prediction" variant="primary" to="/predict">
                Try a prediction
              </MagneticButton>
              <MagneticButton testId="cta-explore-research" variant="ghost" to="/about">
                Explore the research
              </MagneticButton>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 font-mono text-[11px] tracking-[0.25em] uppercase text-ink/50">
              <span>· Free for research</span>
              <span>· No PHI required</span>
              <span>· 10,710-record dataset</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
