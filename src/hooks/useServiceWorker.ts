import { useCallback, useEffect, useRef, useState } from 'react';

interface SkipWaitingMessage {
  type: 'SKIP_WAITING';
}

export interface ServiceWorkerUpdateState {
  updateReady: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

/** Registers the app-shell worker in production and exposes a user-controlled update flow. */
export function useServiceWorker(): ServiceWorkerUpdateState {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadAfterControllerChangeRef = useRef(false);
  const controllerChangedInOtherTabRef = useRef(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    let disposed = false;
    let registration: ServiceWorkerRegistration | null = null;
    let installingWorker: ServiceWorker | null = null;
    let onInstallingStateChange: (() => void) | null = null;
    let hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (reloadAfterControllerChangeRef.current) {
        reloadAfterControllerChangeRef.current = false;
        window.location.reload();
        return;
      }
      // The first install is not an update. A later controller change can come
      // from another tab; let this tab save and reload only after user approval.
      if (hadController && !disposed) {
        controllerChangedInOtherTabRef.current = true;
        setUpdateReady(true);
      }
      hadController = true;
    };

    const showIfWaiting = (candidate: ServiceWorkerRegistration) => {
      if (!disposed && candidate.waiting && navigator.serviceWorker.controller) {
        setUpdateReady(true);
      }
    };

    const onUpdateFound = () => {
      const candidate = registration;
      if (!candidate) return;

      if (installingWorker && onInstallingStateChange) {
        installingWorker.removeEventListener('statechange', onInstallingStateChange);
      }

      installingWorker = candidate.installing;
      if (!installingWorker) return;

      const worker = installingWorker;
      onInstallingStateChange = () => {
        if (worker.state === 'installed') showIfWaiting(candidate);
      };
      worker.addEventListener('statechange', onInstallingStateChange);
      // Also check immediately in case installation completed before this listener ran.
      onInstallingStateChange();
    };

    const onControllerChangeBound = () => onControllerChange();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChangeBound);

    void (async () => {
      try {
        const candidate = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
        if (disposed) return;

        registration = candidate;
        registrationRef.current = candidate;
        candidate.addEventListener('updatefound', onUpdateFound);
        // register() starts an update check; inspect an in-flight installer too in case it began before listener setup.
        if (candidate.installing) onUpdateFound();
        showIfWaiting(candidate);
      } catch (error) {
        if (!disposed) console.warn('[HM26] Service worker registration failed:', error);
      }
    })();

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChangeBound);
      registration?.removeEventListener('updatefound', onUpdateFound);
      if (installingWorker && onInstallingStateChange) {
        installingWorker.removeEventListener('statechange', onInstallingStateChange);
      }
      if (registrationRef.current === registration) registrationRef.current = null;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) {
      if (controllerChangedInOtherTabRef.current) {
        controllerChangedInOtherTabRef.current = false;
        window.location.reload();
      } else setUpdateReady(false);
      return;
    }

    reloadAfterControllerChangeRef.current = true;
    const message: SkipWaitingMessage = { type: 'SKIP_WAITING' };
    waitingWorker.postMessage(message);
  }, []);

  const dismissUpdate = useCallback(() => setUpdateReady(false), []);

  return { updateReady, applyUpdate, dismissUpdate };
}
