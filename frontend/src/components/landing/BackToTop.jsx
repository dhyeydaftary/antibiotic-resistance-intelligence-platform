import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating back-to-top button. Uses the page's Lenis instance (via ref) so
 * the scroll-up motion matches the rest of the page's smooth-scroll feel;
 * falls back to native smooth scroll for reduced-motion users, who never
 * get a Lenis instance.
 */
export default function BackToTop({ lenisRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.75);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    if (lenisRef?.current) {
      lenisRef.current.scrollTo(0, { duration: 1.4 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          type="button"
          onClick={handleClick}
          data-testid="back-to-top"
          aria-label="Back to top"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-8 right-6 md:right-10 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "#2C7A6B" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F7F5F0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
