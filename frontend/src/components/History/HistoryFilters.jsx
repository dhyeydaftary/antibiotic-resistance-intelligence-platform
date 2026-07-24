import React, { useState, useRef } from 'react';
import Select from '../common/Select';

const HistoryFilters = ({
  filters,
  onFilterChange,
  antibioticOptions = ['All'],  // ✅ Default value
  organismOptions = ['All'],    // ✅ Default value
  searching
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

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

  // ✅ SAFELY convert options with fallback
  const antibioticSelectOptions = Array.isArray(antibioticOptions) 
    ? antibioticOptions.map(opt => ({ value: opt, label: opt }))
    : [{ value: 'All', label: 'All' }];

  const organismSelectOptions = Array.isArray(organismOptions)
    ? organismOptions.map(opt => ({ value: opt, label: opt }))
    : [{ value: 'All', label: 'All' }];

  return (
    <div className="mb-8">
      {/* Search Bar */}
      <div className="mb-5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className={`h-5 w-5 transition-colors duration-200 ${isSearchFocused ? 'text-teal' : 'text-ink/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by sample ID, organism, or antibiotic..."
            value={filters.search}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-12 py-2.5 bg-transparent border-b border-hairline font-sans text-ink placeholder-ink-faint focus:outline-none focus:border-teal transition-all duration-300"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink transition-colors duration-200"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {searching && (
            <div className="absolute inset-y-0 right-12 pr-3 flex items-center">
              <svg className="w-4 h-4 animate-spin text-ink/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Custom Select Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Select
          label="Status"
          value={filters.status}
          onChange={(val) => handleFilterChange('status', val)}
          options={statusOptions}
          placeholder="All Status"
        />

        <Select
          label="Date"
          value={filters.dateRange}
          onChange={(val) => handleFilterChange('dateRange', val)}
          options={dateOptions}
          placeholder="All Time"
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

        <Select
          label="Sort"
          value={filters.sort}
          onChange={(val) => handleFilterChange('sort', val)}
          options={sortOptions}
          placeholder="Newest First"
        />
      </div>
    </div>
  );
};

export default HistoryFilters;