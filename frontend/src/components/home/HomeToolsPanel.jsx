import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, MessageSquare, LineChart, FileEdit, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import Panel from '../app/Panel';

const JOURNEY_STEPS = [
  { icon: MessageSquare, label: 'Input' },
  { icon: LineChart, label: 'Analyze' },
  { icon: FileEdit, label: 'Result' },
  { icon: Sparkles, label: 'Insights' },
];

const NOTEBOOK_STORAGE_KEY = 'amr-insight:notebook';

/**
 * AI Memory has no backend concept of "memory" yet, so "Open AI Memory"
 * honestly points at /history — your real past activity — rather than a
 * feature that doesn't exist. AI Notebook is a real (if minimal) feature:
 * a per-browser notes box saved to localStorage.
 */
function HomeToolsPanel() {
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(NOTEBOOK_STORAGE_KEY);
    if (saved) setNote(saved);
  }, []);

  function handleSave() {
    window.localStorage.setItem(NOTEBOOK_STORAGE_KEY, note);
    setSavedAt(new Date());
  }

  return (
    <Panel className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent-blue/30 hover:shadow-panel-lg">
      <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="sm:pr-6">
          <Brain className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
          <h3 className="mt-3 font-display text-h4 text-onpanel-ink">AI Memory</h3>
          <p className="mt-1.5 font-sans text-small text-onpanel-muted">
            Remembers your work and suggests insights based on your activity.
          </p>
          <Link
            to="/history"
            className="mt-3 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            Open AI Memory
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="pt-5 sm:px-6 sm:pt-0">
          <h3 className="mb-6 font-display text-h4 text-onpanel-ink">Prediction journey</h3>
          <div className="relative flex items-start justify-between">
            <div className="absolute left-[9%] right-[9%] top-[9px] h-px bg-panel-border" aria-hidden="true" />
            {JOURNEY_STEPS.map((step) => (
              <div key={step.label} className="relative z-10 flex flex-col items-center bg-panel px-1 text-center">
                <step.icon className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.06em] text-onpanel-muted">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-5 sm:pl-6 sm:pt-0">
          <BookOpen className="h-[18px] w-[18px] text-accent-blue" strokeWidth={1.75} />
          <h3 className="mt-3 font-display text-h4 text-onpanel-ink">AI Notebook</h3>
          <p className="mt-1.5 font-sans text-small text-onpanel-muted">
            Save notes and findings from your analysis.
          </p>
          <button
            type="button"
            onClick={() => setNotebookOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 font-sans text-small font-medium text-accent-blue hover:text-accent-blue-hover"
          >
            {notebookOpen ? 'Close notebook' : 'Open Notebook'}
            <ArrowRight className={`h-3.5 w-3.5 transition-transform ${notebookOpen ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {notebookOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Jot down a note..."
                  rows={3}
                  className="mt-3 w-full resize-none rounded-[10px] border border-panel-border bg-panel-raised p-3 font-sans text-small text-onpanel-ink placeholder:text-onpanel-faint focus:outline-none focus:shadow-focus-ring"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-caption text-onpanel-faint">
                    {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'Saved only on this device'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-[8px] bg-accent-blue px-3 py-1.5 font-sans text-caption font-medium text-white hover:bg-accent-blue-hover"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Panel>
  );
}

export default HomeToolsPanel;
