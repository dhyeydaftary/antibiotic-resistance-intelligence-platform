import { Check } from "lucide-react";

// Compact pill-chip layout instead of a stacked list — wraps into 1-2 lines
// instead of taking up 5 full-width rows. If you had a specific reference
// UI in mind, send it and I'll match it exactly.
export const PasswordChecklist = ({ results = [], testId }) => {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" data-testid={testId}>
      {results.map((r) => (
        <span
          key={r.key}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[11px] transition-colors ${r.passed
              ? "border-susceptible/30 bg-susceptible/10 text-susceptible"
              : "border-panel-border text-onpanel-faint"
            }`}
          data-testid={testId ? `${testId}-${r.key}` : undefined}
        >
          {r.passed && <Check size={10} />}
          {r.label}
        </span>
      ))}
    </div>
  );
};