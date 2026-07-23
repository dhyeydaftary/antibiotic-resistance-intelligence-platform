import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, ArrowRight, Clock, FlaskConical, Microscope,
  Home, ClipboardList, TrendingUp, Compass, PlusCircle,
  GitCompare, CornerDownLeft,
} from 'lucide-react';
import { getHistory } from '../../api/historyApi';
import { ORGANISM_OPTIONS, ANTIBIOTICS, APP_PAGES } from '../../constants/domainData';

const PAGE_ICONS = {
  '/home': Home,
  '/predict': FlaskConical,
  '/history': ClipboardList,
  '/trends': TrendingUp,
  '/explore': Compass,
};

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent text-teal font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset state on open, focus input, lazy-load recent predictions
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);

      getHistory()
        .then((res) => setRecentPredictions(res?.data?.history?.slice(0, 5) || []))
        .catch(() => setRecentPredictions([]));
    }
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  const quickActions = useMemo(() => [
    { id: 'qa-new', label: 'New Prediction', icon: PlusCircle, action: () => navigate('/predict') },
    { id: 'qa-compare', label: 'Compare Cases', icon: GitCompare, action: () => navigate('/history') },
    { id: 'qa-history', label: 'Open History', icon: ClipboardList, action: () => navigate('/history') },
    { id: 'qa-trends', label: 'Open Trends', icon: TrendingUp, action: () => navigate('/trends') },
    { id: 'qa-explore', label: 'Open Explore', icon: Compass, action: () => navigate('/explore') },
  ], [navigate]);

  // Build flat, filtered, grouped result list
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (label) => !q || label.toLowerCase().includes(q);

    const pages = APP_PAGES
      .filter((p) => matches(p.label))
      .map((p) => ({
        id: `page-${p.path}`,
        label: p.label,
        icon: PAGE_ICONS[p.path] || Home,
        action: () => navigate(p.path),
      }));

    const organisms = ORGANISM_OPTIONS
      .filter((o) => matches(o))
      .map((o) => ({
        id: `org-${o}`,
        label: o,
        icon: Microscope,
        action: () => navigate('/predict', { state: { organism: o } }),
      }));

    const antibiotics = ANTIBIOTICS
      .filter((a) => matches(a.code))
      .map((a) => ({
        id: `abx-${a.code}`,
        label: a.code,
        meta: a.aware,
        icon: FlaskConical,
        action: () => navigate('/explore', { state: { antibiotic: a.code } }),
      }));

    const recent = recentPredictions
      .filter((r) => matches(r.inputData?.organism || ''))
      .map((r) => ({
        id: `recent-${r._id}`,
        label: r.inputData?.organism || 'Prediction',
        meta: new Date(r.createdAt).toLocaleDateString(),
        icon: Clock,
        action: () => navigate('/history', { state: { openRecordId: r._id } }),
      }));

    const actions = quickActions.filter((a) => matches(a.label));

    return [
      { title: 'Quick Actions', items: actions },
      { title: 'Pages', items: pages },
      { title: 'Recent Predictions', items: recent },
      { title: 'Organisms', items: organisms },
      { title: 'Antibiotics', items: antibiotics },
    ].filter((g) => g.items.length > 0);
  }, [query, recentPredictions, quickActions, navigate]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const runItem = useCallback((item) => {
    if (!item) return;
    item.action();
    close();
  }, [close]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(flatItems[selectedIndex]);
    }
  }

  // Keep selected item scrolled into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-xl bg-paper border border-hairline flex flex-col max-h-[70vh] overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
              <Search size={16} className="text-ink-faint shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, organisms, antibiotics..."
                className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-faint font-sans text-sm"
              />
              <kbd className="text-[10px] font-mono uppercase tracking-wide text-ink-faint border border-hairline px-1.5 py-0.5">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto flex-1">
              {flatItems.length === 0 && (
                <div className="px-4 py-8 text-center text-ink-faint text-sm font-sans">
                  No results found.
                </div>
              )}

              {groups.map((group) => (
                <div key={group.title} className="py-2">
                  <div className="px-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-faint">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        data-index={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => runItem(item)}
                        className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                          isSelected ? 'bg-hairline/60' : ''
                        }`}
                      >
                        <Icon size={15} className="text-ink-muted shrink-0" />
                        <span className="flex-1 text-sm font-sans text-ink truncate">
                          {highlightMatch(item.label, query)}
                        </span>
                        {item.meta && (
                          <span className="text-[10px] font-mono uppercase tracking-wide text-ink-faint shrink-0">
                            {item.meta}
                          </span>
                        )}
                        {isSelected && (
                          <ArrowRight size={13} className="text-teal shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer hint bar */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-hairline text-[10px] font-mono uppercase tracking-wide text-ink-faint">
              <span className="flex items-center gap-1">
                <CornerDownLeft size={11} /> Select
              </span>
              <span>↑↓ Navigate</span>
              <span>Esc Close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}