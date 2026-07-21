import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ChapterKicker from "./ChapterKicker";

/**
 * Trends & Analytics teaser — a bespoke data visualization (not a dashboard screenshot).
 * A pill grid of years, and a hairline area chart per antibiotic class.
 */
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
const SERIES = [
  {
    name: "Ciprofloxacin",
    aware: "Watch",
    values: [0.28, 0.34, 0.41, 0.46, 0.5, 0.53],
    color: "#C1502E",
  },
  {
    name: "TMP-SMX",
    aware: "Access",
    values: [0.42, 0.44, 0.47, 0.49, 0.52, 0.55],
    color: "#C1502E",
  },
  {
    name: "Ceftriaxone",
    aware: "Watch",
    values: [0.11, 0.14, 0.18, 0.22, 0.25, 0.29],
    color: "#C98A2C",
  },
  {
    name: "Meropenem",
    aware: "Watch",
    values: [0.03, 0.04, 0.05, 0.07, 0.09, 0.11],
    color: "#C98A2C",
  },
  {
    name: "Nitrofurantoin",
    aware: "Access",
    values: [0.09, 0.09, 0.1, 0.1, 0.11, 0.12],
    color: "#2C7A6B",
  },
];

export default function TrendsTeaser() {
  return (
    <section
      id="trends"
      data-testid="trends-section"
      className="relative bg-paper py-32 md:py-48"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-12 gap-6 mb-16">
          <div className="col-span-12 md:col-span-2">
            <ChapterKicker>Ch. 04</ChapterKicker>
          </div>
          <div className="col-span-12 md:col-span-8 md:col-start-3">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink/60 mb-6">
              Trends · 2020 – 2025
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-light text-[8vw] md:text-[5vw] lg:text-[4.6rem] leading-[1.02] tracking-[-0.02em] text-ink text-balance"
            >
              What&nbsp;resistance <em className="italic">looks like</em> across six years.
            </motion.h2>
            <p className="mt-6 font-sans text-lg max-w-[540px] text-ink/70">
              A slice of the public 10,710-record dataset that powers AMR-Insight. Read
              the direction, not the decimal — the platform teaser below shows one
              curve per class.
            </p>
          </div>
        </div>

        {/* Big stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline mb-20">
          <Stat n="10710" label="Records" />
          <Stat n="15" label="Antibiotics modeled" />
          <Stat n="6" label="Years surveyed" />
          <Stat n="3" label="AWaRe categories" />
        </div>

        {/* Chart matrix */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8">
            <ChartCluster />
          </div>
          <div className="col-span-12 md:col-span-4 md:pl-8">
            <div className="border-t border-ink/20 pt-6">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/50">
                Reading key
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <LegendRow color="#C1502E" k="Rising resistance" />
                <LegendRow color="#C98A2C" k="Emerging concern" />
                <LegendRow color="#2C7A6B" k="Stable / low" />
              </ul>
              <p className="mt-8 font-sans text-sm text-ink/60 leading-relaxed">
                All figures are illustrative of the underlying research dataset.
                Live analytics available to signed-in researchers.
              </p>
              <a
                href="#cta"
                data-testid="trends-cta"
                className="mt-6 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.25em] text-ink hover:text-teal transition-colors link-underline"
              >
                Explore full trends
                <span aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }) {
  return (
    <div className="bg-paper p-8 md:p-10">
      <CountUp value={parseInt(n, 10)} className="font-serif text-5xl md:text-6xl font-light tracking-tight text-ink" />
      <div className="mt-3 font-mono text-[11px] tracking-[0.25em] uppercase text-ink/60">
        {label}
      </div>
    </div>
  );
}

function CountUp({ value, className }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          const start = performance.now();
          const dur = 1400;
          function tick(now) {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(value * eased));
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={className}>
      {display.toLocaleString()}
    </div>
  );
}

function LegendRow({ color, k }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-6 h-px" style={{ background: color }} />
      <span className="font-sans text-ink/80">{k}</span>
    </li>
  );
}

function ChartCluster() {
  return (
    <div className="border-t border-b border-ink/20">
      {SERIES.map((s, i) => (
        <div key={s.name} className={`grid grid-cols-12 items-center gap-4 py-6 ${i > 0 ? "border-t border-hairline" : ""}`}>
          <div className="col-span-4">
            <div className="font-mono text-[13px] text-ink">{s.name}</div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink/50 mt-1">
              AWaRe · {s.aware}
            </div>
          </div>
          <div className="col-span-6">
            <SparkArea values={s.values} color={s.color} />
          </div>
          <div className="col-span-2 text-right">
            <span className="font-mono text-xl text-ink">
              {(s.values[s.values.length - 1] * 100).toFixed(0)}
              <span className="text-ink/50 text-xs">%</span>
            </span>
            <div className="font-mono text-[10px] text-ink/50 mt-1">2025</div>
          </div>
        </div>
      ))}
      {/* Year axis */}
      <div className="border-t border-hairline">
        <div className="grid grid-cols-12 gap-4 py-3">
          <div className="col-span-4" />
          <div className="col-span-6 flex justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">
            {YEARS.map((y) => <span key={y}>{y}</span>)}
          </div>
          <div className="col-span-2" />
        </div>
      </div>
    </div>
  );
}

function SparkArea({ values, color }) {
  const w = 320, h = 48;
  const max = 0.7;
  const min = 0;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => [i * step, h - ((v - min) / (max - min)) * h]);
  const d = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const dArea = `${d} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <motion.path
        d={dArea}
        fill={color}
        fillOpacity="0.08"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color} />
      ))}
    </svg>
  );
}
