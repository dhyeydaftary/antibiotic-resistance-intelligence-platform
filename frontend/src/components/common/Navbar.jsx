import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="relative z-40 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-3xl items-center gap-1 rounded-full border border-t-white border-x-canvas-hairline/70 border-b-canvas-hairline bg-white/90 px-3 py-2 shadow-panel-md backdrop-blur-xl backdrop-saturate-150">
        <motion.div whileTap={reduceMotion ? undefined : tapFeedback} transition={{ duration: 0.12 }}>
          <Link
            to="/home"
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

        <div className="mx-1 h-5 w-px bg-page-ink/10" />

        <div className="flex flex-1 items-center gap-1">
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
            className="mr-1 rounded-full px-4 py-2 font-sans text-[14px] font-medium text-page-muted transition-colors hover:bg-white/80 hover:text-page-ink"
          >
            Logout
          </motion.button>
        )}
      </nav>
    </div>
  );
}

export default Navbar;