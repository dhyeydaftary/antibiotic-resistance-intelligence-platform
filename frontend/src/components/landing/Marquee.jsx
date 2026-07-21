/**
 * Editorial marquee — very slow drifting ribbon of antibiotic names / AWaRe tags.
 */
const ITEMS = [
  { t: "Ciprofloxacin", a: "Watch" },
  { t: "Meropenem", a: "Watch" },
  { t: "Ampicillin", a: "Access" },
  { t: "Colistin", a: "Reserve" },
  { t: "Ceftriaxone", a: "Watch" },
  { t: "Gentamicin", a: "Access" },
  { t: "TMP-SMX", a: "Access" },
  { t: "Levofloxacin", a: "Watch" },
  { t: "Nitrofurantoin", a: "Access" },
  { t: "Piperacillin-Tazobactam", a: "Watch" },
  { t: "Amikacin", a: "Access" },
  { t: "Cefepime", a: "Watch" },
  { t: "Ertapenem", a: "Watch" },
  { t: "Amoxicillin-Clav", a: "Access" },
  { t: "Cefazolin", a: "Access" },
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <section
      data-testid="marquee-section"
      className="relative bg-paper py-16 border-y border-hairline overflow-hidden"
      aria-hidden="false"
    >
      <div className="flex whitespace-nowrap animate-marquee">
        {row.map((it, i) => (
          <div key={i} className="flex items-baseline gap-6 mr-16 shrink-0">
            <span className="font-serif italic text-4xl md:text-6xl text-ink font-light tracking-tight">
              {it.t}
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink/40">
              — {it.a}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
