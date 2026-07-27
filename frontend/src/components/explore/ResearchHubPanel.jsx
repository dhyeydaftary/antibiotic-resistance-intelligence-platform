// frontend/src/components/explore/ResearchHubPanel.jsx

import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import Panel from '../app/Panel';
import { RESEARCH_HUB } from '../../constants/exploreContent';
import { RESEARCH_ANSWERS } from '../../constants/questionAnswers';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

function ResearchHubPanel() {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItem = (title) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <Panel id="research-hub" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        AI Research Hub
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Recent AMR research</h2>

      <div className="divide-y divide-panel-border">
        {RESEARCH_HUB.map((item) => {
          const isExpanded = expandedItems[item.title];
          const answer = RESEARCH_ANSWERS[item.title];
          
          return (
            <div key={item.title} className="py-3 first:pt-0 last:pb-0">
              <button
                onClick={() => toggleItem(item.title)}
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
                  className={`h-4 w-4 shrink-0 text-onpanel-faint transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`} 
                  strokeWidth={1.75}
                />
              </button>
              
              {isExpanded && answer && (
                <div className="mt-3 rounded-[10px] border border-accent-blue/20 bg-accent-blue/5 p-3.5">
                  <p className="font-sans text-small text-onpanel-muted">
                    <span className="font-semibold text-accent-blue">Summary:</span> {answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export default ResearchHubPanel;