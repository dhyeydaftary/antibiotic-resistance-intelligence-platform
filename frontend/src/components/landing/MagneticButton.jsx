import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const MotionLink = motion.create(Link);

/**
 * Magnetic button — attracts cursor within radius, uses spring.
 * Renders as a router Link when `to` is provided, otherwise a button.
 */
export default function MagneticButton({ children, className = "", variant = "primary", testId, onClick, to }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    setPos({ x: relX * 0.25, y: relY * 0.25 });
  };
  const onMouseLeave = () => setPos({ x: 0, y: 0 });

  const base = "inline-flex items-center gap-3 px-7 py-4 text-sm font-sans transition-colors duration-500 will-change-transform select-none";
  const styles = {
    primary: "bg-ink text-paper hover:bg-teal",
    ghost: "bg-transparent text-ink border border-ink/20 hover:border-ink",
    accent: "bg-teal text-paper hover:bg-ink",
  };

  const Component = to ? MotionLink : motion.button;
  const navProps = to ? { to } : {};

  return (
    <Component
      ref={ref}
      data-testid={testId}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.2 }}
      className={`${base} ${styles[variant]} ${className}`}
      style={{ borderRadius: 999 }}
      {...navProps}
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        className="relative z-10 inline-block"
        animate={{ x: pos.x * 0.4 }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
      >
        →
      </motion.span>
    </Component>
  );
}
