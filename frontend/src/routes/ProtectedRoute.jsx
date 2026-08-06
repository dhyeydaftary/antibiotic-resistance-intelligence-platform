import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SessionCheckLoader from '../components/common/SessionCheckLoader';

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
