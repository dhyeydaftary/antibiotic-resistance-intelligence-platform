import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Hand-rolled inline-SVG sunburst specific to the Explore page — distinct
// from the reusable components/charts/sunburst-chart.jsx library
// component; this one is self-contained on purpose (see below) and not
// built on the shared charts/ primitives.
// Self-contained 2-ring sunburst — zero dependencies, same convention as
// MiniLineChart on Home. Real hierarchy from the real dataset-stats
// response: inner ring = "Named organisms" vs "Unknown", outer ring = each
// individual organism, sized within its parent's arc.
//
// TOOLTIP POSITIONING: this used to follow the raw mouse position, which
// meant hovering a legend pill placed the tooltip directly on top of the
// pill row, covering neighboring pill labels. Fixed by anchoring the
// tooltip to the HOVERED ELEMENT's own bounding box instead of the cursor —
// for legend pills it now floats above the whole row; for chart segments
// it centers over the chart. Either way it can no longer land on top of
// sibling content.

const SIZE = 320;
const CENTER = SIZE / 2;
const INNER_R0 = 50;
const INNER_R1 = 84;
const OUTER_R0 = 90;
const OUTER_R1 = 142;

const BLUE_SHADES = ['#0071E3', '#2B87E8', '#4C9CED', '#6EB1F1', '#8FC6F5', '#B0DBFA', '#D1EFFE'];
const UNKNOWN_COLOR = '#6E6E73';

// Converts a polar angle (degrees, 0 = top) into SVG (x, y) coordinates.
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Builds the SVG path `d` string for one donut-ring arc segment.
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

// Two-ring organism-distribution sunburst: inner ring = named vs.
// Unknown, outer ring = each individual organism's share.
function SunburstChart({ organisms, totalRows }) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState(null); // { key, label, count, top, left }

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
    innerSegments.push({ key: 'unknown', label: 'Unknown', count: unknownTotal, start: namedAngleSpan, end: 360, color: UNKNOWN_COLOR });
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
    outerSegments.push({ key: 'Unknown', label: 'Unknown', count: unknownTotal, start: namedAngleSpan, end: 360, color: UNKNOWN_COLOR });
  }

  // Anchor to the hovered DOM element's own rect (relative to the shared
  // container), never to the mouse — that's what keeps the tooltip from
  // ever landing on top of a sibling pill.
  function showTooltipFor(seg, targetEl) {
    const containerRect = containerRef.current.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    
    // Position tooltip above the hovered element with enough offset
    // so it doesn't cover the label below
    const tooltipWidth = 180;
    const tooltipHeight = 70;
    
    let left = targetRect.left - containerRect.left + targetRect.width / 2 - tooltipWidth / 2;
    let top = targetRect.top - containerRect.top - tooltipHeight - 12;
    
    // If not enough space above, place below
    if (top < 10) {
      top = targetRect.top - containerRect.top + targetRect.height + 12;
    }
    
    // Keep within container bounds
    const containerWidth = containerRef.current.offsetWidth;
    if (left < 10) left = 10;
    if (left + tooltipWidth > containerWidth - 10) left = containerWidth - tooltipWidth - 10;

    setHovered({
      ...seg,
      top: top,
      left: left,
    });
  }

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center" onMouseLeave={() => setHovered(null)}>
      <div className="relative shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="300" height="300">
          {innerSegments.map((s) => (
            <path
              key={`inner-${s.key}`}
              d={arcPath(CENTER, CENTER, INNER_R0, INNER_R1, s.start, s.end)}
              fill={s.color}
              stroke="#1D1D1F"
              strokeWidth="1.5"
              opacity={hovered && hovered.key !== s.key ? 0.35 : 1}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={(e) => showTooltipFor(s, e.currentTarget)}
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
              onMouseEnter={(e) => showTooltipFor(s, e.currentTarget)}
            />
          ))}
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" fill="#F5F5F7" fontSize="26" fontWeight="600" fontFamily="Space Grotesk, sans-serif">
            {organisms.length}
          </text>
          <text x={CENTER} y={CENTER + 15} textAnchor="middle" fill="#98989D" fontSize="11" fontFamily="monospace" letterSpacing="0.5">
            ORGANISMS
          </text>
        </svg>
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
              onMouseEnter={(e) => showTooltipFor(s, e.currentTarget)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors ${
                hovered?.key === s.key ? 'border-accent-blue' : 'border-panel-border'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-mono text-[10px] text-onpanel-muted">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-20 min-w-[160px] rounded-[10px] border border-panel-border bg-panel-raised p-2.5 shadow-panel-lg"
            style={{ 
              top: hovered.top, 
              left: hovered.left,
              maxWidth: '200px',
            }}
          >
            <p className="font-sans text-caption font-semibold text-onpanel-ink truncate">{hovered.label}</p>
            <p className="font-mono text-[11px] text-onpanel-muted">
              {hovered.count.toLocaleString()} samples · {((hovered.count / grandTotal) * 100).toFixed(1)}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SunburstChart;