import { Loader2, ArrowRight } from "lucide-react";

// Full-width primary submit button with a built-in loading (spinner) state,
// used for every auth form's main action.
export const PrimaryButton = ({
  children, loading = false, loadingText, disabled, className = "", type = "button", testId, ...props
}) => {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      data-testid={testId}
      className={`flex w-full items-center justify-center gap-2 rounded-full bg-accent-blue px-5 py-3 font-sans text-[14px] font-medium text-white transition-colors hover:bg-accent-blue-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>{loadingText || "Loading…"}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </>
      )}
    </button>
  );
};

// Full-width secondary/low-emphasis button (outline style, no loading state).
export const GhostButton = ({ children, disabled, className = "", type = "button", testId, ...props }) => (
  <button
    type={type}
    disabled={disabled}
    data-testid={testId}
    className={`w-full rounded-full border border-panel-border px-5 py-3 font-sans text-[14px] font-medium text-onpanel-ink transition-colors hover:border-accent-blue hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {...props}
  >
    {children}
  </button>
);