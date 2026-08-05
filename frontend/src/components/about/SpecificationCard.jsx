export default function SpecificationCard({ label, value, note, className = '', active = false }) {
    return (
        <div
            className={`flex h-full flex-col justify-between rounded-[18px] border p-5 transition-all shadow-card-flat ${
                active
                    ? 'border-accent-blue bg-white ring-2 ring-accent-blue/20 shadow-md'
                    : 'border-canvas-hairline bg-white hover:border-accent-blue/40 hover:bg-canvas-alt/50'
            } ${className}`}
        >
            <div>
                <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent-blue">
                    {label}
                </div>
                <div className="mt-1.5 font-display text-[16px] font-semibold leading-[1.3] text-page-ink">
                    {value}
                </div>
            </div>
            {note && (
                <div className="mt-3 font-sans text-[12.5px] leading-[1.45] text-page-muted">
                    {note}
                </div>
            )}
        </div>
    );
}
