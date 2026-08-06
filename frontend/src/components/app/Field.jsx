// Shared app-wide form primitives (Field label wrapper, TextInput,
// SelectInput) — the "shared kit" version; PredictionInputPage.jsx
// defines its own local near-duplicates instead of importing these.
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[13px] font-medium text-[#C7C7CC]">
        {label}
      </span>
      {children}
    </label>
  );
}

// Shared Tailwind class string for this file's TextInput/SelectInput.
function inputClasses(extra = '') {
  return `w-full rounded-[10px] border border-panel-border bg-panel-raised px-3.5 py-2.5 font-sans text-[15px] text-onpanel-ink placeholder:text-onpanel-faint outline-none transition-all duration-150 focus:border-accent-blue focus:shadow-focus-ring ${extra}`;
}

// Standard styled text input, no built-in error/label handling.
export function TextInput({ name, value, onChange, type = 'text', required, ...rest }) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={inputClasses()}
      {...rest}
    />
  );
}

// Custom-arrow native <select>, no placeholder option support.
export function SelectInput({ name, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={inputClasses('appearance-none pr-9 cursor-pointer')}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-panel-raised text-onpanel-ink">
            {opt}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-onpanel-faint"
        width="12" height="8" viewBox="0 0 12 8" fill="none"
      >
        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default Field;