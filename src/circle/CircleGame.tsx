import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleWheel, prettyChord, type Mark } from './CircleWheel';
import { CircleSettingsSheet } from './CircleSettings';
import { InfoModal } from '../components/InfoModal';
import { renderJazz } from '../components/ChordDisplay';
import {
  defaultCircleSettings,
  generateCircle,
  ringChord,
  slotKey,
  type CircleQuestion,
  type CircleSettings,
  type Slot,
} from './circleData';
import { haptic, CORRECT, WRONG } from '../lib/haptics';
import { armUnlock, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playChord, prefetchChords } from '../audio/phrases';
import { chordToMidi } from '../audio/harmony';
import { ThemeIconButton } from '../components/ThemeSwitch';

const STORAGE_KEY = 'diatone.circle.v1';
const ADVANCE_MS = 800;

function loadSettings(): CircleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CircleSettings>;
      return {
        ...defaultCircleSettings,
        ...saved,
        rings: { ...defaultCircleSettings.rings, ...(saved.rings ?? {}) },
        degrees: { ...defaultCircleSettings.degrees, ...(saved.degrees ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return defaultCircleSettings;
}

/** What a segment sounds, whatever the prompt happens to be naming it. The
    two spellings at the seam are the same pitches, so the segment decides. */
const chordFor = (slot: Slot): string => ringChord(slot.ring, slot.pos);

export default function CircleGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<CircleSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [question, setQuestion] = useState<CircleQuestion | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [step, setStep] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const timer = useRef<number | null>(null);
  const runId = useRef(0);
  const { instrument } = useInstrument();

  useEffect(armUnlock, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopAll();
    runId.current += 1;
    setMarks({});
    setStep(0);
    setQuestion(generateCircle(settings));
  }, [settings]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      stopAll();
    },
    [],
  );

  // Warm the chords this question can ask for.
  useEffect(() => {
    if (!question || !settings.playback) return;
    const chords = question.blanks
      .map((s) => chordToMidi(chordFor(s)))
      .filter((c): c is number[] => c !== null);
    if (chords.length) prefetchChords(instrument, chords);
  }, [question, instrument, settings.playback]);

  const done = question ? step >= question.queue.length : false;
  const currentKey = question && !done ? question.queue[step] : null;
  const currentLabel = currentKey && question ? question.labels[currentKey] : null;

  const tap = (slot: Slot) => {
    if (!question || done || question.error) return;
    const key = slotKey(slot);
    if (marks[key]) return;

    const right = key === currentKey;
    haptic(right ? CORRECT : WRONG);
    setStreak((s) => (right ? s + 1 : 0));
    setFlash(right ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 420);

    // Either way the answer ends up on the board: a wrong tap fills the
    // segment it should have gone in, so you see the miss in place rather
    // than being told about it.
    setMarks((m) => ({ ...m, [currentKey as string]: right ? 'ok' : 'no' }));
    const next = step + 1;
    setStep(next);

    if (settings.playback) {
      const notes = chordToMidi(chordFor(slot));
      if (notes) void playChord(instrument, notes);
    }

    if (next >= question.queue.length && settings.autoAdvance) {
      const mine = runId.current;
      timer.current = window.setTimeout(() => {
        if (runId.current === mine) generate();
      }, ADVANCE_MS);
    }
  };

  const advance = () => {
    if (done) generate();
  };
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const waitingToAdvance = done && !settings.autoAdvance;

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

      <div className="stage cof-stage">
        {!question || question.error ? (
          <div className="empty">
            {question?.error ?? 'Loading…'}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              {question.key ? (
                <>
                  <span className="lead">in the key of</span>
                  <span className="k">{renderJazz(question.key, 'ck')}</span>
                </>
              ) : (
                <span className="lead">where does it go?</span>
              )}
            </div>

            <div className="cof-wheel reveal" style={{ animationDelay: '.08s' }}>
              <CircleWheel
                blanks={question.blanks}
                marks={marks}
                keyPos={question.keyPos}
                rotate={question.rotate}
                onTap={tap}
                disabled={done}
              />
              <div className="cof-hub">
                {done ? (
                  <div className="cof-done">✓</div>
                ) : (
                  <>
                    <div className="cof-ask">place</div>
                    <div className="cof-target">{renderJazz(prettyChord(currentLabel ?? ''), 'ct')}</div>
                  </>
                )}
              </div>
            </div>

            <div className="cof-progress">
              {question.queue.map((k, i) => (
                <span
                  key={k}
                  className={`dotp${i < step ? (marks[k] === 'ok' ? ' ok' : ' no') : ''}${
                    i === step ? ' live' : ''
                  }`}
                />
              ))}
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        )}
      </div>

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
              Some segments are empty. The middle names a chord — tap the gap it belongs in.
            </p>
            <p>
              Majors sit on the middle ring, their relative minors directly inside, and each
              key's <b>vii°</b> on the thin outer ring.
            </p>
            <p>
              The point is the shape. A key's seven chords are one wedge: <b>IV</b> is one step
              anticlockwise, <b>V</b> one step clockwise, and <b>ii</b>, <b>vi</b>, <b>iii</b>{' '}
              sit under those three. Learn the wedge and you can read a numeral off the wheel
              instead of working it out.
            </p>
            <p className="info-dim">
              Two segments carry two names (B♭m/A♯m, F♯/G♭) — twelve spokes can't hold both
              sides of the enharmonic seam. Either name is the same place.
            </p>
          </InfoModal>
        </div>
      )}
    </div>
  );
}
