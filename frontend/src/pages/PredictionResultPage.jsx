import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ChevronDown, FileDown, FileJson, FileSpreadsheet,
  AlertTriangle, TrendingUp, Sparkles, ListChecks,
} from 'lucide-react';
import Panel from '../components/app/Panel';
import PrimaryButton from '../components/app/PrimaryButton';
import ResultBadge from '../components/app/ResultBadge';
import { downloadPdf, downloadCsv, downloadJson } from '../utils/reportGenerator';

import { RingChart } from '../components/charts/ring-chart';
import { Ring } from '../components/charts/ring';
import { RingCenter } from '../components/charts/ring-center';
import { BarChart } from '../components/charts/bar-chart';
import { Bar } from '../components/charts/bar';
import { BarXAxis } from '../components/charts/bar-x-axis';
import { Grid } from '../components/charts/grid';
import { ChartTooltip } from '../components/charts/tooltip';

const FAKE_PREDICTION = {
  predictions: [
    { antibiotic: 'AMX/AMP', result: 'R', confidence: 0.87, awareCategory: 'Access', shapExplanation: [] },
    { antibiotic: 'CIP', result: 'S', confidence: 0.92, awareCategory: 'Watch', shapExplanation: [] },
    { antibiotic: 'IPM', result: 'I', confidence: 0.65, awareCategory: 'Reserve', shapExplanation: [] },
  ],
  aiInsights: null,
  modelVersion: 'v1.0',
};

const RISK_TONE = {
  Low: 'text-susceptible',
  Moderate: 'text-intermediate',
  'Moderate-High': 'text-intermediate',
  High: 'text-resistant',
};

// Chart theming: explicit brand tokens, scoped to whatever contains this style block
const CHART_VARS = {
  '--chart-background': '#1D1D1F',
  '--chart-foreground': '#F5F5F7',
  '--chart-foreground-muted': '#98989D',
  '--chart-line-primary': '#0071E3',
  '--chart-line-secondary': '#98989D',
  '--chart-crosshair': '#0071E3',
  '--chart-grid': '#3A3A3C',
  '--border': '#3A3A3C',
};

