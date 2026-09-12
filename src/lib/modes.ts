// The four Numerals drills, in the order they're offered. Shared by the setup
// screen and the settings sheet so the two can't drift apart.

export interface ModeInfo {
  id: number;
  label: string;
}

export const MODES: ModeInfo[] = [
  { id: 1, label: 'Name Chord' },
  { id: 4, label: 'Name Numeral' },
  { id: 2, label: 'Progression' },
  { id: 3, label: 'Transpose' },
];

/** Transpose has to move between two keys, so it needs two to choose from. */
export const TRANSPOSE_MODE = 3;
export const transposeStranded = (modes: number[], keys: string[]): boolean =>
  modes.includes(TRANSPOSE_MODE) && keys.length < 2;
