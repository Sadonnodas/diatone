import { useEffect, useReducer, useRef, useState } from 'react';
import {
  trainerReducer,
  initialState,
  initialSettings,
  currentQuestion,
  type TrainerState,
} from './state/trainerReducer';
import { pickSeed, type Settings } from './lib/engine';
import { Prompt } from './components/Prompt';
import { useAnswerBuilder, Preview, Keypad } from './components/AnswerInput';
import { SettingsSheet } from './components/SettingsSheet';
import { Review } from './components/Review';
import { InfoModal } from './components/InfoModal';
import { KeyWheel } from './components/KeyWheel';
import { haptic, TAP, CORRECT, WRONG } from './lib/haptics';

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

export default function NumeralsGame({ onBack }: { onBack: () => void }) {
  const [state, dispatch] = useReducer(trainerReducer, undefined, loadInitialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [phase, setPhase] = useState<'setup' | 'play'>('setup');
  const [setupKeys, setSetupKeys] = useState<string[]>(state.settings.selectedKeys);
  const advanceTimer = useRef<number | null>(null);

  const question = currentQuestion(state);
  const reviewing = state.reviewIndex !== null;
  const disabled = state.feedback !== null || reviewing;

  // Persist settings.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch {
      /* ignore */
    }
  }, [state.settings]);

  const builder = useAnswerBuilder({
    question,
    use7thChords: state.settings.use7thChords,
    hideQuality: state.settings.hideQuality,
    disabled,
    onSubmit: (ascii, display) => dispatch({ type: 'SUBMIT', answer: ascii, display }),
    onTap: () => {
      haptic(TAP);
      dispatch({ type: 'TAP' });
    },
  });

  // Feedback side effects: haptic + flash + (correct & autoAdvance) auto-roll (§18).
  useEffect(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (!state.feedback) {
      setFlash('');
      return;
    }
    haptic(state.feedback.correct ? CORRECT : WRONG);
    setFlash(state.feedback.correct ? 'flash-ok' : 'flash-no');
    const t = window.setTimeout(() => setFlash(''), 500);
    if (state.feedback.correct && state.settings.autoAdvance) {
      advanceTimer.current = window.setTimeout(() => dispatch({ type: 'NEXT' }), CORRECT_ADVANCE_MS);
    }
    return () => {
      window.clearTimeout(t);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [state.feedback, state.settings.autoAdvance]);

  // Enter advances when feedback is showing (§18).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && state.feedback && !reviewing) dispatch({ type: 'NEXT' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.feedback, reviewing]);

  // Tap-anywhere-to-advance once feedback is showing (§17/§18).
  const onAppClick = () => {
    if (state.feedback && !reviewing) dispatch({ type: 'NEXT' });
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const updateSettings = (s: Settings) => dispatch({ type: 'UPDATE_SETTINGS', settings: s });

  const reviewEntry =
    state.reviewIndex !== null ? (state.history[state.reviewIndex] ?? null) : null;

  // Setup screen: pick the keys to train on before the drill starts.
  if (phase === 'setup') {
    const toggleSetupKey = (k: string) =>
      setSetupKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
    const start = () => {
      updateSettings({ ...state.settings, selectedKeys: setupKeys });
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
          <div className="setup-title reveal" style={{ animationDelay: '.04s' }}>
            Which keys?
          </div>
          <div className="reveal" style={{ animationDelay: '.08s' }}>
            <KeyWheel selected={setupKeys} onToggle={toggleSetupKey} />
          </div>
          <div className="setup-note reveal" style={{ animationDelay: '.12s' }}>
            You can change this anytime in settings.
          </div>
        </div>
        <div className="fret-actions">
          <button className="bigbtn" onClick={start} disabled={setupKeys.length === 0}>
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
          <div className="streak" aria-label={`Streak ${state.streak}`}>
            <span className="dot" />
            <span className="n">{state.streak}</span>
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
            onClick={() => dispatch({ type: 'REVIEW_PREV' })}
            disabled={state.history.length === 0}
          >
            ↺
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className="stage">
        {question ? (
          <>
            <Prompt question={question} feedback={state.feedback} userAnswer={state.userAnswer} />
            {!state.feedback && <Preview builder={builder} />}
            {state.feedback && !(state.feedback.correct && state.settings.autoAdvance) && (
              <div className="next-hint">tap to continue →</div>
            )}
          </>
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
            index={state.reviewIndex ?? 0}
            total={state.history.length}
            onPrev={() => dispatch({ type: 'REVIEW_PREV' })}
            onNext={() => dispatch({ type: 'REVIEW_NEXT' })}
            onClose={() => dispatch({ type: 'REVIEW_EXIT' })}
          />
        </div>
      )}
    </div>
  );
}
