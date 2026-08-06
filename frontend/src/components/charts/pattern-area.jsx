"use client";;
import { curveMonotoneX } from "@visx/curve";
import { AreaClosed } from "@visx/shape";
import { useChartStable } from "./chart-context";

/**
 * Filled area using an SVG pattern (`url(#id)`).
 * Pair with `PatternLines` in `AreaChart` children and an `Area` with `fillOpacity={0}` for the stroke line.
 */
export function PatternArea({
  dataKey,
  fill,
  curve = curveMonotoneX
}) {
  const { renderData, xScale, yScale, xAccessor } = useChartStable();

  return (
    <AreaClosed
      curve={curve}
      data={renderData}
      fill={fill}
      x={(d) => xScale(xAccessor(d)) ?? 0}
      y={(d) => {
        const v = d[dataKey];
        return typeof v === "number" ? (yScale(v) ?? 0) : 0;
      }}
      yScale={yScale} />
  );
}

PatternArea.displayName = "PatternArea";

export default PatternArea;
