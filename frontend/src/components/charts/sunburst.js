const TOP = -Math.PI / 2;
const TWO_PI = 2 * Math.PI;
const ID_SEP = " / ";
/** Drill-down navigation hub is smaller than one ring to leave room for hover grow. */
const DRILL_CENTER_SCALE = 0.65;
/** Extra hub shrink per focus level beyond the first drill. */
const DRILL_CENTER_DEPTH_SHRINK = 0.08;
/** Max total radial hover grow as a fraction of the current ring width. */
const HOVER_GROW_RING_BUDGET = 0.28;
/** Per-segment hover grow cap as a fraction of ring width. */
const HOVER_GROW_SEGMENT_CAP = 0.1;

function nodeId(parentId, name) {
  return parentId ? `${parentId}${ID_SEP}${name}` : name;
}

export function sumValues(node) {
  if (node.children?.length) {
    return node.children.reduce((sum, child) => sum + sumValues(child), 0);
  }
  return node.value ?? 0;
}

function layoutNode(
  node,
  id,
  depth,
  a0,
  a1,
  parentId,
  categoryIndex,
  trail,
  ctx
) {
  const value = sumValues(node);
  const hasChildren = Boolean(node.children?.length);

  if (depth > 0) {
    ctx.arcs.push({
      id,
      name: node.name,
      depth,
      value,
      categoryIndex,
      hasChildren,
      trail: [...trail, node.name],
      parentId,
      a0,
      a1,
      arcIndex: ctx.arcIndex,
      color: node.color,
      fill: node.fill,
    });
    ctx.arcIndex += 1;
  }

  ctx.focusById.set(id, {
    id,
    name: node.name,
    depth,
    parentId,
    categoryIndex,
    a0,
    a1,
  });
  ctx.maxDepth = Math.max(ctx.maxDepth, depth);

  if (!(hasChildren && node.children?.length)) {
    return;
  }

  const span = a1 - a0;
  let cursor = a0;
  for (const [index, child] of node.children.entries()) {
    const childValue = sumValues(child);
    const childSpan = value > 0 ? (childValue / value) * span : 0;
    const childId = nodeId(id, child.name);
    const childCategory = depth === 0 ? index : categoryIndex;
    layoutNode(
      child,
      childId,
      depth + 1,
      cursor,
      cursor + childSpan,
      id,
      childCategory,
      depth === 0 ? [node.name] : trail,
      ctx
    );
    cursor += childSpan;
  }
}

function toRadians(normalized) {
  return TOP + normalized * TWO_PI;
}

export function buildArcs(data) {
  const rootId = data.name;
  const ctx = {
    arcs: [],
    focusById: new Map(),
    maxDepth: 0,
    rootId,
    arcIndex: 0,
  };

  layoutNode(data, rootId, 0, 0, 1, null, 0, [], ctx);

  for (const arc of ctx.arcs) {
    arc.a0 = toRadians(arc.a0);
    arc.a1 = toRadians(arc.a1);
  }
  for (const focus of ctx.focusById.values()) {
    focus.a0 = toRadians(focus.a0);
    focus.a1 = toRadians(focus.a1);
  }

  return {
    arcs: ctx.arcs,
    maxDepth: ctx.maxDepth,
    total: sumValues(data),
    focusById: ctx.focusById,
    rootId,
  };
}

export function ringOptions(
  focusDepth,
  maxDepth,
  radius
) {
  const oneLevelCenterR = radius / maxDepth;
  if (focusDepth === 0) {
    // Root view — segments fill from the center, no navigation hub gap.
    return { centerR: 0, ringWidth: oneLevelCenterR };
  }
  // Hub shrinks on drill-down; shrinks further when focus moves deeper.
  const depthPastFirstDrill = Math.max(0, focusDepth - 1);
  const centerScale = Math.max(0.45, DRILL_CENTER_SCALE - depthPastFirstDrill * DRILL_CENTER_DEPTH_SHRINK);
  const centerR = oneLevelCenterR * centerScale;
  const visibleRings = Math.max(1, maxDepth - focusDepth);
  const ringWidth = (radius - centerR) / visibleRings;
  return { centerR, ringWidth };
}

