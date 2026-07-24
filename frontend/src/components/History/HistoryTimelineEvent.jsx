import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HistoryDetails from './HistoryDetails';

const HistoryTimelineEvent = ({ prediction, isExpanded, onToggle, index }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'R': return 'text-destructive';
      case 'S': return 'text-teal';
      case 'I': return 'text-intermediate';
      default: return 'text-ink-muted';
    }
  };

  const getResultDotColor = (result) => {
    switch (result) {
      case 'R': return 'bg-destructive';
      case 'S': return 'bg-teal';
      case 'I': return 'bg-intermediate';
      default: return 'bg-ink-faint';
    }
  };

  const getResultLabel = (result) => {
    switch (result) {
      case 'R': return 'RESISTANT';
      case 'S': return 'SUSCEPTIBLE';
      case 'I': return 'INTERMEDIATE';
      default: return result;
    }
  };

  const isEven = index % 2 === 0;

  return (
    <div className="relative">
      <div
        className={`
          group flex items-center gap-4 px-5 py-3 rounded-lg
          ${isEven ? 'bg-paper' : 'bg-paper/60'}
          hover:bg-ink/5 transition-colors duration-200 ease-out
          cursor-pointer border border-transparent hover:border-hairline/40
          min-h-[56px]
        `}
        onClick={onToggle}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        {/* Left accent bar */}
        <div className={`w-0.5 h-5 rounded-full flex-shrink-0 ${getResultDotColor(prediction.result)}`} />
        
        {/* Prediction ID */}
        <span className="font-mono text-[12px] text-ink tabular-nums w-[120px] flex-shrink-0 truncate">
          {prediction.id}
        </span>
        
        <span className="text-ink-faint/30 flex-shrink-0">·</span>
        
        {/* Organism */}
        <span className="font-serif italic text-[14px] text-ink truncate min-w-[80px] max-w-[140px]">
          {prediction.organism}
        </span>
        
        <span className="text-ink-faint/30 flex-shrink-0">·</span>
        
        {/* Antibiotic */}
        <span className="font-sans text-[14px] text-ink-soft truncate min-w-[80px] max-w-[140px]">
          {prediction.antibiotic}
        </span>
        
        <div className="flex-1" />
        
        {/* Confidence */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-[80px] h-0.5 rounded-full bg-hairline overflow-hidden">
            <div 
              className={`h-full rounded-full ${getResultDotColor(prediction.result)} opacity-70`}
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
          <span className="font-mono text-[12px] text-ink tabular-nums w-[44px] text-right">
            {prediction.confidence}%
          </span>
        </div>
        
        {/* Status pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 border border-hairline rounded-full flex-shrink-0 min-w-[90px] justify-center">
          <span className={`w-1.5 h-1.5 rounded-full ${getResultDotColor(prediction.result)}`} />
          <span className={`font-mono text-[10px] tracking-[0.12em] uppercase ${getResultColor(prediction.result)}`}>
            {getResultLabel(prediction.result)}
          </span>
        </div>
        
        {/* Time */}
        <span className="font-mono text-[11px] text-ink-faint w-[60px] text-right flex-shrink-0">
          {formatTime(prediction.date)}
        </span>
        
        {/* Chevron */}
        <motion.svg 
          className="w-3.5 h-3.5 text-ink-faint flex-shrink-0 transition-colors duration-200 group-hover:text-ink"
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </motion.svg>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.24, 
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.2 }
            }}
            className="overflow-hidden ml-9"
          >
            <div className="bg-paper/80 border border-hairline/50 rounded-lg mt-1 px-5 py-4">
              <HistoryDetails prediction={prediction} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryTimelineEvent;