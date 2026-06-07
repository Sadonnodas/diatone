// §11 / §12 — display transforms. All one-directional (standard → jazz).
// Anything already jazz passes through untouched.

// (1) Used by ChordDisplay (the visual prompt renderer). Includes the '7' no-op.
export const JAZZ_SYMBOLS: Record<string, string> = {
  m: '-',
  maj7: '△7',
  m7: '-7',
  dim: '°',
  m7b5: 'ø7',
  '7': '7',
};

// (2) Used to convert the stored canonical answer string to jazz so the
//     "Correct answer" line matches the prompt's notation.
const STANDARD_TO_JAZZ: Record<string, string> = {
  m7b5: 'ø7',
  maj7: '△7',
  m7: '-7',
  dim: '°',
  m: '-',
};
// Iterate suffixes by length descending so m7b5 matches before m7 before m.
const STANDARD_TO_JAZZ_KEYS = Object.keys(STANDARD_TO_JAZZ).sort((a, b) => b.length - a.length);

// Replace the matching trailing suffix only, then stop (one substitution per chord).
export const chordToJazz = (chord: string): string => {
  for (const suf of STANDARD_TO_JAZZ_KEYS) {
    if (chord.endsWith(suf)) return chord.slice(0, -suf.length) + STANDARD_TO_JAZZ[suf];
  }
  return chord;
};

export const progressionToJazz = (progression: string): string =>
  progression.split(' ').map(chordToJazz).join(' ');

// §11 — display a stored numeral with its proper 7th quality (7-chord mode).
// Triad mode returns the numeral unchanged. The progressionToJazz pass later
// converts maj7 → △7 and m7 → -7 for display.
export const display7th = (numeral: string, use7thChords: boolean): string => {
  if (!use7thChords) return numeral;
  const base = numeral.replace('°', '');
  if (numeral.includes('°')) return base + 'ø7'; // vii° → viiø7
  if (base === base.toUpperCase()) return base + (base === 'V' ? '7' : 'maj7'); // I→Imaj7, V→V7
  return base + 'm7'; // ii→iim7
};

// §11 — used when hideQuality is ON: strip quality, bare degree only (I…VII).
export const neutralizeNumeral = (numeral: string): string =>
  numeral.toUpperCase().replace('°', '').replace('ø', '');
