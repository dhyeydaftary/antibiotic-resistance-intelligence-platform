import { useId } from "react";
import { Check } from "lucide-react";

export const Checkbox = ({
  checked,
  onCheckedChange,
  label,
  id,
  testId,
  error,
  ...props
}) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="flex items-start gap-3 cursor-pointer group select-none"
      >
        <span className="relative mt-[3px]">
          <input
            id={inputId}
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            data-testid={testId}
            {...props}
          />
          <span
            className={`amr-check-box peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${
              checked
                ? "bg-ink border-ink"
                : "border-ink-faint group-hover:border-ink-soft"
            } ${error ? "border-destructive" : ""}`}
          >
            {checked ? (
              <Check className="w-3 h-3 text-paper" />
            ) : null}
          </span>
        </span>
        <span className="text-[13.5px] leading-snug text-ink-soft group-hover:text-ink transition-colors">
          {label}
        </span>
      </label>
      {error ? (
        <p
          role="alert"
          className="mt-1.5 ml-7 text-[12.5px] text-destructive"
          data-testid={testId ? `${testId}-error` : undefined}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
