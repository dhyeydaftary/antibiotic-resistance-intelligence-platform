import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/predict', label: 'Predict' },
  { to: '/history', label: 'History' },
  { to: '/trends', label: 'Trends' },
  { to: '/explore', label: 'Explore' },
];

// Menu/tab selection is a static click, not a drag or flick -- per the
// design system's rule that overshoot is reserved for momentum-carrying
// gestures, this pill settles with zero bounce rather than the slight
// (~0.8 damping-ratio) overshoot it had before.
const pillSpring = { type: 'spring', bounce: 0, duration: 0.35 };
const tapFeedback = { scale: 0.96 };

// ===================================================================
// Persistent top nav, rendered by App.jsx on every route except the
// landing page and auth pages (which use their own chrome). Auth-aware:
// shows Login/Signup for a guest, or the 5 app links + Logout for an
// authenticated user, with an animated pill (framer-motion layoutId)
// following the active route.
//
// Below md (768px) the full link row and Logout button don't fit the
// pill's width (5 links + logo + logout has a min-content width well
// past a phone viewport), so they're replaced by a hamburger trigger
// that opens a stacked dropdown -- same pattern as
// components/landing/Header.jsx's mobile menu, adapted to this
// component's pill chrome and auth-aware link set.
// ===================================================================
function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Clears auth state and returns the user to the landing page.
  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/');
  }

  return (
    <div className="relative z-40 flex justify-center px-4 pt-4">
      <div className="w-full max-w-3xl">
        <nav className="flex w-full items-center gap-1 rounded-full border border-t-white border-x-canvas-hairline/70 border-b-canvas-hairline bg-white/90 px-3 py-2 shadow-panel-md backdrop-blur-xl backdrop-saturate-150">
          <motion.div whileTap={reduceMotion ? undefined : tapFeedback} transition={{ duration: 0.12 }}>
            <Link
              to={isAuthenticated ? '/home' : '/'}
              className="flex items-center gap-2 rounded-full px-2 py-1.5 pr-3 transition-colors hover:bg-white/50"
            >
              <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="18" stroke="#1D1D1F" strokeWidth="1.4" />
                <circle cx="20" cy="20" r="10" stroke="#0071E3" strokeWidth="1.4" />
                <circle cx="20" cy="20" r="3" fill="#1D1D1F" />
              </svg>
              <span className="font-display text-[15px] font-semibold text-page-ink">AMR-Insight</span>
            </Link>
          </motion.div>

          <div className="mx-1 hidden h-5 w-px bg-page-ink/10 md:block" />

          <div className="hidden flex-1 items-center gap-1 md:flex">
            {!isAuthenticated ? (
              <>
                <motion.div whileTap={reduceMotion ? undefined : tapFeedback} transition={{ duration: 0.12 }} className="ml-auto">
                  <NavLink
                    to="/login"
                    className="block rounded-full px-4 py-2 font-sans text-[14px] font-medium text-page-ink transition-colors hover:bg-white/80"
                  >
                    Login
                  </NavLink>
                </motion.div>
                <motion.div whileTap={reduceMotion ? undefined : tapFeedback} transition={{ duration: 0.12 }}>
                  <NavLink
                    to="/signup"
                    className="block rounded-full bg-accent-blue px-4 py-2 font-sans text-[14px] font-medium text-white transition-colors hover:bg-accent-blue-hover"
                  >
                    Sign up
                  </NavLink>
                </motion.div>
              </>
            ) : (
              LINKS.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <motion.div key={link.to} whileTap={reduceMotion ? undefined : tapFeedback} transition={{ duration: 0.12 }}>
                    <NavLink
                      to={link.to}
                      className="relative block rounded-full px-4 py-2 font-sans text-[14px] font-medium transition-colors"
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-active-pill"
                          className="absolute inset-0 rounded-full bg-page-ink"
                          transition={reduceMotion ? { duration: 0 } : pillSpring}
                        />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-white' : 'text-page-muted hover:text-page-ink'}`}>
                        {link.label}
                      </span>
                    </NavLink>
                  </motion.div>
                );
              })
            )}
          </div>

          {isAuthenticated && (
            <motion.button
              whileTap={reduceMotion ? undefined : tapFeedback}
              transition={{ duration: 0.12 }}
              onClick={handleLogout}
              className="mr-1 hidden rounded-full px-4 py-2 font-sans text-[14px] font-medium text-page-muted transition-colors hover:bg-white/80 hover:text-page-ink md:block"
            >
              Logout
            </motion.button>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-page-ink transition-colors hover:bg-white/80 md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden md:hidden"
            >
              <div className="mt-2 flex flex-col gap-1 rounded-3xl border border-canvas-hairline bg-white/95 p-3 shadow-panel-md backdrop-blur-xl">
                {!isAuthenticated ? (
                  <>
                    <NavLink
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="rounded-2xl px-4 py-2.5 font-sans text-[15px] font-medium text-page-ink transition-colors hover:bg-canvas-alt"
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      onClick={() => setOpen(false)}
                      className="rounded-2xl bg-accent-blue px-4 py-2.5 text-center font-sans text-[15px] font-medium text-white transition-colors hover:bg-accent-blue-hover"
                    >
                      Sign up
                    </NavLink>
                  </>
                ) : (
                  <>
                    {LINKS.map((link) => {
                      const isActive = location.pathname === link.to;
                      return (
                        <NavLink
                          key={link.to}
                          to={link.to}
                          onClick={() => setOpen(false)}
                          className={`rounded-2xl px-4 py-2.5 font-sans text-[15px] font-medium transition-colors ${
                            isActive ? 'bg-page-ink text-white' : 'text-page-muted hover:bg-canvas-alt hover:text-page-ink'
                          }`}
                        >
                          {link.label}
                        </NavLink>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl px-4 py-2.5 text-left font-sans text-[15px] font-medium text-page-muted transition-colors hover:bg-canvas-alt hover:text-page-ink"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Navbar;