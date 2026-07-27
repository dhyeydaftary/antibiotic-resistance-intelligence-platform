// frontend/src/components/explore/QuestionBankPanel.jsx

import { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import Panel from '../app/Panel';
import { QUESTION_BANK } from '../../constants/exploreContent';
import { QUESTION_ANSWERS } from '../../constants/questionAnswers';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

function QuestionBankPanel() {
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const toggleQuestion = (question) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [question]: !prev[question]
    }));
  };

  return (
    <Panel id="question-bank" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Question Bank
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Questions worth exploring</h2>

      <div className="flex flex-wrap -mx-1.5">
        {QUESTION_BANK.map((q, index) => {
          const isExpanded = expandedQuestions[q];
          const answer = QUESTION_ANSWERS[q];
          
          return (
            <div 
              key={q} 
              className="w-full sm:w-1/2 px-1.5 mb-3"
            >
              <div 
                className={`rounded-[10px] border transition-all duration-200 ${
                  isExpanded 
                    ? 'border-accent-blue bg-panel-raised/60' 
                    : 'border-panel-border bg-panel-raised/40 hover:border-accent-blue/40'
                }`}
              >
                <button
                  onClick={() => toggleQuestion(q)}
                  className="flex w-full items-start gap-2.5 p-3.5 text-left"
                >
                  <span className="font-mono text-caption text-onpanel-faint shrink-0">
                    {index + 1}.
                  </span>
                  <span className="flex-1 font-sans text-small text-onpanel-ink">{q}</span>
                  <ChevronDown 
                    className={`h-4 w-4 shrink-0 text-onpanel-faint transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`} 
                    strokeWidth={1.75}
                  />
                </button>
                
                {isExpanded && answer && (
                  <div className="border-t border-panel-border px-3.5 pb-4 pt-3">
                    <p className="font-sans text-small text-onpanel-muted">
                      <span className="font-semibold text-accent-blue">Answer:</span> {answer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default QuestionBankPanel;