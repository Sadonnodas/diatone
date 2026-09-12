import { useTheme, type ThemePref } from '../theme';

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      {[
        [12, 2, 12, 4.4],
        [12, 19.6, 12, 22],
        [2, 12, 4.4, 12],
        [19.6, 12, 22, 12],
        [5.2, 5.2, 6.9, 6.9],
        [17.1, 17.1, 18.8, 18.8],
        [18.8, 5.2, 17.1, 6.9],
        [6.9, 17.1, 5.2, 18.8],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Half a moon, half a sun — the OS is deciding, so show both.
function AutoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 4a8 8 0 000 16z" fill="currentColor" />
    </svg>
  );
}

const LABEL: Record<ThemePref, string> = { dark: 'Night', light: 'Daylight', auto: 'Auto' };

function PrefIcon({ pref, day }: { pref: ThemePref; day: boolean }) {
  if (pref === 'auto') return <AutoIcon />;
  return day ? <SunIcon /> : <MoonIcon />;
}

// Corner control on the home screen — shows what's driving the palette, tap to
// move through night → daylight → auto.
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { pref, day, cycle } = useTheme();
  return (
    <button
      className={`theme-btn ${className}`}
      aria-label={`Palette: ${LABEL[pref]}. Tap to change.`}
      onClick={cycle}
    >
      <PrefIcon pref={pref} day={day} />
      <span>{LABEL[pref]}</span>
    </button>
  );
}

const CHOICES: ThemePref[] = ['dark', 'light', 'auto'];

// The same choice as a settings row, so you can change it mid-drill.
export function ThemeSettingRow() {
  const { pref, theme, set } = useTheme();
  return (
    <div>
      <div className="group-label">Palette</div>
      <div className="seg">
        {CHOICES.map((c) => (
          <button
            key={c}
            className={pref === c ? 'on' : ''}
            aria-pressed={pref === c}
            onClick={() => set(c)}
          >
            {LABEL[c]}
          </button>
        ))}
      </div>
      <div className="desc" style={{ marginTop: 8 }}>
        {pref === 'auto'
          ? `Following your phone — ${theme === 'light' ? 'daylight' : 'night'} right now.`
          : pref === 'light'
            ? 'High-contrast light palette for bright sun.'
            : 'The night palette, whatever your phone is set to.'}
      </div>
    </div>
  );
}
