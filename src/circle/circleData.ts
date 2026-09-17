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
import { answersMatch } from '../lib/normalize';
import { COMMON_PATTERNS } from '../lib/patterns';

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
export type Drill = 'layout' | 'wedge' | 'progression' | 'mix';

/** What an individual question is — a mixed session deals either. */
export type QuestionDrill = 'layout' | 'wedge' | 'progression';

/** How the wedge drill takes a chord: built from recall on the keypad, picked
    out of a handful of plausible options, or a mix of the two. */
export type WedgeStyle = 'build' | 'pick' | 'mix';
export type QuestionStyle = 'build' | 'pick';

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
  /** Wedge drill, chords only: build each chord, pick it, or both. */
  style: WedgeStyle;
  /** Wedge drill: print each slot's numeral as a guide. Off by default — the
      numerals never move, so printing them stops teaching you anything after
      the first few questions. */
  guide: boolean;
  /** Which revision of the defaults these settings were last reconciled with.
      Bumping SETTINGS_REV re-applies changed defaults once over a saved value
      that was only ever the old default. */
  rev?: number;
  /** Wedge and progression drills: which keys come up. */
  keys: string[];
  autoAdvance: boolean;
  playback: boolean;
}

export const GAP_CHOICES = [1, 2, 4];

/** Bump when a default changes and saved settings should follow it once. */
export const SETTINGS_REV = 1;

export const defaultCircleSettings: CircleSettings = {
  rev: SETTINGS_REV,
  drill: 'layout',
  rings: { major: true, minor: false },
  gaps: 2,
  place: 'chords',
  style: 'build',
  guide: false,
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
  /** Build: tap any slot and build its chord. Pick: the slots are highlighted
      one at a time, in `order`, each with its own `options`. */
  style: QuestionStyle;
  order: string[];
  options: Record<string, string[]>;
  error?: string;
}

/** What goes in a slot, given what the player is supplying. */
export const wedgeToken = (w: WedgeSlot, place: WedgePlace): string =>
  place === 'numerals' ? w.degree : w.chord;

/**
 * Is `typed` right for this slot? Graded exactly the way the Numerals drill
 * grades — same normaliser, so Am / A- / Amin all pass — and, unlike the
 * layout drill, strict about spelling: this is "the chords of F# major", and
 * in F# major the vii° is E#°, not F°. Knowing that is part of the drill.
 */
export const wedgeAnswerMatches = (typed: string, w: WedgeSlot, place: WedgePlace): boolean =>
  answersMatch(typed, wedgeToken(w, place));

