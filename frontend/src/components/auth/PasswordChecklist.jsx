import { Check, Minus } from "lucide-react";

export const PasswordChecklist = ({ results, testId }) => (
  <ul
    className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5"
    data-testid={testId}
    aria-label="Password requirements"
  >
    {results.map((r) => (
      <li
        key={r.key}
        className="flex items-center gap-2 text-[12.5px]"
        data-testid={`pw-rule-${r.key}`}
        data-passed={r.passed}
      >
        <span
          className={`inline-flex h-3.5 w-3.5 items-center justify-center border transition-colors ${
            r.passed
              ? "bg-success border-success text-paper"
              : "border-ink-faint text-ink-faint"
          }`}
          aria-hidden="true"
        >
          {r.passed ? (
            <Check className="w-2.5 h-2.5" />
          ) : (
            <Minus className="w-2.5 h-2.5" />
          )}
        </span>
        <span
          className={
            r.passed
              ? "text-ink"
              : "text-ink-muted"
          }
        >
          {r.label}
        </span>
      </li>
    ))}
  </ul>
);
