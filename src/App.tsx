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

const STORAGE_KEY = 'diatone.settings.v1';

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

export default function App() {
  const [state, dispatch] = useReducer(trainerReducer, undefined, loadInitialState);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
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
    disabled,
    onSubmit: (ascii, display) => dispatch({ type: 'SUBMIT', answer: ascii, display }),
    onTap: () => dispatch({ type: 'TAP' }),
  });

  // Feedback side effects: flash + (correct & autoAdvance) auto-roll after 1500ms (§18).
  useEffect(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (!state.feedback) {
      setFlash('');
      return;
    }
    setFlash(state.feedback.correct ? 'flash-ok' : 'flash-no');
    const t = window.setTimeout(() => setFlash(''), 500);
    if (state.feedback.correct && state.settings.autoAdvance) {
      advanceTimer.current = window.setTimeout(() => dispatch({ type: 'NEXT' }), 1500);
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

  return (
    <div className={`app ${flash}`} onClick={onAppClick}>
      <div className="top reveal" style={{ animationDelay: '.02s' }} onClick={stop}>
        <div className="mark">
          Dia<b>tone</b>
        </div>
        <div className="top-right">
          <div className="streak">
            <span className="dot" />
            <span className="n">{state.streak}</span>
            <span>streak</span>
          </div>
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
            <Prompt
              question={question}
              feedback={state.feedback ? (state.feedback.correct ? 'correct' : 'wrong') : null}
            />
            <Preview
              builder={builder}
              feedback={state.feedback}
              correctAnswer={state.feedback?.correctAnswer ?? null}
            />
            {state.feedback && !(state.feedback.correct && state.settings.autoAdvance) && (
              <div className="next-hint">tap anywhere or press Enter to continue →</div>
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
        <>
          <div className="pills" onClick={stop}>
            <button
              className={`pill${state.settings.hideQuality ? ' on' : ''}`}
              onClick={() =>
                updateSettings({ ...state.settings, hideQuality: !state.settings.hideQuality })
              }
            >
              hide quality
            </button>
            <button
              className={`pill${state.settings.use7thChords ? ' on' : ''}`}
              onClick={() =>
                updateSettings({ ...state.settings, use7thChords: !state.settings.use7thChords })
              }
            >
              7th chords
            </button>
          </div>
          <div onClick={stop}>
            <Keypad builder={builder} disabled={disabled} />
          </div>
        </>
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
