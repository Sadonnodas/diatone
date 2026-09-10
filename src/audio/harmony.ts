// Chord symbol → pitches. The drill's answers are spelled strings ('C△7',
// 'E#dim', 'Cbmaj7'); this turns them into MIDI notes we can sound.
//
// Parsing rides on normalize() from the answer checker, which already folds
// every accepted notation (jazz, textbook, Unicode) down to one lowercase
// standard form. That means playback accepts exactly what the grader accepts —
// they can't drift apart.

import { normalize } from '../lib/normalize';

const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

// Root position throughout: intervals ascend from the root, so the root is
// always the lowest note. Voice leading with moving bass notes reads as a
// different chord to anyone still learning the shapes.
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7], // major triad
  m: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10], // dominant
  m7b5: [0, 3, 6, 10],
};

/**
 * Every root lands in one octave band (C3–B3), so a I in C and a I in B sound
 * like they're in the same place. Without this the absolute pitch creeps up
 * with the key and the same progression feels like a different instrument.
 */
export const ROOT_LOW = 48; // C3

/** Pitch class of a spelled root, or null. Handles E#, Cb, double accidentals. */
export function rootPitchClass(name: string): number | null {
  const m = /^([a-g])(#+|b+)?$/.exec(normalize(name));
  if (!m) return null;
  const [, letter, acc] = m;
  const shift = acc ? (acc[0] === '#' ? acc.length : -acc.length) : 0;
  return (((LETTER_PC[letter] + shift) % 12) + 12) % 12;
}

/** MIDI notes for one chord symbol, root position in the fixed band. */
export function chordToMidi(chord: string): number[] | null {
  const m = /^([a-g])(#+|b+)?(.*)$/.exec(normalize(chord));
  if (!m) return null;
  const [, letter, acc, suffix] = m;
  const intervals = QUALITY[suffix];
  if (!intervals) return null;
  const shift = acc ? (acc[0] === '#' ? acc.length : -acc.length) : 0;
  const pc = (((LETTER_PC[letter] + shift) % 12) + 12) % 12;
  return intervals.map((i) => ROOT_LOW + pc + i);
}

/** MIDI notes for a space-separated progression. Null if any chord won't parse. */
export function progressionToMidi(answer: string): number[][] | null {
  const parts = normalize(answer).split(' ').filter(Boolean);
  if (parts.length === 0) return null;
  const out: number[][] = [];
  for (const p of parts) {
    const notes = chordToMidi(p);
    if (!notes) return null;
    out.push(notes);
  }
  return out;
}

/** The tonic triad of a key, for the anchor that gives a numeral its meaning. */
export function tonicTriad(key: string): number[] | null {
  const pc = rootPitchClass(key);
  return pc === null ? null : [0, 4, 7].map((i) => ROOT_LOW + pc + i);
}
