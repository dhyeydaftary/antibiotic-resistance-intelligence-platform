import { Link } from "react-router-dom";

function AuthHeader() {
  return (
    <header
      className="flex items-center justify-between px-6 sm:px-10 h-16 md:h-20 border-b border-hairline bg-paper"
      data-testid="auth-header"
    >
      <Link to="/" className="flex items-center gap-3 group" data-testid="auth-header-logo">
        <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke="#12141A" strokeWidth="1.2" />
          <circle cx="20" cy="20" r="10" stroke="#2C7A6B" strokeWidth="1.2" />
          <circle cx="20" cy="20" r="3" fill="#12141A" />
        </svg>
        <div className="leading-none">
          <div className="font-serif text-lg tracking-tight text-ink">AMR-Insight</div>
          <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-ink/50 mt-0.5">
            Research · v0.9
          </div>
        </div>
      </Link>

      <Link
        to="/"
        className="font-mono-label text-ink-muted hover:text-ink transition-colors"
        data-testid="auth-header-back-home"
      >
        ← Back to home
      </Link>
    </header>
  );
}

export default AuthHeader;