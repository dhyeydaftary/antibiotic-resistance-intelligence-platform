import { motion } from 'framer-motion';

function Toggle({ label, checked, onChange, name }) {
  return (
    <button
      type="button"
      onClick={() => onChange({ target: { name, type: 'checkbox', checked: !checked } })}
      className="flex w-full items-center justify-between rounded-[10px] border border-panel-border bg-panel-raised px-3.5 py-3 transition-colors hover:border-onpanel-faint"
    >
      <span className="font-sans text-[14px] text-onpanel-ink">{label}</span>
      <span
        className={`relative h-[22px] w-9 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent-blue' : 'bg-panel-border'
        }`}
      >
        <motion.span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white"
          animate={{ left: checked ? 19 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

export default Toggle;