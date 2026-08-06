// A real progress bar: one solid color at a time, and that color itself
// transitions as strength changes (red -> amber -> blue -> green), rather
// than showing every color as a static band.
const STRENGTH_COLOR = {
  0: "#3A3A3C", // empty / neutral
  1: "#FF3B30", // Weak
  2: "#FF9F0A", // Fair
  3: "#0071E3", // Good
  4: "#30D158", // Strong
};

// Renders evaluatePassword()'s strengthIndex (0-4) as a colored progress bar.
export const StrengthMeter = ({ strength = "empty", strengthIndex = 0 }) => {
  const widthPct = (strengthIndex / 4) * 100;
  const color = STRENGTH_COLOR[strengthIndex] ?? STRENGTH_COLOR[0];

  return (
    <div
      className="mt-4 flex items-center gap-3"
      data-testid="password-strength"
      data-strength={strength}
    >
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-border">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${widthPct}%`, backgroundColor: color }}
        />
      </div>
      <span className="min-w-[54px] text-right font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-onpanel-faint">
        {strength === "empty" ? "—" : strength}
      </span>
    </div>
  );
};