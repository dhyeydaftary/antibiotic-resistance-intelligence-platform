// ===================================================================
// AreaChart — one of components/charts/'s top-level chart containers
// (visx-based, ~130-file internal library). This whole directory reads
// as generated/vendored component-library code (auto-formatted prop
// ordering, biome lint-ignore annotations, "use client";; double
// semicolons) rather than hand-authored app logic, so only this
// top-level entry point is annotated — internals (chart-phase.js,
// time-series-chart-shell.jsx, the tooltip/ subfolder, etc.) are left
// as-is. Used directly by PredictionResultPage (confidence bars),
// TrendsPage/HomePage (resistance-rate area/line charts).
// AreaChart auto-sizes via visx's ParentSize, reads <Area> children to
// find which data keys to plot, and renders through the shared
// TimeSeriesChartInner (handles axes/grid/tooltip/enter-animation).
// ===================================================================
"use client";;
import { ParentSize } from "@visx/responsive";
import { Children, isValidElement, useCallback, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Area } from "./area";
import { ChartLoadingLabel } from "./chart-loading-label";
import { DEFAULT_CHART_STATUS, DEFAULT_Y_DOMAIN_TWEEN_MS, resolveRestingChartPhase } from "./chart-phase";
import { PatternArea } from "./pattern-area";
import { getResponsiveMargin } from "./responsive-margin";
import { TimeSeriesChartInner } from "./time-series-chart-shell";

const DEFAULT_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };

function extractAreaConfigs(children) {
  const configs = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    const childType = child.type;
    const componentName =
      typeof child.type === "function"
        ? childType.displayName || childType.name || ""
        : "";

    const props = child.props;
    const isPatternArea =
      componentName === "PatternArea" || child.type === PatternArea;
    const isAreaComponent =
      componentName === "Area" ||
      child.type === Area ||
      (props &&
        typeof props.dataKey === "string" &&
        props.dataKey.length > 0 &&
        !isPatternArea);

    if (isAreaComponent && props?.dataKey) {
      configs.push({
        dataKey: props.dataKey,
        stroke: props.stroke || props.fill || "var(--chart-line-primary)",
        strokeWidth: props.strokeWidth || 2,
        yAxisId: props.yAxisId,
      });
    }
  });

  return configs;
}

function ChartInner({
  width,
  height,
  data,
  xDataKey,
  margin,
  animationDuration,
  animationEasing,
  enterTransition,
  revealSignature,
  chartStatus,
  loadingLabel,
  yDomainTweenDuration,
  yDomainTween,
  xDomain,
  xDomainSlotCount,
  tweenYDomainOnXDomainChange,
  children,
  containerRef,
  onPhaseChange
}) {
  const lines = useMemo(() => extractAreaConfigs(children), [children]);

  return (
    <TimeSeriesChartInner
      animationDuration={animationDuration}
      animationEasing={animationEasing}
      chartStatus={chartStatus}
      clipPathId="chart-area-grow-clip"
      containerRef={containerRef}
      data={data}
      enterTransition={enterTransition}
      height={height}
      lines={lines}
      loadingLabel={loadingLabel}
      margin={margin}
      onPhaseChange={onPhaseChange}
      revealSignature={revealSignature}
      tweenYDomainOnXDomainChange={tweenYDomainOnXDomainChange}
      width={width}
      xDataKey={xDataKey}
      xDomain={xDomain}
      xDomainSlotCount={xDomainSlotCount}
      yDomainTween={yDomainTween}
      yDomainTweenDuration={yDomainTweenDuration}>
      {children}
    </TimeSeriesChartInner>
  );
}

export function AreaChart({
  data,
  xDataKey = "date",
  margin: marginProp,
  animationDuration = 1100,
  animationEasing,
  enterTransition,
  revealSignature,
  aspectRatio = "2 / 1",
  className = "",
  status = DEFAULT_CHART_STATUS,
  loadingLabel,
  yDomainTweenDuration = DEFAULT_Y_DOMAIN_TWEEN_MS,
  yDomainTween = true,
  xDomain,
  xDomainSlotCount,
  tweenYDomainOnXDomainChange = false,
  style,
  onPhaseChange,
  children
}) {
  const containerRef = useRef(null);
  const [chartPhase, setChartPhase] = useState(() =>
    resolveRestingChartPhase(status));
  const handlePhaseChange = useCallback((phase) => {
    setChartPhase(phase);
    onPhaseChange?.(phase);
  }, [onPhaseChange]);

  const showLoadingLabel = Boolean(loadingLabel?.trim() &&
    (chartPhase === "loading" ||
      chartPhase === "exiting" ||
      chartPhase === "gridTweenReady" ||
      chartPhase === "revealingLoading"));

  return (
    <div
      className={cn("relative w-full", className)}
      ref={containerRef}
      style={{ aspectRatio, touchAction: "none", ...style }}>
      <ParentSize debounceTime={10}>
        {({ width, height }) => (
          <ChartInner
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            chartStatus={status}
            containerRef={containerRef}
            data={data}
            enterTransition={enterTransition}
            height={height}
            loadingLabel={loadingLabel}
            margin={{ ...getResponsiveMargin(DEFAULT_MARGIN, width), ...marginProp }}
            onPhaseChange={handlePhaseChange}
            revealSignature={revealSignature}
            tweenYDomainOnXDomainChange={tweenYDomainOnXDomainChange}
            width={width}
            xDataKey={xDataKey}
            xDomain={xDomain}
            xDomainSlotCount={xDomainSlotCount}
            yDomainTween={yDomainTween}
            yDomainTweenDuration={yDomainTweenDuration}>
            {children}
          </ChartInner>
        )}
      </ParentSize>
      {showLoadingLabel ? (
        <ChartLoadingLabel exiting={chartPhase !== "loading"} text={loadingLabel} />
      ) : null}
    </div>
  );
}

export { Area } from "./area";

export default AreaChart;
