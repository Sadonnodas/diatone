// The modal cheat sheet as data: the degree each mode sits on, the tensions it
// takes, its harmonization, and the chords and vamps that state it. Everything
// the drill asks comes from this one table, so the connections it tests are the
// connections the sheet draws.
//
// Locrian is left out on purpose — the sheet groups the modes as major and
// minor, and the half-diminished seventh mode belongs to neither.

export type Category = 'major' | 'minor';

export interface ModeRow {
  /** Its place in the parent major scale, 1–6. */
  degree: number;
  name: string;
  category: Category;
  /** The tetrad on that degree of the parent scale. */
  tetrad: string;
  /** The tensions available over it, low to high. */
  extensions: [string, string, string];
  /** The mode's own harmonization, from its own root. */
  harmonization: string[];
  /** The chord (or chords) that state the mode on their own. */
  modalChords: string;
  /** Two-chord vamps that hold the mode. */
  vamps: string[];
  /** The degree that sets it apart from the plain major or minor scale, and
      why. Ionian and Aeolian are the references, so they have none. */
  signature?: { degree: string; why: string };
}

export const MODES: ModeRow[] = [
  {
    degree: 1,
    name: 'Ionian',
    category: 'major',
    tetrad: 'Imaj7',
    extensions: ['9', '11', '13'],
    harmonization: ['Imaj7', 'II-7', 'III-7', 'IVmaj7', 'V7', 'VI-7', 'VII-7(b5)'],
    modalChords: 'Imaj7, Imaj9 or Imaj13',
    vamps: ['Imaj7 | II-7', 'Imaj7 | IVmaj7'],
  },
  {
    degree: 2,
    name: 'Dorian',
    category: 'minor',
    tetrad: 'II-7',
    extensions: ['9', '11', '13'],
    harmonization: ['I-7', 'II-7', 'bIIImaj7', 'IV7', 'V-7', 'VI-7(b5)', 'bVIImaj7'],
    modalChords: 'I-6, I-69 or I-13',
    vamps: ['I-7 | II-7', 'I-7 | IV7'],
    signature: {
      degree: 'VI',
      why: 'A minor mode, so you expect Aeolian’s bVI — Dorian’s natural VI is the difference.',
    },
  },
  {
    degree: 3,
    name: 'Phrygian',
    category: 'minor',
    tetrad: 'III-7',
    extensions: ['b9', '11', 'b13'],
    harmonization: ['I-7', 'bIImaj7', 'bIII7', 'IV-7', 'V-7(b5)', 'bVImaj7', 'bVII-7'],
    modalChords: 'Isus4(b9)',
    vamps: ['I-7 | bIImaj7', 'I-7 | bVII-7'],
    signature: {
      degree: 'bII',
      why: 'Aeolian has a natural II; Phrygian flattens it, which is where the b9 comes from.',
    },
  },
  {
    degree: 4,
    name: 'Lydian',
    category: 'major',
    tetrad: 'IVmaj7',
    extensions: ['9', '#11', '13'],
    // The sheet prints V7 here, but Lydian's fifth carries a major 7th — its
    // own vamp list says Imaj7 | Vmaj7.
    harmonization: ['Imaj7', 'II7', 'III-7', '#IV-7(b5)', 'Vmaj7', 'VI-7', 'VII-7'],
    modalChords: 'Imaj7(#11), Imaj9(#11) or Imaj13(#11)',
    vamps: ['Imaj7 | II7', 'Imaj7 | Vmaj7'],
    signature: {
      degree: '#IV',
      why: 'Ionian’s IV is natural; raising it is the whole colour of Lydian — the #11.',
    },
  },
  {
    degree: 5,
    name: 'Mixolydian',
    category: 'major',
    tetrad: 'V7',
    extensions: ['9', '11', '13'],
    harmonization: ['I7', 'II-7', 'III-7(b5)', 'IVmaj7', 'V-7', 'VI-7', 'bVIImaj7'],
    modalChords: 'I7, I9, I13 or I7sus',
    vamps: ['I7 | bVIImaj7', 'I7 | V-7', 'I7 | II-7'],
    signature: {
      degree: 'bVII',
      why: 'A major mode with a flat seventh: that’s why its tonic chord is I7, not Imaj7.',
    },
  },
  {
    degree: 6,
    name: 'Aeolian',
    category: 'minor',
    tetrad: 'VI-7',
    extensions: ['9', '11', 'b13'],
    harmonization: ['I-7', 'II-7(b5)', 'bIIImaj7', 'IV-7', 'V-7', 'bVImaj7', 'bVII7'],
    modalChords: 'I-(b6) or I-9(b6)',
    vamps: ['I-7 | bVII7', 'I-7 | IV-7'],
  },
];

