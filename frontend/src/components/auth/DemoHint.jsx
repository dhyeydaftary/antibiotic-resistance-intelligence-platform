// Small editorial hint block explaining mock demo credentials so any
// state can be exercised. Hairline-only, monospace, no bright chrome.
export const DemoHint = ({ children, testId = "demo-hint" }) => (
  <details
    className="mt-10 border-t hairline pt-4 group"
    data-testid={testId}
  >
    <summary className="cursor-pointer font-mono-label text-ink-muted hover:text-ink flex items-center justify-between list-none">
      <span>DEMO CREDENTIALS &nbsp;·&nbsp; MOCK API</span>
      <span aria-hidden="true" className="opacity-60 group-open:rotate-45 transition-transform">
        +
      </span>
    </summary>
    <div className="mt-3 text-[12.5px] leading-relaxed text-ink-muted font-[IBM_Plex_Mono] space-y-1">
      {children}
    </div>
  </details>
);
