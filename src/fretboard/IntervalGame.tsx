import { useCallback, useEffect, useRef, useState } from 'react';
import { FretboardWindow, type FretNote } from './FretboardWindow';
import { IntervalSettings } from './IntervalSettings';
import { InfoModal } from '../components/InfoModal';
import { renderJazz } from '../components/ChordDisplay';
import {
  INTERVALS,
  KEYPAD_ROWS,
  STRING_NAMES,
  defaultIntervalSettings,
  generateInterval,
  intervalDescription,
  type IntervalQuestion,
  type IntervalSettings as Settings,
} from './intervalData';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';
import { armUnlock, stopAll } from '../audio/engine';
import { useInstrument } from '../audio/instrument';
import { playFrettedInterval, playIntervalClass, prefetchFretted } from '../audio/phrases';
import { ThemeIconButton } from '../components/ThemeSwitch';

const STORAGE_KEY = 'diatone.intervals.v1';
const ADVANCE_MS = 900;

interface HistoryEntry {
  question: IntervalQuestion;
  answer: number;
  correct: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Settings>;
      return {
        ...defaultIntervalSettings,
        ...saved,
        // Nested maps gained keys over time — merge rather than replace.
        rootStrings: { ...defaultIntervalSettings.rootStrings, ...(saved.rootStrings ?? {}) },
        intervals: { ...defaultIntervalSettings.intervals, ...(saved.intervals ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return defaultIntervalSettings;
}

// Root, then question note. Post-answer the question note wears the interval.
function buildNotes(q: IntervalQuestion, answer: number | null, correct: boolean | null): FretNote[] {
  const root: FretNote = {
    string: q.rootString,
    fret: q.rootFret,
    fill: 'var(--accent-dim)',
    stroke: 'var(--accent-line)',
    text: 'var(--accent)',
    label: 'R',
    tappable: false,
  };
  const answered = answer !== null;
  const note: FretNote = {
    string: q.noteString,
    fret: q.noteFret,
    fill: answered ? (correct ? 'var(--correct)' : 'var(--wrong)') : 'var(--surface-3)',
    stroke: answered ? (correct ? 'var(--correct)' : 'var(--wrong)') : 'var(--text-2)',
    text: answered ? 'var(--on-fill)' : 'var(--text)',
    label: answered ? INTERVALS[q.cls].short : '?',
    tappable: false,
  };
  return [root, note];
}

export default function IntervalGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [question, setQuestion] = useState<IntervalQuestion | null>(null);
  const [answer, setAnswer] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const lastCls = useRef<number | undefined>(undefined);
  // Bumped on every new question. Playback that outlives its question (you
  // tapped on before the notes finished) checks this before advancing.
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

  // Only the limits drive generation — flipping a reveal preference (or the
  // instrument) mustn't throw away the question you're looking at.
  const { rootStrings, stringGap, fretSpan, intervals } = settings;
  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    stopAll();
    runId.current += 1;
    setAnswer(null);
    setCorrect(null);
    setReviewIndex(null);
    const q = generateInterval({ rootStrings, stringGap, fretSpan, intervals }, Math.random, lastCls.current);
    lastCls.current = q?.cls;
    setQuestion(q);
  }, [rootStrings, stringGap, fretSpan, intervals]);

  useEffect(() => {
    generate();
  }, [generate]);

