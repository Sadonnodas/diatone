import { useEffect, useState, useCallback } from 'react';
import type { Question } from '../lib/engine';
import { DEGREE_KEYS } from '../lib/engine';
import { display7th, progressionToJazz } from '../lib/jazz';
import { renderJazz } from './ChordDisplay';

// §17 — chromatic tap-to-build. Chord answers are [root][accidental?][quality];
// numeral answers are just the degree (the quality is implied by the chord shown
// and by the diatonic position, so it isn't re-entered — see Name Numeral).

interface Quality {
  ascii: string; // for the compare string
  disp: string; // jazz glyph form, for live preview / committed chips
  main: string; // button glyph
  sub: string; // button caption
}

const CHORD_TRIAD: Quality[] = [
  { ascii: '', disp: '', main: 'maj', sub: 'major' },
  { ascii: 'm', disp: '-', main: '–', sub: 'minor' },
  { ascii: 'dim', disp: '°', main: '°', sub: 'dim' },
];
const CHORD_7TH: Quality[] = [
  { ascii: 'maj7', disp: '△7', main: '△7', sub: 'maj7' },
  { ascii: 'm7', disp: '-7', main: '-7', sub: 'm7' },
  { ascii: '7', disp: '7', main: '7', sub: 'dom7' },
  { ascii: 'm7b5', disp: 'ø7', main: 'ø7', sub: 'm7b5' },
];

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const accG = (a: string) => (a === '#' ? '♯' : a === 'b' ? '♭' : '');

export interface BuilderApi {
  isNumeral: boolean;
  slots: number;
  active: string | null; // in-progress root
  acc: string;
  committed: string[]; // display chips
  qualities: Quality[];
  pickActive: (v: string) => void;
  toggleAcc: (v: 'b' | '#') => void;
  backspace: () => void;
  commit: (q: Quality) => void; // chord modes (commit-on-quality)
  commitDegree: (i: number) => void; // numeral mode (commit-on-degree)
  inProgressDisplay: string | null;
}

export function useAnswerBuilder(opts: {
  question: Question | null;
  use7thChords: boolean;
  disabled: boolean;
  onSubmit: (ascii: string, display: string) => void;
  onTap?: () => void;
}): BuilderApi {
  const { question, use7thChords, disabled, onSubmit, onTap } = opts;
  const isNumeral = question?.mode === 4;
  // slots = number of chords/numerals to answer (1 for modes 1 & 4).
  const slots = question ? question.answer.split(' ').length : 1;
  const seventh = use7thChords;

  const [active, setActive] = useState<string | null>(null);
  const [acc, setAcc] = useState('');
  const [committed, setCommitted] = useState<string[]>([]);
  const [committedAscii, setCommittedAscii] = useState<string[]>([]);

  const sig = question ? JSON.stringify(question.seed) : '';
  useEffect(() => {
    setActive(null);
    setAcc('');
    setCommitted([]);
    setCommittedAscii([]);
  }, [sig]);

  const qualities = seventh ? CHORD_7TH : CHORD_TRIAD;

  const pickActive = useCallback(
    (v: string) => {
      if (disabled) return;
      setActive(v);
      setAcc('');
      onTap?.();
    },
    [disabled, onTap],
  );

  const toggleAcc = useCallback(
    (v: 'b' | '#') => {
      if (disabled || !active) return;
      setAcc((a) => (a === v ? '' : v));
      onTap?.();
    },
    [disabled, active, onTap],
  );

  const backspace = useCallback(() => {
    if (disabled) return;
    if (active) {
      setActive(null);
      setAcc('');
    } else if (committed.length > 0) {
      setCommitted((c) => c.slice(0, -1));
      setCommittedAscii((c) => c.slice(0, -1));
    }
    onTap?.();
  }, [disabled, active, committed.length, onTap]);

  // Chord modes (1, 2, 3): root [+ accidental] + quality commits the chord.
  const commit = useCallback(
    (q: Quality) => {
      if (disabled || !active) return;
      onTap?.();
      const ascii = active + acc + q.ascii;
      const disp = active + accG(acc) + q.disp;
      const nextAscii = [...committedAscii, ascii];
      const nextDisp = [...committed, disp];
      setCommittedAscii(nextAscii);
      setCommitted(nextDisp);
      setActive(null);
      setAcc('');
      if (nextAscii.length >= slots) {
        onSubmit(nextAscii.join(' '), nextDisp.join(' '));
      }
    },
    [disabled, active, acc, committed, committedAscii, slots, onSubmit, onTap],
  );

  // Name Numeral (mode 4): one tap. The degree determines the full diatonic
  // numeral (quality/case auto-applied) — no quality to re-enter.
  const commitDegree = useCallback(
    (i: number) => {
      if (disabled) return;
      onTap?.();
      const built = display7th(DEGREE_KEYS[i], use7thChords); // e.g. ii / iim7 / viiø7 / V7
      const disp = progressionToJazz(built); // ii / ii-7 / viiø7 / V7 / I△7
      onSubmit(built, disp);
    },
    [disabled, use7thChords, onSubmit, onTap],
  );

  const inProgressDisplay = active ? active + accG(acc) : null;

  return {
    isNumeral,
    slots,
    active,
    acc,
    committed,
    qualities,
    pickActive,
    toggleAcc,
    backspace,
    commit,
    commitDegree,
    inProgressDisplay,
  };
}

