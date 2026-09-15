import { prettyChord } from './CircleWheel';
import { renderJazz } from '../components/ChordDisplay';

/**
 * The pick style's answer pad: six chords for the highlighted slot. Laid out on
 * the same `.pad` as the chord keypad, so it reserves the same height — in a
 * build/pick mix the wedge above doesn't move between questions.
 */
export function OptionPad({
  options,
  disabled,
  onPick,
}: {
  options: string[];
  disabled: boolean;
  onPick: (chord: string) => void;
}) {
  const rows = [options.slice(0, 3), options.slice(3, 6)];
  return (
    <div className="pad option-pad">
      <div className="cap">tap to answer</div>
      {rows.map((row, r) => (
        <div className="row" key={r}>
          {row.map((c) => (
            <button key={c} className="key option" onClick={() => onPick(c)} disabled={disabled}>
              {/* One span: .key stacks its children in a column, which would put
                  the root, accidental and quality on three lines. */}
              <span>{renderJazz(prettyChord(c), `o${c}`)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
