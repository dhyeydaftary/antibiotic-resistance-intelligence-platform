// ===================================================================
// Route: /predict (ProtectedRoute-gated). The form that starts the core
// ML flow: collects the 9 required fields + 24 optional clinical
// fields, optionally auto-filled from an uploaded PDF lab report
// (extractReportFromPDF), then submits to getPrediction() and
// navigates to /predict/result/live with the response in router state
// (PredictionResultPage reads it from location.state — no refetch,
// no persistence yet; the record only gets a real ID once History
// reloads it from the gateway).
//
// Field contract (VALIDATORS, OPTIONAL_DEFAULTS, OPTIONAL_NUMERIC_FIELDS)
// deliberately mirrors gateway/utils/predictionValidation.js and
// ml-backend/predictor/serializers.py field-for-field — keep all three
// in sync. Defines its own local Field/TextInput/SelectInput/SectionLabel
// below (distinct from components/app/Field.jsx and components/auth/
// TextInput.jsx — this page predates/diverges from that shared kit).
// ===================================================================
import { useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ChevronDown, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';
import { getPrediction, extractReportFromPDF } from '../api/predictionApi';
import { ORGANISM_OPTIONS } from '../constants/domainData';
import usePageTitle from '../hooks/usePageTitle';
import Panel from '../components/app/Panel';
import Toggle from '../components/app/Toggle';
import PrimaryButton from '../components/app/PrimaryButton';

const FIELD_COUNT = 9;
const OPTIONAL_FIELD_COUNT = 24;

const WARD_OPTIONS = ['General Ward', 'ICU'];
const SPECIMEN_OPTIONS = ['Blood', 'Urine', 'Wound', 'Respiratory', 'Catheter'];

const VALIDATORS = {
  age: (v) => {
    if (v === '') return 'Age is required';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Must be a number';
    if (n < 0 || n > 120) return 'Must be between 0 and 120';
    return null;
  },
  infection_freq: (v) => {
    if (v === '') return 'Infection frequency is required';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Must be a number';
    if (n < 0 || n > 3) return 'Must be between 0 and 3';
    return null;
  },
  year: (v) => {
    if (v === '') return 'Year is required';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Must be a number';
    if (n < 2000 || n > 2030) return 'Must be between 2000 and 2030';
    return null;
  },
  month: (v) => {
    if (v === '') return 'Month is required';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Must be a number';
    if (n < 1 || n > 12) return 'Must be between 1 and 12';
    return null;
  },
};

// Optional new fields default to empty/false — none are required, none are
// validated. Empty numeric fields and the "not specified" select option are
// stripped out of the payload before submit so predict.py's own defaults
// apply, exactly matching the same optional/default behavior the backend
// already implements.
const OPTIONAL_DEFAULTS = {
  ward_type: '',
  specimen_source: '',
  previous_antibiotic_use: false,
  ckd_status: false,
  liver_disease: false,
  cancer: false,
  immunocompromised_status: false,
  fever: false,
  cough: false,
  burning_urination: false,
  wound_infection: false,
  wbc: '',
  neutrophils_pct: '',
  lymphocytes_pct: '',
  crp: '',
  procalcitonin: '',
  creatinine: '',
  egfr: '',
  temperature: '',
  heart_rate: '',
  respiratory_rate: '',
  spo2: '',
  weight_kg: '',
  bmi: '',
};

const OPTIONAL_NUMERIC_FIELDS = [
  'wbc', 'neutrophils_pct', 'lymphocytes_pct', 'crp', 'procalcitonin',
  'creatinine', 'egfr', 'temperature', 'heart_rate', 'respiratory_rate',
  'spo2', 'weight_kg', 'bmi',
];

// Every field the extraction endpoint can possibly return (7 core fields
// minus year/month, which aren't derivable from a report — plus all 24
// optional fields). Used to know how to type-convert each extracted value
// when merging it into formData, and to size the "N of 31" messaging.
const EXTRACTABLE_FIELD_COUNT = 31;
const EXTRACTABLE_BOOLEAN_FIELDS = [
  'diabetes', 'hypertension', 'hospital_before', 'previous_antibiotic_use',
  'ckd_status', 'liver_disease', 'cancer', 'immunocompromised_status',
  'fever', 'cough', 'burning_urination', 'wound_infection',
];
const EXTRACTABLE_NUMERIC_FIELDS = ['age', 'infection_freq', ...OPTIONAL_NUMERIC_FIELDS];
const EXTRACTABLE_SELECT_FIELDS = ['gender', 'organism', 'ward_type', 'specimen_source'];

// Small uppercase section divider label (e.g. "Demographics", "Vitals & body metrics").
function SectionLabel({ children }) {
  return (
    <div className="mb-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#8E8E93]">
      {children}
    </div>
  );
}

// Labeled form-field wrapper local to this page.
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[13px] font-medium text-[#C7C7CC]">{label}</span>
      {children}
    </label>
  );
}

