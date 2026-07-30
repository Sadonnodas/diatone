import { describe, it, expect } from 'vitest';
import {
  ALL_CLASSES,
  INTERVALS,
  KEYPAD_ROWS,
  LEVELS,
  MAX_FRET,
  MIN_FRET,
  ROOT_STRING_ORDER,
  candidatesByClass,
  defaultIntervalSettings,
  fretWindow,
  generateInterval,
  intervalDescription,
  levelSettings,
  matchLevel,
  pitchAt,
  type IntervalSettings,
} from './intervalData';

const settings = (over: Partial<IntervalSettings> = {}): IntervalSettings => ({
  ...levelSettings('l3'),
  autoAdvance: true,
  ...over,
});

describe('tuning', () => {
  it('places the fifth fret of one string on the open string above it', () => {
    // The B string is the exception: fret 4 of G equals open B.
    expect(pitchAt(5, 5)).toBe(pitchAt(4, 0));
    expect(pitchAt(4, 5)).toBe(pitchAt(3, 0));
    expect(pitchAt(3, 4)).toBe(pitchAt(2, 0));
    expect(pitchAt(2, 5)).toBe(pitchAt(1, 0));
  });
  it('spans two octaves between the low and high E strings', () => {
    expect(pitchAt(1, 0) - pitchAt(6, 0)).toBe(24);
  });
});

describe('keypad', () => {
  it('covers all twelve interval classes exactly once', () => {
    expect(KEYPAD_ROWS.flat().slice().sort((a, b) => a - b)).toEqual(ALL_CLASSES);
    expect(INTERVALS).toHaveLength(12);
  });
});

describe('candidatesByClass', () => {
  it('only ever puts the question note on a thinner string, sounding higher', () => {
    for (const pairs of candidatesByClass(settings()).values()) {
      for (const p of pairs) {
        expect(p.noteString).toBeLessThan(p.rootString);
        expect(p.semitones).toBeGreaterThan(0);
        expect(p.cls).toBe(p.semitones % 12);
      }
    }
  });

  it('honours the string, fret and interval limits', () => {
    const s = settings({
      rootStrings: { 6: true, 5: true, 4: false, 3: false, 2: false },
      stringGap: 1,
      fretSpan: 3,
    });
    for (const pairs of candidatesByClass(s).values()) {
      for (const p of pairs) {
        expect([5, 6]).toContain(p.rootString);
        expect(p.rootString - p.noteString).toBe(1);
        expect(Math.abs(p.rootFret - p.noteFret)).toBeLessThanOrEqual(3);
        expect(p.rootFret).toBeGreaterThanOrEqual(MIN_FRET);
        expect(p.noteFret).toBeLessThanOrEqual(MAX_FRET);
      }
    }
  });

  it('drops interval classes that are switched off', () => {
    const s = settings({
      intervals: Object.fromEntries(ALL_CLASSES.map((c) => [c, c === 7])) as Record<number, boolean>,
    });
    expect([...candidatesByClass(s).keys()]).toEqual([7]);
  });

  it('cannot reach the octave on adjacent strings within a hand span', () => {
    const s = settings({ stringGap: 1, fretSpan: 5 });
    expect(candidatesByClass(s).has(0)).toBe(false);
  });

  it('can actually ask every interval each level switches on', () => {
    for (const lv of LEVELS) {
      const limits = levelSettings(lv.key);
      const reachable = candidatesByClass(limits);
      const enabled = ALL_CLASSES.filter((c) => limits.intervals[c]);
      expect({ level: lv.key, unreachable: enabled.filter((c) => !reachable.has(c)) }).toEqual({
        level: lv.key,
        unreachable: [],
      });
    }
  });
});

describe('generateInterval', () => {
  it('returns null when nothing fits', () => {
    expect(generateInterval(settings({ rootStrings: {} }))).toBeNull();
    expect(generateInterval(settings({ intervals: {} }))).toBeNull();
  });

  it('avoids repeating the previous interval when another is available', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateInterval(settings(), Math.random, 7);
      expect(q!.cls).not.toBe(7);
    }
  });

  it('still answers when the avoided interval is the only one left', () => {
    const s = settings({
      intervals: Object.fromEntries(ALL_CLASSES.map((c) => [c, c === 7])) as Record<number, boolean>,
    });
    expect(generateInterval(s, Math.random, 7)!.cls).toBe(7);
  });

  it('draws a window that contains both notes', () => {
    for (let i = 0; i < 200; i++) {
      const q = generateInterval(settings())!;
      expect(q.startFret).toBeLessThanOrEqual(Math.min(q.rootFret, q.noteFret));
      expect(q.endFret).toBeGreaterThanOrEqual(Math.max(q.rootFret, q.noteFret));
    }
  });
});

describe('fretWindow', () => {
  it('never goes behind the nut and stays at least five frets wide', () => {
    const w = fretWindow(0, 1);
    expect(w.startFret).toBe(0);
    expect(w.endFret - w.startFret + 1).toBeGreaterThanOrEqual(5);
    const mid = fretWindow(7, 8);
    expect(mid.endFret - mid.startFret + 1).toBeGreaterThanOrEqual(5);
    expect(mid.startFret).toBeLessThan(7);
  });
});

describe('levels', () => {
  it('recognises each preset and nothing in between', () => {
    for (const lv of LEVELS) {
      expect(matchLevel(levelSettings(lv.key))).toBe(lv.key);
      // autoAdvance is a preference, not part of the level.
      const full: IntervalSettings = { ...levelSettings(lv.key), autoAdvance: false };
      expect(matchLevel(full)).toBe(lv.key);
    }
    expect(matchLevel(settings({ fretSpan: 4 }))).toBeNull();
  });

  it('hands out copies, so editing settings never mutates a preset', () => {
    const a = levelSettings('l1');
    a.rootStrings[2] = true;
    expect(levelSettings('l1').rootStrings[2]).toBe(false);
  });

  it('starts at level 1', () => {
    expect(matchLevel(defaultIntervalSettings)).toBe('l1');
    expect(ROOT_STRING_ORDER.filter((s) => defaultIntervalSettings.rootStrings[s])).toEqual([6, 5, 4]);
  });
});

describe('intervalDescription', () => {
  const q = (semitones: number) => ({
    rootString: 6,
    rootFret: 0,
    noteString: 5,
    noteFret: 0,
    semitones,
    cls: semitones % 12,
    startFret: 0,
    endFret: 4,
  });
  it('names simple, compound and octave distances', () => {
    expect(intervalDescription(q(3))).toBe('minor 3rd');
    expect(intervalDescription(q(15))).toBe('minor 3rd + octave');
    expect(intervalDescription(q(27))).toBe('minor 3rd + 2 octaves');
    expect(intervalDescription(q(12))).toBe('octave');
    expect(intervalDescription(q(24))).toBe('2 octaves');
  });
});
