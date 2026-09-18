import { renderJazz } from '../components/ChordDisplay';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/**
 * Build a note name, then answer. The same chromatic tap-to-build idea the
 * Numerals drill uses — you produce the name from recall rather than picking
 * it out of a line-up of twelve. The ring says whether it's a major or a
 * minor, so only the root is ever typed — but the answer reads as the chord
 * ("Am", not "A"), so a minor gap is plainly answered with a minor.
 */
export function NameKeypad({
  letter,
  acc,
  onLetter,
  onAcc,
  onClear,
  onAnswer,
  disabled,
  suffix = '',
}: {
  letter: string | null;
  acc: '' | 'b' | '#';
  onLetter: (l: string) => void;
  onAcc: (a: 'b' | '#') => void;
  onClear: () => void;
  onAnswer: () => void;
  disabled: boolean;
  /** The quality the gap's ring gives the answer: 'm' on the minor ring. */
  suffix?: string;
}) {
  return (
    <div className="pad">
      <div className="cap">name</div>
      <div className="row">
        {LETTERS.map((l) => (
          <button
            key={l}
            className={`key${letter === l ? ' sel' : ''}`}
            onClick={() => onLetter(l)}
            disabled={disabled}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="row">
        <button
          className={`key${acc === 'b' ? ' sel' : ''}`}
          onClick={() => onAcc('b')}
          disabled={disabled || !letter}
        >
          ♭
        </button>
        <button
          className={`key${acc === '#' ? ' sel' : ''}`}
          onClick={() => onAcc('#')}
          disabled={disabled || !letter}
        >
          ♯
        </button>
        <button className="key util" onClick={onClear} disabled={disabled || !letter}>
          ⌫
        </button>
      </div>

      <div className="cap">tap to answer</div>
      <div className="row">
        <button className="key q wide" onClick={onAnswer} disabled={disabled || !letter}>
          <span className="q-glyph">
            {letter
              ? renderJazz(letter + (acc === 'b' ? 'b' : acc === '#' ? '#' : '') + suffix, 'nk')
              : '—'}
          </span>
        </button>
      </div>
    </div>
  );
}
