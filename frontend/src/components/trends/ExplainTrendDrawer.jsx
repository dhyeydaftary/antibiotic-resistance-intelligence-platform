import { useState, useEffect } from 'react';
import { ExplainTrendSkeleton } from '../common/Skeletons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Database, Stethoscope, Radar, Activity,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { getTrendExplanation } from '../../api/trendsApi';
import Panel from '../app/Panel';

const DIRECTION_ICON = {
  rising: TrendingUp,
  declining: TrendingDown,
  'roughly stable': Minus,
};

// Matches the exact rising/declining/stable convention already used by
// TrendsPage's hero-chart trend indicator (resistant = worse, susceptible =
// better, muted = flat) — same meaning, same colors, not a new palette.
const DIRECTION_TONE = {
  rising: { text: 'text-resistant', bg: 'bg-resistant/15', border: 'border-resistant/30' },
  declining: { text: 'text-susceptible', bg: 'bg-susceptible/15', border: 'border-susceptible/30' },
  'roughly stable': { text: 'text-onpanel-muted', bg: 'bg-panel-border', border: 'border-panel-border' },
};

// Matches TrendsPage's TIER_TONE mapping (Access=susceptible, Watch=intermediate,
// Reserve=resistant) — detected from the clinicalRelevance text itself, so the
// color always reflects the antibiotic's real WHO AWaRe tier, not decoration.
function detectTierTone(text = '') {
  if (text.includes('Reserve tier')) return { text: 'text-resistant', bg: 'bg-resistant/15', border: 'border-resistant/25' };
  if (text.includes('Watch tier')) return { text: 'text-intermediate', bg: 'bg-intermediate/15', border: 'border-intermediate/25' };
  return { text: 'text-susceptible', bg: 'bg-susceptible/15', border: 'border-susceptible/25' };
}

const SECTION_TONE = {
  indigo: { text: 'text-accent-indigo', bg: 'bg-accent-indigo/15' },
  blue: { text: 'text-accent-blue', bg: 'bg-accent-blue/15' },
  amber: { text: 'text-intermediate', bg: 'bg-intermediate/15' },
  neutral: { text: 'text-onpanel-muted', bg: 'bg-panel-border' },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.05 } }),
};