export function geometryFor(arc, focus, maxDepth, radius) {
  if (arc.depth <= focus.depth) {
    return null;
  }
  if (arc.id !== focus.id && !arc.id.startsWith(`${focus.id}${ID_SEP}`)) {
    return null;
  }

  const { centerR, ringWidth } = ringOptions(focus.depth, maxDepth, radius);
  const relativeDepth = arc.depth - focus.depth;
  const focusSpan = focus.a1 - focus.a0;
  const mapAngle = (angle) => {
    if (focusSpan <= 1e-9) {
      return TOP;
    }
    return TOP + ((angle - focus.a0) / focusSpan) * TWO_PI;
  };

  return {
    a0: mapAngle(arc.a0),
    a1: mapAngle(arc.a1),
    innerR: centerR + (relativeDepth - 1) * ringWidth,
    outerR: centerR + relativeDepth * ringWidth,
  };
}

export function lerpGeometry(from, to, progress) {
  const t = Math.min(1, Math.max(0, progress));
  const fromMid = (from.a0 + from.a1) / 2;
  const toMid = (to.a0 + to.a1) / 2;
  const fromHalf = (from.a1 - from.a0) / 2;
  const toHalf = (to.a1 - to.a0) / 2;
  const mid = lerpAngle(fromMid, toMid, t);
  const half = fromHalf + (toHalf - fromHalf) * t;

  return {
    a0: mid - half,
    a1: mid + half,
    innerR: from.innerR + (to.innerR - from.innerR) * t,
    outerR: from.outerR + (to.outerR - from.outerR) * t,
  };
}

function lerpAngle(from, to, progress) {
  let delta = to - from;
  while (delta > Math.PI) {
    delta -= TWO_PI;
  }
  while (delta < -Math.PI) {
    delta += TWO_PI;
  }
  return from + delta * progress;
}

function pointGeometry(source) {
  const mid = (source.a0 + source.a1) / 2;
  const radius = (source.innerR + source.outerR) / 2;
  const pin = Math.max(0, Math.min(radius * 0.12, source.innerR));
  return { a0: mid, a1: mid, innerR: pin, outerR: pin };
}

/** Zoom morph — lerps matching arcs; entering/exiting arcs collapse to a point. */
export function transitionGeometry(arc, fromFocus, toFocus, maxDepth, radius, progress) {
  const from = geometryFor(arc, fromFocus, maxDepth, radius);
  const to = geometryFor(arc, toFocus, maxDepth, radius);

  if (!(from || to)) {
    return null;
  }
  if (from && to) {
    return lerpGeometry(from, to, progress);
  }
  if (from) {
    return lerpGeometry(from, pointGeometry(from), progress);
  }
  if (to) {
    return lerpGeometry(pointGeometry(to), to, progress);
  }
  return null;
}

/** Normalized clockwise angle from 12 o'clock (0 → 1). */
export function clockwiseFraction(angle) {
  let normalized = angle - TOP;
  if (normalized < 0) {
    normalized += TWO_PI;
  }
  return normalized / TWO_PI;
}

/** Matches ring chart expand — each ring/segment grows from the chart center. */
export function buildSunburstEnterTiming(arcs, staggerScale = 1) {
  const scale = Math.max(0.25, staggerScale);
  const byDepth = new Map();

  for (const arc of arcs) {
    const list = byDepth.get(arc.depth) ?? [];
    list.push(arc);
    byDepth.set(arc.depth, list);
  }

  const segmentDelays = new Map();
  let maxDelay = 0;

  for (const [, ringArcs] of byDepth) {
    const sorted = [...ringArcs].sort((a, b) => clockwiseFraction(a.a0) - clockwiseFraction(b.a0));
    const ringIndex = (sorted[0]?.depth ?? 1) - 1;

    for (const [index, arc] of sorted.entries()) {
      const delay = (ringIndex * 0.12 + index * 0.08) * scale;
      segmentDelays.set(arc.id, { delay });
      maxDelay = Math.max(maxDelay, delay);
    }
  }

  return { segmentDelays, maxDelay };
}

