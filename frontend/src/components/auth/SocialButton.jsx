import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Real, standard Google "G" mark (Google's own four-color identity
// asset, not an approximation) and GitHub's Octocat mark (currentColor,
// so it follows text color like the rest of this button).
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.31 14.32c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.66H1.3C.47 8.24 0 10.06 0 12s.47 3.76 1.3 5.34l4-3.02z" />
            <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.3 6.66l4 3.09c.94-2.84 3.58-4.99 6.7-4.99z" />
        </svg>
    );
}

function GitHubIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="currentColor"
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
        </svg>
    );
}

const ICONS = { google: GoogleIcon, github: GitHubIcon };
const LABELS = { google: "Continue with Google", github: "Continue with GitHub" };

// Static click, not a momentum-carrying gesture -- critically damped
// (bounce: 0), same rule already applied to the hero chart and navbar
// pill: overshoot belongs to drags/flicks, not a press like this one.
const tapSpring = { type: "spring", bounce: 0, duration: 0.25 };

export function SocialButton({ provider, loading, disabled, onClick, testId }) {
    const reduceMotion = useReducedMotion();
    const Icon = ICONS[provider];

    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            data-testid={testId}
            whileTap={reduceMotion || disabled ? undefined : { scale: 0.97 }}
            transition={tapSpring}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-t-white/80 border-x-panel-border border-b-panel-border bg-panel-raised px-5 py-3 font-sans text-[14px] font-medium text-onpanel-ink shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_1px_2px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] duration-200 hover:border-x-accent-blue/40 hover:border-b-accent-blue/40 hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_4px_12px_-4px_rgba(0,0,0,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Connecting…</span>
                </>
            ) : (
                <>
                    <Icon />
                    <span>{LABELS[provider]}</span>
                </>
            )}
        </motion.button>
    );
}