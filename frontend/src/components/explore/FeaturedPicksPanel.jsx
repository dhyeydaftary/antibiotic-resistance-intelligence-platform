import { Microscope, FlaskConical } from 'lucide-react';
import Panel from '../app/Panel';
import { ANTIBIOTIC_AWARE_MAP, AWARE_DESCRIPTIONS } from '../../constants/exploreContent';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

// Picks a day-of-year-indexed item from a list, so the choice rotates
// daily but stays consistent within a day.
// Deterministic daily rotation (same pattern as homeContent.js's
// pickDailyQuestion) — the pick rotates, but every fact shown about the
// pick is real: organism counts come from the real dataset-stats response,
// and the antibiotic's AWaRe category is the real mirrored map.
function pickOfTheDay(list, seed = 0) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return list[(dayOfYear + seed) % list.length];
}

// "Featured organism" + "featured antibiotic of the day" cards — the
// pick rotates daily, but every stat shown about it is real.
function FeaturedPicksPanel({ organisms, totalRows }) {
  const featuredOrganism = organisms.length ? pickOfTheDay(organisms, 0) : null;
  const antibioticNames = Object.keys(ANTIBIOTIC_AWARE_MAP);
  const featuredAntibiotic = pickOfTheDay(antibioticNames, 3);
  const category = ANTIBIOTIC_AWARE_MAP[featuredAntibiotic];

  const organismPct =
    featuredOrganism && totalRows ? ((featuredOrganism.count / totalRows) * 100).toFixed(1) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Panel className={`p-6 ${HOVER}`}>
        <div className="mb-3 flex items-center gap-2">
          <Microscope className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
          <div className="font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            Featured Organism
          </div>
        </div>
        {featuredOrganism ? (
          <>
            <h3 className="font-display text-h3 text-onpanel-ink">{featuredOrganism.organism}</h3>
            <p className="mt-1.5 font-sans text-small text-onpanel-muted">
              {featuredOrganism.count.toLocaleString()} samples in this dataset — {organismPct}% of the total.
            </p>
          </>
        ) : (
          <p className="font-sans text-small text-onpanel-faint">No organism data yet.</p>
        )}
      </Panel>

      <Panel className={`p-6 ${HOVER}`}>
        <div className="mb-3 flex items-center gap-2">
          <FlaskConical className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
          <div className="font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            Featured Antibiotic
          </div>
        </div>
        <h3 className="font-display text-h3 text-onpanel-ink">{featuredAntibiotic}</h3>
        <p className="mt-1.5 font-sans text-small text-onpanel-muted">
          WHO AWaRe: <span className="font-medium text-onpanel-ink">{category}</span> — {AWARE_DESCRIPTIONS[category]}
        </p>
      </Panel>
    </div>
  );
}

export default FeaturedPicksPanel;
