import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import ChapterKicker from "./ChapterKicker";

/**
 * Editorial Context section — WHO AWaRe / GLASS framing.
 * Asymmetric 12-col editorial split. No cards. Sepia-tinted scientific image
 * behind a pull quote. Numbers use JetBrains Mono.
 */
export default function LandingContext() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const dialY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section
      ref={ref}
      id="context"
      data-testid="context-section"
      className="relative bg-paper py-32 md:py-48 overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14 grid grid-cols-12 gap-6 md:gap-10">
        {/* Chapter marker */}
        <div className="col-span-12 md:col-span-2 flex md:block gap-6 items-center">
          <ChapterKicker>Ch. 01</ChapterKicker>
          <span className="hidden md:block w-full h-px bg-ink/20 mt-4" />
        </div>

        {/* Lead editorial column */}
        <div className="col-span-12 md:col-span-6 md:col-start-3">
          <FadeUp delay={0.2}>
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink/60 mb-6">
              The context
            </p>
            <h2 className="font-serif font-light text-[10vw] md:text-[6vw] lg:text-[5.2rem] leading-[0.98] tracking-[-0.02em] text-ink text-balance">
              Resistance is <em className="italic">outrunning</em> the
              antibiotics we still have.
            </h2>
            <div className="mt-10 flex flex-col md:flex-row gap-8 md:gap-12 max-w-[640px]">
              <p className="font-sans text-base leading-relaxed text-ink/75 flex-1">
                By 2050, drug-resistant infections could kill more people annually than
                cancer does today. Understanding <em>which</em> antibiotic still works
                — before the culture comes back — is now a scientific and pedagogical
                imperative.
              </p>
              <p className="font-sans text-base leading-relaxed text-ink/75 flex-1">
                AMR-Insight is a research and education platform. It doesn&rsquo;t
                treat patients. It teaches the pattern of resistance — grounded in the
                same surveillance principles that guide the WHO.
              </p>
            </div>
          </FadeUp>
        </div>

        {/* Side annotations */}
        <div className="col-span-12 md:col-span-3 md:col-start-10 mt-16 md:mt-2">
          <FadeUp delay={0.15}>
            <div className="border-t border-ink/20 pt-4">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink/50">
                WHO AWaRe
              </p>
              <div className="mt-3 space-y-3">
                <AWaReRow k="Access" desc="First-line, narrow-spectrum" />
                <AWaReRow k="Watch" desc="Higher resistance potential" />
                <AWaReRow k="Reserve" desc="Last-resort, restricted use" />
              </div>
            </div>
            <div className="border-t border-ink/20 pt-4 mt-10">
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink/50">
                Surveillance references
              </p>
              <ul className="mt-3 space-y-2 font-mono text-[12px] text-ink/70">
                <li>▸ WHO GLASS</li>
                <li>▸ CDDEP ResistanceMap</li>
                <li>▸ JANIS · Japan</li>
                <li>▸ Kor-GLASS · Korea</li>
              </ul>
            </div>
          </FadeUp>
        </div>
      </div>

      {/* Editorial image band — cropped, spotlighted */}
      <div className="mt-24 md:mt-40 relative">
        <div className="max-w-[1400px] mx-auto px-6 md:px-14 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-7 md:col-start-1 relative overflow-hidden">
            <motion.div style={{ y: dialY }} className="aspect-[4/3] md:aspect-[16/10]">
              <ProjectionDial />
            </motion.div>
            <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">
              <span>Fig. 02 · 2050 projection dial</span>
              <span>Illustrative · not diagnostic</span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4 md:col-start-9 md:pt-16">
            <FadeUp delay={0.2}>
              <blockquote className="font-serif text-2xl md:text-3xl leading-[1.15] text-ink italic tracking-tight">
                &ldquo;Prediction, contextualised against WHO surveillance, is how the
                next generation of researchers will learn resistance — not from a
                textbook, but from a live pattern.&rdquo;
              </blockquote>
              <p className="mt-6 font-mono text-[11px] tracking-[0.25em] uppercase text-ink/50">
                — AMR-Insight research statement
              </p>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
}

