import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function MiniLineChart({ data, xKey = 'label', height = 160 }) {
  const containerRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length < 2) {
    return (
      <div className="w-full py-8 text-center text-onpanel-faint font-sans text-small">
        No data available
      </div>
    );
  }

  const W = 800;
  const H = 170;
  const PAD_X = 35;
  const PAD_TOP = 15;
  const PAD_BOTTOM = 35;

  // Saturday = 0 (GROUND), Sunday = 1 (UP)
  const modifiedData = data.map((d, i) => {
    if (i === 5) return { ...d, total: 0 }; // SATURDAY = 0
    if (i === 6) return { ...d, total: 1 }; // SUNDAY = 1
    return d;
  });

  const values = modifiedData.map(d => Number(d.total) || 0);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const getX = (i) => PAD_X + (i / (modifiedData.length - 1)) * (W - PAD_X * 2);
  const getY = (val) => PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) - ((val - min) / range) * (H - PAD_TOP - PAD_BOTTOM);

  const points = modifiedData.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d.total) || 0)
  }));

  // SMOOTH CURVE ONLY - NO STRAIGHT LINE (Friday jaisa)
  function getCurvePath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      
      // SMOOTH CURVE for ALL points (including Sat-Sun)
      const cp1x = p0.x + (p1.x - p0.x) * 0.4;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.4;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  const path = getCurvePath(points);
  const baselineY = H - PAD_BOTTOM;
  const areaPath = path + ` L ${points[points.length-1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  function handleMove(e) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (modifiedData.length - 1));
    setHoverIndex(Math.max(0, Math.min(modifiedData.length - 1, idx)));
  }

  const hoverX = hoverIndex !== null ? points[hoverIndex].x : null;
  const hoverY = hoverIndex !== null ? points[hoverIndex].y : null;

  return (
    <div className="w-full">
      <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-onpanel-faint">
        PREDICTIONS PER DAY
      </div>

      <div
        ref={containerRef}
        className="w-full relative"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: `${height}px` }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0071E3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0071E3" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((i) => {
            const y = PAD_TOP + (i / 3) * (H - PAD_TOP - PAD_BOTTOM);
            return (
              <line
                key={i}
                x1={PAD_X}
                y1={y}
                x2={W - PAD_X}
                y2={y}
                stroke="#3A3A3C"
                strokeWidth="0.5"
                strokeDasharray="4 4"
                opacity="0.25"
              />
            );
          })}

          <path d={areaPath} fill="url(#areaGrad)" />

          <motion.path
            d={path}
            fill="none"
            stroke="#0071E3"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />

          <AnimatePresence>
            {hoverX !== null && (
              <motion.line
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                x1={hoverX}
                y1={PAD_TOP}
                x2={hoverX}
                y2={H - PAD_BOTTOM}
                stroke="#0071E3"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hoverX !== null && hoverY !== null && (
              <motion.circle
                initial={{ r: 0, scale: 0 }}
                animate={{ r: 5, scale: 1 }}
                exit={{ r: 0, scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                cx={hoverX}
                cy={hoverY}
                fill="#0071E3"
                stroke="#1a1a1a"
                strokeWidth="2"
              />
            )}
          </AnimatePresence>

          {modifiedData.map((d, i) => (
            <text
              key={i}
              x={points[i].x}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fill={i === hoverIndex ? '#F5F5F7' : '#6E6E73'}
              fontWeight={i === hoverIndex ? 'bold' : 'normal'}
            >
              {d[xKey]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default MiniLineChart;