import { Link } from 'react-router-dom';
import { FileText, HelpCircle, ChevronRight } from 'lucide-react';
import Panel from '../app/Panel';
import { RESEARCH_FEED, WHAT_CHANGED, pickDailyQuestion } from '../../constants/homeContent';

function ColumnHeader({ title, linkTo, linkLabel }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="font-display text-h4 text-onpanel-ink">{title}</h3>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-0.5 font-sans text-caption font-medium text-accent-blue hover:text-accent-blue-hover"
        >
          {linkLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/**
 * PLACEHOLDER CONTENT NOTICE: the research feed and "what changed" bullets
 * come from constants/homeContent.js, not a live API — there's no
 * research-feed or changelog endpoint yet. Swap the data source there
 * once/if one exists; this component doesn't need to change.
 */
function HomeInsightPanel() {
  const question = pickDailyQuestion();

  return (
    <Panel className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg">
      <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="sm:pr-6">
          <ColumnHeader title="AI Research Feed" linkTo="/explore" linkLabel="View all" />
          <ul className="space-y-3">
            {RESEARCH_FEED.map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-onpanel-faint" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-sans text-small leading-snug text-onpanel-ink">{item.title}</p>
                  <p className="mt-0.5 font-mono text-caption text-onpanel-faint">{item.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-5 sm:px-6 sm:pt-0">
          <ColumnHeader title="What changed?" linkTo="/trends" linkLabel="Explore trends" />
          <p className="mb-3 font-sans text-caption text-onpanel-faint">
            Latest updates in AMR patterns
          </p>
          <ul className="space-y-2">
            {WHAT_CHANGED.map((line) => (
              <li key={line} className="flex gap-2 font-sans text-small text-onpanel-ink">
                <span className="text-accent-blue">&bull;</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-5 sm:pl-6 sm:pt-0">
          <ColumnHeader title="Today's question" />
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
            <div>
              <p className="font-sans text-small font-medium text-onpanel-ink">{question}</p>
              <p className="mt-1 font-sans text-caption text-onpanel-faint">
                Ask AI or explore the dataset to find out.
              </p>
            </div>
          </div>
          <Link
            to="/explore"
            className="mt-3 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            Explore now
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export default HomeInsightPanel;
