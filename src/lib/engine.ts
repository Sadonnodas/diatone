// §10 — question generation via the seed pattern. The visible question is
// *derived* from seed + settings. Toggling a setting rebuilds the same seed's
// question; only Next Question (or seed invalidation) rolls a fresh seed.

import { chordData } from './chordData';
import { COMMON_PATTERNS } from './patterns';
import { chordToJazz, progressionToJazz, display7th, neutralizeNumeral } from './jazz';

export type GenerationMethod = 'random' | 'weighted';

export interface Settings {
  selectedKeys: string[];
  selectedModes: number[];
  use7thChords: boolean;
  generationMethod: GenerationMethod;
  majorWeights: number[];
  degreeToggles: Record<string, boolean>;
  autoAdvance: boolean;
  hideQuality: boolean;
}

export interface Seed {
  key: string;
  mode: number;
  degreeIndex: number;
  basePattern?: string[];
  keyTo?: string;
}

export interface PromptObj {
  text: string; // template with {key} / {chordType} placeholders
  keys: string[]; // fills {key} occurrences in order
  chordType?: 'triad' | 'tetrad'; // fills {chordType} (hideQuality only)
  content: string; // the chord(s)/numeral(s), space-separated, jazz form
}

export interface Question {
  prompt: PromptObj;
  answer: string; // canonical answer, jazz form (§12)
  key: string;
  mode: number;
  reminder: string;
  seed: Seed;
}

// §9 — degree key order is load-bearing; maps degreeIndex 0..6 to chords/numerals.
export const DEGREE_KEYS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

// §7 — resolve a pattern numeral to a degree index, case/°-insensitive.
const degreeIndexOf = (numerals: string[], n: string): number =>
  numerals.findIndex(
    (kn) => kn.toLowerCase().replace('°', '') === n.toLowerCase().replace('°', ''),
  );

const formOf = (key: string, use7thChords: boolean) =>
  use7thChords ? chordData[key].sevenths : chordData[key].triads;

// §10 — verbatim engine. Logic must not change.
export const pickSeed = (settings: Settings): Seed | null => {
  const { selectedKeys, selectedModes, majorWeights, degreeToggles, generationMethod } = settings;
  if (selectedKeys.length === 0 || selectedModes.length === 0) return null;

  const availableDegreeIndexes = Object.keys(degreeToggles)
    .map((deg, i) => (degreeToggles[deg] ? i : -1))
    .filter((i) => i !== -1);
  if (availableDegreeIndexes.length === 0) return null;

  // Mode 3 needs ≥2 keys; drop it otherwise so we don't loop picking a target.
  const usableModes = selectedModes.filter((m) => m !== 3 || selectedKeys.length >= 2);
  if (usableModes.length === 0) return null;

  const key = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
  const mode = usableModes[Math.floor(Math.random() * usableModes.length)];

  let selectionPool: number[] = [];
  if (generationMethod === 'random') {
    selectionPool = availableDegreeIndexes;
  } else {
    availableDegreeIndexes.forEach((index) => {
      for (let i = 0; i < majorWeights[index]; i++) selectionPool.push(index);
    });
  }
  if (selectionPool.length === 0) return null;

  const seed: Seed = {
    key,
    mode,
    degreeIndex: selectionPool[Math.floor(Math.random() * selectionPool.length)],
  };
  if (mode === 2 || mode === 3) {
    const basePatterns = COMMON_PATTERNS['Major'];
    seed.basePattern = basePatterns[Math.floor(Math.random() * basePatterns.length)];
  }
  if (mode === 3) {
    const otherKeys = selectedKeys.filter((k) => k !== key);
    seed.keyTo = otherKeys[Math.floor(Math.random() * otherKeys.length)];
  }
  return seed;
};

export const isSeedValid = (seed: Seed | null, settings: Settings | null): boolean => {
  if (!seed || !settings) return false;
  if (!settings.selectedKeys.includes(seed.key)) return false;
  if (!settings.selectedModes.includes(seed.mode)) return false;
  if (seed.mode === 3 && (!seed.keyTo || !settings.selectedKeys.includes(seed.keyTo))) return false;
  if (seed.mode === 1 || seed.mode === 4) {
    const degree = Object.keys(settings.degreeToggles)[seed.degreeIndex];
    if (!settings.degreeToggles[degree]) return false;
  }
  return true;
};

