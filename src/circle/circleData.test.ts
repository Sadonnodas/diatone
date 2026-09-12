import { describe, it, expect } from 'vitest';
import {
  POSITIONS,
  MIN_GAPS,
  defaultCircleSettings,
  generateCircle,
  keyAt,
  keyChord,
  ringChord,
  segmentLabel,
  segmentSpellings,
  slotKey,
  wedgeSlots,
  wrap,
  type CircleSettings,
} from './circleData';
import { ALL_KEYS, chordData } from '../lib/chordData';
import { DEGREE_KEYS } from '../lib/engine';

const settings = (over: Partial<CircleSettings> = {}): CircleSettings => ({
  ...defaultCircleSettings,
  rings: { ...defaultCircleSettings.rings, ...(over.rings ?? {}) },
  degrees: { ...defaultCircleSettings.degrees, ...(over.degrees ?? {}) },
  ...over,
});

// Deterministic "random" so a generated question can be asserted on.
const seeded = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

describe('the wheel', () => {
  it('puts the twelve keys in circle-of-fifths order from C', () => {
    expect(keyAt(0)).toBe('C');
    expect(keyAt(1)).toBe('G'); // a fifth up
    expect(keyAt(11)).toBe('F'); // a fifth down
    expect(keyAt(12)).toBe('C'); // all the way round
  });

  it('wraps in both directions', () => {
    expect(wrap(-1)).toBe(11);
    expect(wrap(13)).toBe(1);
  });

  it('reads each ring off the key table', () => {
    expect(ringChord('major', 0)).toBe('C');
    expect(ringChord('minor', 0)).toBe('Am'); // relative minor
    expect(ringChord('dim', 0)).toBe('Bdim'); // vii° of C
  });

  it('keeps the awkward spellings the key table insists on', () => {
    const fSharp = ALL_KEYS.indexOf('F#');
    expect(ringChord('major', fSharp)).toBe('F#');
    expect(ringChord('minor', fSharp)).toBe('D#m');
    expect(ringChord('dim', fSharp)).toBe('E#dim'); // not Fdim
  });
});

describe('the wedge', () => {
  // The load-bearing claim: a key's seven chords are one contiguous wedge, and
  // the wedge agrees with the key table exactly. If the geometry is wrong the
  // whole drill teaches the wrong thing.
  it('is the key’s seven diatonic chords, for every key', () => {
    for (let pos = 0; pos < POSITIONS; pos++) {
      const key = keyAt(pos);
      const expected = chordData[key].triads.chords;
      for (const { degree, slot } of wedgeSlots(pos)) {
        const degreeIndex = DEGREE_KEYS.indexOf(degree);
        // Twelve spokes can't carry both sides of the enharmonic seam, so the
        // segment has to answer to the spelling this key uses — not
        // necessarily the one its own spoke prints first.
        expect(segmentSpellings(slot), `${key} ${degree}`).toContain(expected[degreeIndex]);
      }
    }
  });

  it('prints both names where the seam needs them', () => {
    const fSharp = ALL_KEYS.indexOf('F#');
    const db = ALL_KEYS.indexOf('Db');
    // F# major's iii lands on Db's vi: same sound, two spellings.
    expect(segmentLabel({ ring: 'minor', pos: db })).toBe('Bbm/A#m');
    expect(segmentLabel({ ring: 'major', pos: fSharp })).toBe('F#/Gb');
    // Away from the seam a segment has just the one name.
    expect(segmentLabel({ ring: 'major', pos: ALL_KEYS.indexOf('C') })).toBe('C');
    expect(segmentLabel({ ring: 'minor', pos: ALL_KEYS.indexOf('C') })).toBe('Am');
  });

  it('names a chord the way the asked key spells it', () => {
    expect(keyChord(ALL_KEYS.indexOf('F#'), 'iii')).toBe('A#m');
    expect(keyChord(ALL_KEYS.indexOf('Db'), 'vi')).toBe('Bbm');
    expect(keyChord(ALL_KEYS.indexOf('F#'), 'vii°')).toBe('E#dim');
  });

  it('covers all seven degrees exactly once', () => {
    const degrees = wedgeSlots(0).map((w) => w.degree);
    expect([...degrees].sort()).toEqual([...DEGREE_KEYS].sort());
  });

  it('sits IV one step anticlockwise and V one step clockwise', () => {
    // The reflex the drill is for: in C, F is to the left and G to the right.
    const c = ALL_KEYS.indexOf('C');
    const byDegree = Object.fromEntries(wedgeSlots(c).map((w) => [w.degree, w.slot]));
    expect(byDegree['IV'].pos).toBe(wrap(c - 1));
    expect(byDegree['V'].pos).toBe(wrap(c + 1));
    expect(ringChord('major', byDegree['IV'].pos)).toBe('F');
    expect(ringChord('major', byDegree['V'].pos)).toBe('G');
  });

  it('spans only three spokes, so it reads as one shape', () => {
    for (let pos = 0; pos < POSITIONS; pos++) {
      const offsets = wedgeSlots(pos).map((w) => {
        const raw = w.slot.pos - pos;
        return raw > 6 ? raw - POSITIONS : raw < -6 ? raw + POSITIONS : raw;
      });
      expect(Math.min(...offsets)).toBe(-1);
      expect(Math.max(...offsets)).toBe(1);
    }
  });
});

