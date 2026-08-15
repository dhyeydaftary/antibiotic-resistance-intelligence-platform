import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, FileDown, FileSpreadsheet, FileJson, ArrowUpRight } from 'lucide-react';
import PrimaryButton from '../app/PrimaryButton';
import AntibioticChip from './AntibioticChip';
import HistoryPager from './HistoryPager';

// Small "NR"/"NS"/"NI" count pill; renders nothing if count is 0.
function ResultCountBadge({ count, tone, letter }) {
  if (!count) return null;
  const tones = {
    resistant: 'bg-resistant/10 text-resistant',
    susceptible: 'bg-susceptible/10 text-susceptible',
    intermediate: 'bg-intermediate/10 text-intermediate',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${tones[tone]}`}>
      {count}{letter}
    </span>
  );
}

// One record's card within the timeline — collapsed header (organism,
// R/S/I counts, confidence, export/open actions), expandable to show
// every antibiotic's AntibioticChip.
function SummaryRow({ summary, isExpanded, onToggle, onView, onDownloadPdf, onDownloadCsv, onDownloadJson }) {
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="overflow-hidden rounded-[16px] border border-panel-border bg-panel">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
            <ChevronRight size={15} className="text-onpanel-faint" />
          </motion.div>
          <div className="min-w-0">
            <div className="truncate font-display text-[16px] font-semibold text-onpanel-ink">{summary.organism}</div>
            <div className="mt-0.5 font-mono text-[11px] text-onpanel-faint">{formatTime(summary.date)}</div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <ResultCountBadge count={summary.resistantCount} tone="resistant" letter="R" />
          <ResultCountBadge count={summary.susceptibleCount} tone="susceptible" letter="S" />
          <ResultCountBadge count={summary.intermediateCount} tone="intermediate" letter="I" />
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-panel-border">
            <div className="h-full rounded-full bg-accent-blue" style={{ width: `${Math.round(summary.avgConfidence * 100)}%` }} />
          </div>
          <span className="w-9 font-mono text-[11px] text-onpanel-muted">{Math.round(summary.avgConfidence * 100)}%</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => onDownloadPdf(summary)} title="PDF" className="rounded-md p-1.5 text-onpanel-faint transition-colors hover:bg-panel-raised hover:text-onpanel-ink">
            <FileDown size={14} />
          </button>
          <button onClick={() => onDownloadCsv(summary)} title="CSV" className="rounded-md p-1.5 text-onpanel-faint transition-colors hover:bg-panel-raised hover:text-onpanel-ink">
            <FileSpreadsheet size={14} />
          </button>
          <button onClick={() => onDownloadJson(summary)} title="JSON" className="rounded-md p-1.5 text-onpanel-faint transition-colors hover:bg-panel-raised hover:text-onpanel-ink">
            <FileJson size={14} />
          </button>
        </div>

        <PrimaryButton onClick={() => onView(summary)} className="shrink-0 gap-1.5 px-4 py-2 text-[13px]">
          Open report <ArrowUpRight size={13} />
        </PrimaryButton>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-panel-border bg-panel-raised px-5 py-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {summary.predictions.map((p) => (
                  <AntibioticChip key={p.antibiotic} prediction={p} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Default history view: records grouped by calendar day along a
// vertical timeline rail, each day's records rendered via SummaryRow.
const HistoryTimeline = ({ summaries, currentPage, totalPages, onPageChange, onView, onDownloadPdf, onDownloadCsv, onDownloadJson }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!summaries || !summaries.length) {
    return (
      <div className="rounded-[20px] border border-canvas-hairline bg-white px-4 py-12 text-center">
        <p className="font-sans text-[14px] text-page-muted">No predictions match your current filters.</p>
      </div>
    );
  }

  // Buckets the already-sorted summaries by their display date label.
  const grouped = summaries.reduce((groups, s) => {
    const key = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
    return groups;
  }, {});

  return (
    <div className="relative mb-8 pl-8">
      <div className="absolute bottom-0 left-[11px] top-0 w-px bg-canvas-hairline" />
      {Object.entries(grouped).map(([dateKey, items]) => (
        <div key={dateKey} className="relative mb-8 last:mb-0">
          <div className="relative mb-3 flex items-center gap-3">
            <div className="absolute left-[-21px] top-1/2 z-10 h-[9px] w-[9px] -translate-y-1/2 rounded-full bg-accent-blue ring-4 ring-canvas" />
            <span className="ml-6 font-mono text-[12px] uppercase tracking-[0.14em] text-page-ink">{dateKey}</span>
            <span className="font-mono text-[11px] text-page-faint">· {items.length} prediction{items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {items.map((summary) => (
              <SummaryRow
                key={summary.id}
                summary={summary}
                isExpanded={expandedId === summary.id}
                onToggle={() => setExpandedId(expandedId === summary.id ? null : summary.id)}
                onView={onView}
                onDownloadPdf={onDownloadPdf}
                onDownloadCsv={onDownloadCsv}
                onDownloadJson={onDownloadJson}
              />
            ))}
          </div>
        </div>
      ))}
      <HistoryPager currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
};

export default HistoryTimeline;