import { useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import AppRoutes from './routes/AppRoutes';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <>
      {!isLandingPage && <Navbar />}
      <AppRoutes />
    </>
  );
}

export default App;