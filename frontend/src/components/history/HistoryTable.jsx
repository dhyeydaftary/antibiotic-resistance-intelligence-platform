import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, FileDown, FileSpreadsheet, FileJson, ArrowUpRight } from 'lucide-react';
import Panel from '../app/Panel';
import PrimaryButton from '../app/PrimaryButton';
import AntibioticChip from './AntibioticChip';

const HistoryTable = ({ summaries, currentPage, totalPages, onPageChange, onView, onDownloadPdf, onDownloadCsv, onDownloadJson }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!summaries || !summaries.length) {
    return (
      <div className="rounded-[20px] border border-canvas-hairline bg-white px-4 py-12 text-center">
        <p className="font-sans text-[14px] text-page-muted">No predictions match your current filters.</p>
      </div>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mb-8">
      <Panel className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-panel-border px-4 py-2.5">
          <div className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">Date</div>
          <div className="flex-1 font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">Organism</div>
          <div className="w-40 shrink-0 text-center font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">R / S / I</div>
          <div className="w-16 shrink-0 text-center font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">Avg</div>
          <div className="w-24 shrink-0 text-right font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">Report</div>
        </div>

        <div className="divide-y divide-panel-border">
          {summaries.map((s) => (
            <div key={s.id}>
              <div
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-panel-raised"
              >
                <div className="flex w-16 shrink-0 items-center gap-1">
                  <motion.div animate={{ rotate: expandedId === s.id ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight size={12} className="text-onpanel-faint" />
                  </motion.div>
                  <span className="font-mono text-[11px] text-onpanel-muted">{formatDate(s.date)}</span>
                </div>
                <div className="min-w-0 flex-1 truncate font-sans text-[13px] font-medium text-onpanel-ink">{s.organism}</div>
                <div className="flex w-40 shrink-0 justify-center gap-1">
                  {s.resistantCount > 0 && <span className="rounded-full bg-resistant/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-resistant">{s.resistantCount}R</span>}
                  {s.susceptibleCount > 0 && <span className="rounded-full bg-susceptible/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-susceptible">{s.susceptibleCount}S</span>}
                  {s.intermediateCount > 0 && <span className="rounded-full bg-intermediate/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-intermediate">{s.intermediateCount}I</span>}
                </div>
                <div className="w-16 shrink-0 text-center font-mono text-[11px] text-onpanel-muted">{Math.round(s.avgConfidence * 100)}%</div>
                <div className="flex w-24 shrink-0 items-center justify-end gap-0.5">
                  <button onClick={(e) => { e.stopPropagation(); onDownloadPdf(s); }} className="rounded-md p-1 text-onpanel-faint hover:bg-panel-border hover:text-onpanel-ink"><FileDown size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDownloadCsv(s); }} className="rounded-md p-1 text-onpanel-faint hover:bg-panel-border hover:text-onpanel-ink"><FileSpreadsheet size={12} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onDownloadJson(s); }} className="rounded-md p-1 text-onpanel-faint hover:bg-panel-border hover:text-onpanel-ink"><FileJson size={12} /></button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expandedId === s.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden bg-panel-raised"
                  >
                    <div className="px-4 py-3">
                      <div className="mb-2 flex justify-end">
                        <PrimaryButton onClick={() => onView(s)} className="gap-1.5 px-3.5 py-1.5 text-[12px]">
                          Open full report <ArrowUpRight size={12} />
                        </PrimaryButton>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
                        {s.predictions.map((p) => (
                          <AntibioticChip key={p.antibiotic} prediction={p} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </Panel>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-full p-1.5 text-page-muted hover:bg-canvas-alt disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`h-8 w-8 rounded-full font-sans text-[13px] ${currentPage === page ? 'bg-page-ink text-white' : 'text-page-muted hover:bg-canvas-alt'}`}
            >
              {page}
            </button>
          ))}
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="rounded-full p-1.5 text-page-muted hover:bg-canvas-alt disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;