// §14 — hint / reminder string for the current mode + 7-chord setting.
const getReminder = (mode: number, use7thChords: boolean): string => {
  if (mode === 4) {
    return use7thChords
      ? 'Examples: Imaj7 (or I△7) • iim7 (or ii-7 or iimin7) • V7 • viiø7 (or viim7b5 or vii-7b5 or vii7b5).'
      : 'Roman numeral with quality. Examples: I • ii • IV • vi • vii°. Case matters.';
  }
  return use7thChords
    ? '7-chord mode. Forms: Cmaj7 (or C△7) • Am7 (or A-7) • Bm7b5 (or B-7b5 or Bø7).'
    : 'Triad mode. Forms: C • Am (or A-) • Bdim (or B°).';
};

// Display a single numeral as the question content (modes 1 & 2).
const numeralContent = (numeral: string, settings: Settings): string => {
  if (settings.hideQuality) return neutralizeNumeral(numeral);
  return progressionToJazz(display7th(numeral, settings.use7thChords));
};

// §10 — derive the visible question from a seed + settings.
export const buildQuestionFromSeed = (seed: Seed, settings: Settings): Question => {
  const { use7thChords, hideQuality } = settings;
  const chordType: 'triad' | 'tetrad' = use7thChords ? 'tetrad' : 'triad';
  const reminder = getReminder(seed.mode, use7thChords);

  if (seed.mode === 1) {
    const form = formOf(seed.key, use7thChords);
    const numeral = form.numerals[seed.degreeIndex];
    const prompt: PromptObj = {
      text: hideQuality
        ? 'In {key}, what is the {chordType} chord for:'
        : 'In {key}, what is the chord for:',
      keys: [seed.key],
      content: numeralContent(numeral, settings),
    };
    if (hideQuality) prompt.chordType = chordType;
    return {
      prompt,
      answer: progressionToJazz(form.chords[seed.degreeIndex]),
      key: seed.key,
      mode: seed.mode,
      reminder,
      seed,
    };
  }

  if (seed.mode === 4) {
    const form = formOf(seed.key, use7thChords);
    const chord = form.chords[seed.degreeIndex];
    const numeral = form.numerals[seed.degreeIndex];
    // hideQuality does NOT apply to mode 4 (its prompt is a chord, not a numeral).
    const prompt: PromptObj = {
      text: 'In {key}, what is the numeral for:',
      keys: [seed.key],
      content: chordToJazz(chord),
    };
    return {
      prompt,
      answer: progressionToJazz(display7th(numeral, use7thChords)),
      key: seed.key,
      mode: seed.mode,
      reminder,
      seed,
    };
  }

  if (seed.mode === 2) {
    const pattern = seed.basePattern ?? [];
    const form = formOf(seed.key, use7thChords);
    const content = pattern.map((n) => numeralContent(n, settings)).join(' ');
    const answer = progressionToJazz(
      pattern
        .map((n) => form.chords[degreeIndexOf(form.numerals, n)])
        .join(' '),
    );
    const prompt: PromptObj = {
      text: hideQuality
        ? 'In {key}, what are the {chordType} chords for:'
        : 'In {key}, what are the chords for:',
      keys: [seed.key],
      content,
    };
    if (hideQuality) prompt.chordType = chordType;
    return { prompt, answer, key: seed.key, mode: seed.mode, reminder, seed };
  }

  // mode === 3 — Transpose. hideQuality does not apply (content is chords).
  const pattern = seed.basePattern ?? [];
  const keyTo = seed.keyTo as string;
  const sourceForm = formOf(seed.key, use7thChords);
  const targetForm = formOf(keyTo, use7thChords);
  const content = progressionToJazz(
    pattern.map((n) => sourceForm.chords[degreeIndexOf(sourceForm.numerals, n)]).join(' '),
  );
  const answer = progressionToJazz(
    pattern.map((n) => targetForm.chords[degreeIndexOf(targetForm.numerals, n)]).join(' '),
  );
  return {
    prompt: {
      text: 'Transpose from {key} to {key}:',
      keys: [seed.key, keyTo],
      content,
    },
    answer,
    key: seed.key,
    mode: seed.mode,
    reminder,
    seed,
  };
};
