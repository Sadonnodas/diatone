import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  trainerReducer,
  initialState,
  initialSettings,
  currentQuestion,
  type TrainerState,
} from './state/trainerReducer';
import { pickSeed, type Settings } from './lib/engine';
import { Prompt } from './components/Prompt';
import { useAnswerBuilder, Keypad } from './components/AnswerInput';
import { SettingsSheet } from './components/SettingsSheet';
import { Review } from './components/Review';
import { InfoModal } from './components/InfoModal';
import { KeyWheel } from './components/KeyWheel';
import { MODES, transposeStranded } from './lib/modes';
import { reviewControls, type MixedHooks } from './lib/mixed';
import { haptic, TAP, CORRECT, WRONG } from './lib/haptics';
import { armUnlock, stopAll } from './audio/engine';
import { useInstrument } from './audio/instrument';
import { playChord, playProgression, prefetchChords } from './audio/phrases';
import { chordToMidi, progressionToMidi, tonicTriad } from './audio/harmony';
import { numeralDegreeIndex } from './lib/jazz';
import { chordData } from './lib/chordData';
import { ThemeIconButton } from './components/ThemeSwitch';

const STORAGE_KEY = 'diatone.settings.v1';
const CORRECT_ADVANCE_MS = 700; // snappy when drilling

function loadInitialState(): TrainerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const settings: Settings = { ...initialSettings, ...JSON.parse(raw) };
      return { ...initialState, settings, seed: pickSeed(settings) };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return initialState;
}

