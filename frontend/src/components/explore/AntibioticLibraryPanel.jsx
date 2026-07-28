import Panel from '../app/Panel';
import { ANTIBIOTIC_AWARE_MAP, AWARE_CATEGORIES, AWARE_DESCRIPTIONS } from '../../constants/exploreContent';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

const CATEGORY_DOT = {
  Access: 'bg-susceptible',
  Watch: 'bg-intermediate',
  Reserve: 'bg-resistant',
};

/**
 * Display-only now — clicking a pill used to "select" an antibiotic for
 * DatasetInsightPanel, but that added a selection state with no real
 * payoff. Just the hover border-color change remains.
 */
function AntibioticLibraryPanel() {
  const byCategory = AWARE_CATEGORIES.map((category) => ({
    category,
    antibiotics: Object.entries(ANTIBIOTIC_AWARE_MAP)
      .filter(([, cat]) => cat === category)
      .map(([name]) => name),
  }));

  return (
    <Panel id="antibiotic-library" className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Antibiotic Library
      </div>
      <h2 className="mb-4 font-display text-h3 text-onpanel-ink">WHO AWaRe coverage</h2>

      <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {byCategory.map(({ category, antibiotics }, i) => (
          <div key={category} className={i === 0 ? 'sm:pr-6' : i === 1 ? 'pt-5 sm:px-6 sm:pt-0' : 'pt-5 sm:pl-6 sm:pt-0'}>
            <div className="mb-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[category]}`} />
              <h3 className="font-display text-h4 text-onpanel-ink">{category}</h3>
              <span className="font-mono text-caption text-onpanel-faint">({antibiotics.length})</span>
            </div>
            <p className="mb-3 font-sans text-caption text-onpanel-faint">{AWARE_DESCRIPTIONS[category]}</p>
            <div className="flex flex-wrap gap-1.5">
              {antibiotics.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-panel-border px-2.5 py-1 font-mono text-caption text-onpanel-muted transition-colors hover:border-accent-blue/40"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default AntibioticLibraryPanel;
