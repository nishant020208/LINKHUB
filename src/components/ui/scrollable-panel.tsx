import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollablePanelProps {
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
  showFadeMasks?: boolean;
  ariaLabel?: string;
}

/**
 * Capped scroll container for Bento dashboard panels.
 * Prevents asymmetrical column collapse and infinite vertical page stretching
 * by maintaining balanced viewport heights with smooth themed scrollbars
 * and non-blocking gradient edge fade indicators.
 */
export const ScrollablePanel: React.FC<ScrollablePanelProps> = ({
  children,
  maxHeight = 'max-h-[460px]',
  className,
  showFadeMasks = true,
  ariaLabel = 'Scrollable panel items',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    // MutationObserver to re-evaluate when children list length changes
    const observer = new MutationObserver(checkScroll);
    observer.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative isolate group/scroll-panel w-full">
      {/* Top Gradient Fade Mask */}
      {showFadeMasks && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-card to-transparent pointer-events-none z-10 transition-opacity duration-200',
            canScrollUp ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Internal Scroll Area */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        className={cn(
          'w-full overflow-y-auto overscroll-contain unifyhub-scrollbar focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded-xl pr-1.5',
          maxHeight,
          className
        )}
      >
        {children}
      </div>

      {/* Bottom Gradient Fade Mask */}
      {showFadeMasks && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none z-10 transition-opacity duration-200',
            canScrollDown ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};
