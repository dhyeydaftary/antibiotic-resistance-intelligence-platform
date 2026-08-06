"use client";;
import {
  PatternCircles as VisxPatternCircles,
  PatternHexagons as VisxPatternHexagons,
  PatternLines as VisxPatternLines,
  PatternWaves as VisxPatternWaves,
} from "@visx/pattern";

export function PatternLines(props) {
  return <VisxPatternLines {...props} />;
}
PatternLines.displayName = "PatternLines";

export function PatternCircles(
  props
) {
  return <VisxPatternCircles {...props} />;
}
PatternCircles.displayName = "PatternCircles";

export function PatternWaves(props) {
  return <VisxPatternWaves {...props} />;
}
PatternWaves.displayName = "PatternWaves";

export function PatternHexagons(
  props
) {
  return <VisxPatternHexagons {...props} />;
}
PatternHexagons.displayName = "PatternHexagons";
