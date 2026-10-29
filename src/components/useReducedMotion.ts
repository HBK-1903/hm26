import { useEffect, useState } from 'react';

/** Hem kariyer tercihini hem de işletim sistemi hareket tercihini gözetir. */
export function useReducedMotion(preference: boolean): boolean {
  const [system, setSystem] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystem(media.matches);
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener?.(update);
    return () => { if (media.removeEventListener) media.removeEventListener('change', update); else media.removeListener?.(update); };
  }, []);
  return preference || system;
}
