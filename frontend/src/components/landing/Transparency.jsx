import { motion } from "framer-motion";
import ChapterKicker from "./ChapterKicker";

/**
 * Transparency & Dataset — dark teal band. High-contrast reversal from paper.
 */
export default function Transparency() {
  return (
    <section
      id="dataset"
      data-testid="transparency-section"
      className="relative py-32 md:py-48"
      style={{ background: "#12141A", color: "#F7F5F0" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <ChapterKicker tone="light">Ch. 06</ChapterKicker>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-3">
            <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-teal/90 mb-6">
              Transparency
            </p>
            <motion.h2
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif font-light text-[8vw] md:text-[5vw] lg:text-[4.6rem] leading-[1.02] tracking-[-0.02em] text-paper text-balance"
            >
              A public dataset,<br />
              openly acknowledged.
            </motion.h2>
            <p className="mt-8 font-sans text-lg leading-relaxed text-paper/70 max-w-[640px]">
              AMR-Insight runs on a public research dataset of 10,710 antimicrobial
              susceptibility records collected 2020–2025. We publish its schema, its
              limits, and its ethical framing — because a model is only as honest as
              its data.
            </p>
          </div>
        </div>

        {/* Dataset spec table */}
        <div className="mt-20 grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-7 md:col-start-3">
            <div className="border-t border-paper/20">
              <SpecRow k="Records" v="10,710" />
              <SpecRow k="Time range" v="2020 – 2025" />
              <SpecRow k="Antibiotics modeled" v="15" />
              <SpecRow k="Model family" v="Gradient-boosted trees (per antibiotic)" />
              <SpecRow k="Classification" v="WHO AWaRe · Access / Watch / Reserve" />
              <SpecRow k="Not for" v="Clinical decision-making · patient care" />
              <SpecRow k="Built for" v="Students · researchers · educators" />
            </div>
          </div>

          <div className="col-span-12 md:col-span-2 md:col-start-10 mt-8 md:mt-0">
            <div className="border-t border-paper/20 pt-4">
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-paper/50">
                Alignment
              </p>
              <ul className="mt-4 space-y-2 font-mono text-[12px] text-paper/80">
                <li>▸ WHO GLASS</li>
                <li>▸ WHO AWaRe</li>
                <li>▸ ResistanceMap</li>
                <li>▸ JANIS</li>
                <li>▸ Kor-GLASS</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpecRow({ k, v }) {
  return (
    <div className="grid grid-cols-12 items-baseline gap-4 py-5 border-b border-paper/15">
      <div className="col-span-4 font-mono text-[11px] tracking-[0.25em] uppercase text-paper/50">
        {k}
      </div>
      <div className="col-span-8 font-sans text-lg md:text-xl text-paper">{v}</div>
    </div>
  );
}