// Numeric/text input local to this page, with a touched-gated inline error.
function TextInput({ name, value, onChange, onBlur, type = 'text', error, touched, ...rest }) {
  const showError = touched && error;
  return (
    <div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full rounded-[10px] border bg-panel-raised px-3.5 py-2.5 font-sans text-[15px] text-onpanel-ink placeholder:text-onpanel-faint outline-none transition-all duration-150 ${showError
            ? 'border-resistant focus:border-resistant focus:shadow-[0_0_0_4px_rgba(255,59,48,0.15)]'
            : 'border-panel-border focus:border-accent-blue focus:shadow-focus-ring'
          }`}
        {...rest}
      />
      {showError && (
        <p className="mt-1.5 font-sans text-[12px] text-resistant">{error}</p>
      )}
    </div>
  );
}

// Custom-arrow native <select> local to this page.
function SelectInput({ name, value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[10px] border border-panel-border bg-panel-raised px-3.5 py-2.5 pr-9 font-sans text-[15px] text-onpanel-ink outline-none transition-all duration-150 focus:border-accent-blue focus:shadow-focus-ring cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-panel-raised text-onpanel-ink">{opt}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-onpanel-faint" width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Prediction request form — required + optional clinical fields, PDF
// auto-fill, live request preview, and submission to the ML pipeline.
function PredictionInputPage() {
  usePageTitle('Predict');
  
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showOptional, setShowOptional] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    age: '',
    gender: 'Male',
    diabetes: false,
    hypertension: false,
    hospital_before: false,
    infection_freq: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    organism: location.state?.organism || 'Escherichia coli',
    ...OPTIONAL_DEFAULTS,
  });

  const [touched, setTouched] = useState({});

  // Validates only the required numeric/date fields; errors are only
  // shown once `touched` marks that field (see handleBlur).
  const fieldErrors = useMemo(() => {
    const errors = {};
    Object.keys(VALIDATORS).forEach((key) => {
      const err = VALIDATORS[key](String(formData[key]));
      if (err) errors[key] = err;
    });
    return errors;
  }, [formData]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

  // Counts how many of the 9 required fields are filled, for the live
  // progress bar in the preview panel (2 baked in: gender/organism always
  // have a default value).
  const filledCount = useMemo(() => {
    let count = 2;
    if (formData.age !== '') count += 1;
    if (formData.infection_freq !== '') count += 1;
    if (formData.year) count += 1;
    if (formData.month) count += 1;
    if (formData.diabetes) count += 1;
    if (formData.hypertension) count += 1;
    if (formData.hospital_before) count += 1;
    return count;
  }, [formData]);

  const progress = filledCount / FIELD_COUNT;

  // Counts how many of the 24 optional clinical fields the user has set
  // (non-default), shown as "N/24 set" next to the collapsible section.
  const optionalFilledCount = useMemo(() => {
    return Object.keys(OPTIONAL_DEFAULTS).filter((key) => {
      const val = formData[key];
      if (typeof val === 'boolean') return val === true;
      return val !== '';
    }).length;
  }, [formData]);

  // Generic controlled-input handler for every field (checkbox-aware).
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  // Marks a required field touched so its validation error becomes visible.
  function handleBlur(e) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

  // Opens the native file picker via the hidden file input.
  function triggerFileUpload() {
    fileInputRef.current?.click();
  }

  // Uploads the selected PDF for LLM field extraction, then merges any
  // extracted values into formData (type-converted per field kind) and
  // auto-expands the optional section if anything was filled.
  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires this handler
    e.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({ type: 'error', message: 'Only PDF files are supported.' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const result = await extractReportFromPDF(file);

      if (!result.success) {
        setUploadStatus({
          type: 'error',
          message: result.error?.message || 'Could not read this report. Please fill the form manually.',
        });
        return;
      }

      const { extracted, missing, extractionAvailable } = result.data;

      if (!extractionAvailable) {
        setUploadStatus({
          type: 'error',
          message: 'Automatic extraction is unavailable right now. Please fill the form manually.',
        });
        return;
      }

      let filledCount = 0;
      const fieldsToMerge = Object.entries(extracted).filter(
        ([, value]) => value !== null && value !== undefined
      );
      filledCount = fieldsToMerge.length;

      setFormData((prev) => {
        const next = { ...prev };
        fieldsToMerge.forEach(([key, value]) => {
          if (!(key in next)) return; // ignore anything not on this form

          if (EXTRACTABLE_BOOLEAN_FIELDS.includes(key)) {
            next[key] = Boolean(value);
          } else if (EXTRACTABLE_NUMERIC_FIELDS.includes(key)) {
            next[key] = String(value);
          } else if (EXTRACTABLE_SELECT_FIELDS.includes(key)) {
            next[key] = value;
          }
        });
        return next;
      });

      if (filledCount > 0) setShowOptional(true);

      const missingCount = missing?.length ?? 0;
      setUploadStatus({
        type: filledCount > 0 ? 'success' : 'error',
        message:
          filledCount > 0
            ? `Fields auto-filled from your report.${missingCount > 0 ? ' Some fields were not found — fill those in manually.' : ''
            }`
            : 'No matching fields were found in this report. Please fill the form manually.',
      });
    } catch (err) {
      console.error(err);
      setUploadStatus({
        type: 'error',
        message: 'Something went wrong reading this file. Please fill the form manually.',
      });
    } finally {
      setUploading(false);
    }
  }

  // Validates, builds the API payload (omitting untouched optional
  // fields so the backend's own defaults apply), submits, and navigates
  // to the result page with the response in router state.
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Mark all validated fields touched so any remaining errors show up
    setTouched({ age: true, infection_freq: true, year: true, month: true });

    if (!isFormValid) {
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        age: Number(formData.age),
        gender: formData.gender,
        diabetes: formData.diabetes,
        hypertension: formData.hypertension,
        hospital_before: formData.hospital_before,
        infection_freq: Number(formData.infection_freq),
        year: Number(formData.year),
        month: Number(formData.month),
        organism: formData.organism,
      };

      // Optional fields: only include a key if the user actually set it.
      // Empty string ('' — untouched select/number field) and false-default
      // toggles that were never touched are omitted rather than sent as
      // empty/zero, so predict.py's own default-filling logic applies
      // exactly as it does for a request that never mentions these fields.
      Object.keys(OPTIONAL_DEFAULTS).forEach((key) => {
        const val = formData[key];
        if (typeof val === 'boolean') {
          if (val === true) payload[key] = true;
        } else if (val !== '') {
          payload[key] = OPTIONAL_NUMERIC_FIELDS.includes(key) ? Number(val) : val;
        }
      });

      const result = await getPrediction(payload);
      navigate('/predict/result/live', { state: { prediction: result.data, inputData: payload } });
    } catch (err) {
      setError('Prediction failed. Please check your input and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-8">
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
            New prediction
          </div>
          <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[48px]">
            Run a resistance prediction
          </h1>
          <p className="mt-3 max-w-lg font-sans text-[16px] leading-[1.55] text-page-muted">
            Enter patient and organism data to generate resistance predictions across
            15 antibiotics, with SHAP explainability and AI-generated insights.
          </p>
        </div>

        {/* Spec strip */}
        <div className="mb-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-canvas-hairline py-4 font-mono text-[12px] text-page-muted">
          <span><span className="text-page-ink font-medium">15</span> antibiotics evaluated</span>
          <span className="text-canvas-hairline">·</span>
          <span>WHO AWaRe aligned</span>
          <span className="text-canvas-hairline">·</span>
          <span>CatBoost models</span>
          <span className="text-canvas-hairline">·</span>
          <span>SHAP explainability</span>
        </div>

        {/* Report upload */}
        <div className="mb-8 rounded-[10px] border border-panel-border bg-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-sans text-[14px] font-medium text-onpanel-ink">
                Upload a lab report
              </span>
              <p className="mt-1 font-sans text-[12.5px] leading-[1.5] text-onpanel-faint">
                We'll read the PDF and auto-fill matching fields below — you can review and edit everything before submitting.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={triggerFileUpload}
                disabled={uploading}
                className="flex items-center gap-2 rounded-[10px] border border-panel-border bg-panel-raised px-4 py-2.5 font-sans text-[14px] font-medium text-onpanel-ink transition-colors hover:border-accent-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Reading report…
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Upload PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {uploadStatus && (
            <div
              className={`mt-4 flex items-start gap-2.5 rounded-[10px] border px-4 py-3 ${uploadStatus.type === 'success'
                  ? 'border-accent-blue/25 bg-accent-blue/10'
                  : 'border-resistant/25 bg-resistant/10'
                }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-blue" />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0 text-resistant" />
              )}
              <p className={`font-sans text-[13px] leading-[1.5] ${uploadStatus.type === 'success' ? 'text-accent-blue' : 'text-resistant'}`}>
                {uploadStatus.message}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: form panel */}
          <Panel className="p-8 lg:col-span-3">
            <div className="space-y-8">
              <div>
                <SectionLabel>Demographics</SectionLabel>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Age">
                    <TextInput
                      name="age" type="number" value={formData.age}
                      onChange={handleChange} onBlur={handleBlur}
                      error={fieldErrors.age} touched={touched.age}
                      placeholder="e.g. 45"
                    />
                  </Field>
                  <Field label="Gender">
                    <SelectInput name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female']} />
                  </Field>
                </div>
              </div>

              <div>
                <SectionLabel>Clinical history</SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Toggle label="Diabetes" name="diabetes" checked={formData.diabetes} onChange={handleChange} />
                  <Toggle label="Hypertension" name="hypertension" checked={formData.hypertension} onChange={handleChange} />
                  <Toggle label="Hospitalized before" name="hospital_before" checked={formData.hospital_before} onChange={handleChange} />
                </div>
              </div>

              <div>
                <SectionLabel>Encounter details</SectionLabel>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Infection frequency">
                    <TextInput
                      name="infection_freq" type="number" step="0.1" value={formData.infection_freq}
                      onChange={handleChange} onBlur={handleBlur}
                      error={fieldErrors.infection_freq} touched={touched.infection_freq}
                      placeholder="e.g. 1.5"
                    />
                  </Field>
                  <Field label="Year">
                    <TextInput
                      name="year" type="number" value={formData.year}
                      onChange={handleChange} onBlur={handleBlur}
                      error={fieldErrors.year} touched={touched.year}
                      placeholder="2026"
                    />
                  </Field>
                  <Field label="Month">
                    <TextInput
                      name="month" type="number" value={formData.month}
                      onChange={handleChange} onBlur={handleBlur}
                      error={fieldErrors.month} touched={touched.month}
                      placeholder="1–12"
                    />
                  </Field>
                </div>
              </div>

              <div>
                <SectionLabel>Organism</SectionLabel>
                <Field label="Identified organism">
                  <SelectInput name="organism" value={formData.organism} onChange={handleChange} options={ORGANISM_OPTIONS} />
                </Field>
              </div>

              {/* --- Optional clinical details (24 new fields) --- */}
              <div className="border-t border-panel-border pt-6">
                <button
                  type="button"
                  onClick={() => setShowOptional((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-[10px] px-1 py-1 text-left transition-colors hover:opacity-80"
                >
                  <div>
                    <span className="font-sans text-[15px] font-medium text-onpanel-ink">
                      Additional clinical details
                    </span>
                    <span className="ml-2 font-mono text-[12px] text-onpanel-faint">
                      {optionalFilledCount}/{OPTIONAL_FIELD_COUNT} set
                    </span>
                  </div>
                  <motion.span animate={{ rotate: showOptional ? 180 : 0 }} transition={{ duration: 0.15 }}>
                    <ChevronDown size={18} className="text-onpanel-faint" />
                  </motion.span>
                </button>
                <p className="mt-1.5 font-sans text-[12.5px] leading-[1.5] text-onpanel-faint">
                  Labs, vitals, comorbidities, and specimen context improve prediction accuracy.
                </p>

                <AnimatePresence initial={false}>
                  {showOptional && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-8 pt-6">
                        <div>
                          <SectionLabel>Ward &amp; specimen</SectionLabel>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Ward type">
                              <SelectInput
                                name="ward_type" value={formData.ward_type} onChange={handleChange}
                                options={WARD_OPTIONS} placeholder="Not specified"
                              />
                            </Field>
                            <Field label="Specimen source">
                              <SelectInput
                                name="specimen_source" value={formData.specimen_source} onChange={handleChange}
                                options={SPECIMEN_OPTIONS} placeholder="Not specified"
                              />
                            </Field>
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Additional history</SectionLabel>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Toggle label="Previous antibiotic use" name="previous_antibiotic_use" checked={formData.previous_antibiotic_use} onChange={handleChange} />
                            <Toggle label="Chronic kidney disease" name="ckd_status" checked={formData.ckd_status} onChange={handleChange} />
                            <Toggle label="Liver disease" name="liver_disease" checked={formData.liver_disease} onChange={handleChange} />
                            <Toggle label="Cancer" name="cancer" checked={formData.cancer} onChange={handleChange} />
                            <Toggle label="Immunocompromised" name="immunocompromised_status" checked={formData.immunocompromised_status} onChange={handleChange} />
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Symptoms</SectionLabel>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Toggle label="Fever" name="fever" checked={formData.fever} onChange={handleChange} />
                            <Toggle label="Cough" name="cough" checked={formData.cough} onChange={handleChange} />
                            <Toggle label="Burning urination" name="burning_urination" checked={formData.burning_urination} onChange={handleChange} />
                            <Toggle label="Wound infection" name="wound_infection" checked={formData.wound_infection} onChange={handleChange} />
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Vitals &amp; body metrics</SectionLabel>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Field label="Temperature (°C)">
                              <TextInput name="temperature" type="number" step="0.1" value={formData.temperature} onChange={handleChange} placeholder="e.g. 37.2" />
                            </Field>
                            <Field label="Heart rate (bpm)">
                              <TextInput name="heart_rate" type="number" value={formData.heart_rate} onChange={handleChange} placeholder="e.g. 82" />
                            </Field>
                            <Field label="Respiratory rate (breaths/min)">
                              <TextInput name="respiratory_rate" type="number" value={formData.respiratory_rate} onChange={handleChange} placeholder="e.g. 16" />
                            </Field>
                            <Field label="SpO2 (%)">
                              <TextInput name="spo2" type="number" value={formData.spo2} onChange={handleChange} placeholder="e.g. 98" />
                            </Field>
                            <Field label="Weight (kg)">
                              <TextInput name="weight_kg" type="number" step="0.1" value={formData.weight_kg} onChange={handleChange} placeholder="e.g. 70" />
                            </Field>
                            <Field label="BMI (kg/m²)">
                              <TextInput name="bmi" type="number" step="0.1" value={formData.bmi} onChange={handleChange} placeholder="e.g. 24.5" />
                            </Field>
                          </div>
                        </div>

                        <div>
                          <SectionLabel>Lab values</SectionLabel>
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Field label="WBC (10³/µL)">
                              <TextInput name="wbc" type="number" step="0.1" value={formData.wbc} onChange={handleChange} placeholder="e.g. 9.2" />
                            </Field>
                            <Field label="Neutrophils (%)">
                              <TextInput name="neutrophils_pct" type="number" step="0.1" value={formData.neutrophils_pct} onChange={handleChange} placeholder="e.g. 65" />
                            </Field>
                            <Field label="Lymphocytes (%)">
                              <TextInput name="lymphocytes_pct" type="number" step="0.1" value={formData.lymphocytes_pct} onChange={handleChange} placeholder="e.g. 25" />
                            </Field>
                            <Field label="CRP (mg/L)">
                              <TextInput name="crp" type="number" step="0.1" value={formData.crp} onChange={handleChange} placeholder="e.g. 12" />
                            </Field>
                            <Field label="Procalcitonin (ng/mL)">
                              <TextInput name="procalcitonin" type="number" step="0.01" value={formData.procalcitonin} onChange={handleChange} placeholder="e.g. 0.3" />
                            </Field>
                            <Field label="Creatinine (mg/dL)">
                              <TextInput name="creatinine" type="number" step="0.01" value={formData.creatinine} onChange={handleChange} placeholder="e.g. 0.9" />
                            </Field>
                            <Field label="eGFR (mL/min/1.73m²)">
                              <TextInput name="egfr" type="number" step="0.1" value={formData.egfr} onChange={handleChange} placeholder="e.g. 90" />
                            </Field>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2.5 rounded-[10px] border border-resistant/25 bg-resistant/10 px-4 py-3">
                <AlertCircle size={16} className="shrink-0 text-resistant" />
                <p className="font-sans text-[13px] text-resistant">{error}</p>
              </div>
            )}

            <div className="mt-8 border-t border-panel-border pt-6">
              <PrimaryButton type="submit" disabled={loading} className="w-full sm:w-auto sm:px-10">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Predicting…
                  </>
                ) : (
                  'Predict susceptibility'
                )}
              </PrimaryButton>
            </div>
          </Panel>

          {/* Right: live preview panel */}
          <Panel raised className="h-fit p-6 lg:sticky lg:top-8 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                Request preview
              </span>
              <span className="font-mono text-[11px] font-medium">
                <span className="text-accent-blue">{filledCount}</span>
                <span className="text-onpanel-faint">/{FIELD_COUNT}</span>
              </span>
            </div>

            <div className="mb-5 h-[3px] w-full overflow-hidden rounded-full bg-panel-border">
              <motion.div
                className="h-full rounded-full bg-accent-blue"
                animate={{ width: `${progress * 100}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 30 }}
              />
            </div>

            <div className="space-y-2 rounded-[10px] border border-panel-border bg-panel p-4 font-mono text-[12px] leading-[1.7] text-onpanel-muted">
              <div><span className="text-onpanel-faint">age</span>: {formData.age || '—'}</div>
              <div><span className="text-onpanel-faint">gender</span>: {formData.gender}</div>
              <div><span className="text-onpanel-faint">diabetes</span>: {String(formData.diabetes)}</div>
              <div><span className="text-onpanel-faint">hypertension</span>: {String(formData.hypertension)}</div>
              <div><span className="text-onpanel-faint">hospital_before</span>: {String(formData.hospital_before)}</div>
              <div><span className="text-onpanel-faint">infection_freq</span>: {formData.infection_freq || '—'}</div>
              <div><span className="text-onpanel-faint">year</span>: {formData.year}</div>
              <div><span className="text-onpanel-faint">month</span>: {formData.month}</div>
              <div className="truncate"><span className="text-onpanel-faint">organism</span>: {formData.organism}</div>
            </div>

            {optionalFilledCount > 0 && (
              <div className="mt-3 rounded-[10px] border border-accent-blue/25 bg-accent-blue/10 px-4 py-2.5">
                <p className="font-sans text-[12px] text-accent-blue">
                  + {optionalFilledCount} additional clinical field{optionalFilledCount !== 1 ? 's' : ''} set
                </p>
              </div>
            )}

            <p className="mt-4 font-sans text-[12px] leading-[1.6] text-onpanel-faint">
              This request will be sent to 15 trained CatBoost models — one per antibiotic —
              along with SHAP explainability and AI-generated insights.
            </p>
          </Panel>
        </form>
      </div>
    </div>
  );
}

export default PredictionInputPage;