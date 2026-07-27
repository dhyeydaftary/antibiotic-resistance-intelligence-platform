"use client";;
import { animate, motion } from "motion/react";
import {
  Children,
  isValidElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildArcs,
  buildHoverGrowTargets,
  buildSunburstEnterTiming,
  defaultSunburstGrowPadding,
  maxHoverSegmentThickness,
} from "./sunburst";
import { defaultSunburstColors, opacityForRelativeDepth, SunburstProvider } from "./sunburst-context";

const DEFAULT_HOVER_POP = 8;

function componentDisplayName(child) {
  return ((child.type).displayName ||
  (child.type).name || "");
}

function isDefsComponent(child) {
  const name = componentDisplayName(child);
  return (name.includes("Gradient") ||
  name.includes("Pattern") ||
  name === "LinearGradient" || name === "RadialGradient");
}

function isOutsideSvgComponent(name) {
  return name === "SunburstBreadcrumb" || name === "SunburstHint";
}

function isSunburstSegment(child) {
  return (isValidElement(child) && componentDisplayName(child) === "SunburstSegment");
}

/** Inner rings last so parent segments win hit testing at ring boundaries. */
function sortSunburstSegments(segments, arcs) {
  return [...segments].sort((a, b) => {
    const arcA = arcs[a.props.index];
    const arcB = arcs[b.props.index];
    const depthA = arcA?.depth ?? 0;
    const depthB = arcB?.depth ?? 0;
    if (depthA !== depthB) {
      return depthB - depthA;
    }
    return (b.props.index ?? 0) - (a.props.index ?? 0);
  });
}

