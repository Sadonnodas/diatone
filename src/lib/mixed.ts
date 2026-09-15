// What a drill needs to take part in a mixed session. Every drill accepts it as
// an optional `mixed` prop; without it, a drill behaves exactly as it does on
// its own.

export type GameId = 'numerals' | 'fretboard' | 'intervals' | 'circle' | 'warmup';

export const GAMES: { id: GameId; label: string }[] = [
  { id: 'numerals', label: 'Numerals' },
  { id: 'fretboard', label: 'Fretboard' },
  { id: 'intervals', label: 'Intervals' },
  { id: 'circle', label: 'Circle' },
  { id: 'warmup', label: 'Warm-up' },
];

/** The drills the home screen's Random button picks from — the warm-up isn't
    an exercise in its own right. */
export const RANDOM_GAMES: GameId[] = ['numerals', 'fretboard', 'intervals', 'circle'];

export interface MixedHooks {
  /** This drill is the one on screen. The others stay mounted, hidden, so each
      keeps its own history to review and its next question ready. */
  active: boolean;
  /** The session's streak, shown in place of the drill's own. */
  streak: number;
  /** Every graded answer, right or wrong. */
  onResult: (correct: boolean) => void;
  /** The drill has moved past its question — by auto-advance or a tap — and
      has its next one ready. The session decides which drill comes next. */
  onDone: () => void;
}

/** Pick uniformly from `pool`, avoiding `avoid` when there's anything else. */
export function pickGame(pool: GameId[], avoid?: GameId | null, rand: () => number = Math.random): GameId {
  const fresh = pool.length > 1 ? pool.filter((g) => g !== avoid) : pool;
  return fresh[Math.floor(rand() * fresh.length)];
}
