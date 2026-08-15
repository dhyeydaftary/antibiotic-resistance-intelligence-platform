import React from 'react';
import { MapPin, ShieldAlert, Activity, FlaskConical } from 'lucide-react';

// Boolean/flag fields we know how to label nicely.
const FLAG_LABELS = {
    diabetes: 'Diabetes',
    hypertension: 'Hypertension',
    hospital_before: 'Hospitalized before',
    previous_antibiotic_use: 'Prior antibiotic use',
    ckd_status: 'CKD',
    liver_disease: 'Liver disease',
    cancer: 'Cancer',
    immunocompromised_status: 'Immunocompromised',
    fever: 'Fever',
    cough: 'Cough',
    burning_urination: 'Burning urination',
    wound_infection: 'Wound infection',
};

// Vitals shown first, then labs — grouped so the metrics grid reads in a
// clinically natural order rather than dataset column order.
const VITAL_FIELDS = [
    { key: 'temperature', label: 'Temp', unit: '°C' },
    { key: 'heart_rate', label: 'HR', unit: 'bpm' },
    { key: 'respiratory_rate', label: 'RR', unit: '/min' },
    { key: 'spo2', label: 'SpO2', unit: '%' },
    { key: 'weight_kg', label: 'Weight', unit: 'kg' },
    { key: 'bmi', label: 'BMI', unit: '' },
];
const LAB_FIELDS = [
    { key: 'wbc', label: 'WBC', unit: '10³/µL' },
    { key: 'neutrophils_pct', label: 'Neutrophils', unit: '%' },
    { key: 'lymphocytes_pct', label: 'Lymphocytes', unit: '%' },
    { key: 'crp', label: 'CRP', unit: 'mg/L' },
    { key: 'procalcitonin', label: 'PCT', unit: 'ng/mL' },
    { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL' },
    { key: 'egfr', label: 'eGFR', unit: 'mL/min' },
];

// Checks whether an inputData field has a meaningful (non-empty) value.
function hasValue(v) {
    return v !== undefined && v !== null && v !== '';
}

// Small icon + uppercase label row, used to head each PatientContext section.
function SectionHeader({ icon: Icon, label, count }) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon size={11} className="text-onpanel-faint" strokeWidth={2} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">{label}</span>
            {count !== undefined && (
                <span className="font-mono text-[10px] text-onpanel-faint">· {count}</span>
            )}
        </div>
    );
}

// Renders only the fields from `fields` that actually have a value on
// this record, as a small metric-tile grid.
function MetricGrid({ fields, inputData }) {
    const active = fields.filter((f) => hasValue(inputData[f.key]));
    if (active.length === 0) return null;
    return (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {active.map((m) => (
                <div
                    key={m.key}
                    className="rounded-[10px] border border-panel-border bg-panel px-2.5 py-1.5 transition-colors hover:border-onpanel-faint/40"
                >
                    <p className="font-mono text-[9px] uppercase tracking-wider text-onpanel-faint">{m.label}</p>
                    <p className="mt-0.5 font-mono text-[13px] font-medium text-onpanel-ink">
                        {inputData[m.key]}
                        {m.unit && <span className="ml-0.5 font-normal text-onpanel-faint">{m.unit}</span>}
                    </p>
                </div>
            ))}
        </div>
    );
}

// Displays a history record's captured clinical context (ward/specimen,
// comorbidity/symptom flags, vitals, labs), skipping any section with no data.
/**
 * Renders the clinical picture captured at prediction time (ward, comorbidities,
 * symptoms, vitals, labs) from a history record's raw inputData. Every section is
 * conditional — older records saved before the dataset expansion simply won't have
 * these keys, and nothing renders for them instead of showing empty placeholders.
 */
const PatientContext = ({ inputData }) => {
    if (!inputData) return null;

    const activeFlags = Object.entries(FLAG_LABELS).filter(
        ([key]) => inputData[key] === true || inputData[key] === 'true' || inputData[key] === 1
    );
    const hasContext = hasValue(inputData.ward_type) || hasValue(inputData.specimen_source);
    const hasVitals = VITAL_FIELDS.some((f) => hasValue(inputData[f.key]));
    const hasLabs = LAB_FIELDS.some((f) => hasValue(inputData[f.key]));

    if (!hasContext && activeFlags.length === 0 && !hasVitals && !hasLabs) return null;

    return (
        <div className="mb-3 overflow-hidden rounded-[14px] border border-panel-border bg-panel-raised">
            <div className="divide-y divide-panel-border">
                {hasContext && (
                    <div className="space-y-1.5 px-3 py-2.5">
                        <SectionHeader icon={MapPin} label="Context" />
                        <div className="flex flex-wrap gap-1.5">
                            {hasValue(inputData.ward_type) && (
                                <span className="rounded-full bg-accent-blue/10 px-2.5 py-1 font-sans text-[11px] font-medium text-accent-blue">
                                    {inputData.ward_type}
                                </span>
                            )}
                            {hasValue(inputData.specimen_source) && (
                                <span className="rounded-full bg-accent-blue/10 px-2.5 py-1 font-sans text-[11px] font-medium text-accent-blue">
                                    {inputData.specimen_source} specimen
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {activeFlags.length > 0 && (
                    <div className="space-y-1.5 px-3 py-2.5">
                        <SectionHeader icon={ShieldAlert} label="Flags" count={activeFlags.length} />
                        <div className="flex flex-wrap gap-1.5">
                            {activeFlags.map(([key, label]) => (
                                <span
                                    key={key}
                                    className="rounded-full border border-panel-border bg-panel px-2.5 py-1 font-mono text-[10px] text-onpanel-muted"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {hasVitals && (
                    <div className="space-y-1.5 px-3 py-2.5">
                        <SectionHeader icon={Activity} label="Vitals" />
                        <MetricGrid fields={VITAL_FIELDS} inputData={inputData} />
                    </div>
                )}

                {hasLabs && (
                    <div className="space-y-1.5 px-3 py-2.5">
                        <SectionHeader icon={FlaskConical} label="Labs" />
                        <MetricGrid fields={LAB_FIELDS} inputData={inputData} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientContext;
