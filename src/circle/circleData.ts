// The chord wheel: three rings of twelve, in circle-of-fifths order, laid out
// like the printed one (Jim Fleser's Chord Wheel):
//
//   inner  — the major key / I
//   middle — its relative minor / vi
//   outer  — the vii° tab
//
// Nothing here is a second copy of the theory. Every label is read out of
// chordData, which is the app's authoritative (and deliberately enharmonic)
// key table — so the wheel spells E#° in F# major for the same reason the
// Numerals drill does.

import { ALL_KEYS, chordData } from '../lib/chordData';
import { DEGREE_KEYS } from '../lib/engine';
import { rootPitchClass } from '../audio/harmony';

export type Ring = 'dim' | 'major' | 'minor';

/** Outside in — also the drawing order. Matches the printed Chord Wheel:
    majors closest to the centre, their relative minors immediately outside,
    and the diminished tabs on the rim. */
export const RING_ORDER: Ring[] = ['dim', 'minor', 'major'];

export const POSITIONS = 12;

/** Which degree of its own key each ring shows. */
const RING_DEGREE: Record<Ring, number> = { major: 0, minor: 5, dim: 6 };

export const RING_LABEL: Record<Ring, string> = {
  major: 'Major',
  minor: 'Minor',
  dim: 'Diminished',
};

export const wrap = (pos: number): number => ((pos % POSITIONS) + POSITIONS) % POSITIONS;

/** The key whose spoke this is. */
export const keyAt = (pos: number): string => ALL_KEYS[wrap(pos)];

/** The chord a segment carries under its own spoke's spelling. */
export const ringChord = (ring: Ring, pos: number): string =>
  chordData[keyAt(pos)].triads.chords[RING_DEGREE[ring]];

/** A named degree of a named key, spelled the way that key spells it. */
export const keyChord = (keyPos: number, degree: string): string =>
  chordData[keyAt(keyPos)].triads.chords[DEGREE_KEYS.indexOf(degree)];

export interface Slot {
  ring: Ring;
  pos: number;
}

export const slotKey = (s: Slot): string => `${s.ring}:${wrap(s.pos)}`;
export const sameSlot = (a: Slot, b: Slot): boolean => slotKey(a) === slotKey(b);

/**
 * A key's seven chords as offsets from its own spoke — the wheel's whole
 * point. IV is one step anticlockwise, V one step clockwise, and the relative
 * minors sit directly beneath. Knowing this is what lets you read a numeral
 * off the wheel instead of recalling it.
 */
export const WEDGE: { degree: string; ring: Ring; offset: number }[] = [
  { degree: 'I', ring: 'major', offset: 0 },
  { degree: 'ii', ring: 'minor', offset: -1 },
  { degree: 'iii', ring: 'minor', offset: 1 },
  { degree: 'IV', ring: 'major', offset: -1 },
  { degree: 'V', ring: 'major', offset: 1 },
  { degree: 'vi', ring: 'minor', offset: 0 },
  { degree: 'vii°', ring: 'dim', offset: 0 },
];

/** Degree name → the segment it lives in, for a key on the given spoke. */
export function wedgeSlots(keyPos: number): { degree: string; slot: Slot }[] {
  return WEDGE.map((w) => ({
    degree: w.degree,
    slot: { ring: w.ring, pos: wrap(keyPos + w.offset) },
  }));
}

/**
 * Every spelling a segment answers to.
 *
 * Twelve spokes can't hold both sides of the enharmonic seam: F# major's iii
 * is A#m, but that segment's own spoke is Db, whose vi is Bbm. Same sound,
 * two names — which is why a printed chord wheel labels the seam "Bbm/A#m".
 * Rather than hardcode the seam, collect the spellings every key's wedge
 * actually uses for the segment; the awkward ones fall out with no special
 * case, and so would any future change to the key table.
 *
 * Grading never depends on this: you answer by tapping a position, so a
 * segment is right or wrong regardless of which name it's wearing.
 */
export function segmentSpellings(slot: Slot): string[] {
  const names: string[] = [];
  for (let p = 0; p < POSITIONS; p++) {
    for (const w of wedgeSlots(p)) {
      if (!sameSlot(w.slot, slot)) continue;
      const name = keyChord(p, w.degree);
      if (!names.includes(name)) names.push(name);
    }
  }
  // Own spoke's spelling first — that's the segment's primary identity.
  const own = ringChord(slot.ring, slot.pos);
  return [own, ...names.filter((n) => n !== own)];
}

