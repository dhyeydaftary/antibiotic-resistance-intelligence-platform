import { motion } from 'framer-motion';

// App-wide filled primary button with a tap-scale micro-interaction
// (framer-motion), used across prediction/history/trends/explore pages.
function PrimaryButton({ children, type = 'button', onClick, disabled, className = '' }) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] bg-accent-blue px-6 py-3 font-sans text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-blue-hover active:bg-accent-blue-active disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default PrimaryButton;