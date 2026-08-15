// Gateway-side mirror of ml-backend/predictor/serializers.py:PredictionRequestSerializer.
// MUST STAY IN SYNC WITH THAT FILE — same field names, same types, same
// allow-listed choices, same numeric ranges. If that serializer changes,
// update FIELDS below to match, or a request that Django would now accept
// (or reject) will disagree with what the gateway does.
//
// Purpose: reject malformed/out-of-range/unexpected-shape /predict payloads
// here, one layer before they ever reach Django, AND produce a whitelisted
// "shaped" object (only the fields declared below) so nothing extra that a
// client sent ends up persisted into PredictionHistory.inputData.

const { ORGANISM_LIST } = require('./domainAllowLists');

const REQUIRED_FIELDS = [
  { name: 'age', type: 'integer', min: 0, max: 120 },
  { name: 'gender', type: 'choice', choices: ['Male', 'Female'] },
  { name: 'diabetes', type: 'boolean' },
  { name: 'hypertension', type: 'boolean' },
  { name: 'hospital_before', type: 'boolean' },
  { name: 'infection_freq', type: 'float', min: 0, max: 3 },
  { name: 'year', type: 'integer', min: 2000, max: 2030 },
  { name: 'month', type: 'integer', min: 1, max: 12 },
  { name: 'organism', type: 'choice', choices: ORGANISM_LIST },
];

// Optional synthetic clinical variables — omitting any of these is fine
// (predict.py falls back to a conservative default), but if present, they
// must still satisfy the same type/range as Django's serializer.
const OPTIONAL_FIELDS = [
  { name: 'ward_type', type: 'choice', choices: ['ICU', 'General Ward'] },
  { name: 'specimen_source', type: 'choice', choices: ['Blood', 'Urine', 'Wound', 'Respiratory', 'Catheter'] },
  { name: 'previous_antibiotic_use', type: 'boolean' },
  { name: 'ckd_status', type: 'boolean' },
  { name: 'liver_disease', type: 'boolean' },
  { name: 'cancer', type: 'boolean' },
  { name: 'immunocompromised_status', type: 'boolean' },
  { name: 'fever', type: 'boolean' },
  { name: 'cough', type: 'boolean' },
  { name: 'burning_urination', type: 'boolean' },
  { name: 'wound_infection', type: 'boolean' },
  { name: 'wbc', type: 'float', min: 0.1, max: 50.0 },
  { name: 'neutrophils_pct', type: 'float', min: 0, max: 100 },
  { name: 'lymphocytes_pct', type: 'float', min: 0, max: 100 },
  { name: 'crp', type: 'float', min: 0, max: 500 },
  { name: 'procalcitonin', type: 'float', min: 0, max: 100 },
  { name: 'creatinine', type: 'float', min: 0.1, max: 15 },
  { name: 'egfr', type: 'float', min: 0, max: 150 },
  { name: 'temperature', type: 'float', min: 30, max: 43 },
  { name: 'heart_rate', type: 'float', min: 20, max: 250 },
  { name: 'respiratory_rate', type: 'float', min: 4, max: 60 },
  { name: 'spo2', type: 'float', min: 50, max: 100 },
  { name: 'weight_kg', type: 'float', min: 2, max: 300 },
  { name: 'height_cm', type: 'float', min: 50, max: 250 },
  { name: 'bmi', type: 'float', min: 8, max: 80 },
];

// Checks that a value is a plain object (not null, not an array).
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Validates a single field's value against its declared type/range/choices.
// Returns an error message string, or null if valid.
function checkType(value, field) {
  switch (field.type) {
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return `${field.name} must be an integer`;
      }
      if (value < field.min || value > field.max) {
        return `${field.name} must be between ${field.min} and ${field.max}`;
      }
      return null;

    case 'float':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `${field.name} must be a number`;
      }
      if (value < field.min || value > field.max) {
        return `${field.name} must be between ${field.min} and ${field.max}`;
      }
      return null;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${field.name} must be true or false`;
      }
      return null;

    case 'choice':
      if (typeof value !== 'string' || !field.choices.includes(value)) {
        return `${field.name} must be one of: ${field.choices.join(', ')}`;
      }
      return null;

    default:
      return `${field.name} has an unrecognized validator type`;
  }
}

// Entry point: validates and whitelists a /predict request body.
// Validates `body` against the field contract above. On success, returns
// { valid: true, data } where `data` contains ONLY the declared fields
// (whitelisted) — any extra/unexpected keys in `body` are dropped. On
// failure, returns { valid: false, message, field } for a VALIDATION_ERROR
// response.
function validatePredictionData(body) {
  if (!isPlainObject(body)) {
    return { valid: false, message: 'Request body must be a JSON object', field: null };
  }

  const data = {};

  for (const field of REQUIRED_FIELDS) {
    const value = body[field.name];
    if (value === undefined || value === null) {
      return { valid: false, message: `${field.name} is required`, field: field.name };
    }
    const error = checkType(value, field);
    if (error) {
      return { valid: false, message: error, field: field.name };
    }
    data[field.name] = value;
  }

  for (const field of OPTIONAL_FIELDS) {
    const value = body[field.name];
    if (value === undefined) {
      continue; // omitted entirely — predict.py applies its own default
    }
    if (value === null) {
      data[field.name] = null; // explicit null allowed, mirrors allow_null=True
      continue;
    }
    const error = checkType(value, field);
    if (error) {
      return { valid: false, message: error, field: field.name };
    }
    data[field.name] = value;
  }

  return { valid: true, data };
}

module.exports = { validatePredictionData };
