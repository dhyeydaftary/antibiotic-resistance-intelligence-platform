export const BacteriumMark = ({ className = "", ...props }) => (
  <svg
    viewBox="0 0 220 90"
    fill="none"
    stroke="currentColor"
    strokeWidth="0.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="18" y="30" width="120" height="22" rx="11" />
    <line x1="42" y1="30" x2="42" y2="52" />
    <line x1="66" y1="30" x2="66" y2="52" />
    <line x1="90" y1="30" x2="90" y2="52" />
    <line x1="114" y1="30" x2="114" y2="52" />
    <path d="M138 41 C 152 30, 170 55, 186 40 S 210 30, 216 46" />
    <rect x="150" y="60" width="46" height="14" rx="7" />
    <line x1="164" y1="60" x2="164" y2="74" />
    <line x1="180" y1="60" x2="180" y2="74" />
    <line x1="6" y1="41" x2="12" y2="41" />
    <line x1="6" y1="67" x2="12" y2="67" />
  </svg>
);