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

/** The chord you'd call home, spelled by the key's own table. */
export const tonicChord = (tonality: Tonality, key: string): string =>
  chordData[key].triads.chords[cells(tonality)[0].index];
