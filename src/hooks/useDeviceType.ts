import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'desktop';

/**
 * Evaluates whether the current environment is a desktop workstation:
 * Requires viewport width >= 1024px AND (hover: hover) AND (pointer: fine).
 *
 * Touch tablets (even large iPads or Android tablets >= 1024px) have (pointer: coarse)
 * and (hover: none), and are therefore categorized as 'mobile' to preserve the touch-first UX.
 */
function checkIsDesktop(): boolean {
  if (typeof window === 'undefined') return false;

  const widthOk = window.innerWidth >= 1024;
  const hoverOk = window.matchMedia ? window.matchMedia('(hover: hover)').matches : false;
  const pointerOk = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : false;

  return widthOk && hoverOk && pointerOk;
}

export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    return checkIsDesktop() ? 'desktop' : 'mobile';
  });

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleResizeOrOrientation = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        const nextType: DeviceType = checkIsDesktop() ? 'desktop' : 'mobile';
        setDeviceType((prev) => (prev !== nextType ? nextType : prev));
      }, 150);
    };

    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);

    // Re-check media query changes specifically if supported
    const hoverQuery = window.matchMedia?.('(hover: hover)');
    const pointerQuery = window.matchMedia?.('(pointer: fine)');

    hoverQuery?.addEventListener?.('change', handleResizeOrOrientation);
    pointerQuery?.addEventListener?.('change', handleResizeOrOrientation);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResizeOrOrientation);
      window.removeEventListener('orientationchange', handleResizeOrOrientation);
      hoverQuery?.removeEventListener?.('change', handleResizeOrOrientation);
      pointerQuery?.removeEventListener?.('change', handleResizeOrOrientation);
    };
  }, []);

  return deviceType;
}
