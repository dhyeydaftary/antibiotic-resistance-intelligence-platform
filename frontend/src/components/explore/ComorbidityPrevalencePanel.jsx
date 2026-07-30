import { useState } from 'react';
import { HeartPulse, Stethoscope, Activity } from 'lucide-react';
import Panel from '../app/Panel';
import { BarChart } from '../charts/bar-chart';
import { Bar } from '../charts/bar';
import { Grid } from '../charts/grid';
import { ChartTooltip } from '../charts/tooltip';
import { BarYAxis } from '../charts/bar-y-axis';

const HOVER = 'transition-colors duration-300 hover:border-accent-blue/30 hover:shadow-panel-lg';

const FIELD_LABELS = {
  previousAntibioticUse: 'Previous Antibiotic Use',
  ckd: 'CKD',
  liverDisease: 'Liver Disease',
  cancer: 'Cancer',
  immunocompromised: 'Immunocompromised',
  fever: 'Fever',
  cough: 'Cough',
  burningUrination: 'Burning Urination',
  woundInfection: 'Wound Infection',
  wbc: 'WBC',
  neutrophilsPct: 'Neutrophils %',
  lymphocytesPct: 'Lymphocytes %',
  crp: 'CRP',
  procalcitonin: 'Procalcitonin',
  creatinine: 'Creatinine',
  egfr: 'eGFR',
  temperature: 'Temperature (°C)',
  heartRate: 'Heart Rate (bpm)',
  respiratoryRate: 'Respiratory Rate',
  spo2: 'SpO₂ (%)',
  weightKg: 'Weight (kg)',
  bmi: 'BMI',
};

const CHART_VARS = {
  '--chart-background': '#1D1D1F',
  '--chart-foreground': '#F5F5F7',
  '--chart-foreground-muted': '#98989D',
  '--chart-label': '#98989D',
  '--chart-line-primary': '#0071E3',
  '--chart-line-secondary': '#98989D',
  '--chart-crosshair': '#0071E3',
  '--chart-grid': '#3A3A3C',
  '--border': '#3A3A3C',
};

function prettifyField(key) {
  return FIELD_LABELS[key] || key;
}

function PrevalenceSection({ icon: Icon, title, subtitle, items }) {
  if (!items || items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.prevalence - a.prevalence);

  // Format data for the Bklit BarChart with inline percentage values
  const chartData = sorted.map((item) => ({
    name: `${prettifyField(item.field)} (${Math.round(item.prevalence * 100)}%)`,
    prevalence: Math.round(item.prevalence * 100),
  }));

  return (
    <div className="chart-on-dark" style={CHART_VARS}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-blue" strokeWidth={1.75} />
        <span className="font-mono text-mono-label font-medium uppercase tracking-[0.08em] text-onpanel-faint">
          {title}
        </span>
      </div>
      <p className="mb-4 font-sans text-caption text-onpanel-muted">{subtitle}</p>
      
      {/* 220px high graph area */}
      <div className="relative h-[220px] w-full">
        <BarChart
          data={chartData}
          xDataKey="name"
          orientation="horizontal"
          aspectRatio="auto"
          className="h-full"
          margin={{ top: 10, right: 25, bottom: 10, left: 200 }}
        >
          <Grid vertical />
          <BarYAxis />
          <Bar dataKey="prevalence" fill="#0071E3" lineCap={4} fadedOpacity={0.6} />
          <ChartTooltip showDatePill={false} />
        </BarChart>
      </div>
    </div>
  );
}

/**
 * vitalsLabsSummary: [{field, min, mean, max, sampleSize}]
 * Displayed as visual range bars: min ←——●——→ max with the mean dot positioned proportionally.
 * Collapsible by default to save vertical height.
 */