export const byName = (name: string): ModeRow => MODES.find((m) => m.name === name)!;
export const byDegree = (degree: number): ModeRow => MODES.find((m) => m.degree === degree)!;
export const MODE_NAMES = MODES.map((m) => m.name);
/** Every tension that appears anywhere on the sheet, low to high. */
export const TENSIONS = ['b9', '9', '11', '#11', 'b13', '13'];

// ── Settings ────────────────────────────────────────────────────────────────

export type Family = 'order' | 'extensions' | 'tetrads' | 'category' | 'harmony' | 'colour';

export const FAMILIES: { id: Family; label: string; blurb: string }[] = [
  { id: 'order', label: 'Order', blurb: 'Which mode sits on which degree.' },
  { id: 'extensions', label: 'Tensions', blurb: 'The 9, 11 and 13 each mode takes.' },
  { id: 'tetrads', label: 'Tetrads', blurb: 'The seventh chord under each mode.' },
  { id: 'category', label: 'Major / minor', blurb: 'The two families, and the degree that marks each mode.' },
  { id: 'harmony', label: 'Harmonization', blurb: 'A mode’s seven chords — both directions.' },
  { id: 'colour', label: 'Chords & vamps', blurb: 'The chord or vamp that states a mode.' },
];

export interface ModalSettings {
  families: Record<Family, boolean>;
  autoAdvance: boolean;
}

export const defaultModalSettings: ModalSettings = {
  families: {
    order: true,
    extensions: true,
    tetrads: true,
    category: true,
    harmony: true,
    colour: true,
  },
  autoAdvance: true,
};

export const modalReady = (s: ModalSettings): boolean =>
  FAMILIES.some((f) => s.families[f.id]);

// ── Questions ───────────────────────────────────────────────────────────────