export function generateWedge(
  s: CircleSettings,
  rand: () => number = Math.random,
  avoidKey?: string,
): WedgeQuestion {
  const pool = s.keys.filter((k) => ALL_KEYS.includes(k));
  if (pool.length === 0) {
    return { key: '', keyPos: 0, slots: [], style: 'build', order: [], options: {}, error: 'Pick at least one key.' };
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

  const style = questionStyle(s, rand);
  if (style === 'build') return { key, keyPos, slots, style, order: [], options: {} };
  return {
    key,
    keyPos,
    slots,
    style,
    order: shuffle(slots.map((w) => w.degree), rand),
    options: Object.fromEntries(slots.map((w) => [w.degree, pickOptions(w, keyPos, rand)])),
  };
}

/** Build or pick for this question. Numerals are always tapped from the seven
    degrees, which is already a pick, so the style only applies to chords. */
function questionStyle(s: CircleSettings, rand: () => number): QuestionStyle {
  if (s.place === 'numerals') return 'build';
  if (s.style === 'mix') return rand() < 0.5 ? 'build' : 'pick';
  return s.style;
}

// ── Pick options ────────────────────────────────────────────────────────────

export const PICK_OPTIONS = 6;

const PC_SPELLINGS: string[][] = [
  ['C', 'B#'], ['C#', 'Db'], ['D'], ['D#', 'Eb'], ['E', 'Fb'], ['F', 'E#'],
  ['F#', 'Gb'], ['G'], ['G#', 'Ab'], ['A'], ['A#', 'Bb'], ['B', 'Cb'],
];
const QUALITY_SUFFIXES = ['', 'm', 'dim'];

const splitChord = (chord: string): { root: string; quality: string } => {
  const m = /^([A-G][#b]?)(.*)$/.exec(chord);
  return m ? { root: m[1], quality: m[2] } : { root: chord, quality: '' };
};

/**
 * Six chords for one slot: the right one and five that are wrong in the ways
 * people actually get it wrong, so picking still takes knowing the chord —
 * not just spotting the only sensible-looking button.
 *
 *  - same root, wrong quality     (E or E° when it's Em)
 *  - right sound, wrong spelling  (F° when F# major spells it E#°)
 *  - the same slot in the next key round the wheel either side
 *  - other chords of this key     (right key, wrong position)
 */
export function pickOptions(w: WedgeSlot, keyPos: number, rand: () => number = Math.random): string[] {
  const correct = w.chord;
  const { root, quality } = splitChord(correct);
  const taken = new Set([correct]);
  const out: string[] = [];
  const add = (c: string | undefined) => {
    if (!c || taken.has(c) || out.length >= PICK_OPTIONS - 1) return;
    if (answersMatch(c, correct)) return; // an equivalent notation isn't a wrong answer
    taken.add(c);
    out.push(c);
  };

  const otherQualities = shuffle(QUALITY_SUFFIXES.filter((q) => q !== quality), rand);
  add(root + otherQualities[0]);

  const pc = rootPitchClass(root);
  const respelled = pc === null ? undefined : PC_SPELLINGS[pc].find((r) => r !== root);
  add(respelled ? respelled + quality : undefined);

  const neighbours = shuffle([keyChord(wrap(keyPos - 1), w.degree), keyChord(wrap(keyPos + 1), w.degree)], rand);
  add(neighbours[0]);

  const keyChords = shuffle(
    DEGREE_KEYS.filter((d) => d !== w.degree).map((d) => keyChord(keyPos, d)),
    rand,
  );
  for (const c of [neighbours[1], root + otherQualities[1], ...keyChords]) add(c);

  return shuffle([correct, ...out], rand);
}

/** Which drill this question comes from. In a mix, one of the drills the
    settings can actually make, and never three of the same kind in a row. */
export function chooseDrill(
  s: CircleSettings,
  recent: QuestionDrill[],
  rand: () => number = Math.random,
): QuestionDrill {
  if (s.drill !== 'mix') return s.drill;
  const keysOk = s.keys.some((k) => ALL_KEYS.includes(k));
  const ready: QuestionDrill[] = [
    ...(s.rings.major || s.rings.minor ? (['layout'] as const) : []),
    ...(keysOk ? (['wedge', 'progression'] as const) : []),
  ];
  if (ready.length === 0) return 'layout'; // reports its own error
  const [a, b] = recent.slice(-2);
  const pool = a && a === b && ready.length > 1 ? ready.filter((d) => d !== a) : ready;
  return pool[Math.floor(rand() * pool.length)];
}

// ── Drill 3: a progression, spelled out on the wedge ───────────────────────

/** Progressions worth knowing by shape: the ten Numerals uses, plus the short
    cadences that turn up everywhere. */
export const KNOWN_PROGRESSIONS: string[][] = [
  ...COMMON_PATTERNS.Major,
  ['ii', 'V', 'I'],
  ['IV', 'V', 'I'],
  ['I', 'IV', 'V'],
  ['vi', 'ii', 'V'],
  ['iii', 'vi', 'ii', 'V'],
  ['I', 'IV', 'vii°', 'iii'],
  ['IV', 'vii°', 'I'],
  // More that turn up everywhere — pop, folk, soul, the circle-of-fifths walk.
  ['I', 'vi', 'IV', 'V'], // doo-wop
  ['IV', 'V', 'iii', 'vi'], // the "royal road"
  ['I', 'V', 'vi', 'iii'], // Pachelbel's opening
  ['vi', 'V', 'IV', 'iii'], // descending
  ['IV', 'iii', 'ii', 'I'], // stepwise down to home
  ['I', 'ii', 'iii', 'IV'], // stepwise up
  ['ii', 'iii', 'IV', 'V'],
  ['I', 'iii', 'IV', 'V'],
  ['I', 'IV', 'ii', 'V'],
  ['I', 'ii', 'IV', 'V'],
  ['I', 'iii', 'ii', 'V'],
  ['vi', 'IV', 'ii', 'V'],
  ['I', 'V', 'IV'],
  ['IV', 'I', 'V'],
  ['vi', 'V', 'IV'],
  ['vi', 'IV', 'V'],
  ['IV', 'V', 'vi'],
  ['ii', 'IV', 'V'],
  ['I', 'ii', 'V'],
  ['iii', 'IV', 'V'],
  ['vii°', 'iii', 'vi'], // a fragment of the circle-of-fifths walk
  ['iii', 'vi', 'ii'],
];

export interface ProgressionQuestion {
  key: string;
  keyPos: number;
  /** The whole wedge, to tap on. */
  slots: WedgeSlot[];
  /** The progression, as degrees — the same one may appear more than once. */
  degrees: string[];
  error?: string;
}

/** No chord twice: a repeat is just finding the same slot again. */
const allDistinct = (degrees: string[]) => new Set(degrees).size === degrees.length;

/** The known progressions that don't repeat a chord (I–IV–V–IV is out). */
export const DISTINCT_PROGRESSIONS = KNOWN_PROGRESSIONS.filter(allDistinct);

/** How a progression is compared for "have I had this recently". */
export const progressionSig = (degrees: string[]) => degrees.join(' ');

/** Share of questions that are well-known progressions; the rest are made up. */
export const KNOWN_SHARE = 0.4;
/** How many recent progressions can't come back yet. */
export const RECENT_PROGRESSIONS = 24;

/**
 * A well-known progression 40% of the time, otherwise any three or four
 * degrees. Never the same degree twice in one progression, and never one of
 * the `recent` progressions — so the familiar ones cycle through the whole
 * list instead of turning up again after a handful of questions.
 */
export function generateProgression(
  s: CircleSettings,
  rand: () => number = Math.random,
  avoidKey?: string,
  recent: string[] = [],
): ProgressionQuestion {
  const base = generateWedge({ ...s, style: 'build' }, rand, avoidKey);
  if (base.error) return { key: '', keyPos: 0, slots: [], degrees: [], error: base.error };

  const seen = new Set(recent);
  let degrees: string[] | undefined;
  if (rand() < KNOWN_SHARE) {
    const fresh = DISTINCT_PROGRESSIONS.filter((p) => !seen.has(progressionSig(p)));
    const pool = fresh.length ? fresh : DISTINCT_PROGRESSIONS;
    degrees = pool[Math.floor(rand() * pool.length)];
  } else {
    // 1,050 possibilities, so a couple of retries all but guarantees a new one.
    for (let i = 0; i < 20; i++) {
      const length = rand() < 0.5 ? 3 : 4;
      const candidate = shuffle([...DEGREE_KEYS], rand).slice(0, length);
      degrees = candidate;
      if (!seen.has(progressionSig(candidate))) break;
    }
  }
  return { key: base.key, keyPos: base.keyPos, slots: base.slots, degrees: [...degrees!] };
}

