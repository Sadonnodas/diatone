import { describe, it, expect } from 'vitest';
import { normalize, answersMatch } from './normalize';
import { chordToJazz, progressionToJazz, display7th, neutralizeNumeral } from './jazz';
import {
  buildQuestionFromSeed,
  isSeedValid,
  pickFreshSeed,
  questionSig,
  type Settings,
  type Seed,
  DEGREE_KEYS,
} from './engine';

const baseSettings = (over: Partial<Settings> = {}): Settings => ({
  selectedKeys: ['C', 'G', 'F'],
  selectedModes: [1, 4],
  use7thChords: false,
  generationMethod: 'weighted',
  majorWeights: [10, 6, 4, 8, 10, 8, 2],
  degreeToggles: { I: true, ii: true, iii: true, IV: true, V: true, vi: true, 'vii°': true },
  autoAdvance: true,
  hideQuality: false,
  ...over,
});

describe('normalize (§13)', () => {
  it('treats jazz and standard minor 7 the same', () => {
    expect(normalize('A-7')).toBe(normalize('Am7'));
    expect(normalize('Amin7')).toBe(normalize('Am7'));
  });
  it('treats half-diminished forms the same', () => {
    const forms = ['Bm7b5', 'B-7b5', 'Bm7(b5)', 'B-7(b5)', 'Bø7', 'Bø'];
    forms.forEach((f) => expect(normalize(f)).toBe(normalize('Bm7b5')));
  });
  it('treats maj7 forms the same', () => {
    ['Cmaj7', 'C△7', 'CΔ7'].forEach((f) => expect(normalize(f)).toBe(normalize('Cmaj7')));
  });
  it('treats dim forms the same', () => {
    expect(normalize('B°')).toBe(normalize('Bdim'));
  });
  it('handles unicode accidentals', () => {
    expect(normalize('F♯m7b5')).toBe(normalize('F#m7b5'));
  });
  it('numeral equivalences', () => {
    ['iim7', 'ii-7', 'iimin7'].forEach((f) => expect(normalize(f)).toBe(normalize('iim7')));
    ['viiø7', 'viim7b5', 'viim7(b5)', 'vii-7b5', 'vii7b5'].forEach((f) =>
      expect(normalize(f)).toBe(normalize('viim7b5')),
    );
  });
});

describe('strictness (§13)', () => {
  it('V is wrong for V7', () => {
    expect(answersMatch('C', 'C7')).toBe(false);
  });
  it('V7 rejects C, Cm7, Cmaj7 but accepts C7', () => {
    expect(answersMatch('C7', 'C7')).toBe(true);
    expect(answersMatch('C', 'C7')).toBe(false);
    expect(answersMatch('Cm7', 'C7')).toBe(false);
    expect(answersMatch('Cmaj7', 'C7')).toBe(false);
  });
  it('vii° never accepted for viiø7 and vice versa', () => {
    expect(answersMatch('B°', 'Bm7b5')).toBe(false);
    expect(answersMatch('Bdim', 'Bm7b5')).toBe(false);
    expect(answersMatch('Bdim7', 'Bm7b5')).toBe(false);
  });
  it('mode 4: Imaj7 accepts I△7/IΔ7, rejects I and I7', () => {
    expect(answersMatch('I△7', 'Imaj7')).toBe(true);
    expect(answersMatch('IΔ7', 'Imaj7')).toBe(true);
    expect(answersMatch('I', 'Imaj7')).toBe(false);
    expect(answersMatch('I7', 'Imaj7')).toBe(false);
  });
});

describe('jazz transforms (§11/§12)', () => {
  it('chordToJazz longest-suffix-first', () => {
    expect(chordToJazz('Bm7b5')).toBe('Bø7');
    expect(chordToJazz('Cmaj7')).toBe('C△7');
    expect(chordToJazz('Am7')).toBe('A-7');
    expect(chordToJazz('Am')).toBe('A-');
    expect(chordToJazz('Bdim')).toBe('B°');
    expect(chordToJazz('G7')).toBe('G7');
  });
  it('progressionToJazz over a list', () => {
    expect(progressionToJazz('G Em Am D')).toBe('G E- A- D');
  });
  it('display7th rules', () => {
    expect(display7th('I', true)).toBe('Imaj7');
    expect(display7th('V', true)).toBe('V7');
    expect(display7th('ii', true)).toBe('iim7');
    expect(display7th('vii°', true)).toBe('viiø7');
    expect(display7th('ii', false)).toBe('ii');
  });
  it('neutralizeNumeral strips quality', () => {
    expect(neutralizeNumeral('vii°')).toBe('VII');
    expect(neutralizeNumeral('ii')).toBe('II');
  });
});

