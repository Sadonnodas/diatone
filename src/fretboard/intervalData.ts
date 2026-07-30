// Interval recognition on the fretboard: two notes in standard tuning — a root
// on a lower string and a question note on a higher (thinner) string — and you
// name the distance between them. String numbering matches scaleData /
// FretboardWindow: 1 = high E … 6 = low E.

// MIDI pitch of each open string.
export const OPEN_MIDI: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 };
export const pitchAt = (string: number, fret: number) => OPEN_MIDI[string] + fret;

export const STRING_NAMES: Record<number, string> = {
  1: 'high E',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'low E',
};

export const MIN_FRET = 0;
export const MAX_FRET = 14;
// Never draw a window narrower than this, so a 1-fret shape isn't a sliver.
const MIN_COLS = 5;

export interface IntervalInfo {
  short: string; // board/keypad label
  name: string; // spoken name
  tiny: string; // keypad sub-label
}

// Indexed by interval class (semitones mod 12).
export const INTERVALS: IntervalInfo[] = [
  { short: '8ve', name: 'octave', tiny: 'octave' },
  { short: '♭2', name: 'minor 2nd', tiny: 'min 2nd' },
  { short: '2', name: 'major 2nd', tiny: 'maj 2nd' },
  { short: '♭3', name: 'minor 3rd', tiny: 'min 3rd' },
  { short: '3', name: 'major 3rd', tiny: 'maj 3rd' },
  { short: '4', name: 'perfect 4th', tiny: 'perf 4th' },
  { short: '♭5', name: 'tritone', tiny: 'tritone' },
  { short: '5', name: 'perfect 5th', tiny: 'perf 5th' },
  { short: '♭6', name: 'minor 6th', tiny: 'min 6th' },
  { short: '6', name: 'major 6th', tiny: 'maj 6th' },
  { short: '♭7', name: 'minor 7th', tiny: 'min 7th' },
  { short: '7', name: 'major 7th', tiny: 'maj 7th' },
];

// Keypad layout — ascending, four per row, octave last.
export const KEYPAD_ROWS: number[][] = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 0],
];

export const ALL_CLASSES = INTERVALS.map((_, i) => i);
export const ROOT_STRING_ORDER = [6, 5, 4, 3, 2];

export interface IntervalSettings {
  rootStrings: Record<number, boolean>; // strings 2..6 that may hold the root
  stringGap: number; // max string distance (1 = adjacent strings only)
  fretSpan: number; // max |fret difference| between the two notes
  intervals: Record<number, boolean>; // enabled interval classes
  autoAdvance: boolean;
}

// The part of the settings that shapes the question pool — autoAdvance is only
// a playback preference, so generation doesn't depend on it.
export type IntervalLimits = Omit<IntervalSettings, 'autoAdvance'>;

const stringSet = (...on: number[]): Record<number, boolean> =>
  Object.fromEntries(ROOT_STRING_ORDER.map((s) => [s, on.includes(s)]));
const classSet = (...on: number[]): Record<number, boolean> =>
  Object.fromEntries(ALL_CLASSES.map((c) => [c, on.includes(c)]));

export type LevelKey = 'l1' | 'l2' | 'l3';
export interface Level {
  key: LevelKey;
  label: string;
  desc: string;
  settings: IntervalLimits;
}

// Presets — each widens the net. Anything off-preset shows as "Custom".
export const LEVELS: Level[] = [
  {
    key: 'l1',
    label: 'Level 1',
    desc: 'Adjacent strings, root on E/A/D. The everyday intervals only.',
    settings: {
      rootStrings: stringSet(6, 5, 4),
      stringGap: 1,
      fretSpan: 5,
      intervals: classSet(2, 3, 4, 5, 7, 9, 10),
    },
  },
  {
    key: 'l2',
    label: 'Level 2',
    desc: 'Up to two strings apart, root on E/A/D/G. Adds ♭5, ♭6, 7 and the octave.',
    settings: {
      rootStrings: stringSet(6, 5, 4, 3),
      stringGap: 2,
      fretSpan: 5,
      intervals: classSet(0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11),
    },
  },
  {
    key: 'l3',
    label: 'Level 3',
    desc: 'Any string pair, any root string, all twelve intervals.',
    settings: {
      rootStrings: stringSet(6, 5, 4, 3, 2),
      stringGap: 5,
      fretSpan: 7,
      intervals: classSet(...ALL_CLASSES),
    },
  },
];

