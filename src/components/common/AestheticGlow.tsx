import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

/**
 * Ambient floating glow orbs for Aesthetic mode.
 * Automatically respects prefers-reduced-motion and only mounts when aesthetic mode is active.
 */
export const AestheticGlow: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mql.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
  }, []);

  if (theme !== 'aesthetic') return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <div
        className={`absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[130px] ${
          reducedMotion ? '' : 'animate-pulse'
        }`}
        style={{ animationDuration: '8s' }}
      />
      <div
        className={`absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-[#f43f5e]/15 blur-[120px] ${
          reducedMotion ? '' : 'animate-pulse'
        }`}
        style={{ animationDuration: '11s', animationDelay: '2s' }}
      />
      <div
        className={`absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full bg-[#38bdf8]/10 blur-[140px] ${
          reducedMotion ? '' : 'animate-pulse'
        }`}
        style={{ animationDuration: '14s', animationDelay: '4s' }}
      />
    </div>
  );
};
