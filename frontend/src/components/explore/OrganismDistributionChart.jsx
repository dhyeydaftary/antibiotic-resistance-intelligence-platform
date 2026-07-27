// frontend/src/components/explore/OrganismDistributionChart.jsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';

const COLORS = {
  'Escherichia coli': '#0071E3',
  'Enterobacteria spp.': '#30D158',
  'Unknown': '#8E8E93',
  'Proteus mirabilis': '#FF9F0A',
  'Klebsiella pneumoniae': '#FF3B30',
  'Citrobacter spp.': '#5856D6',
  'Morganella morganii': '#FF6B8A',
  'Serratia marcescens': '#64D2FF',
};

function OrganismDistributionChart({ organisms, totalRows }) {
  const [chartData, setChartData] = useState([]);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });

  useEffect(() => {
    if (!organisms || organisms.length === 0) return;
    
    const top8 = organisms.slice(0, 8).map((o) => ({
      name: o.organism,
      value: o.count,
      color: COLORS[o.organism] || '#8E8E93',
      percentage: ((o.count / totalRows) * 100).toFixed(1),
    }));

    if (organisms.length > 8) {
      const othersCount = organisms.slice(8).reduce((sum, o) => sum + o.count, 0);
      top8.push({
        name: 'Others',
        value: othersCount,
        color: '#8E8E93',
        percentage: ((othersCount / totalRows) * 100).toFixed(1),
      });
    }

    setChartData(top8);
  }, [organisms, totalRows]);

  const polarToCartesian = (radius, angle) => ({
    x: 200 + radius * Math.cos(angle - Math.PI / 2),
    y: 200 + radius * Math.sin(angle - Math.PI / 2),
  });

  const getArcPath = (startAngle, endAngle, radius, innerRadius = 0) => {
    const start = polarToCartesian(radius, startAngle);
    const end = polarToCartesian(radius, endAngle);
    const innerStart = polarToCartesian(innerRadius, startAngle);
    const innerEnd = polarToCartesian(innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  const topOrganism = chartData[0];
  const totalValue = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-onpanel-faint">
        <p>No data available</p>
      </div>
    );
  }

  let currentAngle = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Top organism badge */}
      {topOrganism && (
        <div className="mb-4 flex items-center gap-2 rounded-full bg-panel-raised/90 px-3 py-1.5 backdrop-blur-sm w-fit">
          <TrendingUp className="h-3.5 w-3.5 text-accent-blue" />
          <span className="font-mono text-caption text-onpanel-muted">
            Most common: {topOrganism.name} · {topOrganism.percentage}%
          </span>
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.visible && tooltip.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute z-50 rounded-[10px] border border-panel-border bg-panel p-3 shadow-panel-lg"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10,
              pointerEvents: 'none',
            }}
          >
            <p className="font-sans text-small text-onpanel-ink">{tooltip.data.name}</p>
            <p className="font-mono text-caption text-onpanel-muted">
              {tooltip.data.value.toLocaleString()} samples ({tooltip.data.percentage}%)
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="rounded-[20px] bg-panel p-4 relative"
        onMouseLeave={() => {
          setTooltip({ visible: false, x: 0, y: 0, data: null });
          setHoveredSegment(null);
        }}
      >
        <svg width="100%" height="350" viewBox="0 0 400 400" className="mx-auto">
          {/* Donut chart */}
          {chartData.map((d, i) => {
            const angle = (d.value / totalValue) * 2 * Math.PI;
            const start = currentAngle;
            const end = currentAngle + angle;
            const isHovered = hoveredSegment === i;
            const path = getArcPath(start, end, 140, 80);
            currentAngle = end;

            // Calculate label position
            const midAngle = (start + end) / 2;
            const labelRadius = 110;
            const labelX = 200 + labelRadius * Math.cos(midAngle - Math.PI / 2);
            const labelY = 200 + labelRadius * Math.sin(midAngle - Math.PI / 2);

            // Calculate tooltip position
            const tooltipRadius = 100;
            const tooltipX = 200 + tooltipRadius * Math.cos(midAngle - Math.PI / 2);
            const tooltipY = 200 + tooltipRadius * Math.sin(midAngle - Math.PI / 2);

            return (
              <g key={d.name}>
                {/* Segment with hover */}
                <path
                  d={path}
                  fill={d.color}
                  stroke="#1D1D1F"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    filter: isHovered ? 'brightness(1.2)' : 'none',
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: '200px 200px',
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const svgRect = e.currentTarget.closest('svg').getBoundingClientRect();
                    setHoveredSegment(i);
                    setTooltip({
                      visible: true,
                      x: e.clientX - svgRect.left - 100,
                      y: e.clientY - svgRect.top - 100,
                      data: d,
                    });
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const svgRect = e.currentTarget.closest('svg').getBoundingClientRect();
                    setTooltip({
                      visible: true,
                      x: e.clientX - svgRect.left - 100,
                      y: e.clientY - svgRect.top - 100,
                      data: d,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredSegment(null);
                    setTooltip({ visible: false, x: 0, y: 0, data: null });
                  }}
                />
                {/* Percentage label */}
                {parseFloat(d.percentage) > 5 && (
                  <text
                    x={labelX}
                    y={labelY}
                    fill="#F5F5F7"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-mono text-[10px] font-medium pointer-events-none"
                    style={{
                      opacity: isHovered ? 0 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {d.percentage}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Center text */}
          <text
            x="200"
            y="190"
            textAnchor="middle"
            fill="#F5F5F7"
            className="font-display text-xl font-bold pointer-events-none"
          >
            {organisms.length}
          </text>
          <text
            x="200"
            y="210"
            textAnchor="middle"
            fill="#98989D"
            className="font-mono text-[10px] pointer-events-none"
          >
            Organisms
          </text>
        </svg>
      </div>

      {/* Legend with hover effect */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        {chartData.map((d) => (
          <div
            key={d.name}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-all duration-200 cursor-pointer ${
              hoveredSegment !== null && chartData[hoveredSegment]?.name !== d.name
                ? 'border-panel-border opacity-40'
                : 'border-panel-border hover:border-accent-blue/40'
            }`}
            onMouseEnter={() => {
              const index = chartData.findIndex(item => item.name === d.name);
              setHoveredSegment(index);
            }}
            onMouseLeave={() => {
              setHoveredSegment(null);
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="font-mono text-[10px] text-onpanel-muted">
              {d.name}
            </span>
            <span className="font-mono text-[9px] text-onpanel-faint">
              {d.percentage}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default OrganismDistributionChart;