describe('buildQuestionFromSeed (§10)', () => {
  it('mode 1 triad: V in F builds answer C', () => {
    const seed: Seed = { key: 'F', mode: 1, degreeIndex: 4 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['F'] }));
    expect(q.answer).toBe('C');
    expect(answersMatch('C', q.answer)).toBe(true);
    expect(answersMatch('C7', q.answer)).toBe(false);
  });
  it('mode 1 7-chord: V7 in F builds answer C7', () => {
    const seed: Seed = { key: 'F', mode: 1, degreeIndex: 4 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['F'], use7thChords: true }));
    expect(q.answer).toBe('C7');
    expect(answersMatch('C7', q.answer)).toBe(true);
    expect(answersMatch('C', q.answer)).toBe(false);
  });
  it('mode 1 triad: vii in C shows vii° and answer Bdim', () => {
    const seed: Seed = { key: 'C', mode: 1, degreeIndex: 6 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['C'] }));
    expect(q.prompt.content).toBe('vii°');
    expect(answersMatch('Bdim', q.answer)).toBe(true);
    expect(answersMatch('B°', q.answer)).toBe(true);
  });
  it('mode 1 7-chord: viiø7 in C, answer accepts half-dim forms, rejects dim', () => {
    const seed: Seed = { key: 'C', mode: 1, degreeIndex: 6 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['C'], use7thChords: true }));
    expect(q.prompt.content).toBe('viiø7');
    ['Bm7b5', 'B-7b5', 'Bm7(b5)', 'B-7(b5)', 'Bø7'].forEach((a) =>
      expect(answersMatch(a, q.answer)).toBe(true),
    );
    ['Bdim', 'B°', 'Bdim7'].forEach((a) => expect(answersMatch(a, q.answer)).toBe(false));
  });
  it('mode 4: Cmaj7 shown (key C, 7-chord) accepts Imaj7 variants, rejects I/I7', () => {
    const seed: Seed = { key: 'C', mode: 4, degreeIndex: 0 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['C'], use7thChords: true }));
    expect(q.prompt.content).toBe('C△7');
    expect(q.answer).toBe('I△7');
    ['Imaj7', 'I△7', 'IΔ7'].forEach((a) => expect(answersMatch(a, q.answer)).toBe(true));
    ['I', 'I7'].forEach((a) => expect(answersMatch(a, q.answer)).toBe(false));
  });
  it('mode 4: F#m7b5 shown (key G, 7-chord) accepts half-dim numerals, rejects vii°/vii/vii7', () => {
    const seed: Seed = { key: 'G', mode: 4, degreeIndex: 6 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['G'], use7thChords: true }));
    expect(q.prompt.content).toBe('F#ø7');
    ['viiø7', 'viim7b5', 'vii-7b5', 'vii7b5', 'viim7(b5)'].forEach((a) =>
      expect(answersMatch(a, q.answer)).toBe(true),
    );
    ['vii°', 'vii', 'vii7'].forEach((a) => expect(answersMatch(a, q.answer)).toBe(false));
  });
  it('mode 2 progression: I V vi IV in G → G D Em C', () => {
    const seed: Seed = { key: 'G', mode: 2, degreeIndex: 0, basePattern: ['I', 'V', 'vi', 'IV'] };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedModes: [2] }));
    expect(q.answer).toBe('G D E- C');
    expect(answersMatch('G D Em C', q.answer)).toBe(true);
  });
  it('mode 3 transpose C→G of I vi ii V → G Em Am D', () => {
    const seed: Seed = {
      key: 'C',
      mode: 3,
      degreeIndex: 0,
      basePattern: ['I', 'vi', 'ii', 'V'],
      keyTo: 'G',
    };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['C', 'G'], selectedModes: [3] }));
    expect(q.prompt.content).toBe('C A- D- G');
    expect(q.answer).toBe('G E- A- D');
  });
  it('hideQuality mode 1 neutralizes numeral and sets chordType', () => {
    const seed: Seed = { key: 'C', mode: 1, degreeIndex: 6 };
    const q = buildQuestionFromSeed(seed, baseSettings({ selectedKeys: ['C'], hideQuality: true }));
    expect(q.prompt.content).toBe('VII');
    expect(q.prompt.chordType).toBe('triad');
    expect(q.prompt.text).toContain('{chordType}');
  });
});

describe('isSeedValid (§10)', () => {
  it('invalid when key removed', () => {
    const seed: Seed = { key: 'D', mode: 1, degreeIndex: 0 };
    expect(isSeedValid(seed, baseSettings())).toBe(false);
  });
  it('invalid when mode removed', () => {
    const seed: Seed = { key: 'C', mode: 2, degreeIndex: 0 };
    expect(isSeedValid(seed, baseSettings())).toBe(false);
  });
  it('invalid when degree disabled', () => {
    const seed: Seed = { key: 'C', mode: 1, degreeIndex: 6 };
    const settings = baseSettings();
    settings.degreeToggles['vii°'] = false;
    expect(isSeedValid(seed, settings)).toBe(false);
  });
  it('mode 3 invalid when keyTo removed', () => {
    const seed: Seed = { key: 'C', mode: 3, degreeIndex: 0, keyTo: 'D' };
    expect(isSeedValid(seed, baseSettings({ selectedModes: [1, 3] }))).toBe(false);
  });
  it('valid seed passes', () => {
    const seed: Seed = { key: 'C', mode: 1, degreeIndex: 0 };
    expect(isSeedValid(seed, baseSettings())).toBe(true);
  });
});

describe('no immediate repeats (pickFreshSeed)', () => {
  it('never serves the same question twice in a row when alternatives exist', () => {
    const settings = baseSettings({
      selectedKeys: ['C'],
      selectedModes: [1],
      generationMethod: 'random',
      degreeToggles: { I: true, ii: true, iii: false, IV: false, V: false, vi: false, 'vii°': false },
    });
    let prev = pickFreshSeed(settings, undefined)!;
    for (let i = 0; i < 50; i++) {
      const prevSig = questionSig(buildQuestionFromSeed(prev, settings));
      const seed = pickFreshSeed(settings, prevSig)!;
      const sig = questionSig(buildQuestionFromSeed(seed, settings));
      expect(sig).not.toBe(prevSig);
      prev = seed;
    }
  });
});

describe('DEGREE_KEYS order is load-bearing', () => {
  it('matches the chordData numeral order', () => {
    expect(DEGREE_KEYS).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  });
});
