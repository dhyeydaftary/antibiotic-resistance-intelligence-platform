import React from 'react';
import HistoryDetails from './HistoryDetails';

const HistoryTimelineEvent = ({ prediction, isExpanded, onToggle, index }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // 🌸 YOUR PREMIUM PASTEL COLORS:
  // Resistant: BG #FAF1F3, Text #92707A, Bar #D8A2AF
  // Susceptible: BG #F2F7F3, Text #617A68, Bar #8EB29A
  // Intermediate: BG #FCF8EF, Text #8D8165, Bar #D6C589
  const getResultStyles = (result) => {
    switch (result) {
      case 'R':
        return {
          bg: '#FAF1F3',
          text: '#92707A',
          dot: '#D8A2AF',
          badgeBg: '#FAF1F3',
          badgeText: '#92707A',
          border: '#D8A2AF',
          label: 'RESISTANT',
          progressColor: '#D8A2AF',
          leftBorder: '#D8A2AF',
          hoverBg: '#FAF1F3',
          ring: '#D8A2AF'
        };
      case 'S':
        return {
          bg: '#F2F7F3',
          text: '#617A68',
          dot: '#8EB29A',
          badgeBg: '#F2F7F3',
          badgeText: '#617A68',
          border: '#8EB29A',
          label: 'SUSCEPTIBLE',
          progressColor: '#8EB29A',
          leftBorder: '#8EB29A',
          hoverBg: '#F2F7F3',
          ring: '#8EB29A'
        };
      case 'I':
        return {
          bg: '#FCF8EF',
          text: '#8D8165',
          dot: '#D6C589',
          badgeBg: '#FCF8EF',
          badgeText: '#8D8165',
          border: '#D6C589',
          label: 'INTERMEDIATE',
          progressColor: '#D6C589',
          leftBorder: '#D6C589',
          hoverBg: '#FCF8EF',
          ring: '#D6C589'
        };
      default:
        return {
          bg: '#F5F5F5',
          border: '#E0E0E0',
          text: '#616161',
          dot: '#BDBDBD',
          badgeBg: '#F5F5F5',
          badgeText: '#616161',
          label: 'UNKNOWN',
          progressColor: '#BDBDBD',
          leftBorder: '#E0E0E0',
          hoverBg: '#F5F5F5',
          ring: '#E0E0E0'
        };
    }
  };

  const styles = getResultStyles(prediction.result);

  return (
    <div 
      className="bg-white border-l-4 border-r border-t border-b border-hairline rounded-xl transition-all duration-300"
      style={{ 
        borderLeftColor: styles.leftBorder,
        backgroundColor: isExpanded ? styles.hoverBg : 'white',
        animationDelay: `${index * 50}ms`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = styles.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) {
          e.currentTarget.style.backgroundColor = 'white';
        }
      }}
    >
      <div 
        className="px-4 sm:px-5 py-3.5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* 🌸 PASTEL DOT */}
            <div 
              className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-white"
              style={{ 
                backgroundColor: styles.dot,
                ringColor: styles.ring
              }}
            />
            
            <span className="font-mono text-xs text-ink font-medium truncate">
              {prediction.id}
            </span>
            
            <span className="flex items-center gap-1 font-sans text-sm text-ink whitespace-nowrap">
              <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {prediction.organism}
            </span>
            
            <span className="text-ink-faint">·</span>
            
            <span className="flex items-center gap-1 font-sans text-sm text-ink-muted whitespace-nowrap">
              <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {prediction.antibiotic}
            </span>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
            {/* 🌸 PASTEL CONFIDENCE BAR */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${prediction.confidence}%`,
                    backgroundColor: styles.progressColor
                  }}
                />
              </div>
              <span className="font-sans text-xs font-bold" style={{ color: styles.text }}>
                {prediction.confidence}%
              </span>
            </div>
            
            {/* 🌸 PREMIUM CHIP - border-radius:999px, height:30px, padding-inline:14px, font-weight:600, letter-spacing:0.02em, tiny shadow */}
            <span 
              className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold tracking-wide"
              style={{ 
                backgroundColor: styles.badgeBg,
                color: styles.badgeText,
                borderRadius: '999px',
                height: '30px',
                paddingInline: '14px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                border: `1px solid ${styles.border}`
              }}
            >
              {prediction.result === 'R' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {prediction.result === 'S' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {prediction.result === 'I' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              {styles.label}
            </span>
            
            <span className="font-sans text-xs text-ink-muted whitespace-nowrap">
              {formatTime(prediction.date)}
            </span>
            
            <svg 
              className={`w-4 h-4 text-ink-faint transition-transform duration-300 flex-shrink-0 ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-hairline animate-expand">
          <HistoryDetails prediction={prediction} />
        </div>
      )}
    </div>
  );
};

export default HistoryTimelineEvent;