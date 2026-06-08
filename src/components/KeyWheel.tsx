import { ALL_KEYS, ENHARMONIC_KEYS } from '../lib/chordData';
import { renderJazz } from './ChordDisplay';

// Circle-of-fifths key picker (with Gb offered as the enharmonic extra), shared
// by the settings sheet and the Numerals setup screen.
export function KeyWheel({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (k: string) => void;
}) {
  return (
    <div className="wheel-wrap">
      <div className="wheel">
        {ALL_KEYS.map((k, i) => {
          const angle = (-90 + i * 30) * (Math.PI / 180);
          const r = 105;
          const x = 128 + r * Math.cos(angle);
          const y = 128 + r * Math.sin(angle);
          const on = selected.includes(k);
          return (
            <button
              key={k}
              className={`kbtn${on ? ' on' : ''}`}
              style={{ left: `${x}px`, top: `${y}px` }}
              onClick={() => onToggle(k)}
            >
              {renderJazz(k, `w${k}`)}
            </button>
          );
        })}
        <div className="wheel-center">
          {selected.length} key{selected.length === 1 ? '' : 's'} selected
        </div>
      </div>
      <div className="enh-row">
        <span>Enharmonic:</span>
        {ENHARMONIC_KEYS.map((k) => (
          <button
            key={k}
            className={`tog${selected.includes(k) ? ' on' : ''}`}
            onClick={() => onToggle(k)}
          >
            {renderJazz(k, `e${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
