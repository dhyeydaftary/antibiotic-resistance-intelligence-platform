import { FileText } from 'lucide-react';
import Panel from '../app/Panel';
import { RESEARCH_HUB } from '../../constants/exploreContent';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * PLACEHOLDER CONTENT — no research-feed API exists yet, see
 * constants/exploreContent.js. Same items Home's "AI Research Feed" links
 * here to, just the full list instead of the first three.
 */
function ResearchHubPanel() {
  return (
    <Panel id="research-hub" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        AI Research Hub
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Recent AMR research</h2>

      <div className="divide-y divide-panel-border">
        {RESEARCH_HUB.map((item) => (
          <div key={item.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="font-sans text-small text-onpanel-ink">{item.title}</p>
              <p className="mt-0.5 font-mono text-caption text-onpanel-faint">{item.date}</p>
            </div>
            <span className="shrink-0 rounded-full border border-panel-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-onpanel-muted">
              {item.tag}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default ResearchHubPanel;
