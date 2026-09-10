import { useInstrument, type Instrument } from '../audio/instrument';

const CHOICES: { value: Instrument; label: string }[] = [
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' },
];

/**
 * Which instrument playback uses. Lives in every game's settings sheet but
 * sets one app-wide preference, like the theme — the drills should all speak
 * with the same voice.
 */
export function InstrumentRow() {
  const { instrument, set } = useInstrument();
  return (
    <div>
      <div className="group-label">Playback sound</div>
      <div className="seg">
        {CHOICES.map((c) => (
          <button
            key={c.value}
            className={instrument === c.value ? 'on' : ''}
            aria-pressed={instrument === c.value}
            onClick={() => set(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="desc" style={{ marginTop: 8 }}>
        {instrument === 'piano'
          ? 'Piano states the notes plainly — the clearer reference.'
          : 'Guitar, recorded per string and fret — on the neck drills you hear the exact voicing you’re looking at.'}
      </div>
    </div>
  );
}
