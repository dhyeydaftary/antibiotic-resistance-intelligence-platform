import { Loader2 } from 'lucide-react';

// Shown by ProtectedRoute/GuestRoute while the app-mount session-validity
// check (AuthContext's isCheckingSession) is in flight. Rendered before
// either an auth-themed page (login/signup) or a dashboard-themed page is
// known, so it deliberately stays theme-neutral (bg-canvas, page-ink),
// matching ErrorBoundary.jsx's top-level fallback rather than the
// dark-panel-specific skeletons in Skeletons.jsx.
function SessionCheckLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Loader2 className="h-5 w-5 animate-spin text-page-muted" aria-hidden="true" />
      <span className="sr-only">Checking your session…</span>
    </div>
  );
}

export default SessionCheckLoader;