export const levelSettings = (key: LevelKey): IntervalLimits => {
  const lv = LEVELS.find((l) => l.key === key) ?? LEVELS[0];
  return {
    ...lv.settings,
    rootStrings: { ...lv.settings.rootStrings },
    intervals: { ...lv.settings.intervals },
  };
};

export const defaultIntervalSettings: IntervalSettings = {
  ...levelSettings('l1'),
  autoAdvance: true,
};

// Which preset (if any) the current settings are exactly — autoAdvance is a
// personal preference, not part of a level.
export function matchLevel(s: IntervalLimits): LevelKey | null {
  for (const lv of LEVELS) {
    const p = lv.settings;
    if (s.stringGap !== p.stringGap || s.fretSpan !== p.fretSpan) continue;
    if (ROOT_STRING_ORDER.some((st) => !!s.rootStrings[st] !== !!p.rootStrings[st])) continue;
    if (ALL_CLASSES.some((c) => !!s.intervals[c] !== !!p.intervals[c])) continue;
    return lv.key;
  }
  return null;
}

export interface IntervalQuestion {
  rootString: number;
  rootFret: number;
  noteString: number;
  noteFret: number;
  semitones: number; // true distance, can exceed an octave
  cls: number; // semitones % 12 — this is what you answer
  startFret: number;
  endFret: number;
}

type Pair = Pick<IntervalQuestion, 'rootString' | 'rootFret' | 'noteString' | 'noteFret' | 'semitones' | 'cls'>;

// Every note pair the settings allow, grouped by interval class. Grouping is
// what makes the drill even: classes are picked uniformly, so a shape that only
// happens at one position is asked as often as one that happens everywhere.
export function candidatesByClass(s: IntervalLimits): Map<number, Pair[]> {
  const out = new Map<number, Pair[]>();
  const roots = ROOT_STRING_ORDER.filter((st) => s.rootStrings[st]);
  for (const rootString of roots) {
    const lowestNoteString = Math.max(1, rootString - s.stringGap);
    for (let rootFret = MIN_FRET; rootFret <= MAX_FRET; rootFret++) {
      for (let noteString = rootString - 1; noteString >= lowestNoteString; noteString--) {
        const from = Math.max(MIN_FRET, rootFret - s.fretSpan);
        const to = Math.min(MAX_FRET, rootFret + s.fretSpan);
        for (let noteFret = from; noteFret <= to; noteFret++) {
          const semitones = pitchAt(noteString, noteFret) - pitchAt(rootString, rootFret);
          if (semitones < 1) continue; // the question note must sound higher
          const cls = semitones % 12;
          if (!s.intervals[cls]) continue;
          const list = out.get(cls);
          const pair = { rootString, rootFret, noteString, noteFret, semitones, cls };
          if (list) list.push(pair);
          else out.set(cls, [pair]);
        }
      }
    }
  }
  return out;
}

// The fret window to draw: the two notes plus a fret of air, widened to
// MIN_COLS and clamped at the nut.
export function fretWindow(a: number, b: number): { startFret: number; endFret: number } {
  let startFret = Math.max(0, Math.min(a, b) - 1);
  let endFret = Math.max(a, b) + 1;
  while (endFret - startFret + 1 < MIN_COLS) {
    if (startFret > 0) startFret--;
    else endFret++;
  }
  return { startFret, endFret };
}

// Pick a question. `avoidCls` keeps the same interval from coming up twice in a
// row when there's another one to ask. Returns null when the settings allow
// nothing at all.
export function generateInterval(
  s: IntervalLimits,
  rand: () => number = Math.random,
  avoidCls?: number,
): IntervalQuestion | null {
  const byClass = candidatesByClass(s);
  const all = [...byClass.keys()];
  if (all.length === 0) return null;

  const fresh = all.filter((c) => c !== avoidCls);
  const classes = fresh.length > 0 ? fresh : all;
  const cls = classes[Math.floor(rand() * classes.length)];
  const pairs = byClass.get(cls)!;
  const pair = pairs[Math.floor(rand() * pairs.length)];

  return { ...pair, ...fretWindow(pair.rootFret, pair.noteFret) };
}

// "minor 3rd", "minor 3rd + octave", "2 octaves" — the reveal line.
export function intervalDescription(q: IntervalQuestion): string {
  const octaves = Math.floor(q.semitones / 12);
  if (q.cls === 0) return octaves === 1 ? 'octave' : `${octaves} octaves`;
  const base = INTERVALS[q.cls].name;
  if (octaves === 0) return base;
  return octaves === 1 ? `${base} + octave` : `${base} + ${octaves} octaves`;
}
