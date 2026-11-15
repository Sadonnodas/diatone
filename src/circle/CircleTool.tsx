import { useEffect, useRef, useState } from 'react';
import { CircleWheel, prettyChord } from './CircleWheel';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { keySignature, signatureText } from './keySignature';
import { cells, tonicChord, type Tonality } from './tonality';
import { WindowShape } from './WindowShape';
import { renderJazz } from '../components/ChordDisplay';
import { chordToJazz } from '../lib/jazz';
import { InfoModal } from '../components/InfoModal';
import { ThemeIconButton } from '../components/ThemeSwitch';
import { haptic, TAP } from '../lib/haptics';
import { armUnlock, releaseAudio, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playChord, prefetchChords } from '../audio/phrases';
import { chordToMidi } from '../audio/harmony';

const STORAGE_KEY = 'diatone.wheel.v1';

interface ToolState {
  key: string;
  tonality: Tonality;
  sevenths: boolean;
  playback: boolean;
}

const DEFAULTS: ToolState = { key: 'C', tonality: 'major', sevenths: false, playback: true };

function load(): ToolState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ToolState>;
      return {
        ...DEFAULTS,
        ...saved,
        key: saved.key && ALL_KEYS.includes(saved.key) ? saved.key : DEFAULTS.key,
        tonality: saved.tonality === 'minor' ? 'minor' : 'major',
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

/**
 * The wheel as a reference rather than a drill: tap a key and read what sits
 * around it — its signature, and its seven chords in the window's own shape,
 * each one tappable. Major or minor is a matter of which chord you count
 * from; the window itself never moves. Nothing else: the page is something to
 * look things up in, so every extra row is one more thing to read past.
 */
export default function CircleTool({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ToolState>(load);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sounding, setSounding] = useState<number | null>(null);
  const { instrument } = useInstrument();
  const timer = useRef<number | null>(null);

  const { key, tonality, sevenths, playback } = state;
  // Triads read as the wheel prints them (Dm, B°); sevenths take the jazz
  // notation the rest of the app uses for them (D-7, Dø7).
  const label = (chord: string) => (sevenths ? chordToJazz(chord) : prettyChord(chord));
  const pos = ALL_KEYS.indexOf(key);
  const form = chordData[key][sevenths ? 'sevenths' : 'triads'];
  const sig = keySignature(key);
  const window7 = cells(tonality);
  const tonic = window7[0];
  const home = prettyChord(tonicChord(tonality, key));

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

  const hush = () => {
    stopAll();
    setSounding(null);
  };

  const pickKey = (p: number) => {
    haptic(TAP);
    hush();
    update({ key: ALL_KEYS[p] });
  };

  const pickTonality = (t: Tonality) => {
    if (t === tonality) return;
    haptic(TAP);
    hush();
    update({ tonality: t });
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
          <CircleWheel
            blanks={[]}
            marks={{}}
            keyPos={pos}
            tonic={{ ring: tonic.ring, pos }}
            onTapPos={pickKey}
          />
        </div>

        <div className="tool-key reveal" style={{ animationDelay: '.1s' }}>
          <span className="tool-key-name">{renderJazz(home, 'tk')}</span>
          <span className="tool-key-sub">
            {signatureText(key)}
            {sig.accidentals.length > 0 && (
              <span className="tool-accs"> · {sig.accidentals.join(' ')}</span>
            )}
          </span>
        </div>

        {/* Major or minor is the same seven chords counted from a different
            one — so this switches what everything below is called, and which
            cell of the window is home. */}
        <div className="tool-tonality reveal" style={{ animationDelay: '.11s' }} role="group">
          {(['major', 'minor'] as Tonality[]).map((t) => (
            <button
              key={t}
              className={`tonality-btn${t === tonality ? ' on' : ''}`}
              aria-pressed={t === tonality}
              onClick={() => pickTonality(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* The window itself, with the degrees in their places. Tap a cell to
            hear the chord that sits there. */}
        <div className="tool-shape reveal" style={{ animationDelay: '.13s' }}>
          <WindowShape
            items={window7.map((cell) => ({ cell, text: label(form.chords[cell.index]) }))}
            sounding={sounding}
            onTap={sound}
          />
        </div>

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
            Major and minor share a window. C major and A minor hold the same seven chords — the
            switch only changes which cell is home, and so what every other cell is called. Count
            from the major and you get I ii iii IV V vi vii°; count from the minor outside it and
            the same chords read i ii° III iv v VI VII.
          </p>
          <p>
            Each step clockwise adds a sharp, each step anticlockwise a flat, always in the same
            order — F♯ C♯ G♯ D♯ A♯ E♯ B♯ going one way, B♭ E♭ A♭ D♭ G♭ C♭ F♭ the other.
          </p>
          <p className="info-dim">
            The circle closes on an enharmonic seam: carry on past F♯ and the next key is written
            D♭, the same pitch as F♯'s own C♯ spelled the flat way.
          </p>
          <p className="info-dim">
            A minor key's <b>v</b> is minor here, because the wheel draws the natural minor. The
            major V7 you hear at the end of so many minor tunes (E7 in A minor) is borrowed from
            the harmonic minor, and sits off the wheel.
          </p>
        </InfoModal>
      )}
    </div>
  );
}