function VitalsLabsTable({ items }) {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, 3);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent-blue" strokeWidth={1.75} />
        <span className="font-mono text-mono-label font-medium uppercase tracking-[0.08em] text-onpanel-faint">
          Vitals &amp; Labs Summary
        </span>
      </div>
      <p className="mb-4 font-sans text-caption text-onpanel-muted">
        Distribution of vital signs and lab values across the dataset
      </p>

      <div className="space-y-3.5">
        {visibleItems.map((item) => {
          const range = item.max - item.min;
          const meanPct = range > 0 ? ((item.mean - item.min) / range) * 100 : 50;

          return (
            <div key={item.field}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-sans text-small text-onpanel-ink">
                  {prettifyField(item.field)}
                </span>
                <span className="font-mono text-caption text-onpanel-faint">
                  {item.sampleSize.toLocaleString()} samples
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-right font-mono text-caption text-onpanel-muted">
                  {item.min}
                </span>
                <div className="relative h-2 flex-1 rounded-full bg-panel-border">
                  {/* Range fill */}
                  <div className="absolute inset-0 rounded-full bg-accent-blue/20" />
                  {/* Mean indicator dot */}
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-accent-blue"
                    style={{ left: `${Math.max(4, Math.min(96, meanPct))}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 font-mono text-caption text-onpanel-muted">
                  {item.max}
                </span>
              </div>
              <div className="mt-0.5 flex justify-center">
                <span className="font-mono text-[10px] font-medium text-accent-blue">
                  avg {item.mean}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-5 w-full py-2.5 text-center rounded-[10px] border border-panel-border bg-panel-raised/40 hover:bg-panel-raised hover:border-accent-blue/30 text-caption font-medium text-accent-blue transition-colors outline-none"
        >
          {expanded ? 'Show fewer metrics' : `Show all ${items.length} vitals & lab metrics`}
        </button>
      )}
    </div>
  );
}

/**
 * comorbidityPrevalence: [{field, yesCount, total, prevalence}]
 * symptomPrevalence:     [{field, yesCount, total, prevalence}]
 * vitalsLabsSummary:     [{field, min, mean, max, sampleSize}]
 *
 * All optional — absent on the legacy (non-augmented) dataset.
 * The panel renders nothing if no data is present.
 */
function ComorbidityPrevalencePanel({ comorbidityPrevalence, symptomPrevalence, vitalsLabsSummary }) {
  const hasComorb = comorbidityPrevalence && comorbidityPrevalence.length > 0;
  const hasSymptom = symptomPrevalence && symptomPrevalence.length > 0;
  const hasVitals = vitalsLabsSummary && vitalsLabsSummary.length > 0;
  if (!hasComorb && !hasSymptom && !hasVitals) return null;

  return (
    <Panel className={`p-6 ${HOVER}`}>
      <div className="mb-1 font-mono text-mono-label font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        Patient Profile
      </div>
      <h2 className="mb-5 font-display text-h3 text-onpanel-ink">
        Comorbidities, symptoms &amp; vitals
      </h2>

      <div className="space-y-8">
        {/* Comorbidity + Symptom side-by-side */}
        {(hasComorb || hasSymptom) && (
          <div className={`grid grid-cols-1 gap-8 ${hasComorb && hasSymptom ? 'sm:grid-cols-2' : ''}`}>
            {hasComorb && (
              <PrevalenceSection
                icon={HeartPulse}
                title="Comorbidities"
                subtitle="Prevalence of comorbid conditions in the dataset"
                items={comorbidityPrevalence}
              />
            )}
            {hasSymptom && (
              <PrevalenceSection
                icon={Stethoscope}
                title="Symptoms"
                subtitle="Prevalence of presenting symptoms"
                items={symptomPrevalence}
              />
            )}
          </div>
        )}

        {/* Vitals / Labs table — full width below */}
        {hasVitals && (
          <>
            {(hasComorb || hasSymptom) && <div className="h-px bg-panel-border" />}
            <VitalsLabsTable items={vitalsLabsSummary} />
          </>
        )}
      </div>
    </Panel>
  );
}

export default ComorbidityPrevalencePanel;
