import { forwardRef, useId } from "react";

export const TextInput = forwardRef(function TextInput(
  { label, error, hint, id, type = "text", className = "", testId, required = false, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={`relative ${className}`}>
      <label
        htmlFor={inputId}
        className="block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-onpanel-faint"
      >
        {label}
        {required && <span className="ml-0.5 text-resistant" aria-hidden="true">*</span>}
      </label>
      <input
        ref={ref}
        id={inputId}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        data-testid={testId}
        className={`mt-2 w-full rounded-[10px] border bg-panel-raised px-3.5 py-2.5 font-sans text-[14px] !text-onpanel-ink outline-none transition-colors placeholder:!text-onpanel-faint focus:border-accent-blue focus:shadow-focus-ring ${error ? "border-resistant" : "border-panel-border"
          }`}
        {...props}
      />
      <div className="mt-2 min-h-[18px]">
        {error ? (
          <p id={errorId} role="alert" className="font-sans text-[12.5px] text-resistant" data-testid={testId ? `${testId}-error` : undefined}>
            {error}
          </p>
        ) : hint ? (
          <p className="font-sans text-[12.5px] text-onpanel-faint">{hint}</p>
        ) : null}
      </div>
    </div>
  );
});