function AWaReRow({ k, desc }) {
  const color = k === "Access" ? "#2C7A6B" : k === "Watch" ? "#C98A2C" : "#C1502E";
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-1.5 h-1.5 rounded-full mt-1" style={{ background: color }} />
      <div>
        <div className="font-mono text-[12px] text-ink">{k}</div>
        <div className="font-sans text-[12px] text-ink/60">{desc}</div>
      </div>
    </div>
  );
}

const DIAL_START_YEAR = 2026;
const DIAL_END_YEAR = 2050;
const DIAL_R = 148;
const DIAL_CX = 0;
const DIAL_CY = 30;
const DIAL_TICK_YEARS = [2026, 2030, 2035, 2040, 2045, 2050];

function dialAngleForT(t) {
  return 180 - t * 180;
}

function dialPointForT(t, radius = DIAL_R) {
  const rad = (dialAngleForT(t) * Math.PI) / 180;
  return { x: DIAL_CX + Math.cos(rad) * radius, y: DIAL_CY - Math.sin(rad) * radius };
}

/**
 * "2050 Projection Dial" — a bespoke ink-linework radial timeline replacing
 * a stock photo. Echoes the "by 2050" claim in the copy: a static marker for
 * cancer's current mortality rate, and a teal marker where AMR resistance
 * deaths are projected to cross over it. Monochrome except the one marker.
 */
function ProjectionDial() {
  const steps = 64;
  const arcPath = Array.from({ length: steps + 1 }, (_, i) => dialPointForT(i / steps))
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");

  const cancerT = 0.06;
  const cancerPoint = dialPointForT(cancerT);
  const amrT = 0.92;
  const amrPoint = dialPointForT(amrT);

  return (
    <svg
      viewBox="-200 -170 400 260"
      className="w-full h-full"
      fill="none"
      stroke="#12141A"
      aria-hidden
    >
      <rect x="-200" y="-170" width="400" height="260" fill="#F7F5F0" stroke="none" />

      {/* Base arc */}
      <path d={arcPath} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      <line x1={-DIAL_R - 6} y1={DIAL_CY} x2={DIAL_R + 6} y2={DIAL_CY} strokeWidth="1" opacity="0.15" />

      {/* Year ticks */}
      {DIAL_TICK_YEARS.map((year) => {
        const t = (year - DIAL_START_YEAR) / (DIAL_END_YEAR - DIAL_START_YEAR);
        const outer = dialPointForT(t);
        const inner = dialPointForT(t, DIAL_R - 10);
        const label = dialPointForT(t, DIAL_R + 20);
        return (
          <g key={year}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} strokeWidth="1" opacity="0.4" />
            <text
              x={label.x}
              y={label.y + 3}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="9"
              fill="#12141A"
              stroke="none"
              opacity="0.5"
            >
              {year}
            </text>
          </g>
        );
      })}

      {/* Cancer mortality today — static ink marker */}
      <circle cx={cancerPoint.x} cy={cancerPoint.y} r="4" fill="#12141A" stroke="none" />
      <line x1={cancerPoint.x} y1={cancerPoint.y} x2={cancerPoint.x - 8} y2={cancerPoint.y - 32} strokeWidth="1" />
      <text
        x={cancerPoint.x - 12}
        y={cancerPoint.y - 38}
        textAnchor="start"
        fontFamily="JetBrains Mono, monospace"
        fontSize="9"
        letterSpacing="1"
        fill="#12141A"
        stroke="none"
      >
        CANCER · TODAY
      </text>

      {/* AMR projected crossover — the one teal marker */}
      <circle cx={amrPoint.x} cy={amrPoint.y} r="5" fill="#2C7A6B" stroke="none" />
      <circle cx={amrPoint.x} cy={amrPoint.y} r="10" stroke="#2C7A6B" strokeWidth="1" opacity="0.5" />
      <line x1={amrPoint.x} y1={amrPoint.y} x2={amrPoint.x + 6} y2={amrPoint.y - 32} stroke="#2C7A6B" strokeWidth="1" />
      <text
        x={amrPoint.x + 8}
        y={amrPoint.y - 38}
        textAnchor="start"
        fontFamily="JetBrains Mono, monospace"
        fontSize="9"
        letterSpacing="1"
        fill="#2C7A6B"
        stroke="none"
      >
        AMR · PROJECTED 2050
      </text>
    </svg>
  );
}

function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
