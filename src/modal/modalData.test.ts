import { describe, expect, it } from 'vitest';
import {
  FAMILIES,
  MODES,
  MODE_NAMES,
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

  it('carries the tensions from the table', () => {
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
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.answer.length).toBeGreaterThan(0);
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
      harmony: false,
      colour: false,
    };
    expect(modalReady({ ...defaultModalSettings, families: off })).toBe(false);
    expect(generateModal({ ...defaultModalSettings, families: off }).error).toBeTruthy();
  });
});
