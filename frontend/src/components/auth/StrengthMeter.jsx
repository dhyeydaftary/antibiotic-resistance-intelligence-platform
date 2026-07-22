// Restrained 4-segment strength indicator. No loud gradients.
export const StrengthMeter = ({ strength = "empty", strengthIndex = 0 }) => {
  const segments = [1, 2, 3, 4];
  const fill = "#12141A"; // ink
  const empty = "#DFDAD0"; // hairline
  return (
    <div
      className="mt-4 flex items-center justify-between gap-4"
      data-testid="password-strength"
      data-strength={strength}
    >
      <div className="flex-1 grid grid-cols-4 gap-1.5">
        {segments.map((s) => (
          <span
            key={s}
            aria-hidden="true"
            className="h-[3px]"
            style={{ background: s <= strengthIndex ? fill : empty }}
          />
        ))}
      </div>
      <span className="font-mono-label text-ink-muted min-w-[54px] text-right">
        {strength === "empty" ? "—" : strength}
      </span>
    </div>
  );
};
