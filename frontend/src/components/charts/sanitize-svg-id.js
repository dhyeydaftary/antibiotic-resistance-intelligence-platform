/**
 * SVG element ids get interpolated directly into `url(#id)` paint references.
 * An unquoted `url()` token cannot contain spaces or most punctuation — one
 * bad character there produces a "bad-url-token" that silently falls back to
 * `stroke: none` (fill/stroke just vanish, no console warning). Consumer data
 * keys are often human-readable strings ("Escherichia coli"), so anything
 * built from a `dataKey` must be sanitized before use as an id fragment.
 */
export function sanitizeSvgId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}
