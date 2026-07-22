// Minimal editorial banner. No saturated alert colors — deep ink for errors,
// muted forest for success. Sits above form, hairline framed.

export const Banner = ({ tone = "error", title, description, testId }) => {
  const toneClass =
    tone === "success"
      ? "border-success text-success"
      : tone === "info"
        ? "border-ink-faint text-ink-soft"
        : "border-destructive text-destructive";

  const label =
    tone === "success" ? "SUCCESS" : tone === "info" ? "NOTICE" : "ERROR";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      className={`border-l-2 ${toneClass} pl-3 py-2`}
    >
      <p className="font-mono-label opacity-80">{label}</p>
      <p className="mt-1 text-[13.5px] leading-snug text-ink">
        {title}
      </p>
      {description ? (
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
};