// "Hide quality" glyph — a universal eye-off mark.
function EyeOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.4 5.2A9.7 9.7 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.6M6.1 6.6C3.8 8 2 10.3 2 12c0 2.5 4 7 10 7 1.6 0 3-.3 4.3-.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NumeralsGame({
  onBack,
  skipSetup = false,
  mixed,
}: {
  onBack: () => void;
  /** Go straight into the drill with the saved keys and modes. */
  skipSetup?: boolean;
  mixed?: MixedHooks;
}) {
  const [state, dispatch] = useReducer(trainerReducer, undefined, loadInitialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [phase, setPhase] = useState<'setup' | 'play'>(skipSetup || mixed ? 'play' : 'setup');
  // Read through a ref so the session's changing callbacks never retrigger
  // this drill's effects.
  const mixedRef = useRef(mixed);
  mixedRef.current = mixed;
  const [setupKeys, setSetupKeys] = useState<string[]>(state.settings.selectedKeys);
  const [setupModes, setSetupModes] = useState<number[]>(state.settings.selectedModes);
  const advanceTimer = useRef<number | null>(null);
  // Bumped whenever playback starts. A phrase you tapped past mustn't advance
  // the question it no longer belongs to.
  const playToken = useRef(0);
  const { instrument } = useInstrument();

  useEffect(armUnlock, []);

  const question = currentQuestion(state);
  // In a mixed session the session drives review (see lib/mixed); on its own
  // the reducer does.
  const rv = reviewControls(state.reviewIndex, () => {}, state.history.length, mixed);
  const reviewIndex = rv.index;
  const reviewing = reviewIndex !== null;
  const disabled = state.feedback !== null || reviewing;

  // Persist settings.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch {
      /* ignore */
    }
  }, [state.settings]);

  // Chords for anything the drill can show: a chord name, or a roman numeral
  // resolved against its key. Name Numeral's answers *are* numerals, so
  // without this that whole mode is silent — and silent playback used to
  // collapse the pause after a correct answer to nothing.
  const use7ths = state.settings.use7thChords;
  const soundable = useCallback(
    (text: string, key: string): number[][] | null => {
      const direct = progressionToMidi(text);
      if (direct) return direct;
      const form = chordData[key]?.[use7ths ? 'sevenths' : 'triads'];
      if (!form) return null;
      const out: number[][] = [];
      for (const part of text.split(' ').filter(Boolean)) {
        const degree = numeralDegreeIndex(part);
        const notes = degree < 0 ? null : chordToMidi(form.chords[degree]);
        if (!notes) return null;
        out.push(notes);
      }
      return out.length ? out : null;
    },
    [use7ths],
  );

  // Sound an answer string. A single chord gets the key's tonic underneath
  // first — a numeral only means something against a home chord. A progression
  // establishes its own key, so it plays alone.
  const playAnswer = useCallback(
    (text: string, key: string): Promise<number> => {
      const chords = soundable(text, key);
      if (!chords) return Promise.resolve(0);
      return chords.length === 1
        ? playChord(instrument, chords[0], tonicTriad(key))
        : playProgression(instrument, chords);
    },
    [instrument, soundable],
  );

  // Warm this question's samples (answer + tonic) before it's answered.
  const answerText = question?.answer ?? '';
  const answerKey = state.seed?.key ?? '';
  useEffect(() => {
    if (!state.settings.playback || !answerText) return;
    const chords = soundable(answerText, answerKey);
    if (!chords) return;
    const tonic = chords.length === 1 ? tonicTriad(answerKey) : null;
    prefetchChords(instrument, tonic ? [...chords, tonic] : chords);
  }, [answerText, answerKey, instrument, state.settings.playback, soundable]);

  const builder = useAnswerBuilder({
    question,
    use7thChords: state.settings.use7thChords,
    disabled,
    onSubmit: (ascii, display) => dispatch({ type: 'SUBMIT', answer: ascii, display }),
    onTap: () => {
      haptic(TAP);
      dispatch({ type: 'TAP' });
    },
  });

  // Move past the current question. In a mixed session the next question is
  // still prepared here, then the session is told it can hand over.
  const goNext = useCallback(() => {
    dispatch({ type: 'NEXT' });
    mixedRef.current?.onDone();
  }, []);

  // Feedback side effects: haptic + flash + (correct & autoAdvance) auto-roll (§18).
  // Runs once per answer. A settings change now keeps the verdict on screen, and
  // re-running here would replay the haptic, the flash and the chord.
  const handledFeedback = useRef<typeof state.feedback>(null);
  useEffect(() => {
    if (state.feedback === handledFeedback.current) return;
    handledFeedback.current = state.feedback;
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (!state.feedback) {
      setFlash('');
      stopAll(); // a new question — don't let the last phrase bleed into it
      return;
    }
    mixedRef.current?.onResult(state.feedback.correct);
    haptic(state.feedback.correct ? CORRECT : WRONG);
    setFlash(state.feedback.correct ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 500);

    const advanceAfter = state.feedback.correct && state.settings.autoAdvance;
    if (state.settings.playback) {
      // Move on only once the chord has finished — never cut it off mid-ring.
      const mine = ++playToken.current;
      void playAnswer(state.feedback.correctAnswer, answerKey).then((seconds) => {
        if (!advanceAfter || playToken.current !== mine) return;
        // Nothing sounded (samples missing, or an answer we can't voice): fall
        // back to the normal pause instead of advancing the instant the empty
        // promise resolves, which would flick the verdict off screen.
        if (seconds > 0) goNext();
        else advanceTimer.current = window.setTimeout(goNext, CORRECT_ADVANCE_MS);
      });
    } else if (advanceAfter) {
      advanceTimer.current = window.setTimeout(goNext, CORRECT_ADVANCE_MS);
    }
    // No cleanup: this only ever runs for a new answer, which clears the old
    // timer above. Unmount is handled below.
  }, [state.feedback, state.settings.autoAdvance, state.settings.playback, answerKey, playAnswer, goNext]);

  // Leaving the screen mid-phrase shouldn't keep playing, or advance a screen
  // that's gone.
  useEffect(
    () => () => {
      stopAll();
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Enter advances when feedback is showing (§18).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A hidden drill in a mixed session must not react to the keyboard.
      if (mixedRef.current && !mixedRef.current.active) return;
      if (e.key === 'Enter' && state.feedback && !reviewing) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.feedback, reviewing, goNext]);

  // Tap-anywhere-to-advance once feedback is showing (§17/§18).
  const onAppClick = () => {
    if (state.feedback && !reviewing) goNext();
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const hearCorrect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state.feedback) void playAnswer(state.feedback.correctAnswer, answerKey);
  };
  const hearYours = (e: React.MouseEvent) => {
    e.stopPropagation();
    void playAnswer(state.userAnswer, answerKey);
  };

  const updateSettings = (s: Settings) => dispatch({ type: 'UPDATE_SETTINGS', settings: s });

  const reviewEntry = reviewIndex !== null ? (state.history[reviewIndex] ?? null) : null;

  const enterReview = () => {
    if (!rv.canEnter) return;
    // A pending auto-advance would pull the question out from under you.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (mixed) mixed.onReview();
    else dispatch({ type: 'REVIEW_PREV' });
  };
  const reviewPrev = () => (mixed ? mixed.onReviewNav(-1) : dispatch({ type: 'REVIEW_PREV' }));
  const reviewNext = () => (mixed ? mixed.onReviewNav(1) : dispatch({ type: 'REVIEW_NEXT' }));
  const reviewClose = () => (mixed ? mixed.onReviewExit() : dispatch({ type: 'REVIEW_EXIT' }));

  // Setup screen: pick the keys to train on before the drill starts.
  if (phase === 'setup') {
    const toggleSetupKey = (k: string) =>
      setSetupKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
    const toggleSetupMode = (id: number) =>
      setSetupModes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    const start = () => {
      updateSettings({ ...state.settings, selectedKeys: setupKeys, selectedModes: setupModes });
      setPhase('play');
    };
    return (
      <div className="app">
        <div className="top reveal" style={{ animationDelay: '.02s' }}>
          <div className="top-left">
            <button className="icon-btn" aria-label="Home" onClick={onBack}>
              ←
            </button>
          </div>
        </div>
        <div className="stage setup-stage">
          <div className="setup-head reveal" style={{ animationDelay: '.04s' }}>
            <div className="setup-title">Which keys?</div>
            {/* Static for now; becomes a major/minor/mix selector later. */}
            <div className="setup-mode">Major</div>
          </div>
          <div className="reveal" style={{ animationDelay: '.08s' }}>
            <KeyWheel selected={setupKeys} onToggle={toggleSetupKey} />
          </div>
          <div className="setup-modes reveal" style={{ animationDelay: '.12s' }}>
            <div className="setup-label">Which drills?</div>
            <div className="chiprow setup-chiprow">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`tog${setupModes.includes(m.id) ? ' on' : ''}`}
                  aria-pressed={setupModes.includes(m.id)}
                  onClick={() => toggleSetupMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="setup-note reveal" style={{ animationDelay: '.16s' }}>
            {transposeStranded(setupModes, setupKeys)
              ? 'Transpose needs at least 2 keys — it’s skipped until you add another.'
              : 'You can change all of this anytime in settings.'}
          </div>
        </div>
        <div className="fret-actions">
          <button
            className="bigbtn"
            onClick={start}
            disabled={setupKeys.length === 0 || setupModes.length === 0}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${flash}`} onClick={onAppClick}>
      <div className="top reveal" style={{ animationDelay: '.02s' }} onClick={stop}>
        <div className="top-left">
          <button className="icon-btn" aria-label="Home" onClick={onBack}>
            ←
          </button>
          <div className="streak" aria-label={`Streak ${mixed ? mixed.streak : state.streak}`}>
            <span className="dot" />
            <span className="n">{mixed ? mixed.streak : state.streak}</span>
            <span className="streak-word">streak</span>
          </div>
        </div>
        <div className="top-right">
          <button
            className={`chip-mini${state.settings.use7thChords ? ' on' : ''}`}
            aria-label="7th chords"
            aria-pressed={state.settings.use7thChords}
            onClick={() =>
              updateSettings({ ...state.settings, use7thChords: !state.settings.use7thChords })
            }
          >
            <span className="q-glyph">△7</span>
          </button>
          <button
            className={`chip-mini${state.settings.hideQuality ? ' on' : ''}`}
            aria-label="Hide quality"
            aria-pressed={state.settings.hideQuality}
            onClick={() =>
              updateSettings({ ...state.settings, hideQuality: !state.settings.hideQuality })
            }
          >
            <EyeOff />
          </button>
          <button className="icon-btn" aria-label="How it works" onClick={() => setInfoOpen(true)}>
            ?
          </button>
          <button
            className="icon-btn"
            aria-label="Review"
            onClick={enterReview}
            disabled={!rv.canEnter}
          >
            ↺
          </button>
          <ThemeIconButton />
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className="stage play-stage">
        {question ? (
          <Prompt
            question={question}
            feedback={state.feedback}
            userAnswer={state.userAnswer}
            builder={builder}
            autoAdvance={state.settings.autoAdvance}
            hear={
              state.settings.playback ? (
                <div className="hear-slot hear-row" onClick={stop}>
                  {state.feedback &&
                    (state.feedback.correct ? (
                      <button className="hear" onClick={hearCorrect}>
                        ▶ hear it again
                      </button>
                    ) : (
                      <>
                        {/* Only offered when what you built is actually playable —
                            a half-finished progression isn't. */}
                        {soundable(state.userAnswer, answerKey) && (
                          <button className="hear no" onClick={hearYours}>
                            ▶ yours
                          </button>
                        )}
                        <button className="hear ok" onClick={hearCorrect}>
                          ▶ answer
                        </button>
                      </>
                    ))}
                </div>
              ) : null
            }
          />
        ) : (
          <div className="empty">
            Select at least one key and one mode to start.
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        )}
      </div>

      {question && (
        <div onClick={stop}>
          <Keypad builder={builder} disabled={disabled} />
        </div>
      )}

      {settingsOpen && (
        <div onClick={stop}>
          <SettingsSheet
            settings={state.settings}
            onChange={updateSettings}
            onClose={() => setSettingsOpen(false)}
          />
        </div>
      )}

      {infoOpen && (
        <div onClick={stop}>
          <InfoModal title="Numerals" onClose={() => setInfoOpen(false)}>
            <p>Read the prompt and answer in a couple of taps — no keyboard.</p>
            <ul>
              <li>
                <b>Name Chord</b> — shown a numeral (like V); tap the chord's root.
              </li>
              <li>
                <b>Name Numeral</b> — shown a chord (like A‑); tap its degree.
              </li>
              <li>
                <b>Progression</b> &amp; <b>Transpose</b> — short four-chord sequences.
              </li>
            </ul>
            <p>
              The quality is implied by the prompt, so you only supply the note (or degree). Use
              the <b>△7</b> chip for 7th chords and the <b>eye</b> chip to hide quality (then you
              choose it).
            </p>
            <p className="info-dim">
              Major keys only, jazz notation (A‑7, C△7, Bø7) — though Am7 / Cmaj7 / Bm7b5 are
              accepted too.
            </p>
          </InfoModal>
        </div>
      )}

      {reviewing && (
        <div onClick={stop}>
          <Review
            entry={reviewEntry}
            index={rv.position - 1}
            total={rv.count}
            onPrev={reviewPrev}
            onNext={reviewNext}
            onClose={reviewClose}
            onHear={state.settings.playback ? (text, key) => void playAnswer(text, key) : undefined}
          />
        </div>
      )}
    </div>
  );
}
