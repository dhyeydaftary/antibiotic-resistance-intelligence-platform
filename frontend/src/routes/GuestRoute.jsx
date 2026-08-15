// ===================================================================
// Route guard wrapping every auth page (login/signup/verify/forgot-
// password) in routes/AppRoutes.jsx. Mirror of ProtectedRoute.jsx:
// redirects an already-authenticated user to /home instead of letting
// them re-visit the login form.
// ===================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionCheckLoader from '../components/common/SessionCheckLoader';

// Renders children only for a guest (no session); otherwise redirects to /home.
function GuestRoute({ children }) {
  const { isAuthenticated, isCheckingSession, isCheckingRedirect } = useAuth();

  // Waits on the same flag ProtectedRoute does: isAuthenticated is
  // presence-based until the check resolves, so without this a stale token
  // would bounce a user landing directly on /login through /home and back.
  // Also waits on isCheckingRedirect: a signInWithRedirect return always
  // lands back on an auth page (Login/Signup are the only pages with social
  // buttons), and without this, a guest with no stored token would see the
  // bare login form flash briefly before AuthContext finishes resolving the
  // pending credential and redirecting them to /home. ProtectedRoute
  // deliberately doesn't check this -- a redirect can never land on a
  // protected page.
  if (isCheckingSession || isCheckingRedirect) {
    return <SessionCheckLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default GuestRoute;
