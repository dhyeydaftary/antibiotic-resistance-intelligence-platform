import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// Matches PredictionInputPage's error box exactly: simple rounded border +
// tinted background + icon, no uppercase label, no left-accent bar.
const TONE_CONFIG = {
  success: { icon: CheckCircle2, border: "border-susceptible/25", bg: "bg-susceptible/10", text: "text-susceptible" },
  info: { icon: Info, border: "border-accent-blue/25", bg: "bg-accent-blue/10", text: "text-accent-blue" },
  error: { icon: AlertCircle, border: "border-resistant/25", bg: "bg-resistant/10", text: "text-resistant" },
};

// Inline success/info/error message box used for global form-level
// feedback across every auth page (e.g. "invalid credentials", "code sent").
export const Banner = ({ tone = "error", title, description, testId }) => {
  const t = TONE_CONFIG[tone] || TONE_CONFIG.error;
  const Icon = t.icon;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      className={`flex items-start gap-2.5 rounded-[10px] border ${t.border} ${t.bg} px-4 py-3`}
    >
      <Icon size={16} className={`mt-0.5 shrink-0 ${t.text}`} />
      <div>
        <p className={`font-sans text-[13px] ${t.text}`}>{title}</p>
        {description ? (
          <p className="mt-0.5 font-sans text-[12px] text-onpanel-muted">{description}</p>
        ) : null}
      </div>
    </div>
  );
};