/** @deprecated Use buildSunburstEnterTiming */
export function buildRevealSchedule(arcs, staggerScale = 1) {
  const timing = buildSunburstEnterTiming(arcs, staggerScale);
  const ringStarts = new Map();
  for (const arc of arcs) {
    const delays = timing.segmentDelays.get(arc.id);
    if (delays) {
      ringStarts.set(arc.depth, delays.delay);
    }
  }
  return {
    ringStarts,
    ringDuration: 0.6,
    segmentsCompleteAt: timing.maxDelay,
    labelsStart: timing.maxDelay + 0.12,
    labelDuration: 0.2,
  };
}

/** @deprecated Ring sweep reveal — use expand + sweep enter instead. */
export function segmentRevealFromRingSweep(ringProgress, a0, a1) {
  const radial = Math.min(1, Math.max(0, ringProgress));
  const startF = clockwiseFraction(a0);
  const endF = clockwiseFraction(a1);

  if (ringProgress <= startF) {
    return { angular: 0, radial };
  }
  if (ringProgress >= endF) {
    return { angular: 1, radial };
  }
  const angular = (ringProgress - startF) / Math.max(endF - startF, 1e-9);
  return { angular, radial };
}

/** @deprecated Use buildSunburstEnterTiming */
export function buildRevealDelays(arcs) {
  const timing = buildSunburstEnterTiming(arcs);
  const map = new Map();
  for (const arc of arcs) {
    map.set(arc.id, timing.segmentDelays.get(arc.id)?.delay ?? 0);
  }
  return map;
}

export function arcPath(geometry, progress, radialProgress = progress) {
  if (progress <= 0 && radialProgress <= 0) {
    return null;
  }

  const p = Math.min(1, Math.max(0, progress));
  const radialP = Math.min(1, Math.max(0, radialProgress));
  const { a0, a1, innerR, outerR } = geometry;

  if (p >= 1 && radialP >= 1) {
    return arcPathFromGeometry(geometry);
  }

  const span = a1 - a0;

  // Clockwise sweep from the segment's leading edge (matches pie chart enter).
  const currentA0 = a0;
  const currentA1 = a0 + span * p;
  const currentInner = innerR < 1 ? 0 : innerR;
  const currentOuter =
    innerR < 1 ? outerR * radialP : innerR + (outerR - innerR) * radialP;

  return arcPathFromRadii(currentA0, currentA1, currentInner, currentOuter);
}

function arcPathFromGeometry(geometry) {
  const { a0, a1, innerR, outerR } = geometry;
  return arcPathFromRadii(a0, a1, innerR, outerR);
}

function arcPathFromRadii(currentA0, currentA1, currentInner, currentOuter) {
  if (currentOuter - currentInner < 0.5 || currentA1 - currentA0 < 0.001) {
    return null;
  }

  const largeArc = currentA1 - currentA0 > Math.PI ? 1 : 0;
  const outerX0 = Math.sin(currentA0) * currentOuter;
  const outerY0 = -Math.cos(currentA0) * currentOuter;
  const outerX1 = Math.sin(currentA1) * currentOuter;
  const outerY1 = -Math.cos(currentA1) * currentOuter;

  if (currentInner < 1) {
    return `M 0 0 L ${outerX0} ${outerY0} A ${currentOuter} ${currentOuter} 0 ${largeArc} 1 ${outerX1} ${outerY1} Z`;
  }

  const innerX1 = Math.sin(currentA1) * currentInner;
  const innerY1 = -Math.cos(currentA1) * currentInner;
  const innerX0 = Math.sin(currentA0) * currentInner;
  const innerY0 = -Math.cos(currentA0) * currentInner;

  return `M ${outerX0} ${outerY0} A ${currentOuter} ${currentOuter} 0 ${largeArc} 1 ${outerX1} ${outerY1} L ${innerX1} ${innerY1} A ${currentInner} ${currentInner} 0 ${largeArc} 0 ${innerX0} ${innerY0} Z`;
}

export function centroidAngle(arc) {
  return (arc.a0 + arc.a1) / 2;
}

export function geomCentroidAngle(geometry) {
  return (geometry.a0 + geometry.a1) / 2;
}

export function geomCentroidRadius(geometry) {
  return (geometry.innerR + geometry.outerR) / 2;
}

