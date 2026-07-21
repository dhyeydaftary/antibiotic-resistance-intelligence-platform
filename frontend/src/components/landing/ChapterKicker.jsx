import { motion } from "framer-motion";

/**
 * Chapter-entry "Ch. XX" label. Fades in first, ahead of the headline that
 * follows it, so arriving at a new chapter reads as a distinct beat rather
 * than everything appearing at once.
 */
export default function ChapterKicker({ children, tone = "dark", className = "" }) {
  const toneClass = tone === "light" ? "text-paper/50" : "text-ink/50";
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`block font-mono text-[11px] tracking-[0.3em] uppercase ${toneClass} ${className}`}
    >
      {children}
    </motion.span>
  );
}
