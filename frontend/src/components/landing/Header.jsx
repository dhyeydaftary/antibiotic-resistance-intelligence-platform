import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { label: "Research", href: "#context", testId: "nav-research" },
  { label: "How it works", href: "#how", testId: "nav-how" },
  { label: "Trends", href: "#trends", testId: "nav-trends" },
  { label: "Dataset", href: "#dataset", testId: "nav-dataset" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      data-testid="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-[background,backdrop-filter,border-color] duration-500 ${
        scrolled
          ? "bg-paper/75 backdrop-blur-xl border-b border-hairline/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-14 h-16 md:h-20 flex items-center justify-between">
        <a href="#top" data-testid="brand-logo" className="flex items-center gap-3 group">
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden>
            <circle cx="20" cy="20" r="18" stroke="#12141A" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="10" stroke="#2C7A6B" strokeWidth="1.2" />
            <circle cx="20" cy="20" r="3" fill="#12141A" />
          </svg>
          <div className="leading-none">
            <div className="font-serif text-lg tracking-tight text-ink">AMR-Insight</div>
            <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-ink/50 mt-0.5">
              Research · v0.9
            </div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-10">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              data-testid={n.testId}
              className="font-sans text-[13px] text-ink/70 hover:text-ink transition-colors link-underline"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            data-testid="nav-sign-in"
            className="hidden md:inline-block font-sans text-[13px] text-ink/70 hover:text-ink transition-colors link-underline"
          >
            Sign in
          </Link>
          <Link
            to="/predict"
            data-testid="nav-try-prediction"
            className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-5 py-2 text-[13px] font-sans hover:bg-teal transition-colors duration-500"
          >
            Try a prediction
            <span aria-hidden>→</span>
          </Link>
          <button
            className="md:hidden ml-2 w-10 h-10 flex items-center justify-center border border-hairline rounded-full"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            data-testid="mobile-menu-toggle"
          >
            <span className="block w-4 h-px bg-ink" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-paper border-t border-hairline overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="font-serif text-2xl text-ink"
                >
                  {n.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
