import { useState, useEffect, useCallback } from 'react';

export const usePopup = (isOpen, triggerRef, panelRef) => {
  const [position, setPosition] = useState({ top: 0, left: 0, right: 'auto' });

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !panelRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space
    const spaceRight = viewportWidth - triggerRect.left;
    const spaceLeft = triggerRect.right;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    // Get panel width
    const width = Math.min(panelRect.width || 360, viewportWidth - 32);

    // Determine horizontal position
    let left = triggerRect.left;
    let right = 'auto';

    // Check if panel fits to the right
    if (spaceRight < width && spaceLeft > width) {
      left = triggerRect.right - width;
    }

    // Ensure panel doesn't go off screen
    if (left + width > viewportWidth - 16) {
      left = viewportWidth - width - 16;
    }
    if (left < 16) {
      left = 16;
    }

    // Determine vertical position
    const panelHeight = Math.min(panelRect.height || 400, viewportHeight - 32);
    let top = triggerRect.bottom + 6;

    // If not enough space below, place above
    if (spaceBelow < panelHeight && spaceAbove > panelHeight) {
      top = triggerRect.top - panelHeight - 6;
    }

    // Ensure panel doesn't go off screen vertically
    if (top + panelHeight > viewportHeight - 16) {
      top = viewportHeight - panelHeight - 16;
    }
    if (top < 16) {
      top = 16;
    }

    setPosition({
      top,
      left,
      right,
    });
  }, [isOpen, triggerRef, panelRef]);

  // Recalculate on scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    const timeoutId = setTimeout(calculatePosition, 50);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, [isOpen, calculatePosition]);

  // Initial calculation when opened
  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, calculatePosition]);

  return { position };
};