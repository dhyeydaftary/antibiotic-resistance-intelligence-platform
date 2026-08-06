// Shared allow-lists mirrored from the ml-backend. MUST STAY IN SYNC with:
//   - ORGANISM_LIST    <- ml-backend/constants.py:ORGANISM_LIST
//   - ANTIBIOTIC_CODES <- ml-backend/ml_artifacts/antibiotic_columns.json
//   - RESULT_VALUES    <- prediction result codes used throughout
//                         ml-backend/predictor/predict.py and ai_insights.py
//                         ('R' = resistant, 'I' = intermediate, 'S' = susceptible)

const ORGANISM_LIST = [
  'Acinetobacter baumannii', 'Citrobacter spp.', 'Enterobacteria spp.',
  'Escherichia coli', 'Klebsiella pneumoniae', 'Morganella morganii',
  'Proteus mirabilis', 'Pseudomonas aeruginosa', 'Serratia marcescens', 'Unknown',
];

const ANTIBIOTIC_CODES = [
  'AMX/AMP', 'AMC', 'CZ', 'FOX', 'CTX/CRO', 'IPM', 'GEN', 'AN',
  'Acide nalidixique', 'ofx', 'CIP', 'C', 'Co-trimoxazole', 'Furanes', 'colistine',
];

const RESULT_VALUES = ['R', 'I', 'S'];

module.exports = { ORGANISM_LIST, ANTIBIOTIC_CODES, RESULT_VALUES };
