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

  const { question, selected, answered, correct, streak, toggle, check, generate, scheduleAdvance } =
    useFretboardGame(settings);

  // Reset the per-question scale-type hint whenever a new question loads.
  useEffect(() => setHintShown(false), [question]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Feedback effects: haptic + flash + auto-advance on correct.
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

  const onTap = (string: number, fret: number) => {
    haptic(TAP);
    toggle(string, fret);
  };

  const fretNotes =
    question && !question.error
      ? buildFretNotes(
          question.notes,
          question.target,
          selected,
          answered,
          question.contextMode === 'rootGiven' ? 'low' : 'none',
        )
      : [];

  // Root-given hides the scale type behind a Hint button (unless revealed); the
  // quality-given mode always states the quality.
  const showScaleType =
    !!question &&
    !question.error &&
    (question.contextMode === 'qualityGiven' || settings.revealScaleType || hintShown || answered);
  const ctxLabel =
    question && !question.error
      ? question.contextMode === 'qualityGiven'
        ? `${question.quality} pattern`
        : SCALE_TYPE_INFO[question.scaleType].label
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
          </div>
        </div>
        <div className="top-right">
          <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            ⚙
          </button>
        </div>
      </div>

      <div className="stage fret-stage">
        {question?.error ? (
          <div className="empty">
            {question.error}
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : question ? (
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
              <span className="t">{renderJazz(degreeGlyphs(degreeOrdinal(question.target)), 'tgt')}</span>
              {!degreeIsRoot(question.target) && <span className="lead">degree</span>}
            </div>
            <FretboardWindow
              notes={fretNotes}
              startFret={question.startFret}
              endFret={question.endFret}
              onTap={onTap}
            />
          </>
        ) : null}
      </div>

      {question && !question.error && (
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
      )}

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
