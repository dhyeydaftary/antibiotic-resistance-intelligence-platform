// REAL data, mirrored from the ml-backend (not invented): the WHO AWaRe
// category map is hardcoded in ml-backend/predictor/predict.py as
// AWARE_MAP, and the antibiotic list matches
// ml-backend/ml_artifacts/antibiotic_columns.json. Keep these two in sync
// with the backend if either ever changes — there's no live endpoint that
// serves this mapping to the frontend yet.
export const ANTIBIOTIC_AWARE_MAP = {
  'AMX/AMP': 'Access',
  AMC: 'Access',
  CZ: 'Access',
  FOX: 'Watch',
  'CTX/CRO': 'Watch',
  IPM: 'Watch',
  GEN: 'Access',
  AN: 'Access',
  'Acide nalidixique': 'Watch',
  ofx: 'Watch',
  CIP: 'Watch',
  C: 'Access',
  'Co-trimoxazole': 'Access',
  Furanes: 'Access',
  colistine: 'Reserve',
};

export const AWARE_CATEGORIES = ['Access', 'Watch', 'Reserve'];

export const AWARE_DESCRIPTIONS = {
  Access: 'First-choice antibiotics for common infections — narrower spectrum, lower resistance risk.',
  Watch: 'Higher resistance potential — prioritized targets for stewardship monitoring.',
  Reserve: 'Last-resort antibiotics, used only when other options have failed.',
};

// PLACEHOLDER CONTENT — there is no research-feed or Q&A API in this
// project yet. Same convention as Home's homeContent.js: clearly separated
// static copy, easy to swap for a real endpoint later.
export const RESEARCH_HUB = [
  { title: 'Global rise in colistin resistance: mechanisms and impact', date: 'Jul 22', tag: 'Reserve tier' },
  { title: 'New insights into beta-lactamase evolution in Gram-negative bacteria', date: 'Jul 19', tag: 'Mechanism' },
  { title: 'WHO updates AWaRe classification: key changes in 2024', date: 'Jul 16', tag: 'Policy' },
  { title: 'Carbapenem resistance trends across ICU admissions', date: 'Jul 10', tag: 'Watch tier' },
  { title: 'Stewardship programs and Access-tier prescribing rates', date: 'Jul 4', tag: 'Stewardship' },
];

export const QUESTION_BANK = [
  'What organism shows the highest multi-drug resistance rate?',
  'Which antibiotic class has the steadiest susceptibility profile?',
  'How does sample source correlate with resistance likelihood?',
  'Which WHO AWaRe category appears most in recent predictions?',
  'Which organism has the fewest recorded samples in this dataset?',
  'How many antibiotics fall under the Reserve tier?',
];
