import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../ui/kit';
import { useReducedMotion } from '../useReducedMotion';
import './cinematic.css';

type CameraTarget = 'manager' | 'opponent';
export type CameraCue = { key: string; target: CameraTarget } | null;
type CameraContextValue = { enabled: boolean; reduced: boolean };
const CameraContext = createContext<CameraContextValue>({ enabled: true, reduced: false });

/** The scene is wide by default. A meaningful line briefly gets a gentle close-up;
 * neither the camera nor its timers advance or block a game decision. */
export function useCinematicShot(cue: CameraCue): 'wide' | CameraTarget {
  const { enabled, reduced } = useContext(CameraContext);
  const [shot, setShot] = useState<'wide' | CameraTarget>('wide');
  const key = cue?.key;
  const target = cue?.target;
  useEffect(() => {
    setShot('wide');
    if (!enabled || reduced || !key || !target) return;
    const move = window.setTimeout(() => setShot(target), 450);
    const returnToWide = window.setTimeout(() => setShot('wide'), 2700);
    return () => { window.clearTimeout(move); window.clearTimeout(returnToWide); };
  }, [enabled, reduced, key, target]);
  return enabled && !reduced ? shot : 'wide';
}

/** A real full-viewport layer, not a taller bottom sheet. It shares the existing
 * dialog focus stack, restores the opener, and can be non-dismissable for a match. */
export const CinematicOverlay: React.FC<{
  open: boolean;
  title: string;
  onClose?: () => void;
  reducedMotion?: boolean;
  children: React.ReactNode;
}> = ({ open, title, onClose, reducedMotion = false, children }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(open, { lockBody: true, onEscape: onClose });
  const titleId = React.useId();
  const reduced = useReducedMotion(reducedMotion);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  useEffect(() => { if (open) setCameraEnabled(true); }, [open]);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="cinematic-overlay" data-testid="cinematic-overlay" data-motion={reduced ? 'reduced' : cameraEnabled ? 'camera' : 'fixed'}>
      <div ref={trapRef} tabIndex={-1} className="cinematic-overlay__window" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="cinematic-overlay__header">
          <div className="cinematic-overlay__title"><span>HM26 · SAHNE</span><h2 id={titleId}>{title}</h2></div>
          <div className="cinematic-overlay__tools">
            <button type="button" data-testid="cinematic-camera-toggle" className="cinematic-overlay__camera"
              aria-label={reduced ? 'Azaltılmış hareket açık; kamera sabit' : cameraEnabled ? 'Kamerayı sabitle' : 'Kamera hareketini aç'}
              aria-pressed={cameraEnabled && !reduced} disabled={reduced} onClick={() => setCameraEnabled((value) => !value)}>
              <span className="cinematic-overlay__camera-icon" aria-hidden="true">◉</span> <span className="cinematic-overlay__camera-label">{reduced || !cameraEnabled ? 'Sabit' : 'Kamera'}</span>
            </button>
            {onClose && <button type="button" className="cinematic-overlay__close" aria-label="Kapat" onClick={onClose}>×</button>}
          </div>
        </header>
        <CameraContext.Provider value={{ enabled: cameraEnabled, reduced }}>{children}</CameraContext.Provider>
      </div>
    </div>, document.body,
  );
};

/** Persistent stage + subtitle + independently scrollable decisions. The scene
 * stays visible on phones even when a long offer needs scrolling. */
export const CinematicLayout = React.forwardRef<HTMLDivElement, {
  scene: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
  stage?: string;
  className?: string;
}>(function CinematicLayout({ scene, subtitle, children, testId, stage, className = '' }, ref) {
  return <div ref={ref} className={`cinematic-layout ${className}`} data-testid={testId} data-stage={stage}>
    <div className="cinematic-layout__scene">{scene}</div>
    <div className="cinematic-layout__subtitle">{subtitle}</div>
    <div className="cinematic-layout__content overflow-y-auto" data-testid="cinematic-decisions">
      <div className="cinematic-layout__inner">{children}</div>
    </div>
  </div>;
});

/** A repeated gesture from a previous decision must not activate the new
 * confirmation. A fresh click or key press remains immediately available. */
export const CinematicActionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => <div
  onClickCapture={(event) => { if (event.detail > 1) { event.preventDefault(); event.stopPropagation(); } }}
  onKeyDownCapture={(event) => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); } }}>
  {children}
</div>;

export function resetCinematicScroll(root: HTMLElement | null) {
  const content = root?.querySelector<HTMLElement>('[data-testid="cinematic-decisions"]');
  if (content) content.scrollTop = 0;
}
