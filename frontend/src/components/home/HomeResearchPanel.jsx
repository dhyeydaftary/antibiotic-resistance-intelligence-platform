import { Link } from 'react-router-dom';
import { FlaskConical, ArrowRight, ChevronRight } from 'lucide-react';
import Panel from '../app/Panel';
import ResultBadge from '../app/ResultBadge';
import PrimaryButton from '../app/PrimaryButton';

const RESULT_STRIPE = {
  R: 'bg-resistant',
  S: 'bg-susceptible',
  I: 'bg-intermediate',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * recentPredictions: [{ recordId, organism, result, confidence, date }]
 * (already flattened — see HomePage.jsx for how this is derived from getHistory())
 */
function HomeResearchPanel({ recentPredictions }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Panel className="p-6 lg:col-span-2 transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg">
        <div className="mb-2 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
          Continue your research
        </div>
        <h3 className="font-display text-h3 text-onpanel-ink">Run a new prediction</h3>
        <p className="mt-2 font-sans text-small text-onpanel-muted">
          Predict resistance across all 15 antibiotics for a new organism sample.
        </p>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-accent-blue/15">
            <FlaskConical className="h-5 w-5 text-accent-blue" strokeWidth={1.75} />
          </div>
          <Link to="/predict" className="flex-1">
            <PrimaryButton className="w-full">
              Start prediction
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </Link>
        </div>
      </Panel>

      <Panel className="p-6 lg:col-span-3 transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
              Of all predictions
            </div>
            <h3 className="font-display text-h3 text-onpanel-ink">Recent predictions</h3>
          </div>
          <Link
            to="/history"
            className="flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentPredictions.length === 0 ? (
          <p className="py-6 text-center font-sans text-small text-onpanel-faint">
            No predictions yet — run your first one to see it here.
          </p>
        ) : (
          <div className="divide-y divide-panel-border">
            {/* NOTE: rows aren't linked to a per-prediction detail route —
                the app currently has no GET-by-id result view (Result page
                only renders a just-submitted "live" prediction via router
                state, and History expands details inline instead of routing).
                "View all" above goes to /history where the real detail view lives. */}
            {recentPredictions.map((p) => (
              <div key={p.recordId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span
                  className={`h-8 w-1 shrink-0 rounded-full ${RESULT_STRIPE[p.result] || 'bg-panel-border'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-small font-medium text-onpanel-ink">
                    {p.organism}
                  </p>
                  <p className="font-mono text-caption text-onpanel-faint">{formatDate(p.date)}</p>
                </div>
                <span className="font-mono text-caption text-onpanel-muted">{p.confidence}%</span>
                <ResultBadge result={p.result} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default HomeResearchPanel;
