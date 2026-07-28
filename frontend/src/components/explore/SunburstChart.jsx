import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Self-contained 2-ring sunburst — zero dependencies, same convention as
// MiniLineChart on Home. This is a genuine (if small) real hierarchy built
// from the real dataset-stats response: inner ring = "Named organisms" vs
// "Unknown" (both real groupings already present in organismDistribution),
// outer ring = each individual organism, sized within its parent's arc.

const SIZE = 320;
const CENTER = SIZE / 2;
const INNER_R0 = 50;
const INNER_R1 = 84;
const OUTER_R0 = 90;
const OUTER_R1 = 142;

// Monochrome blue shades only — the locked design system allows exactly
// one accent color (accent-blue) plus semantic R/S/I colors, which don't
// apply here since organisms aren't resistance results. No rainbow palette.
const BLUE_SHADES = ['#0071E3', '#2B87E8', '#4C9CED', '#6EB1F1', '#8FC6F5', '#B0DBFA', '#D1EFFE'];
const UNKNOWN_COLOR = '#6E6E73';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle);
  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * organisms: real organismDistribution array — [{ organism, count }]
 * totalRows: real stats.totalRows
 */
function SunburstChart({ organisms, totalRows }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!organisms || organisms.length === 0 || !totalRows) {
    return <p className="py-10 text-center font-sans text-small text-onpanel-faint">No organism data available.</p>;
  }

  const namedOrganisms = organisms.filter((o) => o.organism !== 'Unknown').sort((a, b) => b.count - a.count);
  const unknownEntry = organisms.find((o) => o.organism === 'Unknown');
  const namedTotal = namedOrganisms.reduce((sum, o) => sum + o.count, 0);
  const unknownTotal = unknownEntry ? unknownEntry.count : 0;
  const grandTotal = namedTotal + unknownTotal || 1;
  const namedAngleSpan = (namedTotal / grandTotal) * 360;

  const innerSegments = [
    { key: 'named', label: 'Named organisms', count: namedTotal, start: 0, end: namedAngleSpan, color: '#0071E3' },
  ];
  if (unknownTotal > 0) {
    innerSegments.push({
      key: 'unknown',
      label: 'Unknown',
      count: unknownTotal,
      start: namedAngleSpan,
      end: 360,
      color: UNKNOWN_COLOR,
    });
  }

  let cursor = 0;
  const outerSegments = namedOrganisms.map((o, i) => {
    const angle = (o.count / grandTotal) * 360;
    const seg = {
      key: o.organism,
      label: o.organism,
      count: o.count,
      start: cursor,
      end: cursor + angle,
      color: BLUE_SHADES[i % BLUE_SHADES.length],
    };
    cursor += angle;
    return seg;
  });
  if (unknownTotal > 0) {
    outerSegments.push({
      key: 'Unknown',
      label: 'Unknown',
      count: unknownTotal,
      start: namedAngleSpan,
      end: 360,
      color: UNKNOWN_COLOR,
    });
  }

  function handleEnter(seg, ring, e) {
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHovered({ ...seg, ring });
  }

  function handleMove(e) {
    if (!hovered) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div ref={containerRef} className="relative shrink-0" onMouseLeave={() => setHovered(null)}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="300" height="300" onMouseMove={handleMove}>
          {innerSegments.map((s) => (
            <path
              key={`inner-${s.key}`}
              d={arcPath(CENTER, CENTER, INNER_R0, INNER_R1, s.start, s.end)}
              fill={s.color}
              stroke="#1D1D1F"
              strokeWidth="1.5"
              opacity={hovered && hovered.key !== s.key ? 0.35 : 1}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={(e) => handleEnter(s, 'inner', e)}
            />
          ))}
          {outerSegments.map((s) => (
            <path
              key={`outer-${s.key}`}
              d={arcPath(CENTER, CENTER, OUTER_R0, OUTER_R1, s.start, s.end)}
              fill={s.color}
              stroke="#1D1D1F"
              strokeWidth="1.5"
              opacity={hovered && hovered.key !== s.key ? 0.35 : 1}
              style={hovered?.key === s.key ? { filter: 'brightness(1.18)' } : undefined}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={(e) => handleEnter(s, 'outer', e)}
            />
          ))}
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" fill="#F5F5F7" fontSize="26" fontWeight="600" fontFamily="Space Grotesk, sans-serif">
            {organisms.length}
          </text>
          <text x={CENTER} y={CENTER + 15} textAnchor="middle" fill="#98989D" fontSize="11" fontFamily="monospace" letterSpacing="0.5">
            ORGANISMS
          </text>
        </svg>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-10 min-w-[140px] rounded-[10px] border border-panel-border bg-panel-raised p-2.5 shadow-panel-lg"
              style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
            >
              <p className="font-sans text-caption font-semibold text-onpanel-ink">{hovered.label}</p>
              <p className="font-mono text-[11px] text-onpanel-muted">
                {hovered.count.toLocaleString()} samples · {((hovered.count / grandTotal) * 100).toFixed(1)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full min-w-0">
        <div className="mb-2 font-mono text-[11px] leading-snug text-onpanel-faint">
          Inner ring: named vs. unknown · outer ring: individual organisms
        </div>
        <div className="flex flex-wrap gap-1.5">
          {outerSegments.map((s) => (
            <button
              key={s.key}
              type="button"
              onMouseEnter={(e) => handleEnter(s, 'outer', e)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-left transition-colors ${
                hovered?.key === s.key ? 'border-accent-blue' : 'border-panel-border'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-mono text-[10px] text-onpanel-muted">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SunburstChart;
