import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// The palette actually on screen. 'dark' is night, 'light' is the daylight
// palette — a high-contrast, near-white one for reading the screen in full sun.
export type Theme = 'dark' | 'light';

// What you chose. 'auto' defers to the OS, which is the only one of the three
// that can change while the app is open.
export type ThemePref = Theme | 'auto';

const STORAGE_KEY = 'diatone.theme';

/* Browser/OS chrome colour per theme — keep in sync with --bg in index.css.
   Mirrored by the pre-paint script in index.html. */
const THEME_COLOR: Record<Theme, string> = { dark: '#0a0c10', light: '#eaeef4' };

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** What the OS is asking for right now. Night when it won't say. */
function systemTheme(): Theme {
  try {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

/** The stored choice. Night when there isn't one — the app opens dark unless
    you've said otherwise, including saying "follow the system". */
function storedPref(): ThemePref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' || raw === 'auto' ? raw : 'dark';
  } catch {
    return 'dark'; // private mode / storage disabled
  }
}

const resolve = (pref: ThemePref): Theme => (pref === 'auto' ? systemTheme() : pref);

export interface ThemeApi {
  /** The palette on screen. */
  theme: Theme;
  /** What you picked — 'auto' when the OS is driving. */
  pref: ThemePref;
  day: boolean;
  set: (p: ThemePref) => void;
  /** Night → Daylight → Auto, for the one-button control on the home screen. */
  cycle: () => void;
}

const ThemeContext = createContext<ThemeApi>({
  theme: 'dark',
  pref: 'dark',
  day: false,
  set: () => {},
  cycle: () => {},
});

const ORDER: ThemePref[] = ['dark', 'light', 'auto'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(storedPref);
  const [theme, setTheme] = useState<Theme>(() => resolve(storedPref()));

  // Follow the OS while 'auto' is selected — and only then, so a deliberate
  // choice is never overridden by the phone switching at sunset.
  useEffect(() => {
    setTheme(resolve(pref));
    if (pref !== 'auto') return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = () => setTheme(systemTheme());
    mq.addEventListener('change', onChange);
    // Installed to the home screen, the app is usually frozen when the phone
    // actually flips at sunset — so re-read on the way back in rather than
    // trusting that a change event survived the freeze.
    const onVisible = () => {
      if (document.visibilityState === 'visible') onChange();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mq.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pref]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const set = useCallback((p: ThemePref) => {
    setPref(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // storage unavailable — the choice still holds for this session
    }
  }, []);

  const cycle = useCallback(() => {
    setPref((p) => {
      const next = ORDER[(ORDER.indexOf(p) + 1) % ORDER.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable — the choice still holds for this session
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, pref, day: theme === 'light', set, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeApi => useContext(ThemeContext);
