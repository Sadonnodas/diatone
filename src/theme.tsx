import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// 'dark' is the night palette (the default), 'light' is the daylight one — a
// high-contrast, near-white palette for reading the screen in full sun.
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'diatone.theme';

/* Browser/OS chrome colour per theme — keep in sync with --bg in index.css.
   Mirrored by the pre-paint script in index.html. */
const THEME_COLOR: Record<Theme, string> = { dark: '#0a0c10', light: '#eaeef4' };

/** The explicit choice, if one was ever made. Night otherwise — the OS setting
    is deliberately ignored, so the app opens dark unless you say otherwise. */
function storedTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark'; // private mode / storage disabled
  }
}

export interface ThemeApi {
  theme: Theme;
  day: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi>({ theme: 'dark', day: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable — the choice still holds for this session
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, day: theme === 'light', toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeApi => useContext(ThemeContext);
