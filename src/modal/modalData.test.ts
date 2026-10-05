import { describe, expect, it } from 'vitest';
import {
  FAMILIES,
  MODES,
  MODE_NAMES,
  PLAIN_SCALE,
  cycleDegree,
  byName,
  defaultModalSettings,
  generateModal,
  modalAnswerMatches,
  modalReady,
  questionSig,
  type Family,
  type ModalQuestion,
} from './modalData';

// A deterministic stand-in for Math.random, so a failing case can be replayed.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const sample = (n: number, seed = 7, families = defaultModalSettings.families): ModalQuestion[] => {
  const rand = seeded(seed);
  return Array.from({ length: n }, () => generateModal({ ...defaultModalSettings, families }, rand));
};

describe('the sheet', () => {
  it('has the six modes in scale order, Locrian left out', () => {
    expect(MODE_NAMES).toEqual(['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian']);
    expect(MODES.map((m) => m.degree)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('carries the extensions from the table', () => {
    expect(byName('Phrygian').extensions).toEqual(['b9', '11', 'b13']);
    expect(byName('Lydian').extensions).toEqual(['9', '#11', '13']);
    expect(byName('Aeolian').extensions).toEqual(['9', '11', 'b13']);
    // Ionian, Dorian and Mixolydian share the natural set — that's a question.
    const natural = MODES.filter((m) => m.extensions.join() === '9,11,13').map((m) => m.name);
    expect(natural).toEqual(['Ionian', 'Dorian', 'Mixolydian']);
  });

  it('carries the tetrads and harmonizations', () => {
    expect(MODES.map((m) => m.tetrad)).toEqual(['Imaj7', 'II-7', 'III-7', 'IVmaj7', 'V7', 'VI-7']);
    for (const m of MODES) expect(m.harmonization).toHaveLength(7);
    expect(byName('Dorian').harmonization[5]).toBe('VI-7(b5)');
    // Lydian's fifth carries a major 7th, as its own vamp shows.
    expect(byName('Lydian').harmonization[4]).toBe('Vmaj7');
    expect(byName('Lydian').vamps).toContain('Imaj7 | Vmaj7');
  });

  it('spells each mode the way the major scale makes it', () => {
    // The major scale in semitones, and a mode read off it from its own degree.
    const MAJOR = [0, 2, 4, 5, 7, 9, 11];
    for (const m of MODES) {
      const start = MAJOR[m.degree - 1];
      const derived = MAJOR.map((_, i) => {
        const semis = (MAJOR[(m.degree - 1 + i) % 7] - start + 12) % 12;
        const diff = semis - MAJOR[i];
        return `${diff === 0 ? '' : diff < 0 ? 'b' : '#'}${i + 1}`;
      });
      expect(m.formula).toEqual(derived);
    }
    expect(byName('Aeolian').formula).toEqual(['1', '2', 'b3', '4', '5', 'b6', 'b7']);
    expect(byName('Lydian').formula).toEqual(['1', '2', '3', '#4', '5', '6', '7']);
  });

  it('taps a degree down, then up, then back — and never the tonic', () => {
    expect(cycleDegree('3')).toBe('b3');
    expect(cycleDegree('b3')).toBe('#3');
    expect(cycleDegree('#3')).toBe('3');
    expect(cycleDegree('1')).toBe('1');
    expect(PLAIN_SCALE).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('marks each coloured mode with the degree that sets it apart', () => {
    expect(byName('Dorian').signature?.degree).toBe('VI');
    expect(byName('Phrygian').signature?.degree).toBe('bII');
    expect(byName('Lydian').signature?.degree).toBe('#IV');
    expect(byName('Mixolydian').signature?.degree).toBe('bVII');
    // The references have none: they're what the others are measured against.
    expect(byName('Ionian').signature).toBeUndefined();
    expect(byName('Aeolian').signature).toBeUndefined();
  });
});

describe('questions', () => {
  it('always offers its own answer, without repeating an option', () => {
    for (const q of sample(600)) {
      expect(q.error).toBeUndefined();
      expect(q.answer.length).toBeGreaterThan(0);
      if (q.input === 'formula') {
        // Answered in the builder, so there's nothing to offer: seven degrees.
        expect(q.options).toEqual([]);
        expect(q.answer).toHaveLength(7);
        continue;
      }
      expect(new Set(q.options).size).toBe(q.options.length);
      for (const a of q.answer) expect(q.options).toContain(a);
    }
  });

  it('reaches every family that is switched on', () => {
    const seen = new Set(sample(400).map((q) => q.family));
    expect(seen.size).toBe(FAMILIES.length);
  });

  it('asks only from the families that are on', () => {
    const only = (id: Family) => ({
      order: false,
      extensions: false,
      tetrads: false,
      category: false,
      spelling: false,
      harmony: false,
      colour: false,
      [id]: true,
    }) as Record<Family, boolean>;
    for (const f of FAMILIES) {
      const families = only(f.id);
      for (const q of sample(40, 3, families)) expect(q.family).toBe(f.id);
    }
  });

  it('asks for every mode of a shared answer, not just one', () => {
    const shared = sample(800).filter(
      (q) => q.family === 'extensions' && q.subject === '9 · 11 · 13',
    );
    expect(shared.length).toBeGreaterThan(0);
    for (const q of shared) {
      expect([...q.answer].sort()).toEqual(['Dorian', 'Ionian', 'Mixolydian']);
    }
  });

  it('groups the major and the minor modes', () => {
    const groups = sample(800).filter(
      (q) => q.family === 'category' && q.subject.endsWith('modes'),
    );
    expect(groups.length).toBeGreaterThan(0);
    for (const q of groups) {
      expect([...q.answer].sort()).toEqual(
        q.subject.startsWith('major')
          ? ['Ionian', 'Lydian', 'Mixolydian']
          : ['Aeolian', 'Dorian', 'Phrygian'],
      );
    }
  });

  it('builds a spelling question you answer in place, in order', () => {
    const built = sample(900).filter((q) => q.family === 'spelling' && q.input === 'formula');
    expect(built.length).toBeGreaterThan(0);
    for (const q of built) {
      const mode = byName(q.subject);
      expect(q.answer).toEqual([...mode.formula]);
      expect(modalAnswerMatches([...q.answer], q)).toBe(true);
      // Order matters here, unlike a set of taps: 1 b2 3 is not 1 2 b3.
      const swapped = [...q.answer].reverse();
      if (swapped.join() !== q.answer.join()) {
        expect(modalAnswerMatches(swapped, q)).toBe(false);
      }
      expect(modalAnswerMatches([...PLAIN_SCALE], q)).toBe(mode.name === 'Ionian');
    }
  });

  it('asks the spelling the other way round too', () => {
    const read = sample(900).filter((q) => q.family === 'spelling' && q.input !== 'formula');
    expect(read.length).toBeGreaterThan(0);
    for (const q of read) {
      const mode = MODES.find((m) => m.formula.join(' ') === q.subject)!;
      expect(q.answer).toEqual([mode.name]);
      expect(q.options).toContain(mode.name);
    }
  });

  it('explains the answer', () => {
    for (const q of sample(300)) expect(q.note && q.note.length).toBeTruthy();
  });

  it('avoids asking the same question twice in a row', () => {
    const rand = seeded(11);
    let prev = generateModal(defaultModalSettings, rand);
    for (let i = 0; i < 300; i++) {
      const q = generateModal(defaultModalSettings, rand, questionSig(prev));
      expect(questionSig(q)).not.toBe(questionSig(prev));
      prev = q;
    }
  });

  it('grades a tap set only when it is exactly right', () => {
    const q = sample(1).find((x) => x.answer.length > 0)!;
    expect(modalAnswerMatches(q.answer, q)).toBe(true);
    expect(modalAnswerMatches([], q)).toBe(false);
    expect(modalAnswerMatches([...q.answer, 'Ionian!'], q)).toBe(false);
  });

  it('says so when nothing is switched on', () => {
    const off = {
      order: false,
      extensions: false,
      tetrads: false,
      category: false,
      spelling: false,
      harmony: false,
      colour: false,
    };
    expect(modalReady({ ...defaultModalSettings, families: off })).toBe(false);
    expect(generateModal({ ...defaultModalSettings, families: off }).error).toBeTruthy();
  });
});
