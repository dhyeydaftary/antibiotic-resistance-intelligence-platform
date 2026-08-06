const CONFIG = {
  R: { label: 'Resistant', bg: 'bg-resistant/10', text: 'text-resistant', dot: 'bg-resistant' },
  S: { label: 'Susceptible', bg: 'bg-susceptible/10', text: 'text-susceptible', dot: 'bg-susceptible' },
  I: { label: 'Intermediate', bg: 'bg-intermediate/10', text: 'text-intermediate', dot: 'bg-intermediate' },
};

// Colored pill badge for a prediction's R/S/I result — the single
// source of the app's Resistant/Susceptible/Intermediate visual language.
function ResultBadge({ result }) {
  const cfg = CONFIG[result] || CONFIG.I;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-mono-label uppercase ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default ResultBadge;