import { useCallback, useEffect, useRef, useState } from 'react';
import { InfoModal } from '../components/InfoModal';
import { ThemeIconButton, ThemeSettingRow } from '../components/ThemeSwitch';
import { ReviewBar } from '../components/ReviewBar';
import { reviewControls, type MixedHooks } from '../lib/mixed';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';
import { ModalOptions, ModalSettingsSheet } from './ModalOptions';
import {
  defaultModalSettings,
  generateModal,
  modalAnswerMatches,
  modalReady,
  questionSig,
  type ModalQuestion,
  type ModalSettings,
} from './modalData';

const STORAGE_KEY = 'diatone.modal.v1';
const ADVANCE_MS = 1400; // longer than the others: there's a line to read

interface HistoryEntry {
  question: ModalQuestion;
  picked: string[];
  correct: boolean;
}

function loadSettings(): ModalSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ModalSettings>;
      return {
        ...defaultModalSettings,
        ...saved,
        families: { ...defaultModalSettings.families, ...(saved.families ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return defaultModalSettings;
}

/** Sheet spelling into print: b9 → ♭9, #IV-7(b5) → ♯IV-7(♭5). */
export const symbols = (text: string): string =>
  text.replace(/b(?=[IViv0-9])/g, '♭').replace(/#(?=[IViv0-9])/g, '♯');

export default function ModalGame({
  onBack,
  skipSetup,
  mixed,
}: {
  onBack: () => void;
  skipSetup?: boolean;
  mixed?: MixedHooks;
}) {
  const [settings, setSettings] = useState<ModalSettings>(loadSettings);
  const [phase, setPhase] = useState<'setup' | 'play'>(() =>
    (skipSetup || mixed) && modalReady(settings) ? 'play' : 'setup',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [question, setQuestion] = useState<ModalQuestion | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ownReviewIndex, setReviewIndex] = useState<number | null>(null);
  const rv = reviewControls(ownReviewIndex, setReviewIndex, history.length, mixed);
  const reviewIndex = rv.index;
  const timer = useRef<number | null>(null);
  const lastSig = useRef<string | undefined>(undefined);
  const mixedRef = useRef(mixed);
  mixedRef.current = mixed;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const families = settings.families;
  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPicked([]);
    setCorrect(null);
    setReviewIndex(null);
    const q = generateModal({ ...defaultModalSettings, families }, Math.random, lastSig.current);
    lastSig.current = q.error ? undefined : questionSig(q);
    setQuestion(q);
  }, [families]);

  // Move past the question, and in a mixed session let the session hand over.
  const next = useCallback(() => {
    generate();
    mixedRef.current?.onDone();
  }, [generate]);

  // A question you're looking at survives a settings change unless its family
  // has just been switched off.
  const questionRef = useRef<ModalQuestion | null>(null);
  questionRef.current = question;
  useEffect(() => {
    if (phase !== 'play') return;
    const q = questionRef.current;
    if (!q || q.error || !families[q.family]) generate();
  }, [generate, families, phase]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const reviewing = reviewIndex !== null;
  const entry = reviewing ? history[reviewIndex] : null;
  const dq = reviewing ? entry!.question : question;
  const dPicked = reviewing ? entry!.picked : picked;
  const dCorrect = reviewing ? entry!.correct : correct;
  const answered = dCorrect !== null;
  const multi = !!dq && dq.answer.length > 1;

  const settle = (chosen: string[]) => {
    if (!question || correct !== null || reviewing) return;
    const isCorrect = modalAnswerMatches(chosen, question);
    mixedRef.current?.onResult(isCorrect);
    haptic(isCorrect ? CORRECT : WRONG);
    setPicked(chosen);
    setCorrect(isCorrect);
    setStreak((s) => (isCorrect ? s + 1 : 0));
    setHistory((h) => [...h, { question, picked: chosen, correct: isCorrect }]);
    setFlash(isCorrect ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 500);
    if (isCorrect && settings.autoAdvance) timer.current = window.setTimeout(next, ADVANCE_MS);
  };

  const tap = (option: string) => {
    if (!question || answered || reviewing) return;
    haptic(TAP);
    // One answer settles on the tap; a set waits for the check.
    if (question.answer.length === 1) {
      settle([option]);
      return;
    }
    setPicked((p) => (p.includes(option) ? p.filter((x) => x !== option) : [...p, option]));
  };

  const enterReview = () => {
    if (!rv.canEnter) return;
    if (timer.current) clearTimeout(timer.current);
    rv.enter();
  };

  const advance = () => {
    if (answered && !reviewing) next();
  };
  const waitingToAdvance = answered && !reviewing && !(dCorrect && settings.autoAdvance);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // Set the drill up before it starts, rather than dropping straight in.
  if (phase === 'setup') {
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
        <div className="stage setup-stage">
          <div className="setup-head reveal" style={{ animationDelay: '.04s' }}>
            <div className="setup-title">Modes</div>
          </div>
          <div className="reveal" style={{ animationDelay: '.08s' }}>
            <ModalOptions settings={settings} onChange={setSettings} />
          </div>
          <div className="setup-note reveal" style={{ animationDelay: '.12s' }}>
            The modal cheat sheet, asked both ways round.
          </div>
        </div>
        <div className="fret-actions">
          <button
            className="bigbtn"
            disabled={!modalReady(settings)}
            onClick={() => setPhase('play')}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${flash}${reviewing ? ' reviewing' : ''}`} onClick={advance}>
      <div className="top reveal" style={{ animationDelay: '.02s' }} onClick={stop}>
        <div className="top-left">
          <button className="icon-btn" aria-label="Home" onClick={onBack}>
            ←
          </button>
          <div className="streak" aria-label={`Streak ${mixed ? mixed.streak : streak}`}>
            <span className="dot" />
            <span className="n">{mixed ? mixed.streak : streak}</span>
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

      <div className="stage modal-stage">
        {!dq || dq.error ? (
          <div className="empty">
            {dq?.error ?? 'Nothing to ask.'}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="question-block">
              <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
                <span className="lead">{dq.lead}</span>
              </div>
              <div
                className={`modal-subject ${dq.subjectKind} reveal`}
                style={{ animationDelay: '.08s' }}
              >
                {dq.subjectKind === 'tensions' ? (
                  dq.subject.split(' · ').map((t) => (
                    <span className="tension" key={t}>
                      {symbols(t)}
                    </span>
                  ))
                ) : (
                  <span>{symbols(dq.subject)}</span>
                )}
              </div>
            </div>

            {/* Reserved so the answer landing never moves the question. */}
            <div className="modal-note" aria-live="polite">
              {answered ? (
                <>
                  <span className={`modal-verdict ${dCorrect ? 'ok' : 'no'}`}>
                    {dCorrect ? '✓ right' : '✗ not quite'}
                  </span>
                  {/* The options pad is gone in review, so what was tapped is
                      spelled out here instead. */}
                  {reviewing && (
                    <span className="modal-said">
                      <span className={dCorrect ? 'ok' : 'no'}>
                        you said {dPicked.length ? symbols(dPicked.join(', ')) : '—'}
                      </span>
                      {!dCorrect && (
                        <>
                          {' — answer '}
                          <span className="ok">{symbols(dq.answer.join(', '))}</span>
                        </>
                      )}
                    </span>
                  )}
                  {dq.note && <span className="modal-why">{symbols(dq.note)}</span>}
                </>
              ) : multi ? (
                <span className="lead">tap all that apply</span>
              ) : null}
            </div>
            {waitingToAdvance && <div className="next-hint">tap to continue →</div>}
          </>
        )}
      </div>

      {reviewing ? (
        <div className="fret-actions" onClick={stop}>
          <ReviewBar rv={rv} ok={!!dCorrect} verdict={dCorrect ? 'Right' : 'Wrong'} />
        </div>
      ) : dq && !dq.error ? (
        <div className="modal-answers" onClick={stop}>
          <div className={`modal-options${dq.wide ? ' wide' : ''}`}>
            {dq.options.map((o) => {
              const isAnswer = dq.answer.includes(o);
              const chosen = dPicked.includes(o);
              return (
                <button
                  key={o}
                  className={`modal-option${chosen ? ' picked' : ''}${
                    answered ? ' done' : ''
                  }${answered && isAnswer ? ' right' : ''}${
                    answered && chosen && !isAnswer ? ' wrong' : ''
                  }`}
                  aria-pressed={chosen}
                  onClick={() => {
                    if (answered) {
                      next(); // the stage's tap-to-continue, from down here too
                      return;
                    }
                    tap(o);
                  }}
                >
                  {symbols(o)}
                </button>
              );
            })}
          </div>
          {multi && !answered && (
            <button
              className="bigbtn"
              disabled={dPicked.length === 0}
              onClick={() => settle(picked)}
            >
              Check
            </button>
          )}
        </div>
      ) : null}

      {settingsOpen && (
        <div onClick={stop}>
          <ModalSettingsSheet
            settings={settings}
            onChange={setSettings}
            onClose={() => setSettingsOpen(false)}
          >
            <ThemeSettingRow />
          </ModalSettingsSheet>
        </div>
      )}

      {infoOpen && (
        <div onClick={stop}>
          <InfoModal title="Modes — the connections" onClose={() => setInfoOpen(false)}>
            <p>
              The modal cheat sheet, asked from every side: the degree a mode sits on, the tensions
              it takes, its harmonization, and the chords and vamps that state it.
            </p>
            <ul>
              <li>
                <b>Order</b> — the 5th mode is Mixolydian, and back again.
              </li>
              <li>
                <b>Tensions</b> — Phrygian takes ♭9, 11, ♭13. Which modes share a set?
              </li>
              <li>
                <b>Major / minor</b> — which family a mode belongs to, and the one degree that
                marks it: Dorian is minor, but its VI is natural where Aeolian flattens it.
              </li>
              <li>
                <b>Harmonization</b>, <b>chords &amp; vamps</b> — name the mode from its chords, or
                its chords from the mode.
              </li>
            </ul>
            <p className="info-dim">
              Six modes: Locrian sits outside the major and minor families, so it's left out.
            </p>
          </InfoModal>
        </div>
      )}
    </div>
  );
}
