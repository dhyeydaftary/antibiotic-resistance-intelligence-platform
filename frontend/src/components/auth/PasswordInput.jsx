import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const PasswordInput = forwardRef(function PasswordInput(
  { label = "Password", error, id, testId, className = "", required = false, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
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
      <div className="relative mt-2">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          data-testid={testId}
          className={`w-full rounded-[10px] border bg-panel-raised px-3.5 py-2.5 pr-10 font-sans text-[14px] !text-onpanel-ink outline-none transition-colors placeholder:!text-onpanel-faint focus:border-accent-blue focus:shadow-focus-ring ${error ? "border-resistant" : "border-panel-border"
            }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          data-testid={testId ? `${testId}-toggle` : undefined}
          className="absolute right-3 top-1/2 -translate-y-1/2 !text-onpanel-faint transition-colors hover:text-onpanel-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-2 min-h-[18px]">
        {error ? (
          <p id={errorId} role="alert" className="font-sans text-[12.5px] text-resistant" data-testid={testId ? `${testId}-error` : undefined}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
});