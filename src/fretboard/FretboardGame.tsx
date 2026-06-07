import { useEffect, useState } from 'react';
import { FretboardWindow, type FretNote } from './FretboardWindow';
import { FretboardSettings } from './FretboardSettings';
import {
  useFretboardGame,
  defaultFretSettings,
  type FretSettings,
  type FretQuestion,
} from './useFretboardGame';
import { SCALE_TYPE_INFO, degreeGlyphs } from './scaleData';
import { renderJazz } from '../components/ChordDisplay';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';

const STORAGE_KEY = 'diatone.fret.v1';
const ROOT_STRINGS = new Set([4, 5, 6]);

function loadSettings(): FretSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultFretSettings, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultFretSettings;
}

// Resolve each note's colours/label for the current state.
function buildFretNotes(q: FretQuestion, selected: Set<string>, answered: boolean): FretNote[] {
  return q.notes.map((n) => {
    const key = `${n.string}-${n.fret}`;
    const sel = selected.has(key);
    const isTarget = n.degree === q.target;
    const pos = { string: n.string, fret: n.fret };

    if (answered) {
      if (isTarget && sel)
        return { ...pos, fill: 'var(--correct)', stroke: 'var(--correct)', text: '#0a0c10', label: n.degree, tappable: false };
      if (isTarget && !sel)
        return { ...pos, fill: 'transparent', stroke: 'var(--correct)', text: 'var(--correct)', label: n.degree, tappable: false };
      if (!isTarget && sel)
        return { ...pos, fill: 'var(--wrong)', stroke: 'var(--wrong)', text: '#fff', label: n.degree, tappable: false };
      return { ...pos, fill: 'var(--surface-1)', stroke: 'var(--line)', text: 'var(--text-3)', label: n.degree, tappable: false };
    }

    if (sel)
      return { ...pos, fill: 'var(--accent-deep)', stroke: 'var(--accent)', text: '#fff', label: '', tappable: true };
    if (q.contextMode === 'rootGiven' && n.isRoot && ROOT_STRINGS.has(n.string))
      return { ...pos, fill: 'var(--accent-dim)', stroke: 'var(--accent-line)', text: 'var(--accent)', label: 'R', tappable: true };
    return { ...pos, fill: 'var(--surface-2)', stroke: 'var(--line-strong)', text: 'var(--text)', label: '', tappable: true };
  });
}

function contextLabel(q: FretQuestion): string {
  if (q.contextMode === 'qualityGiven') return `${q.quality} pattern`;
  return SCALE_TYPE_INFO[q.scaleType].label;
}

export default function FretboardGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<FretSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');

  const { question, selected, answered, correct, streak, toggle, check, generate, scheduleAdvance } =
    useFretboardGame(settings);

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

  const fretNotes = question && !question.error ? buildFretNotes(question, selected, answered) : [];

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
              <span className="lead">{contextLabel(question)}</span>
            </div>
            <div className="fret-prompt reveal" style={{ animationDelay: '.08s' }}>
              tap every <span className="t">{renderJazz(degreeGlyphs(question.target), 'tgt')}</span>
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
