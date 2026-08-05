import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/predict', label: 'Predict' },
  { to: '/history', label: 'History' },
  { to: '/trends', label: 'Trends' },
  { to: '/explore', label: 'Explore' },
];

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="relative z-40 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-3xl items-center gap-1 rounded-full border border-white/60 bg-white/60 px-3 py-2 shadow-panel-sm backdrop-blur-xl backdrop-saturate-150">
        <Link to={isAuthenticated ? '/home' : '/'} className="flex items-center gap-2 rounded-full px-2 py-1.5 pr-3">
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="18" stroke="#1D1D1F" strokeWidth="1.4" />
            <circle cx="20" cy="20" r="10" stroke="#0071E3" strokeWidth="1.4" />
            <circle cx="20" cy="20" r="3" fill="#1D1D1F" />
          </svg>
          <span className="font-display text-[15px] font-semibold text-page-ink">AMR-Insight</span>
        </Link>

        <div className="mx-1 h-5 w-px bg-page-ink/10" />

        <div className="flex flex-1 items-center gap-1">
          {!isAuthenticated ? (
            <>
              <NavLink
                to="/login"
                className="ml-auto rounded-full px-4 py-2 font-sans text-[14px] font-medium text-page-ink transition-colors hover:bg-white/80"
              >
                Login
              </NavLink>
              <NavLink
                to="/signup"
                className="rounded-full bg-accent-blue px-4 py-2 font-sans text-[14px] font-medium text-white transition-colors hover:bg-accent-blue-hover"
              >
                Sign up
              </NavLink>
            </>
          ) : (
            LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="relative rounded-full px-4 py-2 font-sans text-[14px] font-medium transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full bg-page-ink"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-white' : 'text-page-muted hover:text-page-ink'}`}>
                    {link.label}
                  </span>
                </NavLink>
              );
            })
          )}
        </div>

        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="mr-1 rounded-full px-4 py-2 font-sans text-[14px] font-medium text-page-muted transition-colors hover:bg-white/80 hover:text-page-ink"
          >
            Logout
          </button>
        )}
      </nav>
    </div>
  );
}

export default Navbar;