import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import Panel from '../app/Panel';
import { QUESTION_BANK } from '../../constants/exploreContent';
import { getAnswer } from '../../utils/questionAnswers';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * Questions are a static bank (see constants/exploreContent.js), but every
 * answer is computed live from the real dataset-stats response passed in
 * as `stats` — see utils/questionAnswers.js. No hardcoded statistics here.
 */
function QuestionCard({ q, i, isOpen, onToggle, stats }) {
  return (
    <div
      className={`rounded-[10px] border transition-colors ${
        isOpen ? 'border-accent-blue bg-panel-raised/60' : 'border-panel-border bg-panel-raised/40 hover:border-accent-blue/40'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2.5 p-3.5 text-left"
      >
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
        <p className="flex-1 font-sans text-small text-onpanel-ink">{q}</p>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
            <p className="border-t border-panel-border px-3.5 py-3 pl-[34px] font-sans text-small text-onpanel-muted">
              {getAnswer(q, { stats })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Expandable FAQ-style grid of canned questions (constants/exploreContent.js)
// answered live via utils/questionAnswers.js's getAnswer().
function QuestionBankPanel({ stats }) {
  const [openIndex, setOpenIndex] = useState(null);

  // Two independent stacked columns instead of a CSS grid — a grid's rows
  // sync height across columns, so expanding one question's answer was
  // stretching its row-neighbor in the other column along with it. Plain
  // flex columns don't share row tracks, so each side reflows on its own.
  const indexed = QUESTION_BANK.map((q, i) => ({ q, i }));
  const leftColumn = indexed.filter((_, idx) => idx % 2 === 0);
  const rightColumn = indexed.filter((_, idx) => idx % 2 === 1);

  return (
    <Panel id="question-bank" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Question Bank
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Questions worth exploring</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          {leftColumn.map(({ q, i }) => (
            <QuestionCard key={q} q={q} i={i} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} stats={stats} />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {rightColumn.map(({ q, i }) => (
            <QuestionCard key={q} q={q} i={i} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? null : i)} stats={stats} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default QuestionBankPanel;
