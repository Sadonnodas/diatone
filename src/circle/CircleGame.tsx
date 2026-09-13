import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleWheel, prettyChord, type Mark } from './CircleWheel';
import { WedgeBoard } from './WedgeBoard';
import { NameKeypad } from './NameKeypad';
import { Keypad, useAnswerBuilder } from '../components/AnswerInput';
import { CircleSettingsSheet } from './CircleSettings';
import { CircleOptions, circleReady } from './CircleOptions';
import { InfoModal } from '../components/InfoModal';
import { renderJazz } from '../components/ChordDisplay';
import { ThemeIconButton } from '../components/ThemeSwitch';
import {
  defaultCircleSettings,
  generateLayout,
  generateWedge,
  layoutAnswerMatches,
  ringChord,
  segmentRoot,
  slotKey,
  wedgeAnswerMatches,
  wedgeToken,
  type CircleSettings,
  type LayoutQuestion,
  type WedgeQuestion,
} from './circleData';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';
import { armUnlock, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playChord, prefetchChords } from '../audio/phrases';
import { chordToMidi } from '../audio/harmony';

const STORAGE_KEY = 'diatone.circle.v2';
const ADVANCE_MS = 850;

function loadSettings(): CircleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CircleSettings>;
      return {
        ...defaultCircleSettings,
        ...saved,
        rings: { ...defaultCircleSettings.rings, ...(saved.rings ?? {}) },
        keys: saved.keys?.length ? saved.keys : defaultCircleSettings.keys,
      };
    }
  } catch {
    /* ignore */
  }
  return defaultCircleSettings;
}

