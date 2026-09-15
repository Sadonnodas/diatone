import { useCallback, useState } from 'react';
import NumeralsGame from './NumeralsGame';
import FretboardGame from './fretboard/FretboardGame';
import IntervalGame from './fretboard/IntervalGame';
import WarmupGame from './fretboard/WarmupGame';
import CircleGame from './circle/CircleGame';
import { ThemeIconButton } from './components/ThemeSwitch';
import { GAMES, pickGame, type GameId, type MixedHooks } from './lib/mixed';

const STORAGE_KEY = 'diatone.mixed.v1';
const DEFAULT_POOL: GameId[] = ['numerals', 'fretboard', 'intervals', 'circle'];

function loadPool(): GameId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown;
    if (Array.isArray(raw)) {
      const valid = raw.filter((g): g is GameId => GAMES.some((x) => x.id === g));
      if (valid.length) return valid;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POOL;
}

const COMPONENTS: Record<
  GameId,
  (p: { onBack: () => void; mixed: MixedHooks }) => React.ReactElement
> = {
  numerals: (p) => <NumeralsGame {...p} />,
  fretboard: (p) => <FretboardGame {...p} />,
  intervals: (p) => <IntervalGame {...p} />,
  circle: (p) => <CircleGame {...p} />,
  warmup: (p) => <WarmupGame {...p} />,
};

/**
 * A session that deals questions from several drills in turn.
 *
 * Each drill is mounted the first time it's dealt and then kept mounted —
 * hidden while it isn't its turn — rather than rebuilt per question. That way
 * every drill keeps its own history (↺ still shows your earlier questions from
 * that drill), and its next question is already waiting when it comes round
 * again. Each drill uses its own saved settings.
 */
export default function MixedGame({ onBack }: { onBack: () => void }) {
  const [pool, setPool] = useState<GameId[]>(loadPool);
  const [phase, setPhase] = useState<'setup' | 'play'>('setup');
  const [current, setCurrent] = useState<GameId | null>(null);
  const [mounted, setMounted] = useState<GameId[]>([]);
  const [streak, setStreak] = useState(0);

  const togglePool = (id: GameId) =>
    setPool((p) => {
      const next = p.includes(id) ? p.filter((g) => g !== id) : [...p, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const deal = useCallback(
    (avoid: GameId | null) => {
      const id = pickGame(pool, avoid);
      setCurrent(id);
      setMounted((m) => (m.includes(id) ? m : [...m, id]));
    },
    [pool],
  );

  const onResult = useCallback((correct: boolean) => {
    setStreak((st) => (correct ? st + 1 : 0));
  }, []);

  if (phase === 'setup') {
    return (
      <div className="app">
        <div className="top reveal" style={{ animationDelay: '.02s' }}>
          <div className="top-left">
            <button className="icon-btn" aria-label="Home" onClick={onBack}>
              ←
            </button>
          </div>
          <div className="top-right">
            <ThemeIconButton />
          </div>
        </div>
        <div className="stage setup-stage">
          <div className="setup-head reveal" style={{ animationDelay: '.04s' }}>
            <div className="setup-title">Mixed session</div>
          </div>
          <div className="setup-modes reveal" style={{ animationDelay: '.08s' }}>
            <div className="setup-label">Deal questions from</div>
            <div className="chiprow setup-chiprow">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  className={`tog${pool.includes(g.id) ? ' on' : ''}`}
                  aria-pressed={pool.includes(g.id)}
                  onClick={() => togglePool(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setup-note reveal" style={{ animationDelay: '.12s' }}>
            {pool.length === 0
              ? 'Pick at least one drill.'
              : 'Each drill uses its own settings — change them from inside it with ⚙.'}
          </div>
        </div>
        <div className="fret-actions">
          <button
            className="bigbtn"
            disabled={pool.length === 0}
            onClick={() => {
              setPhase('play');
              deal(null);
            }}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {mounted.map((id) => {
        const active = id === current;
        const mixed: MixedHooks = {
          active,
          streak,
          onResult,
          onDone: () => deal(id),
        };
        return (
          // `display: contents` keeps each drill laid out exactly as it is on
          // its own; hidden ones are simply not displayed.
          <div key={id} hidden={!active} style={active ? { display: 'contents' } : undefined}>
            {COMPONENTS[id]({ onBack, mixed })}
          </div>
        );
      })}
    </>
  );
}
