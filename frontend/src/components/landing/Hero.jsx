import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import MagneticButton from "./MagneticButton";

/**
 * Cinematic hero with scroll-driven bacterium magnification.
 * Uses a single SVG whose scale, stroke-width, opacity and layered rings
 * are tied to scroll progress across a tall (300vh) container. A resting
 * frame appears at the bottom with CTAs, slightly offset (asymmetric).
 *
 * Reduced-motion users get a static resting state.
 */
export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  // Magnification zoom
  const scale = useTransform(scrollYProgress, [0, 0.55, 1], [1, 8, 12]);
  // Position drifts subtly right so final resting state is asymmetric
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  // Outer contour fades as we push past cell wall
  const outerOpacity = useTransform(scrollYProgress, [0, 0.4, 0.75], [1, 1, 0]);
  // Inner cross-hatching appears mid-scroll
  const midOpacity = useTransform(scrollYProgress, [0.15, 0.4, 0.85], [0, 1, 0.4]);
  // Molecular abstraction appears late
  const molecularOpacity = useTransform(scrollYProgress, [0.55, 0.85, 1], [0, 1, 1]);
  // Stroke thins under magnification
  const strokeW = useTransform(scrollYProgress, [0, 1], [1.2, 0.2]);

  // Headline beats — a discrete state machine (not a continuous opacity blend), so
  // exactly one beat is ever mounted at a time and they can never visually collide.
  const [beat, setBeat] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (v < 0.3) setBeat(0);
    else if (v < 0.62) setBeat(1);
    else setBeat(2);
  });

  const beatTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

  return (
    <section
      ref={ref}
      className="relative"
      style={{ height: "320vh" }}
      data-testid="hero-section"
    >
      <div className="sticky top-0 h-screen w-full bg-paper">
        {/* SVG bacterium — center pinned, scaled via transform. Only this layer
            clips, so the huge magnified shape never spills into other sections
            without also hiding the headline text if it runs slightly tall. */}
        <motion.div
          style={{ scale, x }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden will-change-transform"
        >
          <svg
            viewBox="-200 -200 400 400"
            className="w-[42vw] max-w-[520px] min-w-[280px]"
            fill="none"
            stroke="#12141A"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {/* Outer contour of rod-shaped bacterium */}
            <motion.g style={{ opacity: outerOpacity, strokeWidth: strokeW }}>
              <path d="M -140 0 C -140 -55, -80 -80, 0 -80 C 80 -80, 140 -55, 140 0 C 140 55, 80 80, 0 80 C -80 80, -140 55, -140 0 Z" />
              {/* Flagellum */}
              <path d="M 140 0 C 175 -10, 190 10, 220 -5 C 250 -20, 265 5, 295 -12" />
              <path d="M -140 0 C -175 12, -190 -8, -220 8" />
              {/* Interior contour (nucleoid suggestion) */}
              <path d="M -70 -20 C -30 -45, 30 -45, 80 -25" />
              <path d="M -60 30 C -20 55, 30 50, 70 20" />
            </motion.g>

            {/* Mid-magnification cross-hatch + concentric refinement */}
            <motion.g style={{ opacity: midOpacity, strokeWidth: strokeW }}>
              {Array.from({ length: 18 }).map((_, i) => {
                const a = (i / 18) * Math.PI * 2;
                const r1 = 88;
                const r2 = 132;
                return (
                  <line
                    key={i}
                    x1={Math.cos(a) * r1}
                    y1={Math.sin(a) * r1 * 0.58}
                    x2={Math.cos(a) * r2}
                    y2={Math.sin(a) * r2 * 0.58}
                  />
                );
              })}
              <ellipse cx="0" cy="0" rx="128" ry="72" />
              <ellipse cx="0" cy="0" rx="108" ry="60" opacity="0.6" />
            </motion.g>

            {/* Molecular abstraction — resistance mechanisms at membrane */}
            <motion.g style={{ opacity: molecularOpacity }} stroke="#2C7A6B" strokeWidth="0.8">
              {Array.from({ length: 26 }).map((_, i) => {
                const a = (i / 26) * Math.PI * 2;
                const rx = 130 + (i % 3) * 8;
                const ry = 74 + (i % 3) * 5;
                const cx = Math.cos(a) * rx;
                const cy = Math.sin(a) * ry;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={2.2} fill="#2C7A6B" stroke="none" />
                    <line x1={cx} y1={cy} x2={cx * 1.18} y2={cy * 1.18} />
                    <line x1={cx * 1.18} y1={cy * 1.18} x2={cx * 1.28 + 4} y2={cy * 1.28 - 4} />
                  </g>
                );
              })}
              {/* Efflux pump hint */}
              <g transform="translate(-40, -30)" fill="none">
                <rect x="-8" y="-14" width="16" height="28" rx="2" />
                <line x1="0" y1="-20" x2="0" y2="-30" />
              </g>
            </motion.g>
          </svg>
        </motion.div>

        {/* Grain overlay + vignette hint */}
        <div className="pointer-events-none absolute inset-0 paper-grain opacity-40" />

        {/* Top-left marker copy — sits on paper like a lab notebook */}
        <div className="absolute left-8 top-28 md:left-14 md:top-32 flex items-center gap-3 z-20">
          <span className="w-6 h-px bg-ink/60" />
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/60">
            Fig. 01 — Escherichia coli · rod-shaped
          </span>
        </div>
        <div className="absolute right-8 top-28 md:right-14 md:top-32 z-20 hidden md:block">
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/60">
            Magnification × <MagCounter progress={scrollYProgress} />
          </span>
        </div>

        {/* Beats layered — exactly one mounted at a time via AnimatePresence */}
        <div className="absolute inset-0 flex items-end md:items-center z-30 pointer-events-none">
          <div className="relative w-full h-full max-w-[1400px] mx-auto px-6 md:px-14 pb-24 md:pb-0">
            <AnimatePresence>
              {beat === 0 && (
                <motion.div
                  key="beat-0"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={beatTransition}
                  className="absolute left-6 md:left-14 top-1/2 -translate-y-1/2 max-w-[720px] pointer-events-auto"
                >
                  <MaskedReveal>
                    <h1 className="font-serif text-[11vw] md:text-[7.5vw] lg:text-[7rem] leading-[0.95] font-light tracking-[-0.02em] text-ink text-balance">
                      A single<br />
                      <em className="italic font-normal">bacterium</em><br />
                      can outpace<br />
                      <span className="text-ink/40">medicine.</span>
                    </h1>
                  </MaskedReveal>
                  <p className="mt-6 font-mono text-[11px] tracking-[0.25em] uppercase text-ink/60">
                    Scroll to magnify
                    <span className="inline-block ml-3 animate-pulse">↓</span>
                  </p>
                </motion.div>
              )}

              {beat === 1 && (
                <motion.div
                  key="beat-1"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={beatTransition}
                  className="absolute right-6 md:right-14 top-1/2 -translate-y-1/2 max-w-[560px] text-right pointer-events-auto"
                >
                  <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-ink/60 mb-6">
                    — 02 · Prediction
                  </p>
                  <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.0] font-light tracking-tight text-ink">
                    Fifteen antibiotics.<br />
                    <span className="italic text-teal">One inference.</span>
                  </h2>
                  <p className="mt-6 font-sans text-base md:text-lg text-ink/70 leading-relaxed">
                    Gradient-boosted models predict resistance across the antibiotics that
                    matter — simultaneously.
                  </p>
                </motion.div>
              )}

              {beat === 2 && (
                <motion.div
                  key="beat-2"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={beatTransition}
                  className="absolute left-6 md:left-14 bottom-16 md:bottom-24 max-w-[640px] pointer-events-auto"
                >
                  <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-ink/60 mb-4">
                    — 03 · Grounded in surveillance
                  </p>
                  <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-[1.05] font-light text-ink text-balance">
                    Aligned with WHO <span className="italic">AWaRe</span> &amp; GLASS —
                    built for students and researchers.
                  </h3>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...beatTransition, delay: 0.15 }}
                    className="mt-10 flex flex-wrap gap-4 items-center"
                  >
                    <MagneticButton testId="hero-try-prediction" variant="primary" to="/predict">
                      Try a prediction
                    </MagneticButton>
                    <MagneticButton testId="hero-explore-research" variant="ghost" to="/about">
                      Explore the research
                    </MagneticButton>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom hairline + progress */}
        <div className="absolute bottom-6 left-0 right-0 px-8 md:px-14 flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.3em] text-ink/50 z-20">
          <span>Amr-Insight / v0.9 research build</span>
          <span className="hidden md:inline">10,710 records · 15 antibiotics · 2020–2025</span>
        </div>
      </div>
    </section>
  );
}

function MagCounter({ progress }) {
  const val = useTransform(progress, [0, 1], [1, 1200]);
  const rounded = useTransform(val, (v) => Math.round(v).toString().padStart(4, "0"));
  return <motion.span>{rounded}</motion.span>;
}

function MaskedReveal({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="overflow-hidden"
    >
      <motion.div
        initial={{ y: "40%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
