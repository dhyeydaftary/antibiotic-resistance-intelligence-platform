// Static domain reference data mirrored from the backend's allow-lists
// (gateway/utils/domainAllowLists.js, ml-backend/constants.py) — used to
// populate dropdowns/filters (organism select, antibiotic lists) without
// a round-trip. Keep in sync if the backend's lists change.
export const ORGANISM_OPTIONS = [
  'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
  'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
  'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown'
];

export const ANTIBIOTICS = [
  { code: 'AMX/AMP', aware: 'Access' },
  { code: 'AMC', aware: 'Access' },
  { code: 'CZ', aware: 'Access' },
  { code: 'FOX', aware: 'Watch' },
  { code: 'CTX/CRO', aware: 'Watch' },
  { code: 'IPM', aware: 'Watch' },
  { code: 'GEN', aware: 'Access' },
  { code: 'AN', aware: 'Access' },
  { code: 'Acide nalidixique', aware: 'Watch' },
  { code: 'ofx', aware: 'Watch' },
  { code: 'CIP', aware: 'Watch' },
  { code: 'C', aware: 'Access' },
  { code: 'Co-trimoxazole', aware: 'Access' },
  { code: 'Furanes', aware: 'Access' },
  { code: 'colistine', aware: 'Reserve' },
];

export const APP_PAGES = [
  { label: 'Home', path: '/home' },
  { label: 'Predict', path: '/predict' },
  { label: 'History', path: '/history' },
  { label: 'Trends', path: '/trends' },
  { label: 'Explore', path: '/explore' },
];