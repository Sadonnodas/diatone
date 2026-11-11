import { useEffect, useRef, useState } from 'react';
import { CircleWheel, prettyChord } from './CircleWheel';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { keySignature, neighbours, relativeMinor, signatureText } from './keySignature';
import { renderJazz } from '../components/ChordDisplay';
import { chordToJazz } from '../lib/jazz';
import { InfoModal } from '../components/InfoModal';
import { ThemeIconButton } from '../components/ThemeSwitch';
import { haptic, TAP } from '../lib/haptics';
import { armUnlock, releaseAudio, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playChord, playProgression, prefetchChords } from '../audio/phrases';
import { chordToMidi } from '../audio/harmony';

const STORAGE_KEY = 'diatone.wheel.v1';

interface ToolState {
  key: string;
  sevenths: boolean;
  playback: boolean;
}

const DEFAULTS: ToolState = { key: 'C', sevenths: false, playback: true };

function load(): ToolState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ToolState>;
      return {
        ...DEFAULTS,
        ...saved,
        key: saved.key && ALL_KEYS.includes(saved.key) ? saved.key : DEFAULTS.key,
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

/**
 * The wheel as a reference rather than a drill: tap a key and read what sits
 * around it — its signature, its seven chords, its relative minor, and the two
 * neighbours that are its IV and V. Nothing is hidden and nothing is scored.
 */
export default function CircleTool({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ToolState>(load);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sounding, setSounding] = useState<number | null>(null);
  const { instrument } = useInstrument();
  const timer = useRef<number | null>(null);

  const { key, sevenths, playback } = state;
  // Triads read as the wheel prints them (Dm, B°); sevenths take the jazz
  // notation the rest of the app uses for them (D-7, Dø7).
  const label = (chord: string) => (sevenths ? chordToJazz(chord) : prettyChord(chord));
  const pos = ALL_KEYS.indexOf(key);
  const form = chordData[key][sevenths ? 'sevenths' : 'triads'];
  const sig = keySignature(key);
  const { down, up } = neighbours(key);

  const update = (patch: Partial<ToolState>) => setState((s) => ({ ...s, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => armUnlock(playback), [playback]);

  // Warm the key's chords so the first tap sounds straight away.
  useEffect(() => {
    if (!playback) return;
    const chords = form.chords.map(chordToMidi).filter((c): c is number[] => c !== null);
    if (chords.length) prefetchChords(instrument, chords);
  }, [form, instrument, playback]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopAll();
      releaseAudio();
    },
    [],
  );

  const sound = (i: number) => {
    haptic(TAP);
    if (!playback) return;
    const notes = chordToMidi(form.chords[i]);
    if (!notes) return;
    setSounding(i);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSounding(null), 900);
    void playChord(instrument, notes);
  };

  // I – IV – V – I: the three chords the wheel puts side by side.
  const soundCadence = () => {
    haptic(TAP);
    if (!playback) return;
    const chords = [0, 3, 4, 0]
      .map((d) => chordToMidi(form.chords[d]))
      .filter((c): c is number[] => c !== null);
    if (chords.length === 4) void playProgression(instrument, chords);
  };

  const pickKey = (p: number) => {
    haptic(TAP);
    stopAll();
    setSounding(null);
    update({ key: ALL_KEYS[p] });
  };

  return (
    <div className="app">
      <div className="top reveal" style={{ animationDelay: '.02s' }}>
        <div className="top-left">
          <button className="icon-btn" aria-label="Home" onClick={onBack}>
            ←
          </button>
          <div className="tool-title">Circle of fifths</div>
        </div>
        <div className="top-right">
          <button
            className={`chip-mini${sevenths ? ' on' : ''}`}
            aria-label="7th chords"
            aria-pressed={sevenths}
            onClick={() => update({ sevenths: !sevenths })}
          >
            <span className="q-glyph">△7</span>
          </button>
          <button
            className={`chip-mini${playback ? ' on' : ''}`}
            aria-label="Sound"
            aria-pressed={playback}
            onClick={() => update({ playback: !playback })}
          >
            ▶
          </button>
          <button className="icon-btn" aria-label="How it works" onClick={() => setInfoOpen(true)}>
            ?
          </button>
          <ThemeIconButton />
        </div>
      </div>

      <div className="stage tool-stage">
        <div className="cof-wheel reveal" style={{ animationDelay: '.06s' }}>
          <CircleWheel blanks={[]} marks={{}} keyPos={pos} onTapPos={pickKey} />
        </div>

        <div className="tool-key reveal" style={{ animationDelay: '.1s' }}>
          <span className="tool-key-name">{renderJazz(key, 'tk')}</span>
          <span className="tool-key-sub">
            {signatureText(key)}
            {sig.accidentals.length > 0 && (
              <span className="tool-accs"> · {sig.accidentals.join(' ')}</span>
            )}
          </span>
        </div>

        {/* The three things the wheel puts next to a key: its relative minor
            just outside it, and the neighbouring spokes that are its IV and V. */}
        <div className="tool-facts reveal" style={{ animationDelay: '.12s' }}>
          <div className="tool-fact">
            <small>relative minor</small>
            <b>{renderJazz(prettyChord(relativeMinor(key)), 'rm')}</b>
          </div>
          <div className="tool-fact">
            <small>IV · a fifth down</small>
            <b>{renderJazz(down, 'nd')}</b>
          </div>
          <div className="tool-fact">
            <small>V · a fifth up</small>
            <b>{renderJazz(up, 'nu')}</b>
          </div>
        </div>

        <div className="tool-chords reveal" style={{ animationDelay: '.14s' }}>
          {form.chords.map((chord, i) => (
            <button
              key={chord}
              className={`tool-chord${sounding === i ? ' sounding' : ''}`}
              onClick={() => sound(i)}
              aria-label={`${form.numerals[i]} — ${chord}`}
            >
              <small className="numeral">{form.numerals[i]}</small>
              <span>{renderJazz(label(chord), `tc${i}`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="fret-actions">
        <button className="bigbtn" onClick={soundCadence} disabled={!playback}>
          ▶ hear I · IV · V · I
        </button>
      </div>

      {infoOpen && (
        <InfoModal title="The wheel" onClose={() => setInfoOpen(false)}>
          <p>
            Tap any spoke to move the window. The wheel is laid out like the printed chord wheel:
            majors innermost, each relative minor immediately outside it, the vii° on the rim.
          </p>
          <p>
            Neighbouring spokes are a fifth apart, which is why the three majors under the window
            are the <b>IV</b>, <b>I</b> and <b>V</b> of the key, and the three minors outside them
            its <b>ii</b>, <b>vi</b> and <b>iii</b>. Everything a key needs sits side by side.
          </p>
          <p>
            Each step clockwise adds a sharp, each step anticlockwise a flat, always in the same
            order — F♯ C♯ G♯ D♯ A♯ E♯ B♯ going one way, B♭ E♭ A♭ D♭ G♭ C♭ F♭ the other.
          </p>
          <p className="info-dim">
            The circle closes on an enharmonic seam: carry on past F♯ and the next key is written
            D♭, the same pitch as F♯'s own C♯ spelled the flat way.
          </p>
        </InfoModal>
      )}
    </div>
  );
}