// ---- Preview (lives in the stage, under the hero, only while building) ----
// Shows the live chord you're assembling. Progression modes always show the
// slot strip (it's the only cue for "4 answers needed"); single chord modes show
// a chip once you've started. Numeral mode commits instantly, so no preview.
// Feedback is rendered by the Prompt, not here.
export function Preview({ builder }: { builder: BuilderApi }) {
  const { slots, committed, inProgressDisplay, active } = builder;

  if (slots > 1) {
    return (
      <div className="preview">
        <div className="slotstrip">
          {Array.from({ length: slots }).map((_, i) => {
            const filled = i < committed.length;
            const isActive = i === committed.length;
            const show = filled ? committed[i] : isActive && inProgressDisplay ? inProgressDisplay : null;
            return (
              <span key={i} className={`slot${filled ? ' filled' : ''}${isActive ? ' active' : ''}`}>
                {show ? renderJazz(show, `s${i}`) : '·'}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (!active) return null;
  return (
    <div className="preview">
      <span className="chip">{renderJazz(inProgressDisplay ?? '', 'ip')}</span>
    </div>
  );
}

// ---- Keypad (bottom of screen) ----
export function Keypad({ builder, disabled }: { builder: BuilderApi; disabled: boolean }) {
  const { isNumeral, active, acc, qualities, pickActive, toggleAcc, backspace, commit, commitDegree } =
    builder;

  // Name Numeral: just the degree — one tap answers.
  if (isNumeral) {
    return (
      <div className="pad">
        <div className="cap">degree — tap to answer</div>
        <div className="row">
          {DEGREES.map((d, i) => (
            <button key={d} className="key" onClick={() => commitDegree(i)} disabled={disabled}>
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Chord modes: root → (accidental) → quality.
  return (
    <div className="pad">
      <div className="cap">root</div>
      <div className="row">
        {ROOTS.map((r) => (
          <button
            key={r}
            className={`key${active === r ? ' sel' : ''}`}
            onClick={() => pickActive(r)}
            disabled={disabled}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="row">
        <button
          className={`key${acc === 'b' ? ' sel' : ''}`}
          onClick={() => toggleAcc('b')}
          disabled={disabled || !active}
        >
          {'♭'}
        </button>
        <button
          className={`key${acc === '#' ? ' sel' : ''}`}
          onClick={() => toggleAcc('#')}
          disabled={disabled || !active}
        >
          {'♯'}
        </button>
        <button className="key util" onClick={backspace} disabled={disabled}>
          {'⌫'}
        </button>
      </div>

      <div className="cap">quality — tap to answer</div>
      <div className="row">
        {qualities.map((q) => (
          <button
            key={q.sub + q.main}
            className="key q"
            onClick={() => commit(q)}
            disabled={disabled || !active}
          >
            <span className="q-glyph">{q.main}</span>
            <small>{q.sub}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