export interface ModalQuestion {
  family: Family;
  /** The small line above the subject. */
  lead: string;
  /** What's being asked about, set large. Chord symbols are printed as-is. */
  subject: string;
  /** How the subject should be set: a mode name reads as a word, chords as
      symbols, a list of tensions as a row of chips. */
  subjectKind: 'word' | 'chords' | 'tensions' | 'degree';
  options: string[];
  /** Everything that has to be tapped. More than one means tap them all. */
  answer: string[];
  /** Wide options (harmonizations, vamps) stack one per row. */
  wide?: boolean;
  /** The connection behind the answer, shown once it's been answered. */
  note?: string;
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

const pick = <T,>(items: T[], rand: () => number): T => items[Math.floor(rand() * items.length)];

/** `count` wrong options from `pool`, never equal to anything in `answer`. */
const decoys = (pool: string[], answer: string[], count: number, rand: () => number): string[] =>
  shuffle(pool.filter((p) => !answer.includes(p)), rand).slice(0, count);

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

function orderQuestion(rand: () => number): ModalQuestion {
  const mode = pick(MODES, rand);
  if (rand() < 0.5) {
    return {
      family: 'order',
      lead: 'which mode is the',
      subject: `${ORDINALS[mode.degree - 1]} mode`,
      subjectKind: 'degree',
      options: shuffle(MODE_NAMES, rand),
      answer: [mode.name],
      note: `Degree ${mode.degree} of the major scale: ${mode.tetrad}.`,
    };
  }
  return {
    family: 'order',
    lead: 'which degree is',
    subject: mode.name,
    subjectKind: 'word',
    options: ORDINALS.slice(),
    answer: [ORDINALS[mode.degree - 1]],
    note: `${mode.name} is built on ${mode.tetrad}.`,
  };
}

function extensionQuestion(rand: () => number): ModalQuestion {
  const roll = rand();
  // Which tensions does this mode take?
  if (roll < 0.4) {
    const mode = pick(MODES, rand);
    return {
      family: 'extensions',
      lead: 'which tensions does it take',
      subject: mode.name,
      subjectKind: 'word',
      options: TENSIONS.slice(),
      answer: [...mode.extensions],
      note: `Degree ${mode.degree}: ${mode.extensions.join(' · ')} over ${mode.tetrad}.`,
    };
  }
  // Which mode (or modes) take this set?
  if (roll < 0.75) {
    const mode = pick(MODES, rand);
    const sharing = MODES.filter((m) => m.extensions.join() === mode.extensions.join());
    return {
      family: 'extensions',
      lead: sharing.length > 1 ? 'which modes take these' : 'which mode takes these',
      subject: mode.extensions.join(' · '),
      subjectKind: 'tensions',
      options: shuffle(MODE_NAMES, rand),
      answer: sharing.map((m) => m.name),
      note:
        sharing.length > 1
          ? `${sharing.map((m) => m.name).join(', ')} all take the natural tensions.`
          : `Only ${mode.name} — ${mode.extensions.join(' · ')}.`,
    };
  }
  // Which modes carry one particular tension?
  const tension = pick(TENSIONS, rand);
  const holders = MODES.filter((m) => (m.extensions as string[]).includes(tension));
  return {
    family: 'extensions',
    lead: holders.length > 1 ? 'which modes carry the' : 'which mode carries the',
    subject: tension,
    subjectKind: 'tensions',
    options: shuffle(MODE_NAMES, rand),
    answer: holders.map((m) => m.name),
    note: `${holders.map((m) => m.name).join(', ')} — ${holders.length === MODES.length ? 'all of them' : `${holders.length} of the six`}.`,
  };
}

function tetradQuestion(rand: () => number): ModalQuestion {
  const mode = pick(MODES, rand);
  const allTetrads = [...MODES.map((m) => m.tetrad), 'VII-7(b5)'];
  if (rand() < 0.5) {
    return {
      family: 'tetrads',
      lead: 'what tetrad sits on degree',
      subject: String(mode.degree),
      subjectKind: 'degree',
      options: shuffle(allTetrads, rand),
      answer: [mode.tetrad],
      note: `${mode.tetrad} — that's ${mode.name}.`,
    };
  }
  return {
    family: 'tetrads',
    lead: 'which mode sits on',
    subject: mode.tetrad,
    subjectKind: 'chords',
    options: shuffle(MODE_NAMES, rand),
    answer: [mode.name],
    note: `Degree ${mode.degree} of the major scale.`,
  };
}

function categoryQuestion(rand: () => number): ModalQuestion {
  const roll = rand();
  // The whole family at once.
  if (roll < 0.3) {
    const category: Category = rand() < 0.5 ? 'major' : 'minor';
    const members = MODES.filter((m) => m.category === category);
    return {
      family: 'category',
      lead: 'which are the',
      subject: `${category} modes`,
      subjectKind: 'word',
      options: shuffle(MODE_NAMES, rand),
      answer: members.map((m) => m.name),
      note:
        category === 'major'
          ? 'Major modes sit on a major tetrad: Imaj7 or I7.'
          : 'Minor modes sit on a minor tetrad: I-7.',
    };
  }
  // One mode, which side is it on?
  if (roll < 0.6) {
    const mode = pick(MODES, rand);
    return {
      family: 'category',
      lead: 'major or minor mode',
      subject: mode.name,
      subjectKind: 'word',
      options: ['Major', 'Minor'],
      answer: [mode.category === 'major' ? 'Major' : 'Minor'],
      note: `${mode.name} is built on ${mode.tetrad}.`,
    };
  }
  // The degree that marks it — the reference modes have none.
  const marked = MODES.filter((m) => m.signature);
  const mode = pick(marked, rand);
  const sig = mode.signature!;
  const others = marked.filter((m) => m !== mode).map((m) => m.signature!.degree);
  return {
    family: 'category',
    lead: `${mode.category} mode — which degree gives it away`,
    subject: mode.name,
    subjectKind: 'word',
    options: shuffle([sig.degree, ...others, ...decoys(['bIII', 'V', 'bVI'], [sig.degree, ...others], 1, rand)], rand),
    answer: [sig.degree],
    note: sig.why,
  };
}

function harmonyQuestion(rand: () => number): ModalQuestion {
  const mode = pick(MODES, rand);
  const line = (m: ModeRow) => m.harmonization.join(' ');
  if (rand() < 0.5) {
    return {
      family: 'harmony',
      lead: 'which mode harmonizes like this',
      subject: line(mode),
      subjectKind: 'chords',
      options: shuffle(MODE_NAMES, rand),
      answer: [mode.name],
      note: `${mode.name}: ${mode.modalChords} states it on its own.`,
    };
  }
  const wrong = decoys(MODES.map(line), [line(mode)], 3, rand);
  return {
    family: 'harmony',
    lead: 'how does it harmonize',
    subject: mode.name,
    subjectKind: 'word',
    options: shuffle([line(mode), ...wrong], rand),
    answer: [line(mode)],
    wide: true,
    note: `From its own root — degree ${mode.degree} of the major scale.`,
  };
}

function colourQuestion(rand: () => number): ModalQuestion {
  const mode = pick(MODES, rand);
  const roll = rand();
  // The chord that states the mode.
  if (roll < 0.35) {
    const wrong = decoys(MODES.map((m) => m.modalChords), [mode.modalChords], 3, rand);
    return {
      family: 'colour',
      lead: 'which chord states',
      subject: mode.name,
      subjectKind: 'word',
      options: shuffle([mode.modalChords, ...wrong], rand),
      answer: [mode.modalChords],
      wide: true,
      note: `Its tensions: ${mode.extensions.join(' · ')}.`,
    };
  }
  // A vamp, either way round.
  const vamp = pick(mode.vamps, rand);
  const allVamps = MODES.flatMap((m) => m.vamps);
  if (roll < 0.7) {
    return {
      family: 'colour',
      lead: 'which mode does this vamp hold',
      subject: `‖: ${vamp} :‖`,
      subjectKind: 'chords',
      options: shuffle(MODE_NAMES, rand),
      answer: [mode.name],
      note: `${mode.name} — ${mode.modalChords}.`,
    };
  }
  const wrong = decoys(allVamps, mode.vamps, 3, rand);
  return {
    family: 'colour',
    lead: 'which vamp holds',
    subject: mode.name,
    subjectKind: 'word',
    options: shuffle([vamp, ...wrong], rand),
    answer: [vamp],
    wide: true,
    note: `Two chords are enough: they pin ${mode.name}'s ${mode.signature ? mode.signature.degree : 'tonic'}.`,
  };
}

const BUILDERS: Record<Family, (rand: () => number) => ModalQuestion> = {
  order: orderQuestion,
  extensions: extensionQuestion,
  tetrads: tetradQuestion,
  category: categoryQuestion,
  harmony: harmonyQuestion,
  colour: colourQuestion,
};

/** What makes two questions the same question, for avoiding repeats. */
export const questionSig = (q: ModalQuestion): string => `${q.family}:${q.lead}:${q.subject}`;

export function generateModal(
  s: ModalSettings,
  rand: () => number = Math.random,
  avoid?: string,
): ModalQuestion {
  const on = FAMILIES.filter((f) => s.families[f.id]).map((f) => f.id);
  if (on.length === 0) {
    return {
      family: 'order',
      lead: '',
      subject: '',
      subjectKind: 'word',
      options: [],
      answer: [],
      error: 'Turn on at least one kind of question.',
    };
  }
  let q = BUILDERS[pick(on, rand)](rand);
  // A handful of tries is plenty: every family has more questions than that.
  for (let i = 0; i < 8 && avoid && questionSig(q) === avoid; i++) {
    q = BUILDERS[pick(on, rand)](rand);
  }
  return q;
}

/** Did they tap exactly the right set? */
export const modalAnswerMatches = (picked: string[], q: ModalQuestion): boolean =>
  picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));
