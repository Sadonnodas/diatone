import type { ReactNode } from 'react';
import type { ReviewControls } from '../lib/mixed';

/**
 * The bottom of the screen while looking back at a past question — the same in
 * every drill. The question itself stays where it was asked, drawn as it was
 * answered; this bar takes the keypad's place, and the whole screen gets an
 * accent edge (`.app.reviewing`), so a review never passes for a live question.
 */
export function ReviewBar({
  rv,
  ok,
  verdict,
}: {
  rv: ReviewControls;
  ok: boolean;
  /** Short: "Right", "Wrong", "2 of 3 right". */
  verdict: ReactNode;
}) {
  return (
    <div className="review-bar" onClick={(e) => e.stopPropagation()}>
      <div className="review-head">
        <span className="review-tag">
          <span aria-hidden>↺</span> Review
        </span>
        <span className={`review-verdict ${ok ? 'ok' : 'no'}`}>
          {ok ? '✓' : '✗'} {verdict}
        </span>
        <span className="review-pos">
          {rv.position} of {rv.count}
        </span>
      </div>
      <div className="review-nav">
        <button onClick={() => rv.nav(-1)} disabled={rv.atOldest}>
          ← Older
        </button>
        <button className="review-return" onClick={rv.exit}>
          Back to play
        </button>
        <button onClick={() => rv.nav(1)} disabled={rv.atNewest}>
          Newer →
        </button>
      </div>
    </div>
  );
}
