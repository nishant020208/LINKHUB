import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setCoarse(mq.matches);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return coarse;
}
