import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PwaApi {
  needRefresh: boolean; // a new version is downloaded and waiting
  updating: boolean; // an update is being applied
  checking: boolean; // a manual check is in flight
  lastChecked: number | null;
  buildTime: string;
  updateNow: () => void; // apply the new version + reload
  checkForUpdates: () => Promise<void>; // ask the SW to look for a new version
}

// Wraps vite-plugin-pwa's service-worker registration: surfaces when a new
// version is ready, checks for updates on focus + hourly, and applies an update
// reliably. Checks only succeed when online.
export function usePwa(): PwaApi {
  const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const {
    needRefresh: [needRefresh],
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      regRef.current = r;
      if (r) {
        const id = setInterval(() => r.update().catch(() => {}), 60 * 60 * 1000);
        // (interval lives for the app's lifetime; no cleanup needed)
        void id;
      }
    },
  });

  // Re-check when the app regains focus (e.g. reopened from the home screen).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') regRef.current?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      await regRef.current?.update();
    } catch {
      /* offline or unsupported */
    }
    setLastChecked(Date.now());
    setChecking(false);
  };

  // Apply the waiting version. Reload ONLY once the new worker is actually
  // controlling the page (controllerchange) — a fixed short timer can fire
  // before the new worker has taken over, so the reload would still be served
  // the old cached assets. The timeout here is just a last-resort safety net,
  // long enough not to pre-empt a normal handover.
  const updateNow = async () => {
    setUpdating(true);
    let done = false;
    const reload = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    try {
      navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });

      let r = regRef.current;
      if (!r && 'serviceWorker' in navigator) {
        r = (await navigator.serviceWorker.getRegistration()) ?? undefined;
      }
      try {
        await r?.update(); // make sure we have the freshest waiting worker
      } catch {
        /* ignore */
      }

      const waiting = r?.waiting;
      if (waiting) {
        // New worker will skipWaiting + clientsClaim → controllerchange → reload.
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (r?.installing) {
        const w = r.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed') w.postMessage({ type: 'SKIP_WAITING' });
        });
      } else {
        reload(); // nothing pending — just reload to whatever's current
      }
    } catch {
      reload();
    }
    window.setTimeout(reload, 8000); // safety net only
  };

  return {
    needRefresh,
    updating,
    checking,
    lastChecked,
    buildTime: __BUILD_TIME__,
    updateNow,
    checkForUpdates,
  };
}
