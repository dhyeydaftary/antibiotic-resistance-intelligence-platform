// ===================================================================
// Route guard wrapping every authenticated page in routes/AppRoutes.jsx.
// Blocks render on isCheckingSession (the AuthContext mount-time /me
// validity check) so a guest never sees a flash of protected content
// before the token is confirmed invalid; redirects to /login once
// resolved if there's no valid session. Mirror of GuestRoute.jsx.
// ===================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionCheckLoader from '../components/common/SessionCheckLoader';

// Renders children only for an authenticated user; otherwise redirects to /login.
function ProtectedRoute({ children }) {
  const { isAuthenticated, isCheckingSession } = useAuth();

  if (isCheckingSession) {
    return <SessionCheckLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
