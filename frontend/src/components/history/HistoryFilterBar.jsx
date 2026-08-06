import React, { useState, useRef, useEffect } from 'react';
import { Search, X, RotateCcw, ChevronDown } from 'lucide-react';
import DatePickerField from './DatePickerField';

// Small uppercase label above each filter control.
function FilterLabel({ children }) {
    return <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-onpanel-faint">{children}</span>;
}

// Plain native <select> (custom chevron via background-image) for the
// Result/Sort filters, which don't need a stats preview.
function NativeSelect({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full cursor-pointer appearance-none rounded-[10px] border border-panel-border bg-panel-raised px-3 pr-8 font-sans text-[13px] font-medium text-onpanel-ink outline-none transition-colors hover:border-onpanel-faint focus:border-accent-blue"
            style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2398989D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
            }}
        >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

// Two-pane dropdown (option list + live stats preview) for Antibiotic/Organism filters.
// Custom dropdown for Antibiotic / Organism — shows a live stat preview on hover.
// Anchored with plain CSS (absolute inside a relative wrapper), NOT fixed/portal —
// so it scrolls naturally with the page and can't drift, unlike the old popup.
function PreviewSelect({ value, onChange, options, statsMap, previewLabel }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredValue, setHoveredValue] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const preview = hoveredValue && hoveredValue !== 'All' ? statsMap[hoveredValue] : null;

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-panel-border bg-panel-raised px-3 font-sans text-[13px] font-medium text-onpanel-ink transition-colors hover:border-onpanel-faint"
            >
                <span className="truncate">{value}</span>
                <ChevronDown size={13} className={`shrink-0 text-onpanel-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-[calc(100%+4px)] z-30 flex w-[280px] overflow-hidden rounded-[12px] border border-panel-border bg-panel shadow-panel-lg">
                    <div className="max-h-64 w-1/2 overflow-y-auto border-r border-panel-border py-1">
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onMouseEnter={() => setHoveredValue(opt)}
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`block w-full truncate px-3 py-1.5 text-left font-sans text-[12px] transition-colors ${opt === value ? 'bg-panel-border font-medium text-onpanel-ink' : 'text-onpanel-muted hover:bg-panel-border/60'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                    <div className="w-1/2 p-3">
                        {preview ? (
                            <div>
                                <div className="mb-2 truncate font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">{hoveredValue}</div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-sans text-[11px] text-onpanel-muted">Records</span>
                                        <span className="font-mono text-[12px] text-onpanel-ink">{preview.count}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-sans text-[11px] text-onpanel-muted">Resistant</span>
                                        <span className="font-mono text-[12px] text-resistant">{preview.resistantPct}%</span>
                                    </div>
                                    {preview.avgConfidence !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span className="font-sans text-[11px] text-onpanel-muted">Avg confidence</span>
                                            <span className="font-mono text-[12px] text-accent-blue">{preview.avgConfidence}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center font-sans text-[11px] text-onpanel-faint">
                                {previewLabel}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const STATUS_OPTIONS = [
    { value: 'All', label: 'All results' },
    { value: 'R', label: 'Resistant' },
    { value: 'S', label: 'Susceptible' },
    { value: 'I', label: 'Intermediate' },
];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'confidence-high', label: 'Highest confidence' },
    { value: 'confidence-low', label: 'Lowest confidence' },
];

// The full filter/sort/search control row for HistoryPage — all state
// is lifted (controlled by `filters`/`onFilterChange` from the parent).
const HistoryFilterBar = ({ filters, onFilterChange, onClear, antibioticOptions, organismOptions, antibioticStats, organismStats, totalResults }) => {
    // Updates a single filter key, preserving the rest.
    const set = (key, value) => onFilterChange({ ...filters, [key]: value });
    const hasActiveFilters =
        filters.search || filters.status !== 'All' || filters.dateFrom || filters.dateTo ||
        filters.antibiotic !== 'All' || filters.organism !== 'All' || filters.sort !== 'newest';

    return (
        <div className="mb-6 rounded-[16px] border border-panel-border bg-panel p-4">
            <div className="mb-3">
                <FilterLabel>Search</FilterLabel>
                <div className="relative max-w-[320px]">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-onpanel-faint" />
                    <input
                        type="text"
                        placeholder="Organism or antibiotic…"
                        value={filters.search}
                        onChange={(e) => set('search', e.target.value)}
                        className="h-9 w-full rounded-[10px] border border-panel-border bg-panel-raised pl-8 pr-7 font-sans text-[13px] text-onpanel-ink outline-none placeholder:text-onpanel-faint focus:border-accent-blue"
                    />
                    {filters.search && (
                        <button onClick={() => set('search', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-onpanel-faint hover:text-onpanel-ink">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                    <FilterLabel>Result</FilterLabel>
                    <NativeSelect value={filters.status} onChange={(v) => set('status', v)} options={STATUS_OPTIONS} />
                </div>



                <div>
                    <FilterLabel>From date</FilterLabel>
                    <DatePickerField value={filters.dateFrom} onChange={(v) => set('dateFrom', v)} />
                </div>

                <div>
                    <FilterLabel>To date</FilterLabel>
                    <DatePickerField value={filters.dateTo} onChange={(v) => set('dateTo', v)} />
                </div>

                <div>
                    <FilterLabel>Antibiotic</FilterLabel>
                    <PreviewSelect
                        value={filters.antibiotic}
                        onChange={(v) => set('antibiotic', v)}
                        options={antibioticOptions}
                        statsMap={antibioticStats}
                        previewLabel="Hover an antibiotic to see stats"
                    />
                </div>

                <div>
                    <FilterLabel>Organism</FilterLabel>
                    <PreviewSelect
                        value={filters.organism}
                        onChange={(v) => set('organism', v)}
                        options={organismOptions}
                        statsMap={organismStats}
                        previewLabel="Hover an organism to see stats"
                    />
                </div>

                <div>
                    <FilterLabel>Sort</FilterLabel>
                    <NativeSelect value={filters.sort} onChange={(v) => set('sort', v)} options={SORT_OPTIONS} />
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-panel-border pt-3">
                <button
                    onClick={onClear}
                    disabled={!hasActiveFilters}
                    className="flex items-center gap-1.5 font-sans text-[12px] font-medium text-onpanel-muted transition-colors hover:text-onpanel-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <RotateCcw size={13} /> Clear filters
                </button>
                <span className="font-mono text-[11px] font-medium text-onpanel-muted">
                    {totalResults} record{totalResults === 1 ? '' : 's'}
                </span>
            </div>
        </div>
    );
};

export default HistoryFilterBar;