export default function CircleGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<CircleSettings>(loadSettings);
  const [phase, setPhase] = useState<'setup' | 'play'>('setup');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');

  // Layout drill
  const [layout, setLayout] = useState<LayoutQuestion | null>(null);
  const [step, setStep] = useState(0);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [letter, setLetter] = useState<string | null>(null);
  const [acc, setAcc] = useState<'' | 'b' | '#'>('');

  // Wedge drill
  const [wedge, setWedge] = useState<WedgeQuestion | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [wedgeMarks, setWedgeMarks] = useState<Record<string, Mark>>({});
  // The slot being answered. Nothing is offered to pick from: you tap a slot
  // and build its chord on the Numerals keypad, so it's recall, not
  // recognition.
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ typed: string; right: boolean } | null>(null);

  const timer = useRef<number | null>(null);
  const runId = useRef(0);
  const lastKey = useRef<string | undefined>(undefined);
  const { instrument } = useInstrument();

  useEffect(armUnlock, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const isWedge = settings.drill === 'wedge';

  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopAll();
    runId.current += 1;
    setFlash('');
    if (settings.drill === 'wedge') {
      const q = generateWedge(settings, Math.random, lastKey.current);
      lastKey.current = q.key || undefined;
      setWedge(q);
      setPlaced({});
      setWedgeMarks({});
      setPickedSlot(null);
      setLastResult(null);
    } else {
      setLayout(generateLayout(settings));
      setStep(0);
      setMarks({});
      setRevealed({});
      setLetter(null);
      setAcc('');
    }
  }, [settings]);

  // Nothing is generated on the setup screen — the drill starts on Start.
  useEffect(() => {
    if (phase === 'play') generate();
  }, [generate, phase]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopAll();
    },
    [],
  );

  // Warm whatever this question can sound.
  useEffect(() => {
    if (!settings.playback) return;
    const names = isWedge
      ? (wedge?.slots ?? []).map((w) => w.chord)
      : (layout?.blanks ?? []).map((s) => ringChord(s.ring, s.pos));
    const chords = names.map(chordToMidi).filter((c): c is number[] => c !== null);
    if (chords.length) prefetchChords(instrument, chords);
  }, [wedge, layout, isWedge, instrument, settings.playback]);

  const sound = (chord: string) => {
    if (!settings.playback) return;
    const notes = chordToMidi(chord);
    if (notes) void playChord(instrument, notes);
  };

  const finish = (allDone: boolean) => {
    if (!allDone || !settings.autoAdvance) return;
    const mine = runId.current;
    timer.current = window.setTimeout(() => {
      if (runId.current === mine) generate();
    }, ADVANCE_MS);
  };

  // ── Layout drill ──────────────────────────────────────────────────────────
  const layoutDone = layout ? step >= layout.blanks.length : false;
  const asked = layout && !layoutDone ? layout.blanks[step] : null;

  const answerName = () => {
    if (!asked || !letter || !layout) return;
    const typed = letter + (acc === 'b' ? 'b' : acc === '#' ? '#' : '');
    const right = layoutAnswerMatches(typed, asked);
    haptic(right ? CORRECT : WRONG);
    setStreak((s) => (right ? s + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 460);

    const key = slotKey(asked);
    setMarks((m) => ({ ...m, [key]: right ? 'ok' : 'no' }));
    // A miss fills the segment in with its real name, so the correction lands
    // in the place you got wrong rather than in a message.
    setRevealed((r) => ({ ...r, [key]: right ? typed : segmentRoot(asked) }));
    setLetter(null);
    setAcc('');
    sound(ringChord(asked.ring, asked.pos));
    const next = step + 1;
    setStep(next);
    finish(next >= layout.blanks.length);
  };

  // ── Wedge drill ───────────────────────────────────────────────────────────
  const wedgeDone = wedge ? Object.keys(placed).length >= wedge.slots.length : false;

  const numeralsMode = settings.place === 'numerals';
  const pickedWedgeSlot =
    wedge && pickedSlot ? (wedge.slots.find((w) => w.degree === pickedSlot) ?? null) : null;

  const answerWedge = (typed: string) => {
    if (!wedge || !pickedWedgeSlot) return;
    const w = pickedWedgeSlot;
    const right = wedgeAnswerMatches(typed, w, settings.place);
    haptic(right ? CORRECT : WRONG);
    setStreak((st) => (right ? st + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 460);

    // The slot always ends up showing the right answer — green if you had it,
    // red if you didn't — and what you typed goes in the line above.
    setPlaced((p) => ({ ...p, [w.degree]: wedgeToken(w, settings.place) }));
    setWedgeMarks((m) => ({ ...m, [w.degree]: right ? 'ok' : 'no' }));
    setLastResult({ typed, right });
    setPickedSlot(null);
    sound(w.chord);
    finish(Object.keys(placed).length + 1 >= wedge.slots.length);
  };

  // The Numerals keypad, driven by the picked slot: root → accidental →
  // quality to answer a chord, or a single degree tap in the numerals drill.
  // It's always given a target in the right mode, even with nothing picked,
  // so the keypad doesn't swap layouts the moment a slot is tapped.
  const builder = useAnswerBuilder({
    question: {
      mode: numeralsMode ? 4 : 1,
      answer: pickedWedgeSlot ? wedgeToken(pickedWedgeSlot, settings.place) : '',
      seed: `${runId.current}:${pickedSlot ?? '-'}`,
    },
    use7thChords: false,
    disabled: !pickedWedgeSlot || wedgeDone,
    onSubmit: (ascii) => answerWedge(ascii),
    onTap: () => haptic(TAP),
  });

  const tapSlot = (degree: string) => {
    if (!wedge || placed[degree] || wedgeDone) return;
    haptic(TAP);
    setPickedSlot((cur) => (cur === degree ? null : degree));
  };

  // What each slot already shows. Placing chords, that's the numeral guide (if
  // it's on); placing numerals, it's always the chord — which is the whole
  // point of the reverse drill.
  const hints = useMemo(() => {
    const out: Record<string, string> = {};
    if (!wedge) return out;
    for (const w of wedge.slots) {
      if (settings.place === 'numerals') out[w.degree] = w.chord;
      else if (settings.guide) out[w.degree] = w.degree;
    }
    return out;
  }, [wedge, settings.place, settings.guide]);

  const done = isWedge ? wedgeDone : layoutDone;
  const advance = () => {
    if (done) generate();
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const waitingToAdvance = done && !settings.autoAdvance;
  const error = isWedge ? wedge?.error : layout?.error;

  // Set the drill up before it starts, rather than dropping straight into
  // whichever one was used last.
  if (phase === 'setup') {
    const ready = circleReady(settings);
    return (
      <div className="app">
        <div className="top reveal" style={{ animationDelay: '.02s' }}>
          <div className="top-left">
            <button className="icon-btn" aria-label="Home" onClick={onBack}>
              ←
            </button>
          </div>
          <div className="top-right">
            <ThemeIconButton />
          </div>
        </div>
        <div className="stage circle-setup">
          <div className="setup-head reveal" style={{ animationDelay: '.04s' }}>
            <div className="setup-title">Circle of fifths</div>
          </div>
          <div className="circle-setup-body reveal" style={{ animationDelay: '.08s' }}>
            <CircleOptions settings={settings} onChange={setSettings} />
          </div>
        </div>
        <div className="fret-actions">
          <button className="bigbtn" onClick={() => setPhase('play')} disabled={!ready}>
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${flash}`} onClick={advance}>
      <div className="top reveal" style={{ animationDelay: '.02s' }} onClick={stop}>
        <div className="top-left">
          <button className="icon-btn" aria-label="Home" onClick={onBack}>
            ←
          </button>
          <div className="streak" aria-label={`Streak ${streak}`}>
            <span className="dot" />
            <span className="n">{streak}</span>
            <span className="streak-word">streak</span>
          </div>
        </div>
        <div className="top-right">
          <button className="icon-btn" aria-label="How it works" onClick={() => setInfoOpen(true)}>
            ?
          </button>
          <ThemeIconButton />
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className={`stage ${isWedge ? 'wedge-stage' : 'cof-stage'}`}>
        {error ? (
          <div className="empty">
            {error}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : isWedge && wedge ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">in the key of</span>
              <span className="k">{renderJazz(wedge.key, 'wk')}</span>
            </div>

            <div className="wedge-status" aria-live="polite">
              {wedgeDone ? (
                <span className="lead">filled in</span>
              ) : pickedWedgeSlot ? (
                <span className="lead">{numeralsMode ? 'tap its numeral' : 'build its chord'}</span>
              ) : lastResult && !lastResult.right ? (
                <span className="miss">you said {prettyChord(lastResult.typed)}</span>
              ) : (
                <span className="lead">tap a slot</span>
              )}
            </div>

            <div className="wedge-wrap reveal" onClick={stop} style={{ animationDelay: '.08s' }}>
              <WedgeBoard
                slots={wedge.slots}
                placed={placed}
                marks={wedgeMarks}
                hints={hints}
                picked={pickedSlot}
                onTapSlot={tapSlot}
              />
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        ) : layout ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">{layoutDone ? 'filled in' : 'name the gap'}</span>
            </div>
            <div className="cof-wheel reveal" style={{ animationDelay: '.08s' }}>
              <CircleWheel
                blanks={layout.blanks}
                marks={marks}
                highlight={asked ? slotKey(asked) : null}
                revealed={revealed}
              />
            </div>
            <div className="cof-progress">
              {layout.blanks.map((b, i) => {
                const k = slotKey(b);
                return (
                  <span
                    key={k}
                    className={`dotp${i < step ? (marks[k] === 'ok' ? ' ok' : ' no') : ''}${
                      i === step ? ' live' : ''
                    }`}
                  />
                );
              })}
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        ) : null}
      </div>

      {isWedge && !error && wedge && (
        <div onClick={stop}>
          <Keypad builder={builder} disabled={!pickedWedgeSlot || wedgeDone} />
        </div>
      )}

      {!isWedge && !error && (
        <div onClick={stop}>
          <NameKeypad
            letter={letter}
            acc={acc}
            onLetter={(l) => {
              haptic(TAP);
              setLetter(l);
              setAcc('');
            }}
            onAcc={(a) => {
              haptic(TAP);
              setAcc((cur) => (cur === a ? '' : a));
            }}
            onClear={() => {
              setLetter(null);
              setAcc('');
            }}
            onAnswer={answerName}
            disabled={layoutDone}
          />
        </div>
      )}

      {settingsOpen && (
        <div onClick={stop}>
          <CircleSettingsSheet
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}

      {infoOpen && (
        <div onClick={stop}>
          <InfoModal title="Circle of fifths" onClose={() => setInfoOpen(false)}>
            <p>
              Two drills, picked in settings. <b>Layout</b> blanks segments of the wheel and you
              name them. <b>Key wedge</b> zooms in on one key: tap a slot and build its chord.
            </p>
            <p>
              The wheel is laid out like the printed one: majors nearest the centre, each
              relative minor immediately outside its major, and the <b>vii°</b> tabs on the rim.
            </p>
            <p>
              A key's seven chords are always the same shape — <b>IV</b> one step anticlockwise,{' '}
              <b>V</b> one step clockwise, the minors directly outside. The wedge drill turns
              that shape to the top every time, so what you learn is the shape rather than twelve
              separate pictures.
            </p>
            <p className="info-dim">
              Either spelling of a seam segment is accepted — F♯ and G♭ are the same place.
            </p>
          </InfoModal>
        </div>
      )}
    </div>
  );
}
