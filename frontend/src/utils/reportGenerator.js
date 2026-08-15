// ===================================================================
// Client-side export of a single prediction-history record — JSON, CSV,
// or a fully laid-out clinical-style PDF (jsPDF + jspdf-autotable, with
// Chart.js used only as an offscreen renderer to rasterize chart images
// into the PDF, since jsPDF can't draw live charts). Entirely
// client-side: no server round-trip, the record is already in memory
// (from HistoryPage or PredictionResultPage).
//
// downloadPdf() is the interesting one — it hand-lays-out a multi-page
// report (header, patient data table, risk banner, chart images,
// predictions table, SHAP table, AI insights prose, disclaimer, footer)
// using absolute mm coordinates and manual pagination (ensureSpace),
// not a templating library.
// ===================================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// --- Logo: rendered from the same mark used in AuthHeader.jsx, in monochrome ---
// Rasterizes the app's SVG logo mark into a PNG data URL for embedding in the PDF.
function renderLogoToImage(size = 120) {
  return new Promise((resolve) => {
    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" stroke="#1D1D1F" stroke-width="1.4" fill="none" />
        <circle cx="20" cy="20" r="10" stroke="#6E6E73" stroke-width="1.4" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#1D1D1F" />
      </svg>
    `;
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = url;
  });
}

// Matches the app's current locked design system (see frontend/tailwind.config.js's
// page-ink/page-muted/page-faint and canvas-hairline/canvas-alt tokens), and
// FLAG_COLOR mirrors PredictionResultPage.jsx's RISK_TONE mapping exactly.
const INK = [29, 29, 31]; // #1D1D1F (page-ink)
const INK_SOFT = [110, 110, 115]; // #6E6E73 (page-muted)
const INK_MUTED = [134, 134, 139]; // #86868B (page-faint)
const HAIRLINE = [210, 210, 215]; // #D2D2D7 (canvas-hairline)
const PANEL_BG = [245, 245, 247]; // #F5F5F7 (canvas-alt)
const FLAG_COLOR = {
  Low: [48, 209, 88], // susceptible #30D158
  Moderate: [255, 159, 10], // intermediate #FF9F0A
  'Moderate-High': [255, 159, 10], // intermediate #FF9F0A
  High: [255, 59, 48], // resistant #FF3B30
};

// Formats a stored timestamp into a locale-readable string.
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

// Builds a descriptive, collision-resistant export filename from a
// history record (organism, date, short record ID).
function buildFilename(item, ext) {
  const organism = (item.inputData?.organism || 'Unknown').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dateStr = new Date(item.createdAt).toISOString().slice(0, 10);
  const shortId = item._id ? item._id.toString().slice(-6).toUpperCase() : 'XXXXXX';
  return `AMR-Insight_Report_${organism}_${dateStr}_${shortId}.${ext}`;
}

// Exports a history record as a raw JSON file.
export function downloadJson(item) {
  const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
  triggerDownload(blob, buildFilename(item, 'json'));
}

// Exports a history record's predictions as a flat CSV file.
export function downloadCsv(item) {
  const headers = ['Antibiotic', 'Result', 'AWaRe Category', 'Confidence', 'Top Contributing Feature'];
  const rows = item.predictions.map((p) => [p.antibiotic, p.result, p.awareCategory, p.confidence, p.shapExplanation?.[0]?.feature || '']);
  const csvLines = [
    `AMR-Insight Prediction Report`, `Generated: ${formatDate(item.createdAt)}`, `Organism: ${item.inputData?.organism || 'Unknown'}`, '',
    headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
  triggerDownload(blob, buildFilename(item, 'csv'));
}

const RETINA_SCALE = 3;
const CHART_GRAY = ['#2A2A2A', '#8A8A8A', '#C7C7C7'];

// Renders a Chart.js config offscreen at retina resolution and returns a
// PNG data URL — the bridge letting jsPDF embed a "live" chart as an image.
function renderChartToImage(config, w, h) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = w * RETINA_SCALE;
    canvas.height = h * RETINA_SCALE;
    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, { ...config, options: { ...config.options, responsive: false, animation: false, devicePixelRatio: 1 } });
    requestAnimationFrame(() => {
      const imgData = canvas.toDataURL('image/png', 1.0);
      chart.destroy();
      resolve({ imgData });
    });
  });
}
// Scales a font size for the retina-resolution offscreen chart canvas.
function sf(base) { return { size: base * RETINA_SCALE }; }

// Builds the Chart.js config for the R/S/I result-distribution doughnut chart.
function buildDistributionChartConfig(predictions) {
  const counts = { R: 0, S: 0, I: 0 };
  predictions.forEach((p) => { counts[p.result] = (counts[p.result] || 0) + 1; });
  return {
    type: 'doughnut',
    data: { labels: ['Resistant', 'Susceptible', 'Intermediate'], datasets: [{ data: [counts.R, counts.S, counts.I], backgroundColor: CHART_GRAY, borderWidth: 0 }] },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { font: sf(11), color: '#2A2A2A', padding: 12 * RETINA_SCALE } },
        title: { display: true, text: 'Prediction distribution (R / S / I)', font: sf(13), color: '#2A2A2A', padding: { bottom: 10 * RETINA_SCALE } },
      },
    },
  };
}

// Builds the Chart.js config for the per-antibiotic confidence bar chart.
function buildConfidenceChartConfig(predictions) {
  return {
    type: 'bar',
    data: { labels: predictions.map((p) => p.antibiotic), datasets: [{ label: 'Confidence', data: predictions.map((p) => p.confidence), backgroundColor: '#3A3A3A', borderWidth: 0 }] },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Prediction confidence by antibiotic', font: sf(13), color: '#2A2A2A', padding: { bottom: 10 * RETINA_SCALE } },
      },
      scales: {
        y: { beginAtZero: true, max: 1, ticks: { font: sf(9), color: '#5A5A5A' }, grid: { color: '#E5E5E5' } },
        x: { ticks: { font: sf(8), color: '#5A5A5A', maxRotation: 60, minRotation: 45 }, grid: { display: false } },
      },
    },
  };
}

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
// jsPDF's built-in Helvetica -- a clean modern sans-serif already bundled
// with jsPDF, matching the app's current sans-serif direction without
// adding new font assets (no Inter TTFs exist in this repo to embed).
const FONT = 'helvetica';

// Draws a section-divider rule + uppercase heading at y, returns the new
// cursor y position.
function sectionHeader(doc, text, y) {
  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6.5;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text(text.toUpperCase(), MARGIN, y);
  doc.setFont(FONT, 'normal');
  return y + 6;
}

// Manual pagination: if the next block wouldn't fit above the footer
// line, starts a new page and returns the reset cursor y; otherwise a no-op.
function ensureSpace(doc, y, needed) {
  if (y + needed > 278) { doc.addPage(); return 24; }
  return y;
}

// Word-wraps `text` at maxWidth, bolding any word that matches keywordSet
// (antibiotic names, R/S/I terms) — a lightweight rich-text renderer since
// jsPDF has no native inline-bold-within-a-paragraph support.
function renderRichText(doc, text, x, y, maxWidth, keywordSet, lineHeight = 4.8) {
  const words = text.split(/\s+/);
  let cursorX = x, cursorY = y;
  doc.setFontSize(9.5);
  words.forEach((word, i) => {
    const clean = word.replace(/[.,;:()]/g, '');
    const isKeyword = keywordSet.has(clean);
    const renderWord = (i === 0 ? '' : ' ') + word;
    doc.setFont(FONT, isKeyword ? 'bold' : 'normal');
    doc.setTextColor(...INK_SOFT);
    const wordWidth = doc.getTextWidth(renderWord);
    if (cursorX + wordWidth > x + maxWidth) { cursorX = x; cursorY += lineHeight; }
    doc.text(renderWord.trimStart(), cursorX, cursorY);
    cursorX += wordWidth;
  });
  doc.setFont(FONT, 'normal');
  return cursorY + lineHeight;
}

// Builds the set of words renderRichText should bold: fixed clinical
// terms plus every antibiotic name in this report.
function buildKeywordSet(predictions) {
  const set = new Set(['Resistant', 'Susceptible', 'Intermediate', 'Reserve', 'Watch', 'Access']);
  predictions.forEach((p) => set.add(p.antibiotic));
  return set;
}

// Entry point: builds and downloads the full multi-page clinical-style
// PDF report for one prediction record.
export async function downloadPdf(item) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await renderLogoToImage();
  const insights = item.aiInsights;
  const reportId = item._id ? item._id.toString().slice(-8).toUpperCase() : 'UNKNOWN';
  const keywordSet = buildKeywordSet(item.predictions);

  doc.setProperties({ title: 'AMR-Insight Prediction Report', subject: 'Antibiotic resistance prediction report', author: 'AMR-Insight', creator: 'AMR-Insight Platform' });

  let y = 20;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', MARGIN, 10, 12, 12);
  }
  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('AMR-INSIGHT', logoDataUrl ? MARGIN + 15 : MARGIN, 17);
  doc.setFont(FONT, 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_MUTED);
  doc.text('Antibiotic Resistance Intelligence Platform', logoDataUrl ? MARGIN + 15 : MARGIN, 22);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text(`Report ID  ${reportId}`, PAGE_W - MARGIN, 15, { align: 'right' });
  doc.text(`Generated  ${formatDate(item.createdAt)}`, PAGE_W - MARGIN, 20, { align: 'right' });

  y = 27;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 1.2;
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 9;

  doc.setFont(FONT, 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text('Research and education report — not intended for clinical diagnosis.', MARGIN, y);
  y += 7;

  y = sectionHeader(doc, 'Patient & input data', y);
  const inputEntries = Object.entries(item.inputData || {});
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.6, textColor: INK_SOFT, font: FONT, valign: 'middle' },
    columnStyles: { 0: { fontStyle: 'bold', textColor: INK, cellWidth: 42 }, 1: { halign: 'left' } },
    body: inputEntries.map(([k, v]) => [k.replace(/_/g, ' '), String(v)]),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  y = doc.lastAutoTable.finalY + 5;

  if (insights?.riskAssessment) {
    const flagColor = FLAG_COLOR[insights.riskAssessment.level] || [90, 90, 90];
    y = ensureSpace(doc, y, 22);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, y, CONTENT_W, 17);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...flagColor);
    doc.text(`RISK LEVEL: ${insights.riskAssessment.level.toUpperCase()}`, MARGIN + 4, y + 6.5);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_SOFT);
    const riskLines = doc.splitTextToSize(insights.riskAssessment.text, CONTENT_W - 8);
    doc.text(riskLines.slice(0, 2), MARGIN + 4, y + 11.5);
    y += 22;
  }

  y = sectionHeader(doc, 'Visual summary', y);
  const [distChart, confChart] = await Promise.all([
    renderChartToImage(buildDistributionChartConfig(item.predictions), 260, 210),
    renderChartToImage(buildConfidenceChartConfig(item.predictions), 260, 210),
  ]);
  const chartW = (CONTENT_W - 6) / 2;
  const chartH = chartW * (210 / 260);
  y = ensureSpace(doc, y, chartH + 4);
  doc.addImage(distChart.imgData, 'PNG', MARGIN, y, chartW, chartH, undefined, 'FAST');
  doc.addImage(confChart.imgData, 'PNG', MARGIN + chartW + 6, y, chartW, chartH, undefined, 'FAST');
  y += chartH + 8;

  y = sectionHeader(doc, 'Predictions', y);
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: INK, fontSize: 8, fontStyle: 'bold', font: FONT, lineColor: INK, lineWidth: 0.3, halign: 'center' },
    bodyStyles: { fontSize: 8.5, textColor: INK_SOFT, font: FONT, lineColor: HAIRLINE, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: PANEL_BG },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: INK, halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    head: [['Antibiotic', 'Result', 'AWaRe Tier', 'Confidence']],
    body: item.predictions.map((p) => [p.antibiotic, p.result, p.awareCategory, `${Math.round(p.confidence * 100)}%`]),
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) data.cell.styles.fontStyle = 'bold';
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  y = ensureSpace(doc, y, 22);
  y = sectionHeader(doc, 'SHAP explainability — top contributing features', y);
  const shapRows = item.predictions.flatMap((p) => (p.shapExplanation || []).slice(0, 3).map((s) => [p.antibiotic, s.feature.replace(/_/g, ' '), s.contribution.toFixed(3), s.direction]));
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: INK, fontSize: 7.5, fontStyle: 'bold', font: FONT, lineColor: INK, lineWidth: 0.3, halign: 'center' },
    bodyStyles: { fontSize: 7.5, textColor: INK_SOFT, font: FONT, lineColor: HAIRLINE, lineWidth: 0.2 },
    alternateRowStyles: { fillColor: PANEL_BG },
    columnStyles: { 0: { fontStyle: 'bold', textColor: INK, halign: 'center' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    head: [['Antibiotic', 'Feature', 'Contribution', 'Direction']],
    body: shapRows,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
  });
  y = doc.lastAutoTable.finalY + 8;

  if (insights) {
    y = ensureSpace(doc, y, 22);
    y = sectionHeader(doc, 'AI insights', y);
    const sections = [['Summary', insights.summary], ['Confidence Interpretation', insights.confidenceInterpretation], ['Plain English Explanation', insights.plainEnglishExplanation]];
    sections.forEach(([label, text]) => {
      if (!text) return;
      y = ensureSpace(doc, y, 16);
      doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text(label, MARGIN, y);
      y += 5;
      y = renderRichText(doc, text, MARGIN, y, CONTENT_W, keywordSet);
      y += 3;
    });

    if (insights.recommendedNextSteps?.length) {
      y = ensureSpace(doc, y, 16);
      doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text('Recommended Next Steps', MARGIN, y);
      y += 5.5;
      insights.recommendedNextSteps.forEach((step) => {
        y = ensureSpace(doc, y, 9);
        doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
        doc.text('-', MARGIN, y);
        y = renderRichText(doc, step, MARGIN + 4, y, CONTENT_W - 4, keywordSet);
        y += 1.5;
      });
      y += 3;
    }

    if (insights.similarHistoricalCases?.sampleSize > 0) {
      y = ensureSpace(doc, y, 30);
      doc.setFont(FONT, 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text('Similar Historical Cases', MARGIN, y);
      y += 5;
      doc.setFont(FONT, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK_SOFT);
      doc.text(`Based on ${insights.similarHistoricalCases.sampleSize} matching records (${insights.similarHistoricalCases.matchCriteria}).`, MARGIN, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: INK, fontSize: 7.5, fontStyle: 'bold', font: FONT, lineColor: INK, lineWidth: 0.3, halign: 'center' },
        bodyStyles: { fontSize: 7.5, textColor: INK_SOFT, font: FONT, lineColor: HAIRLINE, lineWidth: 0.2 },
        alternateRowStyles: { fillColor: PANEL_BG },
        columnStyles: { 0: { fontStyle: 'bold', textColor: INK, halign: 'center' }, 1: { halign: 'center' } },
        head: [['Antibiotic', 'Historical Resistance Rate']],
        body: insights.similarHistoricalCases.resistanceBreakdown.slice(0, 8).map((r) => [r.antibiotic, `${Math.round(r.resistantRate * 100)}%`]),
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_W,
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    if (insights.disclaimer) {
      y = ensureSpace(doc, y, 18);
      doc.setDrawColor(...INK); doc.setLineWidth(0.3);
      doc.rect(MARGIN, y, CONTENT_W, 15);
      doc.setFont(FONT, 'italic'); doc.setFontSize(7); doc.setTextColor(...INK_MUTED);
      const lines = doc.splitTextToSize(insights.disclaimer, CONTENT_W - 6);
      doc.text(lines, MARGIN + 3, y + 5);
      doc.setFont(FONT, 'normal');
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...HAIRLINE); doc.setLineWidth(0.3);
    doc.line(MARGIN, 289, PAGE_W - MARGIN, 289);
    doc.setFont(FONT, 'italic'); doc.setFontSize(7); doc.setTextColor(...INK_MUTED);
    doc.text('AMR-Insight — Research & education tool. Not for clinical diagnosis.', MARGIN, 293);
    doc.setFont(FONT, 'normal');
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, 293, { align: 'right' });
  }

  doc.save(buildFilename(item, 'pdf'));
}

// Triggers a browser file download for a Blob via a throwaway <a> element.
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}