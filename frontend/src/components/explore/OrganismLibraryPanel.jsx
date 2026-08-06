import { Microscope } from 'lucide-react';
import Panel from '../app/Panel';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

// Clickable grid of every organism in the dataset with sample count/share;
// selecting one highlights it across DatasetInsightPanel too.
/**
 * organisms: real organismDistribution array from GET /predictor/dataset-stats
 * — [{ organism, count }], already sorted desc by caller.
 */
function OrganismLibraryPanel({ organisms, totalRows, selected, onSelect }) {
  return (
    <Panel id="organism-library" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Organism Library
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">Organisms in this dataset</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {organisms.map((o) => {
          const pct = totalRows ? Math.round((o.count / totalRows) * 100) : 0;
          const isSelected = selected === o.organism;
          return (
            <button
              key={o.organism}
              type="button"
              onClick={() => onSelect(isSelected ? null : o.organism)}
              className={`rounded-[10px] border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-accent-blue bg-panel-raised'
                  : 'border-panel-border bg-panel-raised/40 hover:border-accent-blue/40'
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <Microscope className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                <span className="truncate font-sans text-small font-medium text-onpanel-ink">{o.organism}</span>
              </div>
              <p className="font-mono text-caption text-onpanel-muted">
                {o.count.toLocaleString()} samples · {pct}%
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-border">
                <div className="h-full rounded-full bg-accent-blue" style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export default OrganismLibraryPanel;
