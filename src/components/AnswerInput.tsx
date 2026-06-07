import { useEffect, useState, useCallback } from 'react';
import type { Question } from '../lib/engine';
import type { Feedback } from '../state/trainerReducer';
import { renderJazz } from './ChordDisplay';

// §17 — chromatic tap-to-build. Every answer has the shape
// [root|degree][accidental?][quality]; ~13 controls spell all of them. The
// builder assembles a plain string compared via the §13 parser — no keyboard.

interface Quality {
  ascii: string; // for the compare string
  disp: string; // jazz glyph form, for live preview / committed chips
  main: string; // button glyph
  sub: string; // button caption
  lower?: boolean; // numeral mode: lowercase the degree
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
const NUM_TRIAD: Quality[] = [
  { ascii: '', disp: '', main: 'maj', sub: 'major' },
  { ascii: '', disp: '', main: 'min', sub: 'minor', lower: true },
  { ascii: 'dim', disp: '°', main: 'dim', sub: '°', lower: true },
];
const NUM_7TH: Quality[] = [
  { ascii: 'maj7', disp: '△7', main: 'maj7', sub: '△7' },
  { ascii: 'm7', disp: '-7', main: 'm7', sub: '-7', lower: true },
  { ascii: '7', disp: '7', main: '7', sub: 'dom7' },
  { ascii: 'm7b5', disp: 'ø7', main: 'ø7', sub: 'm7b5', lower: true },
];

const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const accG = (a: string) => (a === '#' ? '♯' : a === 'b' ? '♭' : '');

export interface BuilderApi {
  isNumeral: boolean;
  use7th: boolean;
  slots: number;
  active: string | null; // in-progress root or degree
  acc: string;
  committed: string[]; // display chips
  qualities: Quality[];
  pickActive: (v: string) => void;
  toggleAcc: (v: 'b' | '#') => void;
  backspace: () => void;
  commit: (q: Quality) => void;
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

  const qualities = isNumeral
    ? seventh
      ? NUM_7TH
      : NUM_TRIAD
    : seventh
      ? CHORD_7TH
      : CHORD_TRIAD;

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

  const commit = useCallback(
    (q: Quality) => {
      if (disabled || !active) return;
      onTap?.();
      let ascii: string;
      let disp: string;
      if (isNumeral) {
        const deg = q.lower ? active.toLowerCase() : active;
        ascii = deg + q.ascii;
        disp = deg + q.disp;
      } else {
        ascii = active + acc + q.ascii;
        disp = active + accG(acc) + q.disp;
      }
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
    [disabled, active, acc, isNumeral, committed, committedAscii, slots, onSubmit, onTap],
  );

  const inProgressDisplay = active ? (isNumeral ? active : active + accG(acc)) : null;

  return {
    isNumeral,
    use7th: seventh,
    slots,
    active,
    acc,
    committed,
    qualities,
    pickActive,
    toggleAcc,
    backspace,
    commit,
    inProgressDisplay,
  };
}

// ---- Preview (lives in the stage, under the hero) ----
export function Preview({
  builder,
  feedback,
  correctAnswer,
}: {
  builder: BuilderApi;
  feedback: Feedback | null;
  correctAnswer: string | null;
}) {
  const { slots, committed, inProgressDisplay, active } = builder;

  if (slots > 1) {
    return (
      <div className="preview">
        <div className="slotstrip">
          {Array.from({ length: slots }).map((_, i) => {
            const filled = i < committed.length;
            const isActive = i === committed.length && !feedback;
            const content = filled
              ? committed[i]
              : isActive && inProgressDisplay
                ? inProgressDisplay
                : '·';
            return (
              <span
                key={i}
                className={`slot${filled ? ' filled' : ''}${isActive ? ' active' : ''}`}
              >
                {filled ? renderJazz(content, `s${i}`) : isActive && inProgressDisplay ? renderJazz(content, `s${i}`) : content}
              </span>
            );
          })}
        </div>
        {feedback && (
          <span className={`verdict ${feedback.correct ? 'ok' : 'no'}`}>
            {feedback.correct ? '✓ correct' : <>{'✕ '}{renderJazz(correctAnswer ?? '', 'fb')}</>}
          </span>
        )}
      </div>
    );
  }

  // Single-chord modes
  if (feedback) {
    return (
      <div className="preview">
        <span className="chip">{renderJazz(committed[0] ?? '', 'c')}</span>
        <span className={`verdict ${feedback.correct ? 'ok' : 'no'}`}>
          {feedback.correct ? '✓ correct' : <>{'✕ '}{renderJazz(correctAnswer ?? '', 'fb')}</>}
        </span>
      </div>
    );
  }
  return (
    <div className="preview">
      {active ? (
        <span className="chip">{renderJazz(inProgressDisplay ?? '', 'ip')}</span>
      ) : (
        <span className="chip ghost">{'—'}</span>
      )}
    </div>
  );
}

// ---- Keypad (bottom of screen) ----
export function Keypad({ builder, disabled }: { builder: BuilderApi; disabled: boolean }) {
  const { isNumeral, active, acc, qualities, pickActive, toggleAcc, backspace, commit } = builder;

  return (
    <div className="pad">
      <div className="cap">{isNumeral ? 'degree' : 'root'}</div>
      <div className="row">
        {(isNumeral ? DEGREES : ROOTS).map((r) => (
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

      {!isNumeral && (
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
      )}

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
        {isNumeral && (
          <button className="key util" onClick={backspace} disabled={disabled}>
            {'⌫'}
          </button>
        )}
      </div>
    </div>
  );
}
