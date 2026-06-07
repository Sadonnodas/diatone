// §6 — the authoritative 13-key table, verbatim. Enharmonic spellings are
// deliberate and correct — do not "simplify" them. F# and Gb are both included
// on purpose (F# at the 6-sharp circle position, Gb as an enharmonic extra).

export interface KeyForm {
  chords: string[];
  numerals: string[];
}

export interface KeyData {
  triads: KeyForm;
  sevenths: KeyForm;
}

export type ChordData = Record<string, KeyData>;

export const chordData: ChordData = {
  C: {
    triads: { chords: ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  G: {
    triads: { chords: ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Gmaj7', 'Am7', 'Bm7', 'Cmaj7', 'D7', 'Em7', 'F#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  D: {
    triads: { chords: ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Dmaj7', 'Em7', 'F#m7', 'Gmaj7', 'A7', 'Bm7', 'C#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  A: {
    triads: { chords: ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Amaj7', 'Bm7', 'C#m7', 'Dmaj7', 'E7', 'F#m7', 'G#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  E: {
    triads: { chords: ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Emaj7', 'F#m7', 'G#m7', 'Amaj7', 'B7', 'C#m7', 'D#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  B: {
    triads: { chords: ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'A#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Bmaj7', 'C#m7', 'D#m7', 'Emaj7', 'F#7', 'G#m7', 'A#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  'F#': {
    triads: { chords: ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'E#dim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['F#maj7', 'G#m7', 'A#m7', 'Bmaj7', 'C#7', 'D#m7', 'E#m7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  Gb: {
    triads: { chords: ['Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ebm', 'Fdim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Gbmaj7', 'Abm7', 'Bbm7', 'Cbmaj7', 'Db7', 'Ebm7', 'Fm7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  Db: {
    triads: { chords: ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Cdim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Dbmaj7', 'Ebm7', 'Fm7', 'Gbmaj7', 'Ab7', 'Bbm7', 'Cm7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  Ab: {
    triads: { chords: ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Gdim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Abmaj7', 'Bbm7', 'Cm7', 'Dbmaj7', 'Eb7', 'Fm7', 'Gm7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  Eb: {
    triads: { chords: ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Ddim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Ebmaj7', 'Fm7', 'Gm7', 'Abmaj7', 'Bb7', 'Cm7', 'Dm7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  Bb: {
    triads: { chords: ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Bbmaj7', 'Cm7', 'Dm7', 'Ebmaj7', 'F7', 'Gm7', 'Am7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
  F: {
    triads: { chords: ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
    sevenths: { chords: ['Fmaj7', 'Gm7', 'Am7', 'Bbmaj7', 'C7', 'Dm7', 'Em7b5'], numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] },
  },
};

// Default selected keys.
export const DEFAULT_KEYS = ['C', 'G', 'F'];

// All selectable keys in circle-of-fifths order, with Gb offered as the
// enharmonic extra (see §6 / §20). Used by the key picker.
export const ALL_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
export const ENHARMONIC_KEYS = ['Gb'];