// One collapsible-feeling (staggered fade-in) section within the drawer body.
function Section({ label, icon: Icon, tone = 'indigo', index, first = false, plain = false, children }) {
  const t = SECTION_TONE[tone];
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={sectionVariants}
      className={`py-5 ${first ? 'pt-0' : 'border-t border-panel-border'}`}
    >
      {plain ? (
        <div className={`mb-2 text-mono-label font-bold uppercase tracking-[0.1em] ${t.text}`}>{label}</div>
      ) : (
        <div className="mb-3 flex items-center gap-2">
          {Icon && (
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${t.bg}`}>
              <Icon size={12} strokeWidth={2.5} className={t.text} />
            </div>
          )}
          <div className={`text-mono-label font-bold uppercase tracking-[0.1em] ${t.text}`}>{label}</div>
        </div>
      )}
      {children}
    </motion.div>
  );
}

// Right-side drawer (portaled, Framer Motion slide-in) showing
// trend_insights.py's narrative explanation for the currently-selected
// antibiotic/organism — summary, key observations, possible causes,
// clinical relevance, AI forecast, and data sources. Opened from
// TrendsPage's "Explain Trend" button; fetches fresh on every open
// (not cached) since antibiotic/organism can change between opens.
function ExplainTrendDrawer({ antibiotic, organism, isOpen, onClose }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetches the trend explanation whenever the drawer opens (or its
  // target antibiotic/organism changes while open).
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setInsights(null);
    getTrendExplanation(antibiotic, organism)
      .then((result) => setInsights(result.data.insights))
      .catch((err) => {
        setError('Failed to load trend explanation.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [antibiotic, organism, isOpen]);

  // Locks background scroll while the drawer is open, restoring the
  // previous overflow value on close/unmount.
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  const forecastDirection = insights?.aiForecast?.direction || 'roughly stable';
  const DirectionIcon = DIRECTION_ICON[forecastDirection] || Minus;
  const directionTone = DIRECTION_TONE[forecastDirection] || DIRECTION_TONE['roughly stable'];
  const tierTone = detectTierTone(insights?.clinicalRelevance);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 z-[10000] flex h-full w-full max-w-md flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 290 }}
          >
            <Panel
              raised
              className="flex h-full flex-col !rounded-none border-y-0 border-r-0 border-l-2 border-accent-indigo/40 text-onpanel-ink !shadow-[-16px_0_48px_rgba(0,0,0,0.4)]"
            >
              {/* Header */}
              <div className="isolate shrink-0 border-b border-panel-border bg-panel-raised px-6 pb-5 pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5 text-mono-label font-bold uppercase tracking-[0.1em] text-accent-indigo">
                    <Sparkles size={14} strokeWidth={2.5} /> AI Interpretation
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-onpanel-faint transition-colors hover:bg-panel-raised hover:text-onpanel-ink"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mt-3 font-display text-[28px] font-bold leading-none text-onpanel-ink">
                  {antibiotic}
                </div>
                {organism !== 'all' && (
                  <div className="mt-1.5 text-small font-medium text-onpanel-muted">{organism}</div>
                )}

                {insights?.aiForecast && !loading && (
                  <div className={`mt-4 inline-flex items-center gap-2 rounded-full border ${directionTone.border} ${directionTone.bg} py-1.5 pl-2.5 pr-3.5`}>
                    <DirectionIcon size={13} strokeWidth={3} className={directionTone.text} />
                    <span className={`text-small font-bold ${directionTone.text}`}>
                      {forecastDirection === 'roughly stable' ? 'Stable' : forecastDirection === 'rising' ? 'Rising' : 'Declining'} trend
                    </span>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6">
                {loading && (
                  <ExplainTrendSkeleton />
                )}

                {error && (
                  <div className="mt-5 flex items-center gap-2 rounded-[14px] bg-resistant/10 p-3 text-small font-medium text-resistant">
                    <AlertTriangle size={14} strokeWidth={2.5} /> {error}
                  </div>
                )}

                {insights && !loading && !error && (
                  <>
                    <div className="py-5 pt-0">
                      <div className="mb-2 flex items-center gap-1.5 text-mono-label font-bold uppercase tracking-[0.1em] text-accent-indigo">
                        <Sparkles size={13} strokeWidth={2.5} /> Summary
                      </div>
                      <div className="border-l-[3px] border-accent-indigo/50 py-0.5 pl-4">
                        <p className="text-body leading-[1.7] text-onpanel-ink">{insights.summary}</p>
                      </div>
                    </div>

                    {insights.keyObservations && (
                      <Section label="Key Observations" icon={Activity} tone="blue" index={1}>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="rounded-[14px] border border-resistant/25 bg-panel-raised p-4">
                            <div className="text-mono-label font-bold uppercase tracking-[0.08em] text-onpanel-muted">Highest</div>
                            <div className="mt-1 font-display text-[26px] font-bold leading-none text-resistant">
                              {Math.round(insights.keyObservations.highest.resistanceRate * 100)}%
                            </div>
                            <div className="mt-1.5 text-caption font-medium text-onpanel-muted">{insights.keyObservations.highest.period}</div>
                          </div>
                          <div className="rounded-[14px] border border-susceptible/25 bg-panel-raised p-4">
                            <div className="text-mono-label font-bold uppercase tracking-[0.08em] text-onpanel-muted">Lowest</div>
                            <div className="mt-1 font-display text-[26px] font-bold leading-none text-susceptible">
                              {Math.round(insights.keyObservations.lowest.resistanceRate * 100)}%
                            </div>
                            <div className="mt-1.5 text-caption font-medium text-onpanel-muted">{insights.keyObservations.lowest.period}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-caption font-medium text-onpanel-muted">
                          <span className={`h-2 w-2 rounded-full ${insights.keyObservations.stability === 'stable' ? 'bg-susceptible' : 'bg-intermediate'}`} />
                          Stability: <span className="font-bold text-onpanel-ink">{insights.keyObservations.stability}</span>
                          <span className="text-onpanel-faint">(σ = {insights.keyObservations.standardDeviation})</span>
                        </div>
                      </Section>
                    )}

                    {insights.possibleCauses?.length > 0 && (
                      <Section label="Possible Causes" icon={AlertTriangle} tone="amber" index={2}>
                        <ul className="space-y-2.5">
                          {insights.possibleCauses.map((cause, i) => (
                            <li
                              key={i}
                              className="rounded-[14px] border-l-[3px] border-intermediate bg-panel-raised px-3.5 py-3 text-small font-medium leading-[1.55] text-onpanel-muted"
                            >
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {insights.clinicalRelevance && (
                      <Section label="Clinical Relevance" icon={Stethoscope} tone="indigo" index={3}>
                        <div className={`rounded-[14px] border p-4 ${tierTone.bg} ${tierTone.border}`}>
                          <p className="text-body font-medium leading-[1.65] text-onpanel-ink">{insights.clinicalRelevance}</p>
                        </div>
                      </Section>
                    )}

                    {insights.aiForecast && (
                      <Section label="AI Forecast" icon={Radar} tone="indigo" index={4}>
                        <div className={`rounded-[14px] border ${directionTone.border} bg-panel-raised p-4`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${directionTone.bg}`}>
                              <DirectionIcon size={16} strokeWidth={2.5} className={directionTone.text} />
                            </div>
                            <div>
                              <div className="font-display text-[26px] font-bold leading-none text-onpanel-ink">
                                {Math.round(insights.aiForecast.projectedNextMonthRate * 100)}%
                              </div>
                              <div className="mt-1 text-mono-label font-bold uppercase tracking-[0.08em] text-onpanel-muted">projected next month</div>
                            </div>
                          </div>
                          <p className="mt-3 text-caption font-medium leading-[1.5] text-onpanel-muted">
                            {insights.aiForecast.confidenceNote}
                          </p>
                          <p className="mt-2.5 border-t border-panel-border pt-2.5 text-caption text-onpanel-faint">
                            {insights.aiForecast.disclaimer}
                          </p>
                        </div>
                      </Section>
                    )}

                    {insights.sources && (
                      <Section label="Sources" tone="neutral" index={5} plain>
                        <div className="text-caption font-medium text-onpanel-muted">
                          Internal dataset · {insights.sources.recordsUsed?.toLocaleString()} records across {insights.sources.periodsCovered} recorded months
                        </div>
                      </Section>
                    )}

                    <div className="h-2" />
                  </>
                )}
              </div>
            </Panel>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ExplainTrendDrawer;