// Shared by the top-level chart containers (area-chart.jsx, line-chart.jsx,
// radar-chart.jsx) whose margin was a single fixed pixel value regardless
// of how narrow the chart's actual container is. A 40px margin on every
// side is fine on desktop, but on a ~280px-wide mobile chart it eats
// nearly the whole plot area -- especially the height, which these charts
// derive from a fixed aspect-ratio times this same narrow width, so 80px
// of vertical margin can leave single-digit pixels of actual plot. For
// radar-chart.jsx specifically, margin isn't four independent sides but a
// single scalar subtracted from the radius on every side at once
// (radius = (size - margin*2)/2) -- shrinking it directly grows the
// radius, which is what actually creates breathing room between the
// axis-label ring's entries (they have no collision avoidance of their
// own, so more circumference per label is the only lever available).
// Both cases share the same underlying single-value scale: box margins
// apply it per side, radar applies it once to the one value it has.
// Scales down toward a floor as the container narrows, rather than
// dropping axis labels/ticks altogether.
const NARROW_WIDTH_FLOOR = 200;
const NARROW_WIDTH_CEILING = 480;
const MIN_MARGIN_PX = 16;

// Linearly interpolates one margin value between its floor (at or below
// NARROW_WIDTH_FLOOR) and its full `base` value (at or above
// NARROW_WIDTH_CEILING). The floor is min(base, MIN_MARGIN_PX), not a
// flat MIN_MARGIN_PX -- a base already smaller than the floor (e.g. a
// caller-tuned 10px top/bottom margin) must interpolate toward its own
// value, not up to 16px, or narrowing the container would perversely
// grow that side's margin.
export function getResponsiveMarginValue(base, width) {
  const floorValue = Math.min(base, MIN_MARGIN_PX);
  if (!width || width >= NARROW_WIDTH_CEILING) return base;
  if (width <= NARROW_WIDTH_FLOOR) return floorValue;
  const t = (width - NARROW_WIDTH_FLOOR) / (NARROW_WIDTH_CEILING - NARROW_WIDTH_FLOOR);
  return Math.round(floorValue + (base - floorValue) * t);
}

// Scales every side of a { top, right, bottom, left } margin object down
// as `width` narrows below NARROW_WIDTH_CEILING. Pass the chart's
// measured container width (from visx's ParentSize) -- not the viewport
// width.
export function getResponsiveMargin(base, width) {
  return {
    top: getResponsiveMarginValue(base.top, width),
    right: getResponsiveMarginValue(base.right, width),
    bottom: getResponsiveMarginValue(base.bottom, width),
    left: getResponsiveMarginValue(base.left, width),
  };
}
