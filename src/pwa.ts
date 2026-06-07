import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PwaApi {
  needRefresh: boolean; // a new version is downloaded and waiting
  checking: boolean; // a manual check is in flight
  lastChecked: number | null;
  buildTime: string;
  updateNow: () => void; // apply the new version + reload
  checkForUpdates: () => Promise<void>; // ask the SW to look for a new version
}

// Wraps vite-plugin-pwa's service-worker registration: surfaces when a new
// version is ready, checks for updates on focus + hourly, and exposes a manual
// "check now" for the settings sheet. Checks only succeed when online.
export function usePwa(): PwaApi {
  const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
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

  return {
    needRefresh,
    checking,
    lastChecked,
    buildTime: __BUILD_TIME__,
    updateNow: () => updateServiceWorker(true),
    checkForUpdates,
  };
}
