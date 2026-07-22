import { useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import AuthHeader from './components/common/AuthHeader';
import AppRoutes from './routes/AppRoutes';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <>
      {isAuthPage && <AuthHeader />}
      {!isLandingPage && !isAuthPage && <Navbar />}
      <AppRoutes />
    </>
  );
}

export default App;