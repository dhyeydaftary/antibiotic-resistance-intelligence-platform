import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useRef, useState } from "react";
import ChapterKicker from "./ChapterKicker";

/**
 * Sticky-left / scrolling-right explanatory sequence.
 * Left column holds a single evolving graphic; right column scrolls
 * through the three steps: Input → Inference → Prediction Table.
 */
const STEPS = [
  {
    n: "01",
    kicker: "Input",
    title: "Organism + clinical context.",
    body: "Select the organism (e.g. E. coli, K. pneumoniae, S. aureus) and describe the infection context — specimen source, patient demographics, prior exposure. No PHI. No hospital integration.",
    tags: ["organism", "specimen", "age_band", "prior_exposure"],
  },
  {
    n: "02",
    kicker: "Inference",
    title: "Fifteen models, in parallel.",
    body: "Each antibiotic has its own gradient-boosted model trained independently on the 2020–2025 dataset. All fifteen run simultaneously — no cascading, no shared bias.",
    tags: ["gradient_boosting", "n_models = 15", "parallel_inference"],
  },
  {
    n: "03",
    kicker: "Prediction",
    title: "Susceptibility across the panel.",
    body: "Results return as Resistant / Susceptible / Intermediate for each antibiotic, contextualised against WHO AWaRe classification. Read the panel, not the point.",
    tags: ["R / S / I", "AWaRe · Access · Watch · Reserve"],
  },
];

const PANEL = [
  { name: "Ampicillin", r: "R", aware: "Access" },
  { name: "Amoxicillin-Clav", r: "I", aware: "Access" },
  { name: "Cefazolin", r: "R", aware: "Access" },
  { name: "Ceftriaxone", r: "S", aware: "Watch" },
  { name: "Cefepime", r: "S", aware: "Watch" },
  { name: "Meropenem", r: "S", aware: "Watch" },
  { name: "Ertapenem", r: "S", aware: "Watch" },
  { name: "Piperacillin-Tazo", r: "S", aware: "Watch" },
  { name: "Gentamicin", r: "S", aware: "Access" },
  { name: "Amikacin", r: "S", aware: "Access" },
  { name: "Ciprofloxacin", r: "R", aware: "Watch" },
  { name: "Levofloxacin", r: "I", aware: "Watch" },
  { name: "TMP-SMX", r: "R", aware: "Access" },
  { name: "Nitrofurantoin", r: "S", aware: "Access" },
  { name: "Colistin", r: "S", aware: "Reserve" },
];

const RCOLOR = { R: "#C1502E", S: "#2C7A6B", I: "#C98A2C" };
const RLABEL = { R: "Resistant", S: "Susceptible", I: "Intermediate" };