/** What a segment prints, e.g. "Bbm/A#m" at the seam. */
export const segmentLabel = (slot: Slot): string => segmentSpellings(slot).join('/');

// ── Settings ────────────────────────────────────────────────────────────────

/** Two drills. Layout teaches the wheel; Wedge teaches a key's place on it. */
export type Drill = 'layout' | 'wedge';

/** What the wedge drill hands you to place. */
export type WedgePlace = 'chords' | 'numerals';

export interface CircleSettings {
  drill: Drill;
  /** Layout drill: which rings can be blanked. */
  rings: { major: boolean; minor: boolean };
  /** Layout drill: how many blanks at once. */
  gaps: number;
  /** Wedge drill: place chord buttons, or numeral buttons. */
  place: WedgePlace;
  /** Wedge drill: print each slot's numeral as a guide. */
  guide: boolean;
  /** Wedge drill: which keys come up. */
  keys: string[];
  autoAdvance: boolean;
  playback: boolean;
}

export const GAP_CHOICES = [1, 2, 4];

export const defaultCircleSettings: CircleSettings = {
  drill: 'layout',
  rings: { major: true, minor: false },
  gaps: 2,
  place: 'chords',
  guide: true,
  keys: [...ALL_KEYS],
  autoAdvance: true,
  playback: true,
};

const shuffle = <T,>(items: T[], rand: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// ── Drill 1: the layout of the wheel ────────────────────────────────────────

/**
 * The root of a segment's chord, without its quality — 'Am' → 'A'. The ring
 * says whether it's major or minor, so naming a segment only ever means
 * naming its root.
 */
export const segmentRoot = (slot: Slot): string =>
  ringChord(slot.ring, slot.pos).replace(/(m|dim)$/, '');

export interface LayoutQuestion {
  /** Segments left empty, in the order they're asked. */
  blanks: Slot[];
  error?: string;
}

export function generateLayout(
  s: CircleSettings,
  rand: () => number = Math.random,
): LayoutQuestion {
  const rings: Ring[] = [];
  if (s.rings.major) rings.push('major');
  if (s.rings.minor) rings.push('minor');
  if (rings.length === 0) return { blanks: [], error: 'Turn on the major ring, the minor ring, or both.' };

  const all = rings.flatMap((ring) =>
    Array.from({ length: POSITIONS }, (_, pos) => ({ ring, pos }) as Slot),
  );
  return { blanks: shuffle(all, rand).slice(0, Math.max(1, Math.min(s.gaps, all.length))) };
}

/**
 * Is `typed` the right name for this segment? Compared by pitch, not spelling:
 * the wheel prints both sides of the enharmonic seam (F#/Gb), and either is
 * the same place on it.
 */
export function layoutAnswerMatches(typed: string, slot: Slot): boolean {
  const want = rootPitchClass(segmentRoot(slot));
  const got = rootPitchClass(typed);
  return want !== null && got !== null && want === got;
}

// ── Drill 2: one key's wedge ────────────────────────────────────────────────

export interface WedgeSlot {
  degree: string;
  slot: Slot;
  /** The chord, spelled the way this key spells it. */
  chord: string;
  /** Offset from the key's spoke: -1, 0 or +1. */
  offset: number;
}

export interface WedgeQuestion {
  key: string;
  keyPos: number;
  slots: WedgeSlot[];
  /** The buttons, shuffled so their order can't give the answer away. */
  tokens: string[];
  error?: string;
}

/** What goes in a slot, given what the player is placing. */
export const wedgeToken = (w: WedgeSlot, place: WedgePlace): string =>
  place === 'numerals' ? w.degree : w.chord;

export function generateWedge(
  s: CircleSettings,
  rand: () => number = Math.random,
  avoidKey?: string,
): WedgeQuestion {
  const pool = s.keys.filter((k) => ALL_KEYS.includes(k));
  if (pool.length === 0) {
    return { key: '', keyPos: 0, slots: [], tokens: [], error: 'Pick at least one key.' };
  }
  const fresh = pool.length > 1 ? pool.filter((k) => k !== avoidKey) : pool;
  const key = fresh[Math.floor(rand() * fresh.length)];
  const keyPos = ALL_KEYS.indexOf(key);

  const slots: WedgeSlot[] = WEDGE.map((w) => ({
    degree: w.degree,
    slot: { ring: w.ring, pos: wrap(keyPos + w.offset) },
    chord: keyChord(keyPos, w.degree),
    offset: w.offset,
  }));

  return {
    key,
    keyPos,
    slots,
    tokens: shuffle(slots.map((w) => wedgeToken(w, s.place)), rand),
  };
}
