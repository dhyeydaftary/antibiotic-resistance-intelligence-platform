import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Select = ({
  label,
  value,
  onChange,
  options = [],  // ✅ Default to empty array
  placeholder = 'Select...',
  className = '',
  labelClassName = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  // ✅ SAFELY find selected option with fallback
  const selectedOption = options && Array.isArray(options) 
    ? options.find(opt => opt.value === value)
    : undefined;
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // ✅ SAFELY get selected index with fallback
  const getSelectedIndex = useCallback(() => {
    if (!options || !Array.isArray(options) || options.length === 0) return -1;
    return options.findIndex(opt => opt.value === value);
  }, [options, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (!options || !Array.isArray(options) || options.length === 0) return;

    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
        event.preventDefault();
        setIsOpen(true);
        const selectedIdx = getSelectedIndex();
        setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1;
          return next < options.length ? next : 0;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1;
          return next >= 0 ? next : options.length - 1;
        });
        break;
      case 'Enter':
      case ' ':
      case 'Space':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
          setFocusedIndex(-1);
          triggerRef.current?.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Focus the active option when it changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [focusedIndex, isOpen]);

  // Reset focused index when opening
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = getSelectedIndex();
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    }
  }, [isOpen, getSelectedIndex]);

  // Handle trigger click
  const handleTriggerClick = () => {
    if (disabled || !options || !Array.isArray(options) || options.length === 0) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      const selectedIdx = getSelectedIndex();
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setFocusedIndex(-1);
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  };

  const shouldScroll = options && Array.isArray(options) && options.length > 10;
  const activeDescendant = isOpen && focusedIndex >= 0 
    ? `select-option-${focusedIndex}` 
    : undefined;

  // ✅ If no options, render disabled trigger
  if (!options || !Array.isArray(options) || options.length === 0) {
    return (
      <div className={`relative ${className}`}>
        {label && (
          <label className={`font-mono text-[10px] tracking-wider uppercase text-ink/40 block mb-1.5 ${labelClassName}`}>
            {label}
          </label>
        )}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-between bg-paper border border-hairline rounded px-3.5 py-2 text-sm text-ink/40 cursor-not-allowed opacity-50"
        >
          <span className="truncate text-left font-sans">{placeholder}</span>
          <svg className="w-4 h-4 text-ink/20 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      {label && (
        <label className={`font-mono text-[10px] tracking-wider uppercase text-ink/40 block mb-1.5 ${labelClassName}`}>
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="select-listbox"
        aria-activedescendant={activeDescendant}
        aria-disabled={disabled}
        onClick={handleTriggerClick}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between bg-paper border rounded px-3.5 py-2 text-sm text-ink
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen 
            ? 'border-ink-soft' 
            : 'border-hairline hover:border-ink-faint'
          }
        `}
      >
        <span className="truncate text-left font-sans">
          {displayLabel}
        </span>
        <svg 
          className={`w-4 h-4 text-ink/40 transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Options Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ 
              duration: 0.15, 
              ease: 'easeOut',
              opacity: { duration: 0.12 }
            }}
            className="absolute z-20 w-full mt-1.5 bg-paper border border-hairline rounded"
            role="listbox"
            id="select-listbox"
            aria-label={label || 'Options'}
            ref={listRef}
            style={{
              maxHeight: shouldScroll ? '240px' : 'auto',
              overflowY: shouldScroll ? 'auto' : 'visible'
            }}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;

              return (
                <button
                  key={option.value}
                  ref={(el) => optionRefs.current[index] = el}
                  role="option"
                  aria-selected={isSelected}
                  id={`select-option-${index}`}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2 text-sm font-sans
                    transition-colors duration-150
                    ${isFocused ? 'bg-hairline/30' : ''}
                    ${isSelected ? 'text-ink font-medium' : 'text-ink-muted'}
                  `}
                  onClick={() => handleOptionSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-teal flex-shrink-0 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Select;