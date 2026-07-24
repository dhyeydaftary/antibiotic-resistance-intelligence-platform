"use client";;
import { cn } from "@/lib/utils";
import {
  chartCenterContainerClassName,
  chartCenterLabelClassName,
  chartCenterValueClassName,
} from "./chart-center-typography";
import { ChartStatFlow, defaultChartStatFlowFormat } from "./chart-stat-flow";
import { useRingHover, useRingStable } from "./ring-context";

/**
 * RingCenter displays content in the center of the ring chart.
 *
 * This component renders as pure HTML (not inside SVG foreignObject) to avoid
 * Safari's WebKit bug #23113 where HTML content with CSS transforms/opacity
 * inside foreignObject renders at incorrect positions.
 *
 * The parent RingChart uses CSS Grid stacking to overlay this HTML content
 * on top of the SVG rings.
 */
export function RingCenter({
  defaultLabel = "Total",
  formatOptions = defaultChartStatFlowFormat,
  children,
  className = "",
  valueClassName = chartCenterValueClassName,
  labelClassName = chartCenterLabelClassName,
  prefix,
  suffix
}) {
  const { data, totalValue, baseInnerRadius } = useRingStable();
  const { hoveredIndex } = useRingHover();

  const hoveredData = hoveredIndex === null ? null : data[hoveredIndex];
  const displayValue = hoveredData ? hoveredData.value : totalValue;
  const displayLabel = hoveredData ? hoveredData.label : defaultLabel;

  // Calculate center area size based on scaled baseInnerRadius
  // Leave some padding so text doesn't touch the inner ring
  const centerSize = baseInnerRadius * 2 - 16;

  // If custom render function is provided, use it
  if (children && hoveredData) {
    return (
      <div
        className={cn(
          chartCenterContainerClassName,
          "flex items-center justify-center",
          className
        )}
        style={{ width: centerSize, height: centerSize }}>
        {children({
          value: displayValue,
          label: displayLabel,
          isHovered: hoveredIndex !== null,
          data: hoveredData,
        })}
      </div>
    );
  }

  // Default center content with NumberFlow animations
  // Now renders as pure HTML, avoiding Safari's foreignObject bugs
  return (
    <div
      className={cn(
        chartCenterContainerClassName,
        "flex flex-col items-center justify-center text-center",
        className
      )}
      style={{ width: centerSize, height: centerSize }}>
      <ChartStatFlow
        formatOptions={formatOptions}
        label={displayLabel}
        labelClassName={labelClassName}
        prefix={prefix}
        suffix={suffix}
        value={displayValue}
        valueClassName={valueClassName} />
    </div>
  );
}

RingCenter.displayName = "RingCenter";

export default RingCenter;
