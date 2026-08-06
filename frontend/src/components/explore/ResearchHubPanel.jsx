import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, ChevronDown, Info } from 'lucide-react';
import Panel from '../app/Panel';
import { RESEARCH_HUB } from '../../constants/exploreContent';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * IMPORTANT: RESEARCH_HUB items are placeholder headlines (see
 * constants/exploreContent.js) — there is no real paper, no real backend,
 * and no real summary behind any of them. Expanding a row must NOT show an
 * invented "summary" — that would present made-up research findings as
 * real ones. It shows an honest disclosure instead.
 */
// Expandable list of placeholder research headlines — see doc comment
// above for why expanding one shows a disclosure, not a fake summary.
function ResearchHubPanel() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <Panel id="research-hub" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        AI Research Hub
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Recent AMR research</h2>

      <div className="divide-y divide-panel-border">
        {RESEARCH_HUB.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.title} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-start gap-3 text-left"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-small text-onpanel-ink">{item.title}</p>
                  <p className="mt-0.5 font-mono text-caption text-onpanel-faint">{item.date}</p>
                </div>
                <span className="shrink-0 rounded-full border border-panel-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-onpanel-muted">
                  {item.tag}
                </span>
                <ChevronDown
                  className={`mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-panel-border bg-panel-raised/40 p-3.5">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint" strokeWidth={1.75} />
                      <p className="font-sans text-small text-onpanel-muted">
                        This headline is placeholder content — there's no research-feed API or real paper behind it
                        yet, so there's no real summary to show. Wire this up to an actual source before relying on
                        it for anything factual.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default ResearchHubPanel;
