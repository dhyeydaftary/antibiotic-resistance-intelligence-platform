import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// --- Font embedding: Merriweather TTFs served from /public/fonts ---
async function loadFontBase64(url) {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function registerReportFonts(doc) {
  const [regular, bold, italic] = await Promise.all([
    loadFontBase64('/fonts/Merriweather_24pt-Regular.ttf'),
    loadFontBase64('/fonts/Merriweather_24pt-Bold.ttf'),
    loadFontBase64('/fonts/Merriweather_24pt-Italic.ttf'),
  ]);
  doc.addFileToVFS('Merriweather-Regular.ttf', regular);
  doc.addFont('Merriweather-Regular.ttf', 'Merriweather', 'normal');
  doc.addFileToVFS('Merriweather-Bold.ttf', bold);
  doc.addFont('Merriweather-Bold.ttf', 'Merriweather', 'bold');
  doc.addFileToVFS('Merriweather-Italic.ttf', italic);
  doc.addFont('Merriweather-Italic.ttf', 'Merriweather', 'italic');
}

// --- Logo: rendered from the same mark used in AuthHeader.jsx, in monochrome ---
function renderLogoToImage(size = 120) {
  return new Promise((resolve) => {
    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" stroke="#141414" stroke-width="1.4" fill="none" />
        <circle cx="20" cy="20" r="10" stroke="#5A5A5A" stroke-width="1.4" fill="none" />
        <circle cx="20" cy="20" r="3" fill="#141414" />
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

// Monochrome, clinical palette
const INK = [20, 20, 20];
const INK_SOFT = [70, 70, 70];
const INK_MUTED = [110, 110, 110];
const HAIRLINE = [210, 210, 210];
const PANEL_BG = [246, 246, 246];
const FLAG_COLOR = { Low: [90, 90, 90], Moderate: [90, 90, 90], 'Moderate-High': [40, 40, 40], High: [20, 20, 20] };

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

function buildFilename(item, ext) {
  const organism = (item.inputData?.organism || 'Unknown').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dateStr = new Date(item.createdAt).toISOString().slice(0, 10);
  const shortId = item._id ? item._id.toString().slice(-6).toUpperCase() : 'XXXXXX';
  return `AMR-Insight_Report_${organism}_${dateStr}_${shortId}.${ext}`;
}

export function downloadJson(item) {
  const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
  triggerDownload(blob, buildFilename(item, 'json'));
}

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
function sf(base) { return { size: base * RETINA_SCALE }; }

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
const FONT = 'Merriweather';

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

function ensureSpace(doc, y, needed) {
  if (y + needed > 278) { doc.addPage(); return 24; }
  return y;
}

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

function buildKeywordSet(predictions) {
  const set = new Set(['Resistant', 'Susceptible', 'Intermediate', 'Reserve', 'Watch', 'Access']);
  predictions.forEach((p) => set.add(p.antibiotic));
  return set;
}

export async function downloadPdf(item) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await registerReportFonts(doc);
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