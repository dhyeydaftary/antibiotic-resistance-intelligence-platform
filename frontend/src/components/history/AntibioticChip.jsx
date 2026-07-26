import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ResultBadge from '../app/ResultBadge';

const AntibioticChip = ({ prediction }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState(null);
  const chipRef = useRef(null);
  const topDriver = prediction.shapExplanation?.[0];

  const POPOVER_WIDTH = 224;
  const POPOVER_HEIGHT_ESTIMATE = 140;

  const handleEnter = () => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < POPOVER_HEIGHT_ESTIMATE + 12;

    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 12) {
      left = window.innerWidth - POPOVER_WIDTH - 12;
    }

    setPosition({
      left,
      top: openAbove ? rect.top - POPOVER_HEIGHT_ESTIMATE - 8 : rect.bottom + 8,
    });
    setIsHovered(true);
  };

  useEffect(() => {
    if (!isHovered) return;
    const handleScroll = () => setIsHovered(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isHovered]);

  return (
    <>
      <div
        ref={chipRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setIsHovered(false)}
        className="flex cursor-default items-center justify-between gap-2 rounded-[10px] border border-panel-border bg-panel px-3 py-2.5 transition-colors hover:border-onpanel-faint"
      >
        <span className="font-mono text-[12px] font-medium text-onpanel-ink">{prediction.antibiotic}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-onpanel-faint">{Math.round(prediction.confidence * 100)}%</span>
          <ResultBadge result={prediction.result} />
        </div>
      </div>

      {isHovered && position && createPortal(
        <div
          className="fixed z-[999] w-56 rounded-[12px] border border-canvas-hairline bg-white p-3 shadow-panel-lg"
          style={{ left: position.left, top: position.top }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-page-ink">{prediction.antibiotic}</span>
            <ResultBadge result={prediction.result} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-page-muted">Confidence</span>
              <span className="font-mono text-[12px] text-accent-blue">{Math.round(prediction.confidence * 100)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-page-muted">AWaRe tier</span>
              <span className="font-mono text-[12px] text-page-ink">{prediction.awareCategory}</span>
            </div>
            {topDriver && (
              <div className="border-t border-canvas-hairline pt-1.5">
                <span className="font-sans text-[11px] text-page-muted">Top factor</span>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-page-ink">
                    {topDriver.feature.replace(/_/g, ' ')}
                  </span>
                  <span className={`shrink-0 font-mono text-[11px] ${topDriver.direction === 'positive' ? 'text-resistant' : 'text-susceptible'}`}>
                    {topDriver.contribution.toFixed(3)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AntibioticChip;