describe('generateCircle', () => {
  it('blanks the requested number of segments', () => {
    const q = generateCircle(settings({ gaps: 4 }), seeded(7));
    expect(q.error).toBeUndefined();
    expect(q.blanks).toHaveLength(4);
    expect(q.queue).toHaveLength(4);
  });

  it('never asks a single gap — there’d be nowhere else to tap', () => {
    const q = generateCircle(settings({ gaps: 1 }), seeded(3));
    expect(q.blanks.length).toBeGreaterThanOrEqual(MIN_GAPS);
  });

  it('blanks everything when asked for all', () => {
    const q = generateCircle(settings({ scope: 'key', gaps: 0 }), seeded(11));
    expect(q.blanks).toHaveLength(DEGREE_KEYS.length);
  });

  it('labels every blank and asks for each exactly once', () => {
    const q = generateCircle(settings({ gaps: 4 }), seeded(5));
    const keys = q.blanks.map(slotKey).sort();
    expect(Object.keys(q.labels).sort()).toEqual(keys);
    expect([...q.queue].sort()).toEqual(keys);
  });

  it('only blanks rings that are switched on', () => {
    const q = generateCircle(
      settings({ gaps: 0, rings: { major: true, minor: false, dim: false } }),
      seeded(2),
    );
    expect(q.blanks.every((b) => b.ring === 'major')).toBe(true);
    expect(q.blanks).toHaveLength(POSITIONS);
  });

  it('only blanks degrees that are switched on, in key scope', () => {
    const only = Object.fromEntries(DEGREE_KEYS.map((d) => [d, d === 'I' || d === 'IV' || d === 'V']));
    const q = generateCircle(settings({ scope: 'key', gaps: 0, degrees: only }), seeded(9));
    expect(q.blanks).toHaveLength(3);
    expect(q.blanks.every((b) => b.ring === 'major')).toBe(true);
  });

  it('names numerals in key scope and chords on the whole circle', () => {
    const byNumeral = generateCircle(settings({ scope: 'key', label: 'numerals', gaps: 0 }), seeded(4));
    expect(Object.values(byNumeral.labels).sort()).toEqual([...DEGREE_KEYS].sort());

    const byChord = generateCircle(settings({ scope: 'circle', label: 'numerals' }), seeded(4));
    // A numeral means nothing without a key, so the whole circle names chords.
    for (const [key, label] of Object.entries(byChord.labels)) {
      const [ring, pos] = key.split(':');
      expect(label).toBe(ringChord(ring as 'major', Number(pos)));
    }
  });

  it('turns the wheel only when asked, and only when there’s a key', () => {
    expect(generateCircle(settings({ scope: 'key', keyAtTop: false }), seeded(6)).rotate).toBe(0);
    expect(generateCircle(settings({ scope: 'circle', keyAtTop: true }), seeded(6)).rotate).toBe(0);
    const turned = generateCircle(settings({ scope: 'key', keyAtTop: true }), seeded(6));
    expect(turned.rotate).toBe(-turned.keyPos!);
  });

  it('explains itself instead of producing an impossible question', () => {
    const noRings = generateCircle(
      settings({ rings: { major: false, minor: false, dim: false } }),
      seeded(1),
    );
    expect(noRings.error).toBeTruthy();
    const oneDegree = Object.fromEntries(DEGREE_KEYS.map((d) => [d, d === 'I']));
    const tooFew = generateCircle(settings({ scope: 'key', degrees: oneDegree }), seeded(1));
    expect(tooFew.error).toBeTruthy();
  });
});
