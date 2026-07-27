// Real antibiotics your models actually predict, with correct WHO AWaRe tiers —
// same mapping used across predict.py, the PubMed integration, and HowItWorks.
const ITEMS = [
  { t: 'Ciprofloxacin', a: 'Watch' },
  { t: 'Imipenem', a: 'Watch' },
  { t: 'Amoxicillin/Ampicillin', a: 'Access' },
  { t: 'Colistin', a: 'Reserve' },
  { t: 'Cefotaxime/Ceftriaxone', a: 'Watch' },
  { t: 'Gentamicin', a: 'Access' },
  { t: 'Trimethoprim-sulfamethoxazole', a: 'Access' },
  { t: 'Ofloxacin', a: 'Watch' },
  { t: 'Nitrofurantoin', a: 'Access' },
  { t: 'Cefoxitin', a: 'Watch' },
  { t: 'Amikacin', a: 'Access' },
  { t: 'Nalidixic acid', a: 'Watch' },
  { t: 'Chloramphenicol', a: 'Access' },
  { t: 'Amoxicillin-clavulanic acid', a: 'Access' },
  { t: 'Cefazolin', a: 'Access' },
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <section
      data-testid="marquee-section"
      className="relative overflow-hidden border-y border-canvas-hairline bg-canvas py-14"
    >
      <div className="flex whitespace-nowrap animate-marquee">
        {row.map((it, i) => (
          <div key={i} className="mr-14 flex shrink-0 items-baseline gap-4">
            <span className="font-display text-[28px] font-semibold tracking-[-0.01em] text-page-ink sm:text-[36px]">
              {it.t}
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-page-faint">
              {it.a}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}