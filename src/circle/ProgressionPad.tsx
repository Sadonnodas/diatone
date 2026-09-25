import { prettyChord } from './CircleWheel';
import { renderJazz } from '../components/ChordDisplay';

export interface ProgressionCell {
  degree: string;
  /** The chord, once the step is done — the right one either way; `right` says
      whether you found its slot and spelled it. */
  chord?: string;
  right?: boolean;
  /** The two halves apart, matching the wedge: the cell's border is the slot
      you tapped, the chord's letters the chord you built. */
  fieldRight?: boolean;
  chordRight?: boolean;
}

/**
 * The progression being spelled out: each numeral with its chord under it. A
 * compact strip rather than a keypad-sized pad, because the chord keypad needs
 * the bottom of the screen — you tap the slot, then build the chord.
 */
export function ProgressionStrip({ cells, step }: { cells: ProgressionCell[]; step: number }) {
  return (
    <div className="prog-strip">
      {cells.map((c, i) => (
        <div
          key={i}
          className={`prog-cell${i === step ? ' live' : ''}${
            c.chord ? (c.fieldRight ?? c.right ? ' ok' : ' no') : ''
          }`}
        >
          <span className="prog-degree">{c.degree}</span>
          <span className={`prog-chord${c.chord ? (c.chordRight ?? c.right ? ' ok' : ' no') : ''}`}>
            {c.chord ? <span>{renderJazz(prettyChord(c.chord), `pc${i}`)}</span> : '·'}
          </span>
        </div>
      ))}
    </div>
  );
}
