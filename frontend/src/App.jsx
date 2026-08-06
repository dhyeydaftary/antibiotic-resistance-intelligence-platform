// ===================================================================
// UI root, rendered inside main.jsx's providers. Decides the app "shell"
// per route: the landing page and auth pages (login/signup/verify/forgot-
// password) render full-bleed with no Navbar, since AuthLayout supplies
// its own chrome; every other route gets the persistent Navbar. Wraps
// route transitions in framer-motion's AnimatePresence for a fade/slide
// between pages, and mounts the global Toaster (sonner) and
// CommandPalette (Cmd+K) once, outside the animated route tree, so
// neither remounts/flickers on navigation.
//
// Talks to: routes/AppRoutes.jsx (the actual route table),
// components/common/Navbar.jsx, components/common/CommandPalette.jsx.
// ===================================================================
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import Navbar from './components/common/Navbar';
import AppRoutes from './routes/AppRoutes';
import CommandPalette from './components/common/CommandPalette';

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  // Extension point: a new full-bleed, no-Navbar page (its own AuthLayout-
  // style chrome) needs its path added to this list.
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/verify-email' ||
    location.pathname === '/forgot-password';

  // AnimatePresence keyed on pathname re-triggers exit/enter animations on
  // every navigation, producing the fade+slide page transition.
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