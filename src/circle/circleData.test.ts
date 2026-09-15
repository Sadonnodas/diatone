import { describe, it, expect } from 'vitest';
import {
  POSITIONS,
  RING_ORDER,
  defaultCircleSettings,
  generateLayout,
  generateWedge,
  layoutAnswerMatches,
  segmentRoot,
  wedgeAnswerMatches,
  pickOptions,
  PICK_OPTIONS,
  chooseDrill,
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
  ...over,
  rings: { ...defaultCircleSettings.rings, ...(over.rings ?? {}) },
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

describe('ring order', () => {
  it('matches the printed wheel: majors inside, minors outside them, vii° on the rim', () => {
    // Drawing order is outside in, so the last one is the innermost ring.
    expect(RING_ORDER).toEqual(['dim', 'minor', 'major']);
  });
});

describe('segmentRoot', () => {
  it('drops the quality — the ring already says what it is', () => {
    expect(segmentRoot({ ring: 'major', pos: 0 })).toBe('C');
    expect(segmentRoot({ ring: 'minor', pos: 0 })).toBe('A');
    expect(segmentRoot({ ring: 'dim', pos: 0 })).toBe('B');
    expect(segmentRoot({ ring: 'minor', pos: ALL_KEYS.indexOf('Db') })).toBe('Bb');
  });
});

describe('layoutAnswerMatches', () => {
  it('accepts the name of the segment', () => {
    expect(layoutAnswerMatches('C', { ring: 'major', pos: 0 })).toBe(true);
    expect(layoutAnswerMatches('A', { ring: 'minor', pos: 0 })).toBe(true);
  });

  it('accepts either side of the enharmonic seam — same place either way', () => {
    const fSharp = { ring: 'major' as const, pos: ALL_KEYS.indexOf('F#') };
    expect(layoutAnswerMatches('F#', fSharp)).toBe(true);
    expect(layoutAnswerMatches('Gb', fSharp)).toBe(true);
    const db = { ring: 'minor' as const, pos: ALL_KEYS.indexOf('Db') };
    expect(layoutAnswerMatches('Bb', db)).toBe(true);
    expect(layoutAnswerMatches('A#', db)).toBe(true);
  });

  it('rejects the wrong note and the unparseable', () => {
    expect(layoutAnswerMatches('D', { ring: 'major', pos: 0 })).toBe(false);
    expect(layoutAnswerMatches('', { ring: 'major', pos: 0 })).toBe(false);
    expect(layoutAnswerMatches('H', { ring: 'major', pos: 0 })).toBe(false);
  });
});

describe('generateLayout', () => {
  it('blanks the number of segments asked for, one included', () => {
    expect(generateLayout(settings({ gaps: 1 }), seeded(7)).blanks).toHaveLength(1);
    expect(generateLayout(settings({ gaps: 4 }), seeded(7)).blanks).toHaveLength(4);
  });

  it('only blanks rings that are on', () => {
    const major = generateLayout(settings({ gaps: 12, rings: { major: true, minor: false } }), seeded(2));
    expect(major.blanks.every((b) => b.ring === 'major')).toBe(true);
    const minor = generateLayout(settings({ gaps: 12, rings: { major: false, minor: true } }), seeded(2));
    expect(minor.blanks.every((b) => b.ring === 'minor')).toBe(true);
  });

  it('never blanks the same segment twice', () => {
    const q = generateLayout(settings({ gaps: 24, rings: { major: true, minor: true } }), seeded(5));
    expect(new Set(q.blanks.map(slotKey)).size).toBe(q.blanks.length);
  });

  it('says so instead of producing an empty question', () => {
    const q = generateLayout(settings({ rings: { major: false, minor: false } }), seeded(1));
    expect(q.error).toBeTruthy();
  });
});

describe('generateWedge', () => {
  it('lays out all seven degrees of the key', () => {
    const q = generateWedge(settings({ drill: 'wedge' }), seeded(3));
    expect(q.slots).toHaveLength(7);
    expect(q.slots.map((w) => w.degree).sort()).toEqual([...DEGREE_KEYS].sort());
  });

  it('spells every chord the way the key spells it', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['F#'] }), seeded(3));
    const byDegree = Object.fromEntries(q.slots.map((w) => [w.degree, w.chord]));
    expect(byDegree['iii']).toBe('A#m'); // not the Bbm its segment is printed with
    expect(byDegree['vii°']).toBe('E#dim');
  });

  it('keeps the wedge to three spokes, IV left and V right', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['C'] }), seeded(3));
    const byDegree = Object.fromEntries(q.slots.map((w) => [w.degree, w]));
    expect(byDegree['IV'].offset).toBe(-1);
    expect(byDegree['I'].offset).toBe(0);
    expect(byDegree['V'].offset).toBe(1);
    // Relative minors sit directly outside their major.
    expect(byDegree['ii'].offset).toBe(-1);
    expect(byDegree['vi'].offset).toBe(0);
    expect(byDegree['iii'].offset).toBe(1);
    expect(byDegree['vii°'].offset).toBe(0);
  });

  it('grades typed chords like Numerals: any notation, but the key’s own spelling', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['F#'] }), seeded(3));
    const byDegree = Object.fromEntries(q.slots.map((w) => [w.degree, w]));
    expect(wedgeAnswerMatches('E#dim', byDegree['vii°'], 'chords')).toBe(true);
    expect(wedgeAnswerMatches('E#°', byDegree['vii°'], 'chords')).toBe(true);
    expect(wedgeAnswerMatches('G#-', byDegree['ii'], 'chords')).toBe(true);
    expect(wedgeAnswerMatches('G#min', byDegree['ii'], 'chords')).toBe(true);
    // Same sound, wrong spelling for this key — not accepted.
    expect(wedgeAnswerMatches('Fdim', byDegree['vii°'], 'chords')).toBe(false);
    // Right chord, wrong slot.
    expect(wedgeAnswerMatches('C#', byDegree['IV'], 'chords')).toBe(false);
  });

  it('grades numerals against the slot’s degree', () => {
    const q = generateWedge(settings({ drill: 'wedge', place: 'numerals', keys: ['C'] }), seeded(3));
    const byDegree = Object.fromEntries(q.slots.map((w) => [w.degree, w]));
    expect(wedgeAnswerMatches('vi', byDegree['vi'], 'numerals')).toBe(true);
    expect(wedgeAnswerMatches('IV', byDegree['vi'], 'numerals')).toBe(false);
  });

  it('draws only from the keys you picked, and avoids repeating one', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['G'] }), seeded(4));
    expect(q.key).toBe('G');
    const two = settings({ drill: 'wedge', keys: ['G', 'D'] });
    expect(generateWedge(two, seeded(4), 'G').key).toBe('D');
    // With only one key to choose from, repeating it is the only option.
    expect(generateWedge(settings({ drill: 'wedge', keys: ['G'] }), seeded(4), 'G').key).toBe('G');
  });

  it('says so when no key is picked', () => {
    expect(generateWedge(settings({ drill: 'wedge', keys: [] }), seeded(1)).error).toBeTruthy();
  });
});

