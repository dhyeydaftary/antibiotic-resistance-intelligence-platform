import { motion } from 'framer-motion';

/**
 * Wraps a section so it slides in horizontally + fades as it scrolls into
 * view, alternating direction by index. Fires once per section (won't
 * replay every time you scroll past it).
 */
function ScrollReveal({ children, index = 0, distance = 40 }) {
  const fromLeft = index % 2 === 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: fromLeft ? -distance : distance }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
