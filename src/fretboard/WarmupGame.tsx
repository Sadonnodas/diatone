import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FretboardWindow } from './FretboardWindow';
import { buildFretNotes } from './fretDisplay';
import {
  WARMUP_SHAPES,
  degreeGlyphs,
  degreeOrdinal,
  degreeIsRoot,
  type WarmupShape,
} from './scaleData';
import { renderJazz } from '../components/ChordDisplay';
import { haptic, TAP, CORRECT, WRONG } from '../lib/haptics';

const STORAGE_KEY = 'diatone.warmup.v1';
type Quality = 'major' | 'minor';

interface WarmupSettings {
  shapes: Record<WarmupShape, boolean>;
  qualities: Record<Quality, boolean>;
  autoAdvance: boolean;
}
const defaults: WarmupSettings = {
  shapes: { rectangle: true, stack: true },
  qualities: { major: true, minor: true },
  autoAdvance: true,
};

const STRINGS: Record<WarmupShape, number[]> = { rectangle: [3, 4], stack: [2, 3, 4] };

interface PlacedMini {
  string: number;
  fret: number;
  degree: string;
  isRoot: boolean;
}
interface WQuestion {
  shape: WarmupShape;
  quality: Quality;
  strings: number[];
  notes: PlacedMini[];
  target: string;
  startFret: number;
  endFret: number;
  correctKeys: string[];
}
interface WHistory {
  question: WQuestion;
  selected: Set<string>;
  correct: boolean;
}

