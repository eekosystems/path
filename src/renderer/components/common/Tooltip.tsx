import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'auto' }) => {
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const updatePosition = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // Calculate tooltip dimensions (estimate if not yet rendered)
      const tooltipWidth = tooltipRef.current?.offsetWidth || 150;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 30;
      
      let finalPosition = position === 'auto' ? 'top' : position;
      let top = 0;
      let left = 0;

      // Calculate available space in each direction
      const spaceTop = rect.top;
      const spaceBottom = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      // Auto-positioning logic
      if (position === 'auto') {
        if (spaceTop > tooltipHeight + 8) {
          finalPosition = 'top';
        } else if (spaceBottom > tooltipHeight + 8) {
          finalPosition = 'bottom';
        } else if (spaceRight > tooltipWidth + 8) {
          finalPosition = 'right';
        } else if (spaceLeft > tooltipWidth + 8) {
          finalPosition = 'left';
        }
      }

      // Calculate exact position based on direction
      switch (finalPosition) {
        case 'top':
          top = rect.top - tooltipHeight - 8;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
      }

      setTooltipPosition(finalPosition);
      setCoords({ top, left });
    };

    updatePosition();
    
    // Update position on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, position]);

  const getTooltipStyles = () => {
    const styles: React.CSSProperties = {
      position: 'fixed',
      top: `${coords.top}px`,
      left: `${coords.left}px`,
      zIndex: 9999,
    };

    // Adjust transform based on position
    switch (tooltipPosition) {
      case 'top':
      case 'bottom':
        styles.transform = 'translateX(-50%)';
        break;
      case 'left':
      case 'right':
        styles.transform = 'translateY(-50%)';
        break;
    }

    return styles;
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800'
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="inline-flex items-center"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          ref={tooltipRef}
          style={getTooltipStyles()}
          className={`max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2 transition-opacity duration-200 pointer-events-none whitespace-nowrap ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {text}
          <div className={`absolute w-0 h-0 border-4 ${arrowClasses[tooltipPosition]}`} />
        </div>,
        document.body
      )}
    </>
  );
};