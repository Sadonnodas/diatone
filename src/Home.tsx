import type { PwaApi } from './pwa';

export type Screen = 'home' | 'numerals' | 'fretboard' | 'warmup';

function formatBuild(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function RectStackIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="13" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <circle cx="20" cy="9" r="2.6" fill="currentColor" />
      <circle cx="28" cy="9" r="2.6" fill="currentColor" />
      <circle cx="20" cy="17" r="2.6" fill="currentColor" />
      <circle cx="28" cy="17" r="2.6" fill="currentColor" />
    </svg>
  );
}

function FretIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      {[4, 10, 16, 22].map((x) => (
        <line key={x} x1={x} y1="2" x2={x} y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      ))}
      {[5, 11, 17, 23].map((y) => (
        <line key={y} x1="2" y1={y} x2="32" y2={y} stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      ))}
      <circle cx="13" cy="11" r="3.2" fill="currentColor" />
      <circle cx="19" cy="17" r="3.2" fill="currentColor" />
      <circle cx="7" cy="23" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default function Home({ onPick, pwa }: { onPick: (g: Screen) => void; pwa: PwaApi }) {
  return (
    <div className="app home">
      <div className="home-head reveal" style={{ animationDelay: '.04s' }}>
        <div className="mark">
          Dia<b>tone</b>
        </div>
        <div className="home-sub">guitar harmony drills</div>
      </div>

      <div className="home-cards">
        <button
          className="gamecard reveal"
          style={{ animationDelay: '.1s' }}
          onClick={() => onPick('numerals')}
        >
          <div className="gc-icon serif">II</div>
          <div className="gc-text">
            <div className="gc-title">Numerals</div>
            <div className="gc-desc">Roman numerals ↔ chords in all 12 keys</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>

        <button
          className="gamecard reveal"
          style={{ animationDelay: '.16s' }}
          onClick={() => onPick('fretboard')}
        >
          <div className="gc-icon">
            <FretIcon />
          </div>
          <div className="gc-text">
            <div className="gc-title">Fretboard</div>
            <div className="gc-desc">Find scale degrees in CAGED shapes</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>

        <button
          className="gamecard reveal"
          style={{ animationDelay: '.22s' }}
          onClick={() => onPick('warmup')}
        >
          <div className="gc-icon">
            <RectStackIcon />
          </div>
          <div className="gc-text">
            <div className="gc-title">Warm-up</div>
            <div className="gc-desc">Degrees in the rectangle & stack shapes</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>
      </div>

      <div className="home-foot reveal" style={{ animationDelay: '.28s' }}>
        {pwa.needRefresh ? (
          <button className="update-link on" onClick={pwa.updateNow} disabled={pwa.updating}>
            {pwa.updating ? 'Updating…' : 'Update to latest'}
          </button>
        ) : (
          <button className="update-link" onClick={pwa.checkForUpdates} disabled={pwa.checking}>
            {pwa.checking ? 'Checking…' : 'Check for updates'}
          </button>
        )}
        <div className="home-version">
          {pwa.lastChecked !== null && !pwa.needRefresh && !pwa.checking && 'Up to date · '}
          installed {formatBuild(pwa.buildTime)}
        </div>
      </div>
    </div>
  );
}