function loadSettings(): WarmupSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export default function WarmupGame({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<WarmupSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [question, setQuestion] = useState<WQuestion | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState<'' | 'flash-ok' | 'flash-no'>('');
  const [history, setHistory] = useState<WHistory[]>([]);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const lastSig = useRef<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const enabledShapes = useMemo(
    () => (Object.keys(settings.shapes) as WarmupShape[]).filter((s) => settings.shapes[s]),
    [settings.shapes],
  );
  const enabledQualities = useMemo(
    () => (Object.keys(settings.qualities) as Quality[]).filter((q) => settings.qualities[q]),
    [settings.qualities],
  );

  const generate = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSelected(new Set());
    setAnswered(false);
    setCorrect(null);
    setReviewIndex(null);

    if (enabledShapes.length === 0 || enabledQualities.length === 0) {
      setQuestion(null);
      return;
    }
    // Pick a shape/quality/target that isn't a repeat of the previous question.
    // Root is hidden, so finding the root is itself a fair question — include it.
    let shape = enabledShapes[0];
    let quality = enabledQualities[0];
    let target = '1';
    let sig = '';
    for (let i = 0; i < 25; i++) {
      shape = enabledShapes[Math.floor(Math.random() * enabledShapes.length)];
      quality = enabledQualities[Math.floor(Math.random() * enabledQualities.length)];
      const degs = Array.from(new Set(WARMUP_SHAPES[shape][quality].map((m) => m.degree)));
      target = degs[Math.floor(Math.random() * degs.length)];
      sig = `${shape}|${quality}|${target}`;
      if (sig !== lastSig.current) break;
    }
    lastSig.current = sig;

    const strings = STRINGS[shape];
    const baseFret = Math.floor(Math.random() * 4) + 4; // 4..7
    const notes: PlacedMini[] = WARMUP_SHAPES[shape][quality].map((m) => ({
      string: strings[m.s],
      fret: baseFret + m.f,
      degree: m.degree,
      isRoot: !!m.root,
    }));
    const correctKeys = notes.filter((n) => n.degree === target).map((n) => `${n.string}-${n.fret}`);
    const frets = notes.map((n) => n.fret);
    setQuestion({
      shape,
      quality,
      strings,
      notes,
      target,
      startFret: Math.max(0, Math.min(...frets) - 1),
      endFret: Math.max(...frets) + 1,
      correctKeys,
    });
  }, [enabledShapes, enabledQualities]);

  useEffect(() => {
    generate();
  }, [generate]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const reviewing = reviewIndex !== null;
  const item = reviewing ? history[reviewIndex] : null;
  const dq = reviewing ? item!.question : question;
  const dSel = reviewing ? item!.selected : selected;
  const dAns = reviewing ? true : answered;
  const dCor = reviewing ? item!.correct : correct;

  const toggle = (string: number, fret: number) => {
    if (answered || reviewing) return;
    haptic(TAP);
    const key = `${string}-${fret}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const check = () => {
    if (answered || !question) return;
    const target = new Set(question.correctKeys);
    const isCorrect = target.size === selected.size && [...target].every((k) => selected.has(k));
    setCorrect(isCorrect);
    setAnswered(true);
    setStreak((s) => (isCorrect ? s + 1 : 0));
    setHistory((h) => [...h, { question, selected: new Set(selected), correct: isCorrect }]);
    haptic(isCorrect ? CORRECT : WRONG);
    setFlash(isCorrect ? 'flash-ok' : 'flash-no');
    window.setTimeout(() => setFlash(''), 500);
    if (isCorrect && settings.autoAdvance) timer.current = window.setTimeout(generate, 900);
  };

  const enterReview = () => {
    if (history.length === 0) return;
    if (timer.current) clearTimeout(timer.current);
    setReviewIndex(history.length - 1);
  };
  const reviewNav = (dir: number) =>
    setReviewIndex((i) => (i === null ? null : Math.max(0, Math.min(history.length - 1, i + dir))));
  const exitReview = () => setReviewIndex(null);

  const fretNotes = dq ? buildFretNotes(dq.notes, dq.target, dSel, dAns, 'none') : [];

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
        {!dq ? (
          <div className="empty">
            Pick at least one shape and quality.
            <div style={{ marginTop: 16 }}>
              <button className="pill on" onClick={() => setSettingsOpen(true)}>
                Open settings
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ctx reveal" style={{ animationDelay: '.04s' }}>
              <span className="lead">{dq.quality} shape</span>
            </div>
            <div className="fret-prompt reveal" style={{ animationDelay: '.08s' }}>
              <span className="lead">tap every</span>
              <span className="t">{renderJazz(degreeGlyphs(degreeOrdinal(dq.target)), 'tgt')}</span>
              {!degreeIsRoot(dq.target) && <span className="lead">degree</span>}
            </div>
            <FretboardWindow
              notes={fretNotes}
              startFret={dq.startFret}
              endFret={dq.endFret}
              strings={dq.strings}
              onTap={toggle}
            />
          </>
        )}
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
      ) : dq ? (
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
        <WarmupSettingsSheet
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function WarmupSettingsSheet({
  settings,
  onChange,
  onClose,
}: {
  settings: WarmupSettings;
  onChange: (s: WarmupSettings) => void;
  onClose: () => void;
}) {
  const shapes: WarmupShape[] = ['rectangle', 'stack'];
  const qualities: Quality[] = ['major', 'minor'];
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Settings">
        <div className="grab" />
        <div className="sheet-head">
          <div className="sheet-title">Settings</div>
          <button className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="sheet-body">
          <div>
            <div className="group-label">Shapes</div>
            <div className="chiprow">
              {shapes.map((s) => (
                <button
                  key={s}
                  className={`tog${settings.shapes[s] ? ' on' : ''}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() =>
                    onChange({ ...settings, shapes: { ...settings.shapes, [s]: !settings.shapes[s] } })
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="group-label">Quality</div>
            <div className="chiprow">
              {qualities.map((q) => (
                <button
                  key={q}
                  className={`tog${settings.qualities[q] ? ' on' : ''}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() =>
                    onChange({
                      ...settings,
                      qualities: { ...settings.qualities, [q]: !settings.qualities[q] },
                    })
                  }
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="label">Auto-advance</div>
              <div className="desc">Move on shortly after a correct answer.</div>
            </div>
            <button
              className={`switch${settings.autoAdvance ? ' on' : ''}`}
              aria-pressed={settings.autoAdvance}
              onClick={() => onChange({ ...settings, autoAdvance: !settings.autoAdvance })}
            />
          </div>
        </div>
      </div>
    </>
  );
}
