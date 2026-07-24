"use client";;
import { BarChart } from "./bar-chart";

const EMPTY_DATA = [];

/**
 * Turnkey loading skeleton for bar charts, a thin shortcut for
 * `<BarChart status="loading" />`. Renders shimmer-swept placeholder bars while
 * data is fetching; swap in a real `<BarChart>` once it resolves.
 */
export function BarChartLoading({
  margin,
  aspectRatio = "2 / 1",
  className = ""
}) {
  return (
    <BarChart
      aspectRatio={aspectRatio}
      className={className}
      data={EMPTY_DATA}
      margin={margin}
      status="loading" />
  );
}

export default BarChartLoading;
