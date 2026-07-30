import { Building2, TestTubes } from 'lucide-react';
import Panel from '../app/Panel';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

/**
 * Horizontal bar row — reused for both ward-type and specimen-source.
 * Uses accent-blue only (no R/S/I colors).
 */
function DistributionRow({ label, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[140px] shrink-0 truncate font-sans text-small text-onpanel-ink">
        {label}
      </span>
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-panel-border">
          <div
            className="h-full rounded-full bg-accent-blue transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-caption text-onpanel-muted">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

function DistributionSection({ icon: Icon, title, subtitle, items, labelKey }) {
  if (!items || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0]?.count || 1;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-blue" strokeWidth={1.75} />
        <span className="font-mono text-mono-label font-medium uppercase tracking-[0.08em] text-onpanel-faint">
          {title}
        </span>
      </div>
      <p className="mb-4 font-sans text-caption text-onpanel-muted">{subtitle}</p>
      <div className="space-y-2.5">
        {sorted.map((item) => (
          <DistributionRow
            key={item[labelKey]}
            label={item[labelKey]}
            count={item.count}
            maxCount={maxCount}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * wardTypeDistribution:      [{wardType, count}]    from dataset-stats API
 * specimenSourceDistribution: [{specimenSource, count}] from dataset-stats API
 *
 * Both are optional / may be absent on the legacy (non-augmented) dataset.
 * The panel renders nothing if neither array exists.
 */
function WardSpecimenPanel({ wardTypeDistribution, specimenSourceDistribution }) {
  const hasWard = wardTypeDistribution && wardTypeDistribution.length > 0;
  const hasSpecimen = specimenSourceDistribution && specimenSourceDistribution.length > 0;
  if (!hasWard && !hasSpecimen) return null;

  return (
    <Panel className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Clinical Context
      </div>
      <h2 className="mb-5 font-display text-h3 text-onpanel-ink">
        Ward &amp; specimen breakdown
      </h2>

      <div className={`grid grid-cols-1 gap-8 ${hasWard && hasSpecimen ? 'sm:grid-cols-2' : ''}`}>
        {hasWard && (
          <DistributionSection
            icon={Building2}
            title="Ward Type"
            subtitle="Distribution of samples across hospital wards"
            items={wardTypeDistribution}
            labelKey="wardType"
          />
        )}
        {hasSpecimen && (
          <DistributionSection
            icon={TestTubes}
            title="Specimen Source"
            subtitle="Distribution of samples by specimen type"
            items={specimenSourceDistribution}
            labelKey="specimenSource"
          />
        )}
      </div>
    </Panel>
  );
}

export default WardSpecimenPanel;
