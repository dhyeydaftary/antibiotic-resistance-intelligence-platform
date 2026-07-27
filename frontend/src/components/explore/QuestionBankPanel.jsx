import { HelpCircle } from 'lucide-react';
import Panel from '../app/Panel';
import { QUESTION_BANK } from '../../constants/exploreContent';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * PLACEHOLDER CONTENT — static question bank, same convention as Home's
 * "Today's question", see constants/exploreContent.js.
 */
function QuestionBankPanel() {
  return (
    <Panel id="question-bank" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Question Bank
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Questions worth exploring</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUESTION_BANK.map((q) => (
          <div key={q} className="flex items-start gap-2.5 rounded-[10px] border border-panel-border bg-panel-raised/40 p-3.5">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
            <p className="font-sans text-small text-onpanel-ink">{q}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default QuestionBankPanel;
