// Lightweight haptics. navigator.vibrate works on Android Chrome; iOS Safari /
// standalone PWAs ignore it, so this is a no-op there (guarded, never throws).
export const haptic = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    /* unsupported */
  }
};

export const TAP = 5;
export const CORRECT = 16;
export const WRONG = [0, 38, 36, 38];
