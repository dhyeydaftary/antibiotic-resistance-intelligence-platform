import { motion } from "framer-motion";
import ChapterKicker from "./ChapterKicker";

const CHAPTERS = [
  {
    n: "I",
    title: "Prediction is a teaching tool.",
    body: "We built AMR-Insight for students and researchers — not clinicians, not hospitals. The point is not to treat, but to see the pattern of resistance emerge before your eyes.",
  },
  {
    n: "II",
    title: "Every antibiotic gets its own model.",
    body: "Fifteen independent gradient-boosted models — one per antibiotic — so no shared bias, no cascading assumptions. When one model is uncertain, the others still speak clearly.",
  },
  {
    n: "III",
    title: "AWaRe is our grammar.",
    body: "Access · Watch · Reserve. Every prediction is contextualised against the WHO classification, because a susceptibility number without stewardship context is just a number.",
  },
  {
    n: "IV",
    title: "The dataset is public.",
    body: "10,710 records, 2020–2025. We surface the dataset as a research artefact, not as a competitive moat. Transparency is the entire point.",
  },
];

export default function Manifesto() {
  return (
    <section
      id="manifesto"
      data-testid="manifesto-section"
      className="relative bg-paper py-32 md:py-48"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-12 gap-6 mb-20">
          <div className="col-span-12 md:col-span-2">
            <ChapterKicker>Ch. 05</ChapterKicker>
          </div>
          <div className="col-span-12 md:col-span-8 md:col-start-3">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink/60 mb-6">
              A brief manifesto
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-light text-[8vw] md:text-[5vw] lg:text-[4.6rem] leading-[1.02] tracking-[-0.02em] text-ink text-balance"
            >
              Four principles<br />
              <em className="italic">we won&rsquo;t compromise on.</em>
            </motion.h2>
          </div>
        </div>

        <div className="flex flex-col gap-16 md:gap-24">
          {CHAPTERS.map((c, i) => (
            <motion.article
              key={c.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className={`grid grid-cols-12 gap-6 items-baseline ${
                i % 2 === 0 ? "" : "md:ml-[8%]"
              }`}
              data-testid={`manifesto-chapter-${i}`}
            >
              {/* Roman numeral */}
              <div className="col-span-3 md:col-span-3">
                <span
                  className="font-serif text-[22vw] md:text-[14vw] lg:text-[12rem] leading-[0.85] font-light text-ink/10 select-none"
                  style={{ WebkitTextStroke: "1px #12141A", color: "transparent" }}
                >
                  {c.n}
                </span>
              </div>
              <div className="col-span-9 md:col-span-7">
                <h3 className="font-serif text-3xl md:text-5xl leading-[1.05] font-light text-ink text-balance">
                  {c.title}
                </h3>
                <p className="mt-6 font-sans text-base md:text-lg leading-relaxed text-ink/70 max-w-[560px]">
                  {c.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
