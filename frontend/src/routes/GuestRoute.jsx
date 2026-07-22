import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default GuestRoute;