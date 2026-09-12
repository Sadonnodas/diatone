// The chord wheel: three rings of twelve, in circle-of-fifths order.
//
//   outer  — vii° of the major beneath it
//   middle — the major key / I
//   inner  — its relative minor / vi
//
// Nothing here is a second copy of the theory. Every label is read out of
// chordData, which is the app's authoritative (and deliberately enharmonic)
// key table — so the wheel spells E#° in F# major for the same reason the
// Numerals drill does.

import { ALL_KEYS, chordData } from '../lib/chordData';
import { DEGREE_KEYS } from '../lib/engine';

export type Ring = 'dim' | 'major' | 'minor';

/** Outside in — also the drawing order. */
export const RING_ORDER: Ring[] = ['dim', 'major', 'minor'];

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

export type Scope = 'circle' | 'key';
export type LabelMode = 'chords' | 'numerals';

export interface CircleSettings {
  scope: Scope;
  /** What the prompt names — numerals only mean something inside a key. */
  label: LabelMode;
  /** Which rings can be blanked, in whole-circle scope. */
  rings: Record<Ring, boolean>;
  /** Which degrees can be blanked, in key scope. */
  degrees: Record<string, boolean>;
  /** How many gaps at once. 0 means every eligible segment. */
  gaps: number;
  /** Turn the wheel so the asked key sits at the top. */
  keyAtTop: boolean;
  autoAdvance: boolean;
  playback: boolean;
}

export const GAP_CHOICES = [2, 4, 0];

export const defaultCircleSettings: CircleSettings = {
  scope: 'circle',
  label: 'chords',
  rings: { major: true, minor: true, dim: false },
  degrees: Object.fromEntries(DEGREE_KEYS.map((d) => [d, true])),
  gaps: 4,
  keyAtTop: false,
  autoAdvance: true,
  playback: true,
};

// ── Questions ───────────────────────────────────────────────────────────────

export interface CircleQuestion {
  scope: Scope;
  /** Key scope only: the spoke being asked about. */
  keyPos: number | null;
  key: string | null;
  /** The segments left empty. */
  blanks: Slot[];
  /** slotKey → what the prompt shows when it's that segment's turn. */
  labels: Record<string, string>;
  /** The order they're asked in. */
  queue: string[];
  /** Positions the wheel is turned by, so the asked key can sit on top. */
  rotate: number;
  error?: string;
}

const shuffle = <T,>(items: T[], rand: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * A gap is only a question if there's more than one place it could go — with a
 * single hole you'd just tap the only hole. Two is the floor.
 */
export const MIN_GAPS = 2;

export function generateCircle(
  s: CircleSettings,
  rand: () => number = Math.random,
): CircleQuestion {
  const blank = (error: string): CircleQuestion => ({
    scope: s.scope,
    keyPos: null,
    key: null,
    blanks: [],
    labels: {},
    queue: [],
    rotate: 0,
    error,
  });

  let candidates: { slot: Slot; label: string }[];
  let keyPos: number | null = null;

  if (s.scope === 'key') {
    keyPos = Math.floor(rand() * POSITIONS);
    candidates = wedgeSlots(keyPos)
      .filter((w) => s.degrees[w.degree])
      .map((w) => ({
        slot: w.slot,
        // Chords are named the way *this key* spells them — ask for A#m in F#
        // major, not the Bbm its segment happens to be printed with.
        label: s.label === 'numerals' ? w.degree : keyChord(keyPos as number, w.degree),
      }));
    if (candidates.length < MIN_GAPS) return blank('Turn on at least two degrees.');
  } else {
    const rings = RING_ORDER.filter((r) => s.rings[r]);
    if (rings.length === 0) return blank('Turn on at least one ring.');
    candidates = rings.flatMap((ring) =>
      Array.from({ length: POSITIONS }, (_, pos) => ({
        slot: { ring, pos },
        // Numerals need a key to be relative to, so whole-circle always names
        // the chord itself.
        label: ringChord(ring, pos),
      })),
    );
  }

  const wanted = s.gaps === 0 ? candidates.length : Math.max(MIN_GAPS, s.gaps);
  const picked = shuffle(candidates, rand).slice(0, Math.min(wanted, candidates.length));
  if (picked.length < MIN_GAPS) return blank('Not enough segments to make a question.');

  const labels: Record<string, string> = {};
  for (const c of picked) labels[slotKey(c.slot)] = c.label;

  return {
    scope: s.scope,
    keyPos,
    key: keyPos === null ? null : keyAt(keyPos),
    blanks: picked.map((c) => c.slot),
    labels,
    queue: shuffle(Object.keys(labels), rand),
    rotate: s.keyAtTop && keyPos !== null ? -keyPos : 0,
  };
}
