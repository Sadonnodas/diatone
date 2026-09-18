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
  /** Set while the session's review is showing one of this drill's past
      questions. Review in a mixed session walks the whole session in order,
      switching drills as it goes, so ↺ in any drill can reach the others. */
  review: MixedReview | null;
  /** The session has something to review, even if this drill doesn't yet. */
  canReview: boolean;
  /** ↺ was tapped: start reviewing the session from its latest question. */
  onReview: () => void;
  /** Older (-1) or newer (+1); newer from the latest returns to play. */
  onReviewNav: (dir: -1 | 1) => void;
  onReviewExit: () => void;
}

export interface MixedReview {
  /** How many of this drill's own questions came after the one shown — 0 is
      its latest. Counted from the end so it holds however the drill stores
      its history. */
  back: number;
  /** 1-based place in the whole session, and the session's length. */
  position: number;
  count: number;
}

/** The index into a drill's own history that the session's review points at. */
export const mixedReviewIndex = (review: MixedReview, historyLength: number): number =>
  Math.max(0, historyLength - 1 - review.back);

/** Pick uniformly from `pool`, avoiding `avoid` when there's anything else. */
export function pickGame(pool: GameId[], avoid?: GameId | null, rand: () => number = Math.random): GameId {
  const fresh = pool.length > 1 ? pool.filter((g) => g !== avoid) : pool;
  return fresh[Math.floor(rand() * fresh.length)];
}

export interface ReviewControls {
  /** Index into the drill's own history being shown; null when playing. */
  index: number | null;
  canEnter: boolean;
  enter: () => void;
  nav: (dir: -1 | 1) => void;
  exit: () => void;
  atOldest: boolean;
  atNewest: boolean;
  /** 1-based, for "3 of 7". */
  position: number;
  count: number;
}

/**
 * A drill's review, driven either by the drill itself (its own history) or,
 * in a mixed session, by the session (every drill's history, in the order it
 * was played). `own`/`setOwn` are the drill's own review index state.
 */
export function reviewControls(
  own: number | null,
  setOwn: (i: number | null) => void,
  historyLength: number,
  mixed: MixedHooks | undefined,
): ReviewControls {
  if (mixed) {
    const r = mixed.review;
    return {
      index: r ? mixedReviewIndex(r, historyLength) : null,
      canEnter: mixed.canReview,
      enter: mixed.onReview,
      nav: mixed.onReviewNav,
      exit: mixed.onReviewExit,
      atOldest: !r || r.position <= 1,
      atNewest: !r || r.position >= r.count,
      position: r?.position ?? 0,
      count: r?.count ?? 0,
    };
  }
  return {
    index: own,
    canEnter: historyLength > 0,
    enter: () => {
      if (historyLength > 0) setOwn(historyLength - 1);
    },
    nav: (dir) => {
      if (own !== null) setOwn(Math.max(0, Math.min(historyLength - 1, own + dir)));
    },
    exit: () => setOwn(null),
    atOldest: own === null || own <= 0,
    atNewest: own === null || own >= historyLength - 1,
    position: (own ?? 0) + 1,
    count: historyLength,
  };
}
