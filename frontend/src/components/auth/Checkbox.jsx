import { useId } from "react";
import { Check } from "lucide-react";

export const Checkbox = ({ checked, onCheckedChange, label, id, testId, error, ...props }) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div>
      <label htmlFor={inputId} className="group flex cursor-pointer select-none items-start gap-3">
        <span className="relative mt-[3px]">
          <input
            id={inputId}
            type="checkbox"
            className="peer sr-only"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            data-testid={testId}
            {...props}
          />
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-blue ${checked ? "border-accent-blue bg-accent-blue" : "border-panel-border group-hover:border-onpanel-faint"
              } ${error ? "border-resistant" : ""}`}
          >
            {checked ? <Check className="h-3 w-3 text-white" /> : null}
          </span>
        </span>
        <span className="font-sans text-[13.5px] leading-snug text-onpanel-muted transition-colors group-hover:text-onpanel-ink">
          {label}
        </span>
      </label>
      {error ? (
        <p role="alert" className="ml-7 mt-1.5 font-sans text-[12.5px] text-resistant" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </p>
      ) : null}
    </div>
  );
};