import { Sparkles } from 'lucide-react';
import Panel from '../app/Panel';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * Every sentence here is generated from real numbers already present in
 * `stats` (the real dataset-stats API response) — same convention the
 * Result page already uses for its "AI Insights" section (templated text
 * over real stats, not a live model call). No numbers here are invented.
 *
 * Antibiotic selection was removed from AntibioticLibraryPanel (click-to-
 * select had no real payoff), so this only responds to organism selection.
 */
const COMORB_LABELS = {
  previousAntibioticUse: 'prior antibiotic use',
  ckd: 'CKD',
  liverDisease: 'liver disease',
  cancer: 'cancer',
  immunocompromised: 'immunocompromised status',
};

function buildInsight({ stats, selectedOrganism }) {
  const organisms = stats.organismDistribution || [];
  const totalRows = stats.totalRows || 0;
  const insights = [];

  if (selectedOrganism) {
    const entry = organisms.find((o) => o.organism === selectedOrganism);
    if (entry) {
      const pct = totalRows ? ((entry.count / totalRows) * 100).toFixed(1) : 0;
      const sorted = [...organisms].sort((a, b) => b.count - a.count);
      const rank = sorted.findIndex((o) => o.organism === selectedOrganism) + 1;
      insights.push({
        label: 'Organism Focus',
        value: `${selectedOrganism} accounts for ${entry.count.toLocaleString()} samples (${pct}% of dataset, rank #${rank}).`
      });
    }
  } else {
    const topOrganism = [...organisms].sort((a, b) => b.count - a.count)[0];
    insights.push({
      label: 'Dataset Coverage',
      value: `Contains ${totalRows.toLocaleString()} samples across ${organisms.length} organisms & ${stats.antibioticTargets} antibiotics.${
        topOrganism ? ` ${topOrganism.organism} is the most represented species.` : ''
      }`
    });
  }

  // Ward type context
  if (stats.wardTypeDistribution?.length) {
    const topWard = [...stats.wardTypeDistribution].sort((a, b) => b.count - a.count)[0];
    const wardPct = totalRows ? Math.round((topWard.count / totalRows) * 100) : 0;
    insights.push({
      label: 'Primary Site',
      value: `${topWard.wardType} is the leading sample source, representing ${wardPct}% of ward records.`
    });
  }

  // Comorbidity context
  if (stats.comorbidityPrevalence?.length) {
    const topComorb = [...stats.comorbidityPrevalence].sort((a, b) => b.prevalence - a.prevalence)[0];
    const pct = Math.round(topComorb.prevalence * 100);
    const label = COMORB_LABELS[topComorb.field] || topComorb.field;
    insights.push({
      label: 'Key Patient Metric',
      value: `Prevalent risk factor is ${label} (present in ${pct}% of cases).`
    });
  }

  return insights;
}

function DatasetInsightPanel({ stats, selectedOrganism }) {
  const insights = buildInsight({ stats, selectedOrganism });

  return (
    <Panel className={`p-6 ${HOVER}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-blue/15">
          <Sparkles className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2.5 font-mono text-mono-label uppercase tracking-[0.08em] text-onpanel-faint">
            Key Insights
          </div>
          <ul className="space-y-2">
            {insights.map((item, idx) => (
              <li key={idx} className="font-sans text-small leading-[1.5] text-onpanel-ink flex items-start gap-2">
                <span className="text-accent-blue mt-1 shrink-0 font-bold">•</span>
                <span>
                  <strong className="font-medium text-[#F5F5F7]">{item.label}:</strong> {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

export default DatasetInsightPanel;