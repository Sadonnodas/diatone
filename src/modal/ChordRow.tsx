import { renderJazz } from '../components/ChordDisplay';
import { symbols } from './modalData';

// Repeat marks and bar lines, which stay plain text between the chords.
const isBar = (token: string) => /^[‖|:]+$/.test(token);

/**
 * A row of chords — a harmonization, a vamp — set one chip per chord.
 *
 * Run together as a single line they were genuinely hard to read: seven chords
 * in the display serif with no spacing to speak of, wrapping mid-chord
 * ("VI-7(♭5)" on one line, "♭VIImaj7" on the next). A chip per chord gives the
 * eye the boundaries the notation doesn't, and each chord wraps whole.
 */
export function ChordRow({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`chord-row ${size}`}>
      {text.split(/\s+/).filter(Boolean).map((token, i) =>
        isBar(token) ? (
          <span className="bar" key={i}>
            {token}
          </span>
        ) : (
          <span className="chord-chip" key={i}>
            {renderJazz(symbols(token), `c${i}`)}
          </span>
        ),
      )}
    </span>
  );
}
