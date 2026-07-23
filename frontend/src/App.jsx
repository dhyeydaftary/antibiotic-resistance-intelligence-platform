import { useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/common/Navbar';
import AuthHeader from './components/common/AuthHeader';
import AppRoutes from './routes/AppRoutes';
import CommandPalette from './components/common/CommandPalette';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/verify-email' ||
    location.pathname === '/forgot-password';

  return (
    <>
      {isAuthPage && <AuthHeader />}
      {!isLandingPage && !isAuthPage && <Navbar />}
      <AppRoutes />
      <CommandPalette />
      <Toaster
        position="top-center"
        toastOptions={{
          unstyled: false,
          className: "!bg-paper !text-ink !border !border-hairline !rounded-none !shadow-none !font-sans",
        }}
      />
    </>
  );
}

export default App;