  // Warm this question's samples so answering sounds instant — also on an
  // instrument switch, which needs a different pair of recordings.
  useEffect(() => {
    if (question) {
      prefetchFretted(instrument, [
        [question.rootString, question.rootFret],
        [question.noteString, question.noteFret],
      ]);
    }
  }, [question, instrument]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    stopAll();
  }, []);

  const reviewing = reviewIndex !== null;
  const entry = reviewing ? history[reviewIndex] : null;
  const dq = reviewing ? entry!.question : question;
  const dAnswer = reviewing ? entry!.answer : answer;
  const dCorrect = reviewing ? entry!.correct : correct;
  const answered = dAnswer !== null;

  const submit = (cls: number) => {
    if (!question || answer !== null || reviewing) return;
    const isCorrect = cls === question.cls;
    haptic(isCorrect ? CORRECT : WRONG);
    setAnswer(cls);
    setCorrect(isCorrect);
    setStreak((s) => (isCorrect ? s + 1 : 0));
    setHistory((h) => [...h, { question, answer: cls, correct: isCorrect }]);
    setFlash(isCorrect ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 500);

    const advanceAfter = isCorrect && settings.autoAdvance;
    if (!settings.playback) {
      if (advanceAfter) timer.current = window.setTimeout(generate, ADVANCE_MS);
      return;
    }

    // Sound the pair as drawn on the board, then move on — never mid-note.
    const mine = runId.current;
    void playFrettedInterval(
      instrument,
      question.rootString,
      question.rootFret,
      question.noteString,
      question.noteFret,
    )
      .then(() => {
        if (advanceAfter && runId.current === mine) generate();
      });
  };

  // The comparison pair. Both sides start from the question's root and stay
  // inside one octave, so the only thing that differs is the interval itself.
  const hearClass = (cls: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dq) return;
    void playIntervalClass(instrument, dq.rootString, dq.rootFret, cls);
  };

  const hearBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dq) return;
    void playFrettedInterval(instrument, dq.rootString, dq.rootFret, dq.noteString, dq.noteFret);
  };

  const enterReview = () => {
    if (history.length === 0) return;
    if (timer.current) clearTimeout(timer.current);
    setReviewIndex(history.length - 1);
  };
  const reviewNav = (dir: number) =>
    setReviewIndex((i) => (i === null ? null : Math.max(0, Math.min(history.length - 1, i + dir))));
  const exitReview = () => setReviewIndex(null);

  const notes = dq ? buildNotes(dq, dAnswer, dCorrect) : [];
  // Tap anywhere to move on once the answer is showing (§18) — the header and
  // the sheets stop the click so their own buttons still work.
  const advance = () => {
    if (answered && !reviewing) generate();
  };
  const waitingToAdvance = answered && !reviewing && !(correct && settings.autoAdvance);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

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
          <button
            className="icon-btn"
            aria-label="Review"
            onClick={enterReview}
            disabled={history.length === 0}
          >
            ↺
          </button>
          <ThemeIconButton />
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className="stage fret-stage iv-stage">
        {!dq ? (
          <div className="empty">
            No interval fits those limits — widen the strings, span or intervals.
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">root on the</span>
              <span className="iv-str">{STRING_NAMES[dq.rootString]}</span>
              <span className="lead">string</span>
            </div>
            <div className="fret-prompt reveal" style={{ animationDelay: '.08s' }}>
              <span className="lead">what's the interval?</span>
            </div>
            <FretboardWindow
              notes={notes}
              startFret={dq.startFret}
              endFret={dq.endFret}
              onTap={() => {}}
            />
            {/* Reserved height so the reveal never pushes the board around. */}
            <div className={`iv-result${settings.playback ? ' with-hear' : ''}`}>
              {answered && (
                <>
                  <div className={`iv-line ${dCorrect ? 'ok' : 'no'}`}>
                    <span className="iv-big">{renderJazz(INTERVALS[dq.cls].short, 'res')}</span>
                    <span className="iv-name">{intervalDescription(dq)}</span>
                  </div>
                  <div className="iv-sub">
                    {dq.semitones} semitone{dq.semitones === 1 ? '' : 's'}
                    {!dCorrect && (
                      <> · you said {renderJazz(INTERVALS[dAnswer!].short, 'gs')}</>
                    )}
                  </div>
                  {settings.playback && (
                    <div className="hear-row" onClick={stop}>
                      {dCorrect ? (
                        <button className="hear" onClick={hearBoard}>
                          ▶ hear it again
                        </button>
                      ) : (
                        <>
                          <button className="hear no" onClick={hearClass(dAnswer!)}>
                            ▶ yours · {renderJazz(INTERVALS[dAnswer!].short, 'hy')}
                          </button>
                          <button className="hear ok" onClick={hearClass(dq.cls)}>
                            ▶ answer · {renderJazz(INTERVALS[dq.cls].short, 'ha')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        )}
      </div>

      {reviewing ? (
        <div className="fret-actions" onClick={stop}>
          <div className={`fb ${dCorrect ? 'ok' : 'no'}`}>{dCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
          <div className="review-nav" style={{ width: '100%', maxWidth: 360 }}>
            <button onClick={() => reviewNav(-1)} disabled={reviewIndex === 0}>
              ← Older
            </button>
            <button onClick={exitReview}>Return</button>
            <button onClick={() => reviewNav(1)} disabled={reviewIndex === history.length - 1}>
              Newer →
            </button>
          </div>
          <div className="review-count">
            {(reviewIndex ?? 0) + 1} of {history.length}
          </div>
        </div>
      ) : dq ? (
        <div className="pad iv-pad">
          {KEYPAD_ROWS.map((row, r) => (
            <div className="row" key={r}>
              {row.map((c) => (
                <button
                  key={c}
                  aria-label={INTERVALS[c].name}
                  // Not `disabled` once answered: a dead keypad would swallow the
                  // taps that are meant to move you on.
                  className={`key${settings.intervals[c] ? '' : ' dim'}${
                    answered ? ' done' : ''
                  }${answered && c === dq.cls ? ' right' : ''}${
                    answered && c === dAnswer && !dCorrect ? ' wrong' : ''
                  }`}
                  onClick={() => {
                    if (answered) return; // the app-level tap advances
                    haptic(TAP);
                    submit(c);
                  }}
                >
                  <span>{renderJazz(INTERVALS[c].short, `k${c}`)}</span>
                  <small>{INTERVALS[c].tiny}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {settingsOpen && (
        <div onClick={stop}>
          <IntervalSettings
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}

      {infoOpen && (
        <div onClick={stop}>
          <InfoModal title="Intervals — see the shape" onClose={() => setInfoOpen(false)}>
          <p>
            Two notes on a slice of the neck: the <b>R</b> is the root, the <b>?</b> sits on a
            thinner string. Tap the interval between them — no note names needed, just the shape.
          </p>
          <p>
            Anything wider than an octave is answered by its simple form: a 10th is a{' '}
            <b>3</b>, a 9th is a <b>2</b>. The reveal tells you the true distance.
          </p>
          <p>Three levels in settings, or mix your own limits:</p>
          <ul>
            <li>
              <b>Level 1</b> — adjacent strings, root on E/A/D, everyday intervals.
            </li>
            <li>
              <b>Level 2</b> — up to two strings apart, adds the octave and the chromatic ones.
            </li>
            <li>
              <b>Level 3</b> — any string pair, all twelve.
            </li>
          </ul>
          <p className="info-dim">
            The point is recognition by sight: the same shape means the same interval anywhere on
            the neck — except across the B string, where it shifts a fret.
          </p>
          </InfoModal>
        </div>
      )}
    </div>
  );
}
