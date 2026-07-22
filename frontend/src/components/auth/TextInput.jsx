import { forwardRef, useId } from "react";

export const TextInput = forwardRef(function TextInput(
  {
    label,
    error,
    hint,
    id,
    type = "text",
    className = "",
    testId,
    ...props
  },
  ref,
) {
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
      <input
        ref={ref}
        id={inputId}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        data-testid={testId}
        className={`amr-input ${error ? "amr-input-invalid" : ""}`}
        {...props}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[12.5px] text-destructive"
          data-testid={testId ? `${testId}-error` : undefined}
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-[12.5px] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
