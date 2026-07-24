"use client";;
import { createContext, useContext, useMemo } from "react";

// CSS variable references for ring chart theming
export const ringCssVars = {
  background: "var(--chart-background)",
  foreground: "var(--chart-foreground)",
  foregroundMuted: "var(--chart-foreground-muted)",
  label: "var(--chart-label)",
  ringBackground: "var(--border)",
  // Default ring colors from chart palette
  ring1: "var(--chart-1)",
  ring2: "var(--chart-2)",
  ring3: "var(--chart-3)",
  ring4: "var(--chart-4)",
  ring5: "var(--chart-5)",
};

// Default ring color palette
export const defaultRingColors = [
  ringCssVars.ring1,
  ringCssVars.ring2,
  ringCssVars.ring3,
  ringCssVars.ring4,
  ringCssVars.ring5,
];

const RingStableContext = createContext(null);
const RingHoverContext = createContext(null);

export function RingProvider({
  children,
  value
}) {
  const stable = useMemo(() => ({
    data: value.data,
    size: value.size,
    center: value.center,
    strokeWidth: value.strokeWidth,
    ringGap: value.ringGap,
    baseInnerRadius: value.baseInnerRadius,
    animationKey: value.animationKey,
    isLoaded: value.isLoaded,
    enterTransition: value.enterTransition,
    enterStaggerScale: value.enterStaggerScale,
    containerRef: value.containerRef,
    totalValue: value.totalValue,
    getColor: value.getColor,
    getRingRadii: value.getRingRadii,
    startAngle: value.startAngle,
    endAngle: value.endAngle,
    geometryScrubbing: value.geometryScrubbing,
  }), [
    value.data,
    value.size,
    value.center,
    value.strokeWidth,
    value.ringGap,
    value.baseInnerRadius,
    value.animationKey,
    value.isLoaded,
    value.enterTransition,
    value.enterStaggerScale,
    value.containerRef,
    value.totalValue,
    value.getColor,
    value.getRingRadii,
    value.startAngle,
    value.endAngle,
    value.geometryScrubbing,
  ]);

  const hover = useMemo(() => ({
    hoveredIndex: value.hoveredIndex,
    setHoveredIndex: value.setHoveredIndex,
  }), [value.hoveredIndex, value.setHoveredIndex]);

  return (
    <RingStableContext.Provider value={stable}>
      <RingHoverContext.Provider value={hover}>
        {children}
      </RingHoverContext.Provider>
    </RingStableContext.Provider>
  );
}

export function useRingStable() {
  const context = useContext(RingStableContext);
  if (!context) {
    throw new Error("useRingStable must be used within a RingProvider. " +
      "Make sure your component is wrapped in <RingChart>.");
  }
  return context;
}

export function useRingHover() {
  const context = useContext(RingHoverContext);
  if (!context) {
    throw new Error("useRingHover must be used within a RingProvider. " +
      "Make sure your component is wrapped in <RingChart>.");
  }
  return context;
}

export function useRing() {
  return { ...useRingStable(), ...useRingHover() };
}

export default RingStableContext;