describe('pickOptions', () => {
  const slotsFor = (key: string) =>
    Object.fromEntries(
      generateWedge(settings({ drill: 'wedge', keys: [key], style: 'build' }), seeded(1)).slots.map((w) => [w.degree, w]),
    );

  it('offers six distinct chords with the right one exactly once', () => {
    for (const key of ALL_KEYS) {
      const q = generateWedge(settings({ drill: 'wedge', keys: [key], style: 'build' }), seeded(2));
      for (const w of q.slots) {
        const opts = pickOptions(w, q.keyPos, seeded(9));
        expect(opts, `${key} ${w.degree}`).toHaveLength(PICK_OPTIONS);
        expect(new Set(opts).size).toBe(PICK_OPTIONS);
        expect(opts.filter((o) => wedgeAnswerMatches(o, w, 'chords'))).toEqual([w.chord]);
      }
    }
  });

  it('includes the same root with a wrong quality', () => {
    const w = slotsFor('C')['iii']; // Em
    const opts = pickOptions(w, ALL_KEYS.indexOf('C'), seeded(3));
    expect(opts.some((o) => o === 'E' || o === 'Edim')).toBe(true);
  });

  it('includes the other spelling where the key insists on one', () => {
    const w = slotsFor('F#')['vii°']; // E#dim
    const opts = pickOptions(w, ALL_KEYS.indexOf('F#'), seeded(3));
    expect(opts).toContain('E#dim');
    expect(opts).toContain('Fdim');
  });
});

describe('wedge styles and the layout/wedge mix', () => {
  it('a pick question walks every slot once, each with its own options', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['G'], style: 'pick' }), seeded(4));
    expect(q.style).toBe('pick');
    expect([...q.order].sort()).toEqual([...DEGREE_KEYS].sort());
    for (const w of q.slots) expect(q.options[w.degree]).toContain(w.chord);
  });

  it('numerals are never a pick question', () => {
    const q = generateWedge(settings({ drill: 'wedge', keys: ['G'], place: 'numerals', style: 'pick' }), seeded(4));
    expect(q.style).toBe('build');
  });

  it('a style mix deals both', () => {
    const rand = seeded(11);
    const styles = new Set(
      Array.from({ length: 30 }, () => generateWedge(settings({ drill: 'wedge', style: 'mix' }), rand).style),
    );
    expect(styles).toEqual(new Set(['build', 'pick']));
  });

  it('a drill mix deals both, never three of a kind in a row', () => {
    const rand = seeded(5);
    const s = settings({ drill: 'mix', rings: { major: true, minor: false }, keys: ['C'] });
    const recent: ('layout' | 'wedge')[] = [];
    for (let i = 0; i < 60; i++) recent.push(chooseDrill(s, recent, rand));
    expect(new Set(recent)).toEqual(new Set(['layout', 'wedge']));
    for (let i = 2; i < recent.length; i++) {
      expect(recent[i] === recent[i - 1] && recent[i] === recent[i - 2]).toBe(false);
    }
  });

  it('a drill mix falls back to whichever drill the settings can make', () => {
    expect(chooseDrill(settings({ drill: 'mix', rings: { major: false, minor: false } }), [], seeded(1))).toBe('wedge');
    expect(chooseDrill(settings({ drill: 'mix', keys: [] }), [], seeded(1))).toBe('layout');
  });
});
