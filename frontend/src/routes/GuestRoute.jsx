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
  const { isAuthenticated, isCheckingSession } = useAuth();

  // Waits on the same flag ProtectedRoute does: isAuthenticated is
  // presence-based until the check resolves, so without this a stale token
  // would bounce a user landing directly on /login through /home and back.
  if (isCheckingSession) {
    return <SessionCheckLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default GuestRoute;
