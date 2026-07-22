import { Loader2 } from "lucide-react";

export const PrimaryButton = ({
  children,
  loading = false,
  loadingText,
  disabled,
  className = "",
  type = "button",
  testId,
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      data-testid={testId}
      className={`amr-btn w-full ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          <span>{loadingText || "Loading…"}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <span aria-hidden="true" className="opacity-60">
            →
          </span>
        </>
      )}
    </button>
  );
};

export const GhostButton = ({
  children,
  disabled,
  className = "",
  type = "button",
  testId,
  ...props
}) => (
  <button
    type={type}
    disabled={disabled}
    data-testid={testId}
    className={`amr-btn-ghost ${className}`}
    {...props}
  >
    {children}
  </button>
);
