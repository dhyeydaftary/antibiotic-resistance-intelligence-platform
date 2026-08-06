// Scores how well `query` matches `text` for CommandPalette search:
// exact match highest, then prefix, then word-boundary, then substring,
// then a typo-tolerant subsequence match penalized by gap count.
// Returns -1 for no match at all.
export function fuzzyScore(text, query) {
  if (!query) return 0;

  const t = text.toLowerCase();
  const q = query.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 90;

  const wordBoundary = new RegExp(`(^|[\\s/_-])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  if (wordBoundary.test(t)) return 80;

  if (t.includes(q)) return 70;

  // Subsequence fuzzy match (typo/abbreviation tolerant)
  let qi = 0;
  let gaps = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastMatch !== -1 && ti - lastMatch > 1) gaps++;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi === q.length) return Math.max(10, 50 - gaps * 4);

  return -1; // no match
}

// Scores and sorts a list of items by fuzzyScore against `query`
// (best match first); returns items unranked (score 0) if query is empty.
export function fuzzyFilter(items, query, getText) {
  if (!query) return items.map((item) => ({ item, score: 0 }));
  return items
    .map((item) => ({ item, score: fuzzyScore(getText(item), query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);
}

// --- Recent commands (persisted in localStorage) ---
const RECENT_KEY = 'amr_recent_commands';
const MAX_RECENT = 6;

// Reads the CommandPalette's recently-used command list from localStorage.
export function getRecentCommands() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Moves a command to the front of the recent list (deduping) and persists it.
export function recordCommandUse(id, label) {
  try {
    const recent = getRecentCommands().filter((r) => r.id !== id);
    recent.unshift({ id, label, timestamp: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable — fail silently, non-critical feature
  }
}