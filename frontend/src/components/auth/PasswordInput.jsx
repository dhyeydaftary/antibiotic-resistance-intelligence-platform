import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const PasswordInput = forwardRef(function PasswordInput(
  { label = "Password", error, id, testId, className = "", ...props },
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
        className="font-mono-label text-ink-muted block"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          data-testid={testId}
          className={`amr-input pr-8 ${error ? "amr-input-invalid" : ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          data-testid={testId ? `${testId}-toggle` : undefined}
          className="absolute right-0 bottom-2 text-ink-muted hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring p-1 transition-colors"
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[12.5px] text-destructive"
          data-testid={testId ? `${testId}-error` : undefined}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});
