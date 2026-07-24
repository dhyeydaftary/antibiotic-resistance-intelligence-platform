import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '../common/Select';
import { usePopup } from '../../hooks/usePopup';

const HistoryFilters = ({
  filters,
  onFilterChange,
  antibioticOptions = ['All'],
  organismOptions = ['All'],
  totalResults = 0,
  searching = false
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);
  const dateRef = useRef(null);
  const filtersPanelRef = useRef(null);
  const datePanelRef = useRef(null);

  const { position: filtersPosition } = usePopup(
    isFiltersOpen,
    filtersRef,
    filtersPanelRef
  );
  const { position: datePosition } = usePopup(
    isDateOpen,
    dateRef,
    datePanelRef
  );

  const isFiltersPanelActive =
    filters.status !== 'All' ||
    filters.antibiotic !== 'All' ||
    filters.organism !== 'All' ||
    filters.sort !== 'newest';

  const isDateActive = filters.dateRange !== 'All';

  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearSearch = () => {
    onFilterChange({ ...filters, search: '' });
    searchInputRef.current?.focus();
  };

  const clearFiltersPanel = () => {
    onFilterChange({
      ...filters,
      status: 'All',
      antibiotic: 'All',
      organism: 'All',
      sort: 'newest'
    });
    setIsFiltersOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setIsFiltersOpen(false);
      }
      if (dateRef.current && !dateRef.current.contains(event.target)) {
        setIsDateOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsFiltersOpen(false);
        setIsDateOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'R', label: 'Resistant' },
    { value: 'S', label: 'Susceptible' },
    { value: 'I', label: 'Intermediate' }
  ];

  const dateOptions = [
    { value: 'All', label: 'All Time' },
    { value: '7', label: 'Last 7 Days' },
    { value: '30', label: 'Last 30 Days' },
    { value: '90', label: 'Last 90 Days' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'confidence-high', label: 'Highest Confidence' },
    { value: 'confidence-low', label: 'Lowest Confidence' }
  ];

  const antibioticSelectOptions = Array.isArray(antibioticOptions) 
    ? antibioticOptions.map(opt => ({ value: opt, label: opt }))
    : [{ value: 'All', label: 'All' }];

  const organismSelectOptions = Array.isArray(organismOptions)
    ? organismOptions.map(opt => ({ value: opt, label: opt }))
    : [{ value: 'All', label: 'All' }];

  // Get sort label for display
  const getSortLabel = () => {
    const opt = sortOptions.find(o => o.value === filters.sort);
    return opt ? opt.label : 'Newest First';
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 py-3 border-b border-hairline">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[160px] max-w-full sm:max-w-[280px]">
          <div className="absolute inset-y-0 left-0 pl-0 flex items-center pointer-events-none">
            <svg className={`w-4 h-4 transition-colors duration-200 ${isSearchFocused ? 'text-ink' : 'text-ink-faint'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search records..."
            value={filters.search}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-7 pr-8 py-1.5 bg-transparent border-b border-hairline font-sans text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-teal transition-all duration-300"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-0 flex items-center text-ink-faint hover:text-ink transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {searching && (
            <div className="absolute inset-y-0 right-6 pr-0 flex items-center">
              <svg className="w-3.5 h-3.5 animate-spin text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setIsDateOpen(!isDateOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-sans transition-all duration-200 ${
              isDateOpen 
                ? 'border-ink-soft bg-ink/5 text-ink' 
                : 'border-hairline hover:border-ink-faint text-ink-soft hover:text-ink bg-paper'
            }`}
          >
            {isDateActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            )}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Date
          </button>

          <AnimatePresence>
            {isDateOpen && (
              <motion.div
                ref={datePanelRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  position: 'fixed',
                  top: datePosition.top || 'auto',
                  left: datePosition.left || 'auto',
                  right: datePosition.right || 'auto',
                }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="z-20 bg-paper border border-hairline rounded-lg p-3 min-w-[160px] max-w-[calc(100vw-32px)]"
                style={{
                  top: datePosition.top,
                  left: datePosition.left,
                  right: datePosition.right,
                }}
              >
                <Select
                  value={filters.dateRange}
                  onChange={(val) => handleFilterChange('dateRange', val)}
                  options={dateOptions}
                  placeholder="All Time"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filters Button */}
        <div className="relative" ref={filtersRef}>
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm font-sans
              transition-all duration-200 bg-paper
              ${isFiltersOpen 
                ? 'border-ink-soft bg-ink/5 text-ink' 
                : 'border-hairline hover:border-ink-faint text-ink-soft hover:text-ink'
              }
            `}
          >
            {isFiltersPanelActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            )}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>

          <AnimatePresence>
            {isFiltersOpen && (
              <motion.div
                ref={filtersPanelRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  position: 'fixed',
                  top: filtersPosition.top || 'auto',
                  left: filtersPosition.left || 'auto',
                  right: filtersPosition.right || 'auto',
                }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="z-20 bg-paper border border-hairline rounded-lg p-4 max-w-[calc(100vw-32px)]"
                style={{
                  top: filtersPosition.top,
                  left: filtersPosition.left,
                  right: filtersPosition.right,
                  width: Math.min(360, window.innerWidth - 32),
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Status"
                    value={filters.status}
                    onChange={(val) => handleFilterChange('status', val)}
                    options={statusOptions}
                    placeholder="All Status"
                  />

                  <Select
                    label="Sort"
                    value={filters.sort}
                    onChange={(val) => handleFilterChange('sort', val)}
                    options={sortOptions}
                    placeholder="Newest First"
                  />

                  <Select
                    label="Antibiotic"
                    value={filters.antibiotic}
                    onChange={(val) => handleFilterChange('antibiotic', val)}
                    options={antibioticSelectOptions}
                    placeholder="All"
                  />

                  <Select
                    label="Organism"
                    value={filters.organism}
                    onChange={(val) => handleFilterChange('organism', val)}
                    options={organismSelectOptions}
                    placeholder="All"
                  />
                </div>

                {isFiltersPanelActive && (
                  <button
                    onClick={clearFiltersPanel}
                    className="mt-3 font-sans text-xs text-ink/30 hover:text-ink transition-colors duration-200"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Result count - right side */}
        <div className="ml-auto flex items-center gap-1">
          <span className="font-mono text-[11px] text-ink-faint">
            {totalResults} records
          </span>
          <span className="text-ink-faint/30">·</span>
          <span className="font-mono text-[11px] text-ink-faint/50">
            sorted {getSortLabel().toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;