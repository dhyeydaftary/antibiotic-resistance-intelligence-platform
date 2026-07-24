import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '../common/Select';
import { usePopup } from '../../hooks/usePopup';

const HistoryFilters = ({
  filters,
  onFilterChange,
  antibioticOptions = ['All'],
  organismOptions = ['All'],
  searching
}) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const filtersRef = useRef(null);
  const dateRef = useRef(null);
  const filtersPanelRef = useRef(null);
  const datePanelRef = useRef(null);

  // Use the positioning hook for both popovers
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

  // Count active non-default filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'All') count++;
    if (filters.antibiotic !== 'All') count++;
    if (filters.organism !== 'All') count++;
    if (filters.sort !== 'newest') count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  // Get active filter summary text
  const getFilterSummary = () => {
    const parts = [];
    if (filters.status !== 'All') {
      const statusMap = { R: 'Resistant', S: 'Susceptible', I: 'Intermediate' };
      parts.push(statusMap[filters.status] || filters.status);
    }
    if (filters.antibiotic !== 'All') parts.push(filters.antibiotic);
    if (filters.organism !== 'All') parts.push(filters.organism);
    if (filters.sort !== 'newest') {
      const sortMap = {
        'newest': 'Newest',
        'oldest': 'Oldest',
        'confidence-high': 'High Conf.',
        'confidence-low': 'Low Conf.'
      };
      parts.push(sortMap[filters.sort] || filters.sort);
    }
    return parts.join(' · ');
  };

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

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      status: 'All',
      antibiotic: 'All',
      organism: 'All',
      sort: 'newest'
    });
  };

  // Close panels on outside click
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

  // Close on Escape
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

  return (
    <div className="mb-8">
      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[160px] max-w-full sm:max-w-[320px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className={`h-4 w-4 transition-colors duration-200 ${isSearchFocused ? 'text-teal' : 'text-ink/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-9 pr-8 py-2 bg-transparent border-b border-hairline font-sans text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-teal transition-all duration-300"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-ink-faint hover:text-ink transition-colors duration-200"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {searching && (
            <div className="absolute inset-y-0 right-8 pr-2 flex items-center">
              <svg className="w-3.5 h-3.5 animate-spin text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
        </div>

        {/* Date Filter Button (Icon-only) */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setIsDateOpen(!isDateOpen)}
            className={`p-2 border rounded-lg transition-all duration-200 ${
              isDateOpen 
                ? 'border-ink-soft bg-ink/5' 
                : 'border-hairline hover:border-ink-faint bg-paper'
            }`}
            aria-label="Filter by date"
          >
            <svg className="w-4 h-4 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
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
                <span className="font-mono text-[10px] tracking-wider uppercase text-ink/30 block mb-2">
                  Date Range
                </span>
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
              flex items-center gap-2 px-3.5 py-2 border rounded-lg bg-paper text-sm font-sans whitespace-nowrap
              transition-all duration-200
              ${isFiltersOpen 
                ? 'border-ink-soft bg-ink/5 text-ink' 
                : 'border-hairline hover:border-ink-faint text-ink-muted hover:text-ink'
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="relative">
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-teal" />
              </span>
            )}
          </button>

          {/* Filter Summary (when filters active) */}
          {activeFilterCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 ml-1 max-w-[200px]">
              <span className="font-sans text-xs text-ink/40 truncate">
                {getFilterSummary()}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-ink-faint hover:text-ink transition-colors duration-200 flex-shrink-0"
                aria-label="Clear all filters"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

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

                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="mt-3 font-sans text-xs text-ink/30 hover:text-ink transition-colors duration-200"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;