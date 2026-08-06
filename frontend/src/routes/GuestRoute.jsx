import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionCheckLoader from '../components/common/SessionCheckLoader';

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
