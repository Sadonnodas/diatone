import type { PwaApi } from './pwa';
import { ThemeToggleButton } from './components/ThemeSwitch';

export type Screen = 'home' | 'numerals' | 'fretboard' | 'intervals' | 'warmup' | 'circle' | 'mixed';

function formatBuild(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

// A die showing five — "pick one for me".
function DieIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
      {[
        [8.5, 8.5],
        [15.5, 8.5],
        [12, 12],
        [8.5, 15.5],
        [15.5, 15.5],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="currentColor" />
      ))}
    </svg>
  );
}

// Two crossing arrows — questions from several drills, shuffled together.
function ShuffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7h3.5c2 0 3.2 1 4.4 2.7l2.2 4.6c1.2 1.7 2.4 2.7 4.4 2.7H21M3 17h3.5c2 0 3.2-1 4.4-2.7M13.1 9.7c1.2-1.7 2.4-2.7 4.4-2.7H21M18 4l3 3-3 3M18 14l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Two rings and a wedge — the circle drill at a glance.
function CircleIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <circle cx="17" cy="13" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <circle cx="17" cy="13" r="5.5" stroke="currentColor" strokeWidth="1.3" opacity="0.4" />
      <path d="M17 2a11 11 0 019.5 5.5L17 13z" fill="currentColor" opacity="0.85" />
    </svg>
  );
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

// Two notes on different strings, joined — the interval drill.
function IntervalIcon() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      {[5, 13, 21].map((y) => (
        <line key={y} x1="2" y1={y} x2="32" y2={y} stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      ))}
      {[9, 25].map((x) => (
        <line key={x} x1={x} y1="2" x2={x} y2="24" stroke="currentColor" strokeWidth="1.2" opacity="0.35" />
      ))}
      <line
        x1="7"
        y1="21"
        x2="19"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.7"
        strokeDasharray="3 2.5"
      />
      <circle cx="7" cy="21" r="3.4" fill="currentColor" />
      <circle cx="19" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function Home({
  onPick,
  onRandom,
  pwa,
}: {
  onPick: (g: Screen) => void;
  onRandom: () => void;
  pwa: PwaApi;
}) {
  return (
    <div className="app home">
      <ThemeToggleButton className="home-theme reveal" />

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
            <div className="gc-desc">Numerals ↔ chords in all 12 keys</div>
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
          onClick={() => onPick('intervals')}
        >
          <div className="gc-icon">
            <IntervalIcon />
          </div>
          <div className="gc-text">
            <div className="gc-title">Intervals</div>
            <div className="gc-desc">Name the gap between two notes</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>

        <button
          className="gamecard reveal"
          style={{ animationDelay: '.28s' }}
          onClick={() => onPick('circle')}
        >
          <div className="gc-icon">
            <CircleIcon />
          </div>
          <div className="gc-text">
            <div className="gc-title">Circle</div>
            <div className="gc-desc">Fill the gaps in the circle of fifths</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>

        <button
          className="gamecard reveal"
          style={{ animationDelay: '.34s' }}
          onClick={() => onPick('warmup')}
        >
          <div className="gc-icon">
            <RectStackIcon />
          </div>
          <div className="gc-text">
            <div className="gc-title">Warm-up</div>
            <div className="gc-desc">Rectangle & stack shape degrees</div>
          </div>
          <div className="gc-arrow">→</div>
        </button>
      </div>

      {/* Ways in that aren't one particular drill. */}
      <div className="home-modes reveal" style={{ animationDelay: '.38s' }}>
        <button className="home-mode" onClick={onRandom}>
          <DieIcon />
          <span>
            <b>Random drill</b>
            <small>pick one for me</small>
          </span>
        </button>
        <button className="home-mode" onClick={() => onPick('mixed')}>
          <ShuffleIcon />
          <span>
            <b>Mixed</b>
            <small>questions from several</small>
          </span>
        </button>
      </div>

      <div className="home-foot reveal" style={{ animationDelay: '.44s' }}>
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
