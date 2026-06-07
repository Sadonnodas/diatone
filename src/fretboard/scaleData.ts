// CAGED scale-shape data, ported from the reference scaleDegreeConstants.js.
// Each note: s = string (1=high E .. 6=low E), f = fret offset relative to the
// shape's anchor, degree = scale degree, d:'R' marks a root. Quality/labels via
// SCALE_TYPE_INFO. We only need degrees + positions (note names aren't shown).

export interface ShapeNote {
  s: number;
  f: number;
  degree: string;
  d?: 'R';
}
export interface Shape {
  notes: ShapeNote[];
}
export type ScaleType = 'majorPentatonic' | 'minorPentatonic' | 'majorScale' | 'naturalMinor';
export type ShapeKey = 'E' | 'A' | 'G' | 'C' | 'D';

export const SCALE_SHAPES: Record<ScaleType, Record<ShapeKey, Shape>> = {
  majorPentatonic: {
    E: { notes: [
      { s: 6, f: 0, degree: '1', d: 'R' }, { s: 6, f: 2, degree: '2' },
      { s: 5, f: -1, degree: '3' }, { s: 5, f: 2, degree: '5' },
      { s: 4, f: -1, degree: '6' }, { s: 4, f: 2, degree: '1', d: 'R' },
      { s: 3, f: -1, degree: '2' }, { s: 3, f: 1, degree: '3' },
      { s: 2, f: 0, degree: '5' }, { s: 2, f: 2, degree: '6' },
      { s: 1, f: 0, degree: '1', d: 'R' }, { s: 1, f: 2, degree: '2' },
    ] },
    G: { notes: [
      { s: 6, f: -3, degree: '6' }, { s: 6, f: 0, degree: '1', d: 'R' },
      { s: 5, f: -3, degree: '2' }, { s: 5, f: -1, degree: '3' },
      { s: 4, f: -3, degree: '5' }, { s: 4, f: -1, degree: '6' },
      { s: 3, f: -3, degree: '1', d: 'R' }, { s: 3, f: -1, degree: '2' },
      { s: 2, f: -3, degree: '3' }, { s: 2, f: 0, degree: '5' },
      { s: 1, f: -3, degree: '6' }, { s: 1, f: 0, degree: '1', d: 'R' },
    ] },
    A: { notes: [
      { s: 6, f: 0, degree: '5' }, { s: 6, f: 2, degree: '6' },
      { s: 5, f: 0, degree: '1', d: 'R' }, { s: 5, f: 2, degree: '2' },
      { s: 4, f: -1, degree: '3' }, { s: 4, f: 2, degree: '5' },
      { s: 3, f: -1, degree: '6' }, { s: 3, f: 2, degree: '1', d: 'R' },
      { s: 2, f: 0, degree: '2' }, { s: 2, f: 2, degree: '3' },
      { s: 1, f: 0, degree: '5' }, { s: 1, f: 2, degree: '6' },
    ] },
    C: { notes: [
      { s: 6, f: -3, degree: '3' }, { s: 6, f: 0, degree: '5' },
      { s: 5, f: -3, degree: '6' }, { s: 5, f: 0, degree: '1', d: 'R' },
      { s: 4, f: -3, degree: '2' }, { s: 4, f: -1, degree: '3' },
      { s: 3, f: -3, degree: '5' }, { s: 3, f: -1, degree: '6' },
      { s: 2, f: -2, degree: '1', d: 'R' }, { s: 2, f: 0, degree: '2' },
      { s: 1, f: -3, degree: '3' }, { s: 1, f: 0, degree: '5' },
    ] },
    D: { notes: [
      { s: 6, f: 0, degree: '2' }, { s: 6, f: 2, degree: '3' },
      { s: 5, f: 0, degree: '5' }, { s: 5, f: 2, degree: '6' },
      { s: 4, f: 0, degree: '1', d: 'R' }, { s: 4, f: 2, degree: '2' },
      { s: 3, f: -1, degree: '3' }, { s: 3, f: 2, degree: '5' },
      { s: 2, f: 0, degree: '6' }, { s: 2, f: 3, degree: '1', d: 'R' },
      { s: 1, f: 0, degree: '2' }, { s: 1, f: 2, degree: '3' },
    ] },
  },

  minorPentatonic: {
    E: { notes: [
      { s: 6, f: 0, degree: '1', d: 'R' }, { s: 6, f: 3, degree: 'b3' },
      { s: 5, f: 0, degree: '4' }, { s: 5, f: 2, degree: '5' },
      { s: 4, f: 0, degree: 'b7' }, { s: 4, f: 2, degree: '1', d: 'R' },
      { s: 3, f: 0, degree: 'b3' }, { s: 3, f: 2, degree: '4' },
      { s: 2, f: 0, degree: '5' }, { s: 2, f: 3, degree: 'b7' },
      { s: 1, f: 0, degree: '1', d: 'R' }, { s: 1, f: 3, degree: 'b3' },
    ] },
    G: { notes: [
      { s: 6, f: -2, degree: 'b7' }, { s: 6, f: 0, degree: '1', d: 'R' },
      { s: 5, f: -2, degree: 'b3' }, { s: 5, f: 0, degree: '4' },
      { s: 4, f: -3, degree: '5' }, { s: 4, f: 0, degree: 'b7' },
      { s: 3, f: -3, degree: '1', d: 'R' }, { s: 3, f: 0, degree: 'b3' },
      { s: 2, f: -2, degree: '4' }, { s: 2, f: 0, degree: '5' },
      { s: 1, f: -2, degree: 'b7' }, { s: 1, f: 0, degree: '1', d: 'R' },
    ] },
    A: { notes: [
      { s: 6, f: 0, degree: '5' }, { s: 6, f: 3, degree: 'b7' },
      { s: 5, f: 0, degree: '1', d: 'R' }, { s: 5, f: 3, degree: 'b3' },
      { s: 4, f: 0, degree: '4' }, { s: 4, f: 2, degree: '5' },
      { s: 3, f: 0, degree: 'b7' }, { s: 3, f: 2, degree: '1', d: 'R' },
      { s: 2, f: 1, degree: 'b3' }, { s: 2, f: 3, degree: '4' },
      { s: 1, f: 0, degree: '5' }, { s: 1, f: 3, degree: 'b7' },
    ] },
    C: { notes: [
      { s: 6, f: -2, degree: '4' }, { s: 6, f: 0, degree: '5' },
      { s: 5, f: -2, degree: 'b7' }, { s: 5, f: 0, degree: '1', d: 'R' },
      { s: 4, f: -2, degree: 'b3' }, { s: 4, f: 0, degree: '4' },
      { s: 3, f: -3, degree: '5' }, { s: 3, f: 0, degree: 'b7' },
      { s: 2, f: -2, degree: '1', d: 'R' }, { s: 2, f: 1, degree: 'b3' },
      { s: 1, f: -2, degree: '4' }, { s: 1, f: 0, degree: '5' },
    ] },
    D: { notes: [
      { s: 6, f: 1, degree: 'b3' }, { s: 6, f: 3, degree: '4' },
      { s: 5, f: 0, degree: '5' }, { s: 5, f: 3, degree: 'b7' },
      { s: 4, f: 0, degree: '1', d: 'R' }, { s: 4, f: 3, degree: 'b3' },
      { s: 3, f: 0, degree: '4' }, { s: 3, f: 2, degree: '5' },
      { s: 2, f: 1, degree: 'b7' }, { s: 2, f: 3, degree: '1', d: 'R' },
      { s: 1, f: 1, degree: 'b3' }, { s: 1, f: 3, degree: '4' },
    ] },
  },

  majorScale: {
    E: { notes: [
      { s: 6, f: -1, degree: '7' },
      { s: 6, f: 0, degree: '1', d: 'R' }, { s: 6, f: 2, degree: '2' },
      { s: 5, f: -1, degree: '3' }, { s: 5, f: 0, degree: '4' }, { s: 5, f: 2, degree: '5' },
      { s: 4, f: -1, degree: '6' }, { s: 4, f: 1, degree: '7' },
      { s: 4, f: 2, degree: '1', d: 'R' },
      { s: 3, f: -1, degree: '2' }, { s: 3, f: 1, degree: '3' }, { s: 3, f: 2, degree: '4' },
      { s: 2, f: 0, degree: '5' }, { s: 2, f: 2, degree: '6' },
      { s: 1, f: -1, degree: '7' },
      { s: 1, f: 0, degree: '1', d: 'R' }, { s: 1, f: 2, degree: '2' },
    ] },
    G: { notes: [
      { s: 6, f: -3, degree: '6' }, { s: 6, f: -1, degree: '7' },
      { s: 6, f: 0, degree: '1', d: 'R' },
      { s: 5, f: -3, degree: '2' }, { s: 5, f: -1, degree: '3' }, { s: 5, f: 0, degree: '4' },
      { s: 4, f: -3, degree: '5' }, { s: 4, f: -1, degree: '6' },
      { s: 3, f: -4, degree: '7' },
      { s: 3, f: -3, degree: '1', d: 'R' }, { s: 3, f: -1, degree: '2' },
      { s: 2, f: -3, degree: '3' }, { s: 2, f: -2, degree: '4' }, { s: 2, f: 0, degree: '5' },
      { s: 1, f: -3, degree: '6' }, { s: 1, f: -1, degree: '7' },
      { s: 1, f: 0, degree: '1', d: 'R' },
    ] },
    A: { notes: [
      { s: 6, f: 0, degree: '5' }, { s: 6, f: 2, degree: '6' },
      { s: 5, f: -1, degree: '7' },
      { s: 5, f: 0, degree: '1', d: 'R' }, { s: 5, f: 2, degree: '2' },
      { s: 4, f: -1, degree: '3' }, { s: 4, f: 0, degree: '4' }, { s: 4, f: 2, degree: '5' },
      { s: 3, f: -1, degree: '6' }, { s: 3, f: 1, degree: '7' },
      { s: 3, f: 2, degree: '1', d: 'R' },
      { s: 2, f: 0, degree: '2' }, { s: 2, f: 2, degree: '3' }, { s: 2, f: 3, degree: '4' },
      { s: 1, f: 0, degree: '5' }, { s: 1, f: 2, degree: '6' },
    ] },
    C: { notes: [
      { s: 6, f: -3, degree: '3' }, { s: 6, f: -2, degree: '4' }, { s: 6, f: 0, degree: '5' },
      { s: 5, f: -3, degree: '6' }, { s: 5, f: -1, degree: '7' },
      { s: 5, f: 0, degree: '1', d: 'R' },
      { s: 4, f: -3, degree: '2' }, { s: 4, f: -1, degree: '3' }, { s: 4, f: 0, degree: '4' },
      { s: 3, f: -3, degree: '5' }, { s: 3, f: -1, degree: '6' },
      { s: 2, f: -3, degree: '7' },
      { s: 2, f: -2, degree: '1', d: 'R' }, { s: 2, f: 0, degree: '2' },
      { s: 1, f: -3, degree: '3' }, { s: 1, f: -2, degree: '4' }, { s: 1, f: 0, degree: '5' },
    ] },
    D: { notes: [
      { s: 6, f: 0, degree: '2' }, { s: 6, f: 2, degree: '3' }, { s: 6, f: 3, degree: '4' },
      { s: 5, f: 0, degree: '5' }, { s: 5, f: 2, degree: '6' },
      { s: 4, f: -1, degree: '7' },
      { s: 4, f: 0, degree: '1', d: 'R' }, { s: 4, f: 2, degree: '2' },
      { s: 3, f: -1, degree: '3' }, { s: 3, f: 0, degree: '4' }, { s: 3, f: 2, degree: '5' },
      { s: 2, f: 0, degree: '6' }, { s: 2, f: 2, degree: '7' },
      { s: 2, f: 3, degree: '1', d: 'R' },
      { s: 1, f: 0, degree: '2' }, { s: 1, f: 2, degree: '3' }, { s: 1, f: 3, degree: '4' },
    ] },
  },

  naturalMinor: {
    E: { notes: [
      { s: 6, f: 0, degree: '1', d: 'R' }, { s: 6, f: 2, degree: '2' }, { s: 6, f: 3, degree: 'b3' },
      { s: 5, f: 0, degree: '4' }, { s: 5, f: 2, degree: '5' }, { s: 5, f: 3, degree: 'b6' },
      { s: 4, f: 0, degree: 'b7' },
      { s: 4, f: 2, degree: '1', d: 'R' },
      { s: 3, f: -1, degree: '2' }, { s: 3, f: 0, degree: 'b3' }, { s: 3, f: 2, degree: '4' },
      { s: 2, f: 0, degree: '5' }, { s: 2, f: 1, degree: 'b6' }, { s: 2, f: 3, degree: 'b7' },
      { s: 1, f: 0, degree: '1', d: 'R' }, { s: 1, f: 2, degree: '2' }, { s: 1, f: 3, degree: 'b3' },
    ] },
    G: { notes: [
      { s: 6, f: -2, degree: 'b7' }, { s: 6, f: 0, degree: '1', d: 'R' },
      { s: 5, f: -3, degree: '2' }, { s: 5, f: -2, degree: 'b3' }, { s: 5, f: 0, degree: '4' },
      { s: 4, f: -3, degree: '5' }, { s: 4, f: -2, degree: 'b6' }, { s: 4, f: 0, degree: 'b7' },
      { s: 3, f: -3, degree: '1', d: 'R' }, { s: 3, f: -1, degree: '2' }, { s: 3, f: 0, degree: 'b3' },
      { s: 2, f: -2, degree: '4' }, { s: 2, f: 0, degree: '5' }, { s: 2, f: 1, degree: 'b6' },
      { s: 1, f: -2, degree: 'b7' }, { s: 1, f: 0, degree: '1', d: 'R' },
    ] },
    A: { notes: [
      { s: 6, f: 0, degree: '5' }, { s: 6, f: 1, degree: 'b6' }, { s: 6, f: 3, degree: 'b7' },
      { s: 5, f: 0, degree: '1', d: 'R' }, { s: 5, f: 2, degree: '2' }, { s: 5, f: 3, degree: 'b3' },
      { s: 4, f: 0, degree: '4' }, { s: 4, f: 2, degree: '5' }, { s: 4, f: 3, degree: 'b6' },
      { s: 3, f: 0, degree: 'b7' },
      { s: 3, f: 2, degree: '1', d: 'R' },
      { s: 2, f: 0, degree: '2' }, { s: 2, f: 1, degree: 'b3' }, { s: 2, f: 3, degree: '4' },
      { s: 1, f: 0, degree: '5' }, { s: 1, f: 1, degree: 'b6' }, { s: 1, f: 3, degree: 'b7' },
    ] },
    C: { notes: [
      { s: 6, f: -2, degree: '4' }, { s: 6, f: 0, degree: '5' }, { s: 6, f: 1, degree: 'b6' },
      { s: 5, f: -2, degree: 'b7' },
      { s: 5, f: 0, degree: '1', d: 'R' },
      { s: 4, f: -3, degree: '2' }, { s: 4, f: -2, degree: 'b3' }, { s: 4, f: 0, degree: '4' },
      { s: 3, f: -3, degree: '5' }, { s: 3, f: -2, degree: 'b6' }, { s: 3, f: 0, degree: 'b7' },
      { s: 2, f: -2, degree: '1', d: 'R' }, { s: 2, f: 0, degree: '2' }, { s: 2, f: 1, degree: 'b3' },
      { s: 1, f: -2, degree: '4' }, { s: 1, f: 0, degree: '5' }, { s: 1, f: 1, degree: 'b6' },
    ] },
    D: { notes: [
      { s: 6, f: 0, degree: '2' }, { s: 6, f: 1, degree: 'b3' }, { s: 6, f: 3, degree: '4' },
      { s: 5, f: 0, degree: '5' }, { s: 5, f: 1, degree: 'b6' }, { s: 5, f: 3, degree: 'b7' },
      { s: 4, f: 0, degree: '1', d: 'R' }, { s: 4, f: 2, degree: '2' }, { s: 4, f: 3, degree: 'b3' },
      { s: 3, f: 0, degree: '4' }, { s: 3, f: 2, degree: '5' }, { s: 3, f: 3, degree: 'b6' },
      { s: 2, f: 1, degree: 'b7' },
      { s: 2, f: 3, degree: '1', d: 'R' },
      { s: 1, f: 0, degree: '2' }, { s: 1, f: 1, degree: 'b3' }, { s: 1, f: 3, degree: '4' },
    ] },
  },
};