function PredictionRow({ p }) {
  const [expanded, setExpanded] = useState(false);
  const hasShap = p.shapExplanation && p.shapExplanation.length > 0;

  return (
    <div className="border-b border-panel-border last:border-b-0">
      <button
        type="button"
        onClick={() => hasShap && setExpanded((v) => !v)}
        className={`flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors ${hasShap ? 'hover:bg-panel-raised cursor-pointer' : 'cursor-default'}`}
      >
        <span className="w-24 shrink-0 font-mono text-[13px] font-medium text-onpanel-ink">{p.antibiotic}</span>
        <span className="w-32 shrink-0"><ResultBadge result={p.result} /></span>
        <span className="w-20 shrink-0 font-mono text-[11px] uppercase tracking-wide text-onpanel-faint">{p.awareCategory}</span>
        <span className="flex-1 text-right font-mono text-[13px] text-onpanel-muted">
          {Math.round(p.confidence * 100)}%
        </span>
        {hasShap && (
          <ChevronDown
            size={14}
            className={`shrink-0 text-onpanel-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {expanded && hasShap && (
        <div className="space-y-1.5 bg-panel px-5 pb-4 pt-1">
          {p.shapExplanation.slice(0, 5).map((s) => (
            <div key={s.feature} className="flex items-center gap-3 font-mono text-[11px]">
              <span className="w-32 shrink-0 truncate text-onpanel-faint">{s.feature.replace(/_/g, ' ')}</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-panel-border">
                <div
                  className={`h-full rounded-full ${s.direction === 'positive' ? 'bg-resistant' : 'bg-susceptible'}`}
                  style={{ width: `${Math.min(Math.abs(s.contribution) * 60, 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right text-onpanel-muted">{s.contribution.toFixed(3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PredictionResultPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const realPrediction = location.state?.prediction;
  const inputData = location.state?.inputData;
  const isLive = Boolean(realPrediction);
  const displayData = realPrediction || FAKE_PREDICTION;
  const insights = displayData.aiInsights;

  const counts = displayData.predictions.reduce(
    (acc, p) => ({ ...acc, [p.result]: (acc[p.result] || 0) + 1 }),
    {}
  );
  const total = displayData.predictions.length;

  const ringData = [
    { label: 'Resistant', value: counts.R || 0, maxValue: total, color: '#FF3B30' },
    { label: 'Susceptible', value: counts.S || 0, maxValue: total, color: '#30D158' },
    { label: 'Intermediate', value: counts.I || 0, maxValue: total, color: '#FF9F0A' },
  ];

  const barData = displayData.predictions.map((p) => ({
    antibiotic: p.antibiotic,
    confidence: Math.round(p.confidence * 100),
  }));

  const reportItem = {
    _id: id !== 'live' ? id : `live-${Date.now()}`,
    createdAt: new Date().toISOString(),
    inputData: inputData || { organism: 'Unknown' },
    predictions: displayData.predictions,
    aiInsights: insights,
  };

  return (
    <div className="px-6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate('/predict')}
          className="mb-5 flex items-center gap-1.5 font-sans text-[13px] font-medium text-page-muted transition-colors hover:text-page-ink"
        >
          <ArrowLeft size={14} />
          Back to predict
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
              {isLive ? 'Live result' : 'Sample result'}
            </div>
            <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-page-ink sm:text-[38px]">
              {inputData?.organism || 'Prediction result'}
            </h1>
          </div>

          <div className="flex gap-2">
            <button onClick={() => downloadPdf(reportItem)} className="flex items-center gap-1.5 rounded-full border border-canvas-hairline bg-white px-3.5 py-2 font-sans text-[13px] font-medium text-page-ink transition-colors hover:bg-canvas-alt">
              <FileDown size={14} /> PDF
            </button>
            <button onClick={() => downloadCsv(reportItem)} className="flex items-center gap-1.5 rounded-full border border-canvas-hairline bg-white px-3.5 py-2 font-sans text-[13px] font-medium text-page-ink transition-colors hover:bg-canvas-alt">
              <FileSpreadsheet size={14} /> CSV
            </button>
            <button onClick={() => downloadJson(reportItem)} className="flex items-center gap-1.5 rounded-full border border-canvas-hairline bg-white px-3.5 py-2 font-sans text-[13px] font-medium text-page-ink transition-colors hover:bg-canvas-alt">
              <FileJson size={14} /> JSON
            </button>
          </div>
        </div>

        {/* Two-column layout: sticky sidebar (glanceable) + main scroll content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Sidebar: everything you need at a glance, no scrolling required */}
          <div className="space-y-4 lg:sticky lg:top-8 lg:col-span-2 lg:h-fit">
            {insights?.riskAssessment && (
              <Panel className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${RISK_TONE[insights.riskAssessment.level] || 'text-onpanel-muted'}`} />
                  <div>
                    <div className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                      Risk: <span className={RISK_TONE[insights.riskAssessment.level] || 'text-onpanel-ink'}>{insights.riskAssessment.level}</span>
                    </div>
                    <p className="font-sans text-[13px] leading-[1.5] text-onpanel-muted">
                      {insights.riskAssessment.text}
                    </p>
                  </div>
                </div>
              </Panel>
            )}

            <Panel className="p-5 chart-on-dark" style={CHART_VARS}>
              <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                Result distribution
              </div>
              <div className="flex items-center justify-center">
                <RingChart data={ringData} size={168}>
                  {ringData.map((item, index) => (
                    <Ring key={item.label} index={index} />
                  ))}
                  <RingCenter defaultLabel="Total" />
                </RingChart>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {ringData.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 font-mono text-[11px] text-onpanel-muted">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label} <span className="text-onpanel-ink">{item.value}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5 chart-on-dark" style={CHART_VARS}>
              <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                Confidence by antibiotic
              </div>
              <BarChart data={barData} xDataKey="antibiotic" aspectRatio="4 / 3">
                <Grid horizontal />
                <Bar dataKey="confidence" fill="var(--chart-line-primary)" lineCap={4} />
                <BarXAxis />
                <ChartTooltip />
              </BarChart>
            </Panel>
          </div>

          {/* Main: predictions table + AI insights, scrolls independently */}
          <div className="space-y-4 lg:col-span-3">
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                  Predictions
                </span>
                <span className="font-mono text-[11px] text-onpanel-faint">
                  {total} antibiotics
                </span>
              </div>
              <div className="border-t border-panel-border">
                {displayData.predictions.map((p) => (
                  <PredictionRow key={p.antibiotic} p={p} />
                ))}
              </div>
            </Panel>

            {insights && (
              <>
                <div className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-page-faint">
                  <Sparkles size={13} />
                  AI insights
                </div>

                <Panel className="p-6">
                  <div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">Summary</div>
                  <p className="mb-5 font-sans text-[14px] leading-[1.6] text-onpanel-muted">{insights.summary}</p>

                  <div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">Confidence interpretation</div>
                  <p className="mb-5 font-sans text-[14px] leading-[1.6] text-onpanel-muted">{insights.confidenceInterpretation}</p>

                  <div className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">Plain English explanation</div>
                  <p className="font-sans text-[14px] leading-[1.6] text-onpanel-muted">{insights.plainEnglishExplanation}</p>
                </Panel>

                {insights.recommendedNextSteps?.length > 0 && (
                  <Panel className="p-6">
                    <div className="mb-4 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                      <ListChecks size={13} /> Recommended next steps
                    </div>
                    <ul className="space-y-2.5">
                      {insights.recommendedNextSteps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 font-sans text-[14px] leading-[1.5] text-onpanel-muted">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-blue" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                {insights.similarHistoricalCases?.sampleSize > 0 && (
                  <Panel className="p-6">
                    <div className="mb-1 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-onpanel-faint">
                      <TrendingUp size={13} /> Similar historical cases
                    </div>
                    <p className="mb-4 font-sans text-[13px] text-onpanel-faint">
                      Based on {insights.similarHistoricalCases.sampleSize} matching records ({insights.similarHistoricalCases.matchCriteria})
                    </p>
                    <div className="space-y-2">
                      {insights.similarHistoricalCases.resistanceBreakdown.slice(0, 6).map((r) => (
                        <div key={r.antibiotic} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 font-mono text-[12px] text-onpanel-ink">{r.antibiotic}</span>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-border">
                            <motion.div
                              className="h-full rounded-full bg-accent-blue"
                              initial={{ width: 0 }}
                              animate={{ width: `${r.resistantRate * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-mono text-[12px] text-onpanel-muted">
                            {Math.round(r.resistantRate * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {insights.disclaimer && (
                  <p className="border-l-2 border-canvas-hairline pl-4 font-sans text-[12px] italic leading-[1.6] text-page-faint">
                    {insights.disclaimer}
                  </p>
                )}
              </>
            )}

            <div className="flex justify-center pt-2">
              <PrimaryButton onClick={() => navigate('/predict')}>
                Run another prediction
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PredictionResultPage;