import { useRef, useState, useId } from 'react';
import { motion } from 'framer-motion';

// Self-contained line chart — zero dependencies (the project's real Bklit
// LineChart isn't installed, see HomeOverviewPanel notes). Uses a monotone
// cubic spline (same family of interpolation d3/Bklit use for line charts)
// instead of a plain Catmull-Rom curve, specifically because our real data
// is sparse and spiky (lots of 0s, then a single day with a few
// predictions) — a naive smoothing curve overshoots below zero and bulges
// oddly around flat runs; monotone interpolation is built to never do that.

const WIDTH = 600;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

function monotoneTangents(values) {
  const n = values.length;
  const delta = [];
  for (let i = 0; i < n - 1; i++) delta.push(values[i + 1] - values[i]);

  const m = new Array(n).fill(0);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 + 1;
      const w2 = 1 + 2;
      m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }
  return m;
}

function monotonePath(points) {
  if (points.length < 2) return '';
  const ys = points.map((p) => p.y);
  const m = monotoneTangents(ys);

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const c1x = p0.x + dx;
    const c1y = p0.y + (m[i] * (p1.x - p0.x)) / 3;
    const c2x = p1.x - dx;
    const c2y = p1.y - (m[i + 1] * (p1.x - p0.x)) / 3;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

/**
 * data: array of row objects, e.g. [{ label: 'Mon', total: 3 }, ...]
 * series: [{ key: 'total', color: '#0071E3', label: 'Predictions' }]
 * xKey: which field in each row is the x-axis label
 */
function MiniLineChart({ data, series, xKey = 'label', height = 200 }) {
  const containerRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const gradientId = useId();

  if (!data || data.length < 2 || !series || series.length === 0) return null;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const allValues = series.flatMap((s) => data.map((d) => Number(d[s.key]) || 0));
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;

  const xFor = (i) => PAD_X + (i / (data.length - 1)) * plotWidth;
  const yFor = (value) => PAD_TOP + plotHeight - ((value - min) / range) * plotHeight;
  const baselineY = PAD_TOP + plotHeight;

  const seriesPoints = series.map((s) => ({
    ...s,
    points: data.map((d, i) => ({ x: xFor(i), y: yFor(Number(d[s.key]) || 0) })),
  }));

  const gridLines = 4;

  function handleMove(e) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const hovered = hoverIndex != null ? data[hoverIndex] : null;
  const hoverX = hoverIndex != null ? xFor(hoverIndex) : null;
  const tooltipLeftPct = hoverIndex != null ? (hoverIndex / (data.length - 1)) * 100 : 0;
  const tooltipTransform =
    hoverIndex === 0 ? 'translateX(0)' : hoverIndex === data.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)';

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          {seriesPoints.map((s) => (
            <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {Array.from({ length: gridLines }).map((_, i) => {
          const y = PAD_TOP + (plotHeight / (gridLines - 1)) * i;
          return (
            <line
              key={i}
              x1={PAD_X}
              y1={y}
              x2={WIDTH - PAD_X}
              y2={y}
              stroke="#3A3A3C"
              strokeWidth="1"
              strokeDasharray="3 4"
              opacity="0.5"
            />
          );
        })}

        {hoverX != null && (
          <line
            x1={hoverX}
            y1={PAD_TOP}
            x2={hoverX}
            y2={baselineY}
            stroke="#0071E3"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {seriesPoints.map((s) => (
          <path
            key={`${s.key}-area`}
            d={`${monotonePath(s.points)} L ${s.points[s.points.length - 1].x.toFixed(1)} ${baselineY} L ${s.points[0].x.toFixed(1)} ${baselineY} Z`}
            fill={`url(#${gradientId}-${s.key})`}
            stroke="none"
          />
        ))}

        {seriesPoints.map((s) => (
          <motion.path
            key={s.key}
            d={monotonePath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}

        {hoverIndex != null &&
          seriesPoints.map((s) => (
            <circle
              key={s.key}
              cx={s.points[hoverIndex].x}
              cy={s.points[hoverIndex].y}
              r="4"
              fill={s.color}
              stroke="#1D1D1F"
              strokeWidth="2"
            />
          ))}

        {data.map((d, i) => {
          const isHovered = i === hoverIndex;
          return (
            <text
              key={i}
              x={xFor(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill={isHovered ? '#F5F5F7' : '#6E6E73'}
            >
              {d[xKey]}
            </text>
          );
        })}
      </svg>

      {hovered && hoverIndex != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[120px] rounded-[10px] border border-panel-border bg-panel-raised p-2.5 shadow-panel-md"
          style={{ left: `${tooltipLeftPct}%`, transform: tooltipTransform }}
        >
          <p className="mb-1.5 font-sans text-caption font-semibold text-onpanel-ink">{hovered[xKey]}</p>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3 font-mono text-caption">
              <span className="flex items-center gap-1.5 text-onpanel-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold text-onpanel-ink">{hovered[s.key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MiniLineChart;
