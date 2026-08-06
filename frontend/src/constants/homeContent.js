// Content for Home page sections that don't have a backing API yet.
// Everything in this file is placeholder/editorial copy, not live data —
// swap in a real endpoint later without touching component code.

export const ROTATING_QUOTES = [
  'Every prediction brings us closer to understanding antimicrobial resistance.',
  'Antibiotics changed medicine. Responsible use protects the future.',
  'Data drives discovery. Every prediction brings us closer to understanding and combating antimicrobial resistance.',
  'Resistance doesn\u2019t emerge overnight \u2014 it accumulates, one unnecessary prescription at a time.',
  'Machine learning can\u2019t replace stewardship, but it can make stewardship faster.',
  'The WHO AWaRe framework exists to keep Reserve antibiotics reserved.',
];

// PLACEHOLDER — no research-feed API exists yet. Replace with a real feed
// endpoint when one is available; keep the {title, date} shape.
export const RESEARCH_FEED = [
  { title: 'Global rise in colistin resistance: mechanisms and impact', date: 'Jul 22' },
  { title: 'New insights into beta-lactamase evolution in Gram-negative bacteria', date: 'Jul 19' },
  { title: 'WHO updates AWaRe classification: key changes in 2024', date: 'Jul 16' },
];

// PLACEHOLDER — mirrors the shape trendsApi.getTrends() could eventually fill
// for a specific antibiotic/organism pair, generalized here across the dataset.
export const WHAT_CHANGED = [
  'Increase in fluoroquinolone resistance in E. coli',
  'Rise in carbapenem resistance in Klebsiella spp.',
  'Aminoglycosides show steady susceptibility',
];

// PLACEHOLDER — static prompt bank; rotate by day-of-year so it's stable
// within a session but changes daily.
export const TODAYS_QUESTIONS = [
  'What organism shows the highest multi-drug resistance rate?',
  'Which antibiotic class has the steadiest susceptibility profile?',
  'How does sample source correlate with resistance likelihood?',
  'Which WHO AWaRe category appears most in recent predictions?',
];

export function pickDailyQuestion() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
  );
  return TODAYS_QUESTIONS[dayOfYear % TODAYS_QUESTIONS.length];
}
