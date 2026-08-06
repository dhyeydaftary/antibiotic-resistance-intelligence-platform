// UNUSED FILE — grep confirms neither CapabilityRow nor the default
// export is imported anywhere. AboutTrustBoundary + ComparisonPanel.jsx
// implement the actual capability/boundary list rendering; this appears
// to be an earlier draft.
import AboutTrustBoundary from './AboutTrustBoundary';

// A single checkmark/dash list row (positive vs. neutral tone).
export function CapabilityRow({ children, tone = 'positive' }) {
    return (
        <li className="flex items-start gap-3 py-3">
            <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    tone === 'positive'
                        ? 'border-accent-blue/30 bg-accent-blue/[0.08] text-accent-blue'
                        : 'border-canvas-hairline bg-canvas-alt text-page-faint'
                }`}
                aria-hidden="true"
            >
                {tone === 'positive' ? '✓' : '–'}
            </span>
            <span className="font-sans text-[14px] leading-[1.6] text-page-muted">
                {children}
            </span>
        </li>
    );
}

export default function AboutCapabilityList() {
    return <AboutTrustBoundary />;
}