/** Visible path length from focus to hovered arc (in ring count). */
export function visibleHoverPathLength(hoveredDepth, focusDepth) {
  return Math.max(1, hoveredDepth - focusDepth);
}

/** Scale hover grow so deep paths and wide drill-down rings stay within budget. */
export function hoverGrowForPathSegment(hoverPop, ringWidth, pathLength) {
  const maxTotalGrow = ringWidth * HOVER_GROW_RING_BUDGET;
  const budgetPerSegment = maxTotalGrow / pathLength;
  const perSegmentCap = ringWidth * HOVER_GROW_SEGMENT_CAP;
  return Math.min(hoverPop, perSegmentCap, budgetPerSegment);
}

/**
 * Max radial thickness for a hovered segment — matches one expanded ring at the
 * first drill level (e.g. Enterprise under Product).
 */
export function maxHoverSegmentThickness(maxDepth, radius, hoverPop, referenceFocusDepth = 1) {
  const { ringWidth } = ringOptions(referenceFocusDepth, maxDepth, radius);
  const grow = hoverGrowForPathSegment(hoverPop, ringWidth, 1);
  return ringWidth + grow;
}

export function buildHoverGrowTargets(arcs, hoveredArc, focus, maxDepth, radius, hoverPop, isOnHoverPath) {
  const targets = new Map();
  const { ringWidth } = ringOptions(focus.depth, maxDepth, radius);
  const pathLength = visibleHoverPathLength(hoveredArc.depth, focus.depth);
  const segmentGrow = hoverGrowForPathSegment(hoverPop, ringWidth, pathLength);
  const maxExpandedThickness = maxHoverSegmentThickness(maxDepth, radius, hoverPop);

  for (const d of arcs) {
    if (!isOnHoverPath(d, hoveredArc.id) || d.depth <= focus.depth) {
      continue;
    }
    const base = geometryFor(d, focus, maxDepth, radius);
    const baseThickness = base
      ? base.outerR - base.innerR
      : maxExpandedThickness;
    const allowedGrow =
      baseThickness >= maxExpandedThickness
        ? 0
        : Math.min(segmentGrow, maxExpandedThickness - baseThickness);
    targets.set(d.id, allowedGrow);
  }

  return targets;
}

/** Inset reserved around the drawable chart so hover growth stays inside the view box. */
export function defaultSunburstGrowPadding(maxDepth, size, hoverPop) {
  const fullRadius = size / 2;
  const rootRingWidth = fullRadius / Math.max(1, maxDepth);
  const pathLength = Math.max(1, maxDepth - 1);
  const segmentGrow = hoverGrowForPathSegment(hoverPop, rootRingWidth, pathLength);
  return Math.ceil(segmentGrow * pathLength + segmentGrow);
}

/** Sum of hover grow from ancestors on the path to this arc (excludes self). */
export function ancestorGrowOffset(arcId, growAmountForArc) {
  const parts = arcId.split(ID_SEP);
  let push = 0;
  for (let i = 1; i < parts.length; i++) {
    push += growAmountForArc(parts.slice(0, i).join(ID_SEP));
  }
  return push;
}

/** Shift descendants outward and expand the hovered segment on its outer edge. */
export function applyHoverGrow(base, arcId, growAmountForArc, maxExpandedThickness) {
  const push = ancestorGrowOffset(arcId, growAmountForArc);
  const ownGrow = growAmountForArc(arcId);
  if (push <= 0 && ownGrow <= 0) {
    return base;
  }

  const baseThickness = base.outerR - base.innerR;
  if (baseThickness >= maxExpandedThickness) {
    if (push <= 0) {
      return base;
    }
    return {
      ...base,
      innerR: base.innerR + push,
      outerR: base.outerR + push,
    };
  }

  const innerR = base.innerR + push;
  let outerR = base.outerR + push + ownGrow;
  const thickness = outerR - innerR;
  if (thickness > maxExpandedThickness) {
    outerR = innerR + maxExpandedThickness;
  }

  return {
    ...base,
    innerR,
    outerR,
  };
}

export function localProgress(progress, delay, duration) {
  if (progress <= delay) {
    return 0;
  }
  if (duration <= 0) {
    return 1;
  }
  return Math.min(1, (progress - delay) / duration);
}