const SunburstChartCore = memo(function SunburstChartCore({
  data,
  size = 520,
  playKey = 0,
  className,
  focusId: focusIdProp,
  onFocusChange,
  hoveredIndex: hoveredIndexProp,
  onHoverChange,
  hoverPop = DEFAULT_HOVER_POP,
  padding: paddingProp,
  enterTransition,
  enterStaggerScale = 1,
  children
}) {
  const fullRadius = size / 2;
  const containerRef = useRef(null);
  const { arcs, maxDepth, focusById, rootId } = useMemo(() => buildArcs(data), [data]);

  const growPadding = useMemo(
    () => paddingProp ?? defaultSunburstGrowPadding(maxDepth, size, hoverPop),
    [paddingProp, maxDepth, size, hoverPop]
  );
  const radius = Math.max(8, fullRadius - growPadding);

  const [skipEnterAnimation, setSkipEnterAnimation] = useState(false);
  const [internalHoveredArc, setInternalHoveredArc] = useState(null);
  const [internalHoveredIndex, setInternalHoveredIndex] = useState(null);
  const growRef = useRef(new Map());
  const [growTick, setGrowTick] = useState(0);

  const [internalFocusId, setInternalFocusId] = useState(rootId);
  const [prevFocusId, setPrevFocusId] = useState(rootId);
  const [zoomT, setZoomT] = useState(1);

  const isFocusControlled = focusIdProp !== undefined;
  const focusId = isFocusControlled ? focusIdProp : internalFocusId;

  const isHoverControlled = hoveredIndexProp !== undefined;
  const hoveredArcIndex = isHoverControlled
    ? hoveredIndexProp
    : internalHoveredIndex;
  const hoveredArc = useMemo(() => {
    if (hoveredArcIndex != null) {
      return arcs[hoveredArcIndex] ?? null;
    }
    return internalHoveredArc;
  }, [arcs, hoveredArcIndex, internalHoveredArc]);

  const setHoveredArcIndex = useCallback((index) => {
    if (isHoverControlled) {
      onHoverChange?.(index);
    } else {
      setInternalHoveredIndex(index);
      setInternalHoveredArc(index == null ? null : (arcs[index] ?? null));
    }
  }, [arcs, isHoverControlled, onHoverChange]);

  const setHoveredArc = useCallback((arc) => {
    setHoveredArcIndex(arc ? arc.arcIndex : null);
  }, [setHoveredArcIndex]);

  const setFocusId = useCallback((nextId) => {
    if (isFocusControlled) {
      onFocusChange?.(nextId);
    } else {
      setInternalFocusId(nextId);
    }
  }, [isFocusControlled, onFocusChange]);

  const rootFocus = focusById.get(rootId);
  const focus = focusById.get(focusId) ?? rootFocus;
  const prevFocus = focusById.get(prevFocusId) ?? focus;

  useEffect(() => {
    if (!isFocusControlled) {
      setInternalFocusId(rootId);
    }
    setPrevFocusId(rootId);
    setZoomT(1);
  }, [rootId, isFocusControlled]);

  const enterTiming = useMemo(
    () => buildSunburstEnterTiming(arcs, enterStaggerScale),
    [arcs, enterStaggerScale]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: replay when data or playKey changes
  useEffect(() => {
    setSkipEnterAnimation(typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true);
  }, [playKey, arcs]);

  const prefersReduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const growControls = useRef(null);
  const zoomControls = useRef(null);
  const zoomGen = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: prefersReduced reads matchMedia at call time
  const zoomTo = useCallback((nextId) => {
    if (nextId === focusId) {
      return;
    }
    setHoveredArc(null);
    growControls.current?.stop();
    growRef.current = new Map();
    setGrowTick((n) => n + 1);
    setPrevFocusId(focusId);
    setFocusId(nextId);
    zoomControls.current?.stop();
    const gen = ++zoomGen.current;
    if (prefersReduced()) {
      setZoomT(1);
      return;
    }
    setZoomT(0);
    zoomControls.current = animate(0, 1, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (value) => {
        if (zoomGen.current === gen) {
          setZoomT(value);
        }
      },
      onComplete: () => {
        if (zoomGen.current === gen) {
          setZoomT(1);
          setPrevFocusId(nextId);
        }
      },
    });
  }, [focusId, setFocusId, setHoveredArc]);

  const isDescendant = useCallback((d, ancestorId) =>
    d.id === ancestorId || d.id.startsWith(`${ancestorId} / `), []);

  const isOnHoverPath = useCallback((d, hoveredId) =>
    d.id === hoveredId || hoveredId.startsWith(`${d.id} / `), []);

  const isRelated = useCallback((d) => {
    if (!hoveredArc) {
      return true;
    }
    return (isDescendant(d, hoveredArc.id) || hoveredArc.id.startsWith(`${d.id} / `));
  }, [hoveredArc, isDescendant]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: grow targets from visible hover path
  useEffect(() => {
    const targets =
      hoveredArc && focus
        ? buildHoverGrowTargets(arcs, hoveredArc, focus, maxDepth, radius, hoverPop, isOnHoverPath)
        : new Map();
    const starts = new Map(growRef.current);
    const ids = new Set([...starts.keys(), ...targets.keys()]);

    growControls.current?.stop();

    if (prefersReduced()) {
      growRef.current = targets;
      setGrowTick((n) => n + 1);
      return;
    }

    growControls.current = animate(0, 1, {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (p) => {
        const next = new Map();
        for (const id of ids) {
          const start = starts.get(id) ?? 0;
          const target = targets.get(id) ?? 0;
          const val = start + (target - start) * p;
          if (val > 0.01) {
            next.set(id, val);
          }
        }
        growRef.current = next;
        setGrowTick((n) => n + 1);
      },
    });
    return () => growControls.current?.stop();
  }, [hoveredArc, arcs, hoverPop, isOnHoverPath, focus, maxDepth, radius]);

  const getColor = useCallback((categoryIndex, nodeColor) => {
    if (nodeColor) {
      return nodeColor;
    }
    return defaultSunburstColors[categoryIndex % defaultSunburstColors.length];
  }, []);

  const getFill = useCallback((arcIndex, fillOverride, colorOverride) => {
    if (fillOverride) {
      return fillOverride;
    }
    const arc = arcs[arcIndex];
    if (!arc) {
      return defaultSunburstColors[0];
    }
    return (colorOverride ?? arc.fill ?? arc.color ?? getColor(arc.categoryIndex));
  }, [arcs, getColor]);

  const getFillOpacity = useCallback((relativeDepth, override) =>
    override ?? opacityForRelativeDepth(relativeDepth), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: growTick forces re-read from growRef
  const growAmountForArc = useCallback((arcId) => growRef.current.get(arcId) ?? 0, [growTick]);

  const maxExpandedThickness = useMemo(
    () => maxHoverSegmentThickness(maxDepth, radius, hoverPop),
    [maxDepth, radius, hoverPop]
  );

  if (!(focus && prevFocus)) {
    return null;
  }

  const childArray = Children.toArray(children);
  const defsChildren = childArray.filter(child => isValidElement(child) && isDefsComponent(child));

  const outsideChildren = [];
  const svgChildren = [];

  for (const child of childArray) {
    if (!isValidElement(child)) {
      svgChildren.push(child);
      continue;
    }
    if (isDefsComponent(child)) {
      continue;
    }
    const name = componentDisplayName(child);
    if (isOutsideSvgComponent(name)) {
      outsideChildren.push(child);
    } else {
      svgChildren.push(child);
    }
  }

  const segmentChildren = svgChildren.filter(isSunburstSegment);
  const otherSvgChildren = svgChildren.filter((child) => !isSunburstSegment(child));
  const orderedSegments = sortSunburstSegments(segmentChildren, arcs);
  const orderedSvgChildren = [...orderedSegments, ...otherSvgChildren];

  const providerValue = {
    data,
    arcs,
    focusById,
    rootId,
    maxDepth,
    radius,
    size,
    focus,
    prevFocus,
    focusId,
    zoomTo,
    zoomT,
    enterTiming,
    skipEnterAnimation,
    growAmountForArc,
    getColor,
    getFill,
    getFillOpacity,
    isRelated,
    isDescendant,
    enterTransition,
    enterStaggerScale,
    playKey,
    hoverPop,
    maxExpandedThickness,
    containerRef,
    hoveredArcIndex,
    setHoveredArcIndex,
    hoveredArc,
    setHoveredArc,
  };

  return (
    <SunburstProvider value={providerValue}>
      <div
        className={className}
        ref={containerRef}
        style={{ maxWidth: "100%", width: size }}>
        {outsideChildren.filter((child) =>
          isValidElement(child) &&
          componentDisplayName(child) === "SunburstBreadcrumb")}
        <div
          className="mx-auto w-full"
          style={{ aspectRatio: "1 / 1", maxWidth: size }}>
          <motion.svg
            animate={{ opacity: 1 }}
            aria-label={`Sunburst chart of ${data.name}`}
            initial={{ opacity: 0 }}
            onPointerLeave={() => setHoveredArc(null)}
            role="img"
            style={{ display: "block", overflow: "visible" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            viewBox={`${-fullRadius} ${-fullRadius} ${size} ${size}`}
            width="100%">
            {defsChildren.length > 0 ? <defs>{defsChildren}</defs> : null}
            {orderedSvgChildren}
          </motion.svg>
        </div>
        {outsideChildren.filter((child) =>
          isValidElement(child) &&
          componentDisplayName(child) === "SunburstHint")}
      </div>
    </SunburstProvider>
  );
});

export function SunburstChart(props) {
  return <SunburstChartCore {...props} />;
}

SunburstChart.displayName = "SunburstChart";
