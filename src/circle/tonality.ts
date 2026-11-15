import { chordData } from '../lib/chordData';
import { DEGREE_KEYS } from '../lib/engine';
import { WEDGE, type Ring } from './circleData';

/**
 * A key's window holds seven chords. Which one you call home decides whether
 * you're in C major or A minor — the chords don't move, only the counting
 * does. That's the whole of this module: the same seven cells, numbered twice.
 */
export type Tonality = 'major' | 'minor';

/** What each chord of the major table is called when counting from the sixth. */
const MINOR_NUMERAL: Record<string, string> = {
  vi: 'i',
  'vii°': 'ii°',
  I: 'III',
  ii: 'iv',
  iii: 'v',
  IV: 'VI',
  V: 'VII',
};

/** Each reading's scale order, written in the major key's own numerals. */
const ORDER: Record<Tonality, string[]> = {
  major: DEGREE_KEYS,
  minor: ['vi', 'vii°', 'I', 'ii', 'iii', 'IV', 'V'],
};

export interface Cell {
  /** The ring it sits in, and how many spokes clockwise of the key's own. */
  ring: Ring;
  offset: number;
  /** What this reading calls it: I…vii°, or i…VII. */
  numeral: string;
  /** Which of the key table's seven chords it holds. */
  index: number;
}

/** The seven cells in the reading's own order, tonic first. */
export function cells(tonality: Tonality): Cell[] {
  return ORDER[tonality].map((degree) => {
    const w = WEDGE.find((x) => x.degree === degree)!;
    return {
      ring: w.ring,
      offset: w.offset,
      numeral: tonality === 'major' ? degree : MINOR_NUMERAL[degree],
      index: DEGREE_KEYS.indexOf(degree),
    };
  });
}

/** Tonic, subdominant, dominant, tonic — as indices into the key's table. */
export const cadence = (tonality: Tonality): number[] =>
  [0, 3, 4, 0].map((d) => cells(tonality)[d].index);

/** The chord you'd call home, spelled by the key's own table. */
export const tonicChord = (tonality: Tonality, key: string): string =>
  chordData[key].triads.chords[cells(tonality)[0].index];

export interface Fact {
  label: string;
  chord: string;
}

/**
 * The three things the wheel puts next to a key: the other way of reading the
 * same window, and the neighbouring spokes that hold its fourth and fifth.
 */
export function facts(tonality: Tonality, key: string): Fact[] {
  const table = chordData[key].triads.chords;
  const c = cells(tonality);
  const other = tonality === 'major' ? 'minor' : 'major';
  return [
    { label: `relative ${other}`, chord: tonicChord(other, key) },
    { label: `${c[3].numeral} · a fifth down`, chord: table[c[3].index] },
    { label: `${c[4].numeral} · a fifth up`, chord: table[c[4].index] },
  ];
}
