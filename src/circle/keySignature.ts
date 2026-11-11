import { ALL_KEYS, chordData } from '../lib/chordData';

// Accidentals always arrive in the same order — each step round the circle
// adds the next one. That's the whole trick the wheel is drawing.
export const SHARP_ORDER = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯', 'B♯'];
export const FLAT_ORDER = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭', 'F♭'];

export interface Signature {
  /** How many accidentals, 0–6 for the keys on the wheel. */
  count: number;
  kind: 'sharp' | 'flat' | 'none';
  /** The accidentals themselves, in the order they're written. */
  accidentals: string[];
}

/**
 * A key's signature from its place on the circle: clockwise from C adds
 * sharps, anticlockwise adds flats. Gb (the enharmonic extra) is the flat side
 * of the same spoke as F#.
 */
export function keySignature(key: string): Signature {
  if (key === 'Gb') return { count: 6, kind: 'flat', accidentals: FLAT_ORDER.slice(0, 6) };
  const pos = ALL_KEYS.indexOf(key);
  if (pos < 0) return { count: 0, kind: 'none', accidentals: [] };
  if (pos === 0) return { count: 0, kind: 'none', accidentals: [] };
  if (pos <= 6) return { count: pos, kind: 'sharp', accidentals: SHARP_ORDER.slice(0, pos) };
  const flats = 12 - pos;
  return { count: flats, kind: 'flat', accidentals: FLAT_ORDER.slice(0, flats) };
}

/** "2 sharps", "1 flat", "no sharps or flats". */
export function signatureText(key: string): string {
  const s = keySignature(key);
  if (s.kind === 'none') return 'no sharps or flats';
  return `${s.count} ${s.kind}${s.count === 1 ? '' : 's'}`;
}

/** The key's relative minor — the vi of its own table. */
export const relativeMinor = (key: string): string => chordData[key].triads.chords[5];

/** The keys a fifth either side: the wheel's neighbours, and a key's IV and V. */
export function neighbours(key: string): { down: string; up: string } {
  const pos = ALL_KEYS.indexOf(key);
  return {
    down: ALL_KEYS[(pos + 11) % 12],
    up: ALL_KEYS[(pos + 1) % 12],
  };
}
