import { prettyChord } from './CircleWheel';
import { renderJazz } from '../components/ChordDisplay';

export interface ProgressionCell {
  degree: string;
  /** The chord written in so far — always the right one; `right` says whether
      you found it. */
  chord?: string;
  right?: boolean;
}

/**
 * The progression being spelled: each numeral, with its chord written under it
 * as you find its slot. Sits on `.pad`, so it reserves the keypad's height and
 * the wedge above doesn't move between this and the other wedge questions.
 */
export function ProgressionPad({
  cells,
  step,
  onReplay,
}: {
  cells: ProgressionCell[];
  step: number;
  onReplay?: () => void;
}) {
  return (
    <div className="pad progression-pad">
      <div className="cap">progression</div>
      <div className="prog-row">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`prog-cell${i === step ? ' live' : ''}${
              c.chord ? (c.right ? ' ok' : ' no') : ''
            }`}
          >
            <div className="prog-degree">{c.degree}</div>
            <div className="prog-chord">
              {c.chord ? <span>{renderJazz(prettyChord(c.chord), `pc${i}`)}</span> : '·'}
            </div>
          </div>
        ))}
      </div>
      <div className="prog-foot">
        {onReplay && (
          <button className="hear" onClick={onReplay}>
            ▶ hear the progression
          </button>
        )}
      </div>
    </div>
  );
}
