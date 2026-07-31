import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import Navbar from './components/common/Navbar';
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

  const routesWithTransition = (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppRoutes />
      </motion.div>
    </AnimatePresence>
  );

  // Auth pages now render as a single, self-contained page via AuthLayout
  // (which includes its own "Back to home" link) — no separate top bar
  // stacked above it anymore.
  if (isLandingPage || isAuthPage) {
    return (
      <>
        {routesWithTransition}
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

  return (
    <>
      <div className="min-h-screen bg-canvas">
        <Navbar />
        {routesWithTransition}
      </div>
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