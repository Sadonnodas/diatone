import { useEffect, useState } from 'react';
import { FretboardWindow } from './FretboardWindow';
import { FretboardSettings } from './FretboardSettings';
import { useFretboardGame, defaultFretSettings, type FretSettings } from './useFretboardGame';
import { SCALE_TYPE_INFO, degreeGlyphs, degreeOrdinal, degreeIsRoot } from './scaleData';
import { buildFretNotes } from './fretDisplay';
import { renderJazz } from '../components/ChordDisplay';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';

const STORAGE_KEY = 'diatone.fret.v1';

function loadSettings(): FretSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultFretSettings, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultFretSettings;
}

export default function FretboardGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<FretSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [hintShown, setHintShown] = useState(false);

  const {
    question, selected, answered, correct, streak,
    history, reviewIndex,
    toggle, check, generate, scheduleAdvance,
    enterReview, reviewNav, exitReview,
  } = useFretboardGame(settings);

  useEffect(() => setHintShown(false), [question]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  useEffect(() => {
    if (!answered) {
      setFlash('');
      return;
    }
    haptic(correct ? CORRECT : WRONG);
    setFlash(correct ? 'flash-ok' : 'flash-no');
    const t = window.setTimeout(() => setFlash(''), 500);
    if (correct && settings.autoAdvance) scheduleAdvance();
    return () => window.clearTimeout(t);
  }, [answered, correct, settings.autoAdvance, scheduleAdvance]);

  const reviewing = reviewIndex !== null;
  const item = reviewing ? history[reviewIndex] : null;
  // Displayed question/state: a history entry while reviewing, otherwise live.
  const dq = reviewing ? item!.question : question;
  const valid = !!dq && !dq.error;
  const dSel = reviewing ? item!.selected : selected;
  const dAns = reviewing ? true : answered;
  const dCor = reviewing ? item!.correct : correct;

  const onTap = (string: number, fret: number) => {
    if (reviewing) return;
    haptic(TAP);
    toggle(string, fret);
  };

  const fretNotes = valid
    ? buildFretNotes(dq!.notes, dq!.target, dSel, dAns, dq!.contextMode === 'rootGiven' ? 'low' : 'none')
    : [];

  const showScaleType =
    valid && (reviewing || dq!.contextMode === 'qualityGiven' || settings.revealScaleType || hintShown || answered);
  const ctxLabel = valid
    ? dq!.contextMode === 'qualityGiven'
      ? `${dq!.quality} pattern`
      : SCALE_TYPE_INFO[dq!.scaleType].label
    : '';

  return (
    <div className={`app ${flash}`}>
      <div className="top reveal" style={{ animationDelay: '.02s' }}>
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
          <button
            className="icon-btn"
            aria-label="Review"
            onClick={enterReview}
            disabled={history.length === 0}
          >
            ↺
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className="stage fret-stage">
        {question?.error && !reviewing ? (
          <div className="empty">
            {question.error}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : valid ? (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              {showScaleType ? (
                <span className="lead">{ctxLabel}</span>
              ) : (
                <button className="hint-btn" onClick={() => setHintShown(true)}>
                  Hint: reveal scale
                </button>
              )}
            </div>
            <div className="fret-prompt reveal" style={{ animationDelay: '.08s' }}>
              <span className="lead">tap every</span>
              <span className="t">{renderJazz(degreeGlyphs(degreeOrdinal(dq!.target)), 'tgt')}</span>
              {!degreeIsRoot(dq!.target) && <span className="lead">degree</span>}
            </div>
            <FretboardWindow
              notes={fretNotes}
              startFret={dq!.startFret}
              endFret={dq!.endFret}
              onTap={onTap}
            />
          </>
        ) : null}
      </div>

      {reviewing ? (
        <div className="fret-actions">
          <div className={`fb ${dCor ? 'ok' : 'no'}`}>{dCor ? '✓ Correct' : '✗ Incorrect'}</div>
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
      ) : valid ? (
        <div className="fret-actions">
          {!answered ? (
            <button className="bigbtn" onClick={check} disabled={selected.size === 0}>
              Check
            </button>
          ) : (
            <>
              <div className={`fb ${correct ? 'ok' : 'no'}`}>
                {correct ? '✓ Correct' : '✗ See the highlighted notes'}
              </div>
              {!(correct && settings.autoAdvance) && (
                <button className="bigbtn" onClick={generate}>
                  Next
                </button>
              )}
            </>
          )}
        </div>
      ) : null}

      {settingsOpen && (
        <FretboardSettings
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
