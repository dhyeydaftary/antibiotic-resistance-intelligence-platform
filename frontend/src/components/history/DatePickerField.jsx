import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Formats a Date as a local YYYY-MM-DD string (not toISOString, which
// would shift by timezone offset).
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Formats a stored ISO date string into a human-readable display string.
function formatDisplay(isoString) {
  if (!isoString) return null;
  const [y, m, d] = isoString.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Builds the 6-week (42-cell) calendar grid for a given month, padded
// with the tail of the previous month and head of the next so the grid
// always starts on Sunday and fills completely.
function buildGrid(viewYear, viewMonth) {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false, date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(viewYear, viewMonth, d) });
  }
  while (cells.length < 42) {
    const nextDay = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ day: nextDay, current: false, date: new Date(viewYear, viewMonth + 1, nextDay) });
  }
  return cells;
}

// Custom calendar date picker (portaled popover, month/year grid views)
// used for the history filter bar's date-range inputs — no native
// <input type="date"> here, for consistent cross-browser styling.
const DatePickerField = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthGrid, setShowMonthGrid] = useState(false);
  const [position, setPosition] = useState(null);
  const today = new Date();
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState((selectedDate || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selectedDate || today).getMonth());
  const triggerRef = useRef(null);

  // Positions and opens the popover relative to the trigger button.
  const open = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 6 });
    setShowMonthGrid(false);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target) && !e.target.closest('[data-calendar-popover]')) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const cells = buildGrid(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  };

  const isSameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

  // Commits a selected calendar date and closes the popover.
  const handleSelect = (cellDate) => {
    onChange(toISODate(cellDate));
    setIsOpen(false);
  };

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className="flex h-9 w-full items-center gap-2 rounded-[10px] border border-panel-border bg-panel-raised px-3 font-sans text-[13px] text-onpanel-ink outline-none transition-colors hover:border-onpanel-faint focus:border-accent-blue"
      >
        <CalendarIcon size={13} className="shrink-0 text-onpanel-faint" />
        <span className={value ? 'text-onpanel-ink' : 'text-onpanel-faint'}>
          {value ? formatDisplay(value) : 'Select date'}
        </span>
      </button>

      {isOpen && position && createPortal(
        <div
          data-calendar-popover
          className="fixed z-[999] w-[280px] overflow-hidden rounded-[16px] border border-canvas-hairline bg-white shadow-panel-lg"
          style={{ left: position.left, top: position.top }}
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-4">
            <button onClick={goPrevMonth} className="flex h-7 w-7 items-center justify-center rounded-full text-page-muted transition-colors hover:bg-canvas-alt hover:text-page-ink">
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setShowMonthGrid((v) => !v)}
              className="rounded-full px-3 py-1 font-display text-[14px] font-semibold text-page-ink transition-colors hover:bg-canvas-alt"
            >
              {monthLabel}
            </button>
            <button onClick={goNextMonth} className="flex h-7 w-7 items-center justify-center rounded-full text-page-muted transition-colors hover:bg-canvas-alt hover:text-page-ink">
              <ChevronRight size={15} />
            </button>
          </div>

          {showMonthGrid ? (
            <div className="px-3 pb-3">
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => setViewYear((y) => y - 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-page-muted hover:bg-canvas-alt hover:text-page-ink">
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono text-[13px] font-medium text-page-ink">{viewYear}</span>
                <button onClick={() => setViewYear((y) => y + 1)} className="flex h-7 w-7 items-center justify-center rounded-full text-page-muted hover:bg-canvas-alt hover:text-page-ink">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, idx) => (
                  <button
                    key={name}
                    onClick={() => { setViewMonth(idx); setShowMonthGrid(false); }}
                    className={`rounded-[8px] py-2 font-sans text-[12px] font-medium transition-colors ${
                      idx === viewMonth ? 'bg-accent-blue text-white' : 'text-page-ink hover:bg-canvas-alt'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-0.5 px-3">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="flex h-7 items-center justify-center font-mono text-[10px] font-medium uppercase text-page-faint">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
                {cells.map((cell, i) => {
                  const isToday = isSameDay(cell.date, today);
                  const isSelected = isSameDay(cell.date, selectedDate);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(cell.date)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-sans text-[13px] transition-colors ${
                        isSelected
                          ? 'bg-accent-blue font-semibold text-white'
                          : isToday
                          ? 'font-semibold text-accent-blue ring-1 ring-inset ring-accent-blue'
                          : cell.current
                          ? 'text-page-ink hover:bg-canvas-alt'
                          : 'text-page-faint hover:bg-canvas-alt'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-canvas-hairline px-4 py-2.5">
            <button
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="font-sans text-[12px] font-medium text-page-muted hover:text-page-ink"
            >
              Clear
            </button>
            <button
              onClick={() => { handleSelect(today); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setShowMonthGrid(false); }}
              className="font-sans text-[12px] font-medium text-accent-blue hover:text-accent-blue-hover"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DatePickerField;