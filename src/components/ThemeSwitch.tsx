import { useTheme } from '../theme';

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

// Corner control on the home screen — shows the palette you're in, tap to swap.
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { day, toggle } = useTheme();
  return (
    <button
      className={`theme-btn ${className}`}
      role="switch"
      aria-checked={day}
      aria-label="Daylight mode"
      onClick={toggle}
    >
      {day ? <SunIcon /> : <MoonIcon />}
      <span>{day ? 'Daylight' : 'Night'}</span>
    </button>
  );
}

// The same switch as a settings row, so you can flip it mid-drill.
export function ThemeSettingRow() {
  const { day, toggle } = useTheme();
  return (
    <div className="setting-row">
      <div>
        <div className="label">Daylight mode</div>
        <div className="desc">High-contrast light palette for bright sun.</div>
      </div>
      <button
        className={`switch${day ? ' on' : ''}`}
        role="switch"
        aria-checked={day}
        aria-label="Daylight mode"
        onClick={toggle}
      />
    </div>
  );
}
