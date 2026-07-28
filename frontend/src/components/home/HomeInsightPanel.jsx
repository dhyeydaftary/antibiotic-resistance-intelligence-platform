import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, HelpCircle, ChevronRight, ChevronDown } from 'lucide-react';
import Panel from '../app/Panel';
import { RESEARCH_FEED, WHAT_CHANGED, pickDailyQuestion } from '../../constants/homeContent';
import { getAnswer } from '../../utils/questionAnswers';
import { getDatasetStats } from '../../api/datasetApi';

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
 *
 * "Today's question" DOES answer for real, though — it fetches the same
 * real dataset-stats used on Explore and reuses utils/questionAnswers.js,
 * so clicking it never shows an invented statistic.
 */
function HomeInsightPanel() {
  const question = pickDailyQuestion();
  const [stats, setStats] = useState(null);
  const [answerOpen, setAnswerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDatasetStats()
      .then((result) => {
        if (!cancelled) setStats(result.data);
      })
      .catch((err) => console.error('Failed to load dataset stats for Today\u2019s question:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel className="p-6 transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg">
      <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="sm:pr-6">
          <ColumnHeader title="AI Research Feed" linkTo="/explore#research-hub" linkLabel="View all" />
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
          <button
            type="button"
            onClick={() => setAnswerOpen((v) => !v)}
            className="flex w-full items-start gap-3 text-left"
          >
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="font-sans text-small font-medium text-onpanel-ink">{question}</p>
              <p className="mt-1 font-sans text-caption text-onpanel-faint">
                {answerOpen ? 'Hide answer' : 'Tap to see the answer'}
              </p>
            </div>
            <ChevronDown
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-onpanel-faint transition-transform ${
                answerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {answerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="mt-2 pl-7 font-sans text-caption text-onpanel-muted">
                  {getAnswer(question, { stats })}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Link
            to="/explore#question-bank"
            className="mt-3 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            See more questions
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

export default HomeInsightPanel;
