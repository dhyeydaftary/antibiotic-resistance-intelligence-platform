import { useMemo, useState } from 'react';
import { Search, Microscope, FlaskConical } from 'lucide-react';
import { ANTIBIOTIC_AWARE_MAP } from '../../constants/exploreContent';

/**
 * Real client-side search across real organism names (from dataset-stats)
 * and real antibiotic names (from the ml-backend's AWaRe map) — no fake
 * API, just filtering arrays that are already loaded.
 */
function ExploreHero({ organisms, onSelectOrganism, onSelectAntibiotic }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const organismMatches = organisms
      .filter((o) => o.organism.toLowerCase().includes(q))
      .slice(0, 5);
    const antibioticMatches = Object.keys(ANTIBIOTIC_AWARE_MAP)
      .filter((a) => a.toLowerCase().includes(q))
      .slice(0, 5);

    return { organismMatches, antibioticMatches };
  }, [query, organisms]);

  function handlePick(type, value) {
    setQuery('');
    if (type === 'organism') onSelectOrganism(value);
    else onSelectAntibiotic(value);
    const targetId = type === 'organism' ? 'organism-library' : 'antibiotic-library';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const hasResults = results && (results.organismMatches.length > 0 || results.antibioticMatches.length > 0);

  return (
    <div className="py-4 sm:py-8">
      <div className="mb-3 font-mono text-mono-label font-medium uppercase tracking-[0.12em] text-page-faint">
        Dataset Explorer
      </div>
      <h1 className="font-display text-h1 text-page-ink sm:text-[44px]">Explore the AMR Dataset</h1>
      <p className="mt-3 max-w-lg font-sans text-subtitle text-page-muted">
        Search organisms and antibiotics, browse WHO AWaRe coverage, and see what's really in the
        data behind every prediction.
      </p>

      <div className="relative mt-6 max-w-lg">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-onpanel-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organisms or antibiotics..."
          className="w-full rounded-[10px] border border-panel-border bg-panel-raised py-2.5 pl-10 pr-3.5 font-sans text-[15px] text-onpanel-ink outline-none transition-all duration-150 placeholder:text-onpanel-faint focus:border-accent-blue focus:shadow-focus-ring"
        />

        {query && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[10px] border border-panel-border bg-panel shadow-panel-lg">
            {!hasResults ? (
              <p className="p-3.5 font-sans text-small text-onpanel-faint">No matches for "{query}"</p>
            ) : (
              <>
                {results.organismMatches.map((o) => (
                  <button
                    key={o.organism}
                    type="button"
                    onClick={() => handlePick('organism', o.organism)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-panel-raised"
                  >
                    <Microscope className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                    <span className="font-sans text-small text-onpanel-ink">{o.organism}</span>
                    <span className="ml-auto font-mono text-caption text-onpanel-faint">
                      {o.count.toLocaleString()}
                    </span>
                  </button>
                ))}
                {results.antibioticMatches.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => handlePick('antibiotic', a)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-panel-raised"
                  >
                    <FlaskConical className="h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
                    <span className="font-sans text-small text-onpanel-ink">{a}</span>
                    <span className="ml-auto font-mono text-caption text-onpanel-faint">
                      {ANTIBIOTIC_AWARE_MAP[a]}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExploreHero;
