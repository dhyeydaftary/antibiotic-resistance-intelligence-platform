import { Sparkles } from 'lucide-react';
import Panel from '../app/Panel';
import { ANTIBIOTIC_AWARE_MAP, AWARE_DESCRIPTIONS } from '../../constants/exploreContent';

const HOVER = 'transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * Every sentence here is generated from real numbers already present in
 * `stats` (the real dataset-stats API response) — same convention the
 * Result page already uses for its "AI Insights" section (templated text
 * over real stats, not a live model call). No numbers here are invented.
 */
function buildInsight({ stats, selectedOrganism, selectedAntibiotic }) {
  const organisms = stats.organismDistribution || [];
  const totalRows = stats.totalRows || 0;

  if (selectedAntibiotic) {
    const category = ANTIBIOTIC_AWARE_MAP[selectedAntibiotic];
    return `${selectedAntibiotic} is classified under the WHO AWaRe ${category} tier. ${AWARE_DESCRIPTIONS[category]}`;
  }

  if (selectedOrganism) {
    const entry = organisms.find((o) => o.organism === selectedOrganism);
    if (entry) {
      const pct = totalRows ? ((entry.count / totalRows) * 100).toFixed(1) : 0;
      const sorted = [...organisms].sort((a, b) => b.count - a.count);
      const rank = sorted.findIndex((o) => o.organism === selectedOrganism) + 1;
      return `${selectedOrganism} accounts for ${entry.count.toLocaleString()} samples \u2014 ${pct}% of the dataset, ranked #${rank} of ${organisms.length} organisms by sample count.`;
    }
  }

  const topOrganism = [...organisms].sort((a, b) => b.count - a.count)[0];
  return `This dataset spans ${totalRows.toLocaleString()} samples across ${organisms.length} organisms, tested against ${stats.antibioticTargets} antibiotics under the WHO AWaRe framework.${
    topOrganism ? ` ${topOrganism.organism} is the most represented organism.` : ''
  }`;
}

function DatasetInsightPanel({ stats, selectedOrganism, selectedAntibiotic }) {
  const insight = buildInsight({ stats, selectedOrganism, selectedAntibiotic });

  return (
    <Panel className={`p-6 ${HOVER}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-blue/15">
          <Sparkles className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
        </div>
        <div>
          <div className="mb-1 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            AI Insight
          </div>
          <p className="font-sans text-body-lg text-onpanel-ink">{insight}</p>
        </div>
      </div>
    </Panel>
  );
}

export default DatasetInsightPanel;