export default function HowItWorks() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Progress through 3 sections — spans the full scroll range (no dead zone at
  // the end), so the sticky visual keeps advancing until the section's last pixel.
  const stage = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 2]);

  // The right-column text steps are driven by this same `stage` value (matching
  // the visual's own crossfade midpoints below), not an independent viewport
  // trigger — so text and visual can never drift out of sync with each other.
  const [activeStep, setActiveStep] = useState(0);
  useMotionValueEvent(stage, "change", (s) => {
    setActiveStep(s < 1 ? 0 : s < 1.925 ? 1 : 2);
  });

  return (
    <section
      ref={ref}
      id="how"
      data-testid="how-it-works-section"
      className="relative bg-paper"
      style={{ minHeight: "300vh" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14">
        {/* Section head */}
        <div className="pt-32 pb-16 md:pb-20 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <ChapterKicker>Ch. 02</ChapterKicker>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-3">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-light text-[9vw] md:text-[5.5vw] lg:text-[4.6rem] leading-[1.02] tracking-[-0.02em] text-ink text-balance"
            >
              How a prediction <em className="italic">assembles</em>.
            </motion.h2>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6 md:gap-10 pb-32">
          {/* Sticky visual column */}
          <div className="col-span-12 md:col-span-6 md:col-start-1">
            <div className="sticky top-24 h-[70vh] flex items-center">
              <StickyVisual stage={stage} />
            </div>
          </div>

          {/* Scrolling steps column */}
          <div className="col-span-12 md:col-span-5 md:col-start-8">
            <div className="flex flex-col gap-[45vh]">
              {STEPS.map((s, i) => (
                <motion.article
                  key={s.n}
                  animate={{
                    opacity: activeStep === i ? 1 : 0.25,
                    y: activeStep === i ? 0 : 24,
                  }}
                  initial={false}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="border-t border-ink/20 pt-8"
                  data-testid={`how-step-${i}`}
                >
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink/60">
                      {s.kicker}
                    </span>
                    <span className="font-serif text-2xl italic text-ink/30">{s.n}</span>
                  </div>
                  <h3 className="font-serif text-3xl md:text-4xl leading-[1.1] font-light text-ink text-balance">
                    {s.title}
                  </h3>
                  <p className="mt-4 font-sans text-base leading-relaxed text-ink/70">
                    {s.body}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[11px] px-2.5 py-1 border border-ink/25 rounded-full text-ink/70"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyVisual({ stage }) {
  // stage: 0 = input, 1 = inference, 2 = prediction panel
  const inputOpacity = useTransform(stage, [0, 0.8, 1.2], [1, 1, 0]);
  const inferOpacity = useTransform(stage, [0.8, 1.1, 1.85], [0, 1, 1]);
  const inferOpacityOut = useTransform(stage, [1.85, 2], [1, 0]);
  const panelOpacity = useTransform(stage, [1.85, 2], [0, 1]);

  return (
    <div className="relative w-full aspect-square max-w-[560px]">
      {/* Input stage */}
      <motion.div
        style={{ opacity: inputOpacity }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-full h-full bg-paper border border-hairline p-8 flex flex-col justify-between">
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50">
            Fig · Input
          </div>
          <div className="space-y-4">
            <FormRow k="organism" v="Escherichia coli" />
            <FormRow k="specimen" v="urine" />
            <FormRow k="age_band" v="18–49" />
            <FormRow k="prior_exposure" v="fluoroquinolone" />
          </div>
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/40">
            No PHI · research payload
          </div>
        </div>
      </motion.div>

      {/* Inference stage — 15 tick marks fanning */}
      <motion.div
        style={{ opacity: useTransform([inferOpacity, inferOpacityOut], ([a, b]) => a * b) }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <svg viewBox="-200 -200 400 400" className="w-full h-full">
          <circle cx="0" cy="0" r="140" fill="none" stroke="#DFDAD0" strokeWidth="1" />
          <circle cx="0" cy="0" r="90" fill="none" stroke="#DFDAD0" strokeWidth="1" />
          {Array.from({ length: 15 }).map((_, i) => {
            const a = (i / 15) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.g key={i}>
                <line
                  x1={Math.cos(a) * 92}
                  y1={Math.sin(a) * 92}
                  x2={Math.cos(a) * 140}
                  y2={Math.sin(a) * 140}
                  stroke="#12141A"
                  strokeWidth="1"
                />
                <circle
                  cx={Math.cos(a) * 140}
                  cy={Math.sin(a) * 140}
                  r="3"
                  fill="#2C7A6B"
                />
              </motion.g>
            );
          })}
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
            fill="#12141A"
            letterSpacing="2"
          >
            n = 15 · parallel
          </text>
        </svg>
      </motion.div>

      {/* Panel stage */}
      <motion.div
        style={{ opacity: panelOpacity }}
        className="absolute inset-0"
      >
        <div className="w-full h-full bg-paper border border-hairline p-4 md:p-6 overflow-hidden">
          <div className="flex items-baseline justify-between mb-3">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50">
              Panel · Fig 03
            </div>
            <div className="font-mono text-[10px] text-ink/50">15 / 15</div>
          </div>
          <div className="grid grid-cols-1 gap-[3px]">
            {PANEL.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between px-3 py-1.5 bg-paper border-b border-hairline/60"
              >
                <span className="font-mono text-[11px] text-ink">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-ink/50">{p.aware}</span>
                  <span
                    className="font-mono text-[10px] w-6 h-6 flex items-center justify-center border"
                    style={{ color: RCOLOR[p.r], borderColor: RCOLOR[p.r] + "80" }}
                    title={RLABEL[p.r]}
                  >
                    {p.r}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FormRow({ k, v }) {
  return (
    <div className="border-b border-ink/15 pb-2 flex items-baseline justify-between">
      <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink/50">{k}</span>
      <span className="font-mono text-sm text-ink">{v}</span>
    </div>
  );
}
