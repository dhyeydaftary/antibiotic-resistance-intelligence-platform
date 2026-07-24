import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { getPrediction } from '../api/predictionApi';
import { ORGANISM_OPTIONS } from '../constants/domainData';
import Panel from '../components/app/Panel';
import Toggle from '../components/app/Toggle';
import PrimaryButton from '../components/app/PrimaryButton';

const FIELD_COUNT = 9;

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

function SectionLabel({ children }) {
  return (
    <div className="mb-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#8E8E93]">
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[13px] font-medium text-[#C7C7CC]">{label}</span>
      {children}
    </label>
  );
}

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
        className={`w-full rounded-[10px] border bg-panel-raised px-3.5 py-2.5 font-sans text-[15px] text-onpanel-ink placeholder:text-onpanel-faint outline-none transition-all duration-150 ${
          showError
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

function SelectInput({ name, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full appearance-none rounded-[10px] border border-panel-border bg-panel-raised px-3.5 py-2.5 pr-9 font-sans text-[15px] text-onpanel-ink outline-none transition-all duration-150 focus:border-accent-blue focus:shadow-focus-ring cursor-pointer"
      >
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

function PredictionInputPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
  });

  const [touched, setTouched] = useState({});

  const fieldErrors = useMemo(() => {
    const errors = {};
    Object.keys(VALIDATORS).forEach((key) => {
      const err = VALIDATORS[key](String(formData[key]));
      if (err) errors[key] = err;
    });
    return errors;
  }, [formData]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

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

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleBlur(e) {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }

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
        ...formData,
        age: Number(formData.age),
        infection_freq: Number(formData.infection_freq),
        year: Number(formData.year),
        month: Number(formData.month),
      };

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