export interface ScaleTypeInfo {
  label: string;
  quality: 'major' | 'minor';
  short: string;
}
export const SCALE_TYPE_INFO: Record<ScaleType, ScaleTypeInfo> = {
  majorPentatonic: { label: 'Major Pentatonic', quality: 'major', short: 'Maj Penta' },
  minorPentatonic: { label: 'Minor Pentatonic', quality: 'minor', short: 'Min Penta' },
  majorScale: { label: 'Major Scale', quality: 'major', short: 'Major' },
  naturalMinor: { label: 'Natural Minor', quality: 'minor', short: 'Nat. Minor' },
};

export const SHAPE_ORDER: ShapeKey[] = ['E', 'A', 'G', 'C', 'D'];

// All degrees that can be a target, in a sensible display order.
export const ALL_DEGREES = ['1', 'b3', '3', '4', '5', 'b6', '6', 'b7', '7', '2'];

// A placed note: absolute fret + selection key.
export interface PlacedNote {
  string: number; // 1..6
  fret: number; // absolute
  degree: string;
  isRoot: boolean;
}

export const noteKey = (n: { string: number; fret: number }) => `${n.string}-${n.fret}`;

// Scale-degree labels use leading b/# for flats/sharps (b3, b7, #4). Convert to
// the proper musical symbols for display (renderJazz then styles them).
export const degreeGlyphs = (d: string) => d.replace(/b/g, '♭').replace(/#/g, '♯');

// Place a shape so its anchor root sits at `rootFret`. Returns null if any note
// would fall outside [0, maxFret].
export function placeShape(
  scaleType: ScaleType,
  shape: ShapeKey,
  rootFret: number,
  maxFret = 15,
): PlacedNote[] | null {
  const data = SCALE_SHAPES[scaleType][shape];
  const anchor = data.notes.find((n) => n.d === 'R');
  if (!anchor) return null;
  const offset = rootFret - anchor.f;
  const placed: PlacedNote[] = [];
  for (const n of data.notes) {
    const fret = n.f + offset;
    if (fret < 0 || fret > maxFret) return null;
    placed.push({ string: n.s, fret, degree: n.degree, isRoot: n.d === 'R' });
  }
  return placed;
}
