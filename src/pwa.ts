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

  // Apply the waiting version. Don't rely on workbox-window's implicit
  // controllerchange→reload (it can silently fail): activate the waiting worker
  // ourselves, reload when it takes control, and hard-reload as a fallback so
  // the banner can never get stuck.
  const updateNow = async () => {
    setUpdating(true);
    const reload = () => {
      window.location.reload();
    };
    try {
      navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true });

      let r = regRef.current;
      if (!r && 'serviceWorker' in navigator) {
        r = await navigator.serviceWorker.getRegistration();
      }
      // Make sure we have the freshest waiting worker.
      try {
        await r?.update();
      } catch {
        /* ignore */
      }

      const waiting = r?.waiting ?? r?.installing;
      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      /* fall through to the fallback reload */
    }
    // If controllerchange doesn't fire promptly (no waiting worker, or the SW
    // doesn't hand over control), reload anyway to pick up the latest.
    setTimeout(reload, 2000);
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
