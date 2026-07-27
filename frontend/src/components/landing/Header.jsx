import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Menu, X, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Anchor links scroll within the landing page; route links navigate to a
// real page. Kept distinct so each renders correctly (<a> vs <Link>).
// "#how" now targets the merged Clinical Gap + How It Works narrative
// section (replacing the separate #problem anchor from an earlier pass).
const ANCHOR_LINKS = [
  { label: "How It Works", href: "#how", testId: "nav-how" },
  { label: "Models", href: "#capabilities", testId: "nav-models" },
  { label: "Transparency", href: "#dataset", testId: "nav-transparency" },
];
const ROUTE_LINKS = [
  { label: "About", to: "/about", testId: "nav-about" },
];

export default function Header({ lenisRef }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Lenis intercepts all scroll globally, so a plain <a href="#anchor"> click
  // fights the browser's native jump against Lenis's own virtual scroll
  // position — that's what caused instant/broken jumps. Routing the click
  // through Lenis's own scrollTo() keeps it smooth and correctly positioned.
  const handleAnchorClick = (e, href) => {
    e.preventDefault();
    setOpen(false);
    if (lenisRef?.current) {
      lenisRef.current.scrollTo(href, { duration: 1.2, offset: -80 });
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-[background,backdrop-filter,border-color] duration-500 ${scrolled
          ? "border-b border-canvas-hairline bg-canvas/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
        }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:h-20 md:px-14">
        <a href="#top" data-testid="brand-logo" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/10">
            <Target size={16} className="text-accent-blue" strokeWidth={2.2} />
          </div>
          <span className="font-display text-[16px] font-semibold tracking-[-0.01em] text-page-ink">
            AMR-Insight
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex lg:gap-9">
          {ANCHOR_LINKS.map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => handleAnchorClick(e, n.href)}
              data-testid={n.testId}
              className="font-sans text-[14px] text-page-muted transition-colors hover:text-page-ink"
            >
              {n.label}
            </a>
          ))}
          {ROUTE_LINKS.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              data-testid={n.testId}
              className="font-sans text-[14px] text-page-muted transition-colors hover:text-page-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/home"
              data-testid="nav-dashboard"
              aria-label="Go to Dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-blue px-3 py-2 font-sans text-[13px] font-medium text-white transition-colors hover:bg-accent-blue-hover sm:px-4 md:px-5 md:py-2.5"
            >
              <span className="hidden sm:inline">Go to Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-sign-in"
                className="hidden font-sans text-[14px] text-page-muted transition-colors hover:text-page-ink md:inline-block"
              >
                Sign in
              </Link>
              <Link
                to="/predict"
                data-testid="nav-try-prediction"
                aria-label="Try a prediction"
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-blue px-3 py-2 font-sans text-[13px] font-medium text-white transition-colors hover:bg-accent-blue-hover sm:px-4 md:px-5 md:py-2.5"
              >
                <span className="hidden sm:inline">Try a prediction</span>
                <ArrowRight size={14} />
              </Link>
            </>
          )}
          <button
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-canvas-hairline text-page-ink md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-canvas-hairline bg-canvas md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-6">
              {ANCHOR_LINKS.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={(e) => handleAnchorClick(e, n.href)}
                  className="py-2 font-display text-[20px] font-medium text-page-ink"
                >
                  {n.label}
                </a>
              ))}
              {ROUTE_LINKS.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="py-2 font-display text-[20px] font-medium text-page-ink"
                >
                  {n.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <Link
                  to="/home"
                  onClick={() => setOpen(false)}
                  className="py-2 font-display text-[20px] font-medium text-accent-blue"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="py-2 font-display text-[20px] font-medium text-page-ink"
                >
                  Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}