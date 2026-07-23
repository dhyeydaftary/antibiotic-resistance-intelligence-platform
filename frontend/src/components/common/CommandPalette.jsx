import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, Clock, FlaskConical, Microscope,
  Home, ClipboardList, TrendingUp, Compass, PlusCircle,
  GitCompare, CornerDownLeft, SearchX,
} from 'lucide-react';
import { getHistory } from '../../api/historyApi';
import { ORGANISM_OPTIONS, ANTIBIOTICS, APP_PAGES } from '../../constants/domainData';
import { fuzzyFilter, getRecentCommands, recordCommandUse } from '../../utils/fuzzyMatch';

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
      <span className="text-app-accent font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function Badge({ children, tone = 'accent' }) {
  const tones = {
    accent: 'text-app-accent bg-app-accent-soft',
    amber: 'text-amber-700 bg-amber-100',
    green: 'text-green-700 bg-green-100',
  };
  return (
    <span className={`text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${tones[tone] || tones.accent}`}>
      {children}
    </span>
  );
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [recentCommands, setRecentCommands] = useState([]);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setRecentCommands(getRecentCommands());
      setTimeout(() => inputRef.current?.focus(), 10);

      getHistory()
        .then((res) => setRecentPredictions(res?.data?.history?.slice(0, 5) || []))
        .catch(() => setRecentPredictions([]));
    }
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  const quickActions = useMemo(() => [
    { id: 'qa-new', label: 'New Prediction', icon: PlusCircle, shortcut: 'N', action: () => navigate('/predict') },
    { id: 'qa-compare', label: 'Compare Cases', icon: GitCompare, badge: 'NEW', action: () => navigate('/history') },
    { id: 'qa-history', label: 'Open History', icon: ClipboardList, action: () => navigate('/history') },
    { id: 'qa-trends', label: 'Open Trends', icon: TrendingUp, action: () => navigate('/trends') },
    { id: 'qa-explore', label: 'Open Explore', icon: Compass, action: () => navigate('/explore') },
  ], [navigate]);

  const allCommands = useMemo(() => {
    const pages = APP_PAGES.map((p) => ({
      id: `page-${p.path}`, label: p.label, group: 'Navigation',
      icon: PAGE_ICONS[p.path] || Home, action: () => navigate(p.path),
    }));

    const organisms = ORGANISM_OPTIONS.map((o) => ({
      id: `org-${o}`, label: o, group: 'Organisms',
      icon: Microscope, action: () => navigate('/predict', { state: { organism: o } }),
    }));

    const antibiotics = ANTIBIOTICS.map((a) => ({
      id: `abx-${a.code}`, label: a.code, group: 'Antibiotics', meta: a.aware,
      icon: FlaskConical, action: () => navigate('/explore', { state: { antibiotic: a.code } }),
    }));

    const recent = recentPredictions.map((r) => ({
      id: `recent-${r._id}`,
      label: r.inputData?.organism || 'Prediction',
      description: new Date(r.createdAt).toLocaleDateString(),
      group: 'Recent Predictions',
      icon: Clock,
      action: () => navigate('/history', { state: { openRecordId: r._id } }),
    }));

    const actions = quickActions.map((a) => ({ ...a, group: 'Actions' }));

    return [...actions, ...pages, ...recent, ...organisms, ...antibiotics];
  }, [recentPredictions, quickActions, navigate]);

  const groups = useMemo(() => {
    const q = query.trim();

    if (!q) {
      const recentUsed = recentCommands
        .map((rc) => allCommands.find((c) => c.id === rc.id))
        .filter(Boolean)
        .map((c) => ({ ...c, badge: c.badge || 'RECENT' }));

      const defaultGroups = [
        { title: 'Recent', items: recentUsed },
        { title: 'Actions', items: allCommands.filter((c) => c.group === 'Actions') },
        { title: 'Navigation', items: allCommands.filter((c) => c.group === 'Navigation') },
      ];
      return defaultGroups.filter((g) => g.items.length > 0);
    }

    const ranked = fuzzyFilter(allCommands, q, (c) => c.label);
    const byGroup = {};
    ranked.forEach(({ item, score }) => {
      if (!byGroup[item.group]) byGroup[item.group] = [];
      byGroup[item.group].push({ ...item, _score: score });
    });

    const groupOrder = ['Actions', 'Navigation', 'Recent Predictions', 'Antibiotics', 'Organisms'];
    return groupOrder
      .filter((g) => byGroup[g]?.length)
      .map((title) => ({ title, items: byGroup[title] }));
  }, [query, allCommands, recentCommands]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => setSelectedIndex(0), [query]);

  const runItem = useCallback((item) => {
    if (!item) return;
    recordCommandUse(item.id, item.label);
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

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/55" onClick={close} />

          <motion.div
            className="relative w-full max-w-xl bg-black border border-neutral-800 rounded-2xl flex flex-col max-h-[85vh] sm:max-h-[70vh] overflow-hidden"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-900">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="flex-1 text-center text-[11px] font-mono text-neutral-500 tracking-wide">
                amr-insight — command
              </span>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-900">
              <motion.span
                className="text-white font-mono text-sm"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                ❯
              </motion.span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, organisms, antibiotics..."
                className="flex-1 bg-transparent outline-none text-neutral-100 placeholder:text-neutral-600 font-mono text-sm"
              />
              <motion.span
                className="w-[7px] h-4 bg-app-accent rounded-sm"
                animate={{ opacity: [1, 1, 0, 0] }}
                transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
              />
            </div>

            <div ref={listRef} className="overflow-y-auto flex-1 py-1">
              {flatItems.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <SearchX size={20} className="text-neutral-700" />
                  <p className="text-neutral-400 text-sm font-sans">No matching commands found.</p>
                  <p className="text-neutral-600 text-xs font-sans">Try "predict", "history", or an antibiotic code.</p>
                </div>
              )}

              {groups.map((group) => (
                <div key={group.title} className="py-1.5">
                  <div className="px-4 pb-1 text-[10px] font-mono uppercase tracking-wider text-neutral-600">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    runningIndex += 1;
                    const idx = runningIndex;
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <motion.div
                        key={item.id}
                        data-index={idx}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => runItem(item)}
                        animate={{ backgroundColor: isSelected ? 'rgba(91,79,233,0.14)' : 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.12 }}
                        className="flex items-center gap-3 px-4 py-2 mx-1.5 rounded-lg cursor-pointer"
                      >
                        <Icon size={15} className="text-neutral-400 shrink-0" />
                        <span className="text-sm font-mono text-neutral-100 shrink-0">
                          {highlightMatch(item.label, query)}
                        </span>
                        {item.description && (
                          <span className="text-xs font-sans text-neutral-500 truncate flex-1">
                            {item.description}
                          </span>
                        )}
                        {!item.description && <span className="flex-1" />}
                        {item.badge && (
                          <Badge tone={item.badge === 'NEW' ? 'green' : 'accent'}>{item.badge}</Badge>
                        )}
                        {item.meta && (
                          <Badge tone={item.meta === 'Reserve' ? 'amber' : 'accent'}>{item.meta}</Badge>
                        )}
                        {item.shortcut && (
                          <kbd className="text-[10px] font-mono text-neutral-500 border border-neutral-800 rounded px-1.5 py-0.5">
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ArrowRight size={13} className="text-app-accent shrink-0" />}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-neutral-900 text-[10px] font-mono uppercase tracking-wide text-neutral-600">
              <span className="flex items-center gap-1">
                <CornerDownLeft size={11} /> select
              </span>
              <span>↑↓ navigate